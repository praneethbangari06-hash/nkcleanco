CREATE OR REPLACE FUNCTION public.worker_score_parts(_worker_id uuid)
RETURNS TABLE (rating_score double precision, load_score double precision, acceptance_score double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT avg(b.rating)::double precision AS avg_rating
    FROM public.bookings b
    WHERE b.assigned_worker_id = _worker_id AND b.rating IS NOT NULL
  ), l AS (
    SELECT count(*) AS active_jobs
    FROM public.bookings b
    WHERE b.assigned_worker_id = _worker_id
      AND b.status IN ('assigned', 'arrived', 'in_progress')
  ), a AS (
    SELECT
      (SELECT count(*) FROM public.bookings b
         WHERE b.assigned_worker_id = _worker_id
           AND b.status IN ('assigned', 'arrived', 'in_progress', 'completed')) AS accepted,
      (SELECT count(*) FROM public.bookings b
         WHERE _worker_id = ANY (COALESCE(b.offered_worker_ids, '{}'::uuid[]))) AS declined
  )
  SELECT
    COALESCE(r.avg_rating / 5.0, 0.8),
    CASE WHEN l.active_jobs = 0 THEN 1.0 WHEN l.active_jobs = 1 THEN 0.5 ELSE 0.0 END,
    CASE WHEN (a.accepted + a.declined) = 0 THEN 0.8
         ELSE a.accepted::double precision / (a.accepted + a.declined) END
  FROM r, l, a
$$;

REVOKE ALL ON FUNCTION public.worker_score_parts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worker_score_parts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.worker_match_scores()
RETURNS TABLE (
  worker_id uuid,
  rating_score double precision,
  load_score double precision,
  acceptance_score double precision,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id,
         p.rating_score,
         p.load_score,
         p.acceptance_score,
         round((
           (0.5 * 0.5) +
           (p.rating_score * 0.25) +
           (p.load_score * 0.15) +
           (p.acceptance_score * 0.10)
         )::numeric, 4)::double precision
  FROM public.workers w
  CROSS JOIN LATERAL public.worker_score_parts(w.id) p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.worker_match_scores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worker_match_scores() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_nearest_worker(_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  b public.bookings;
  t_lat double precision;
  t_lng double precision;
  w_id uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL OR b.status <> 'pending' OR b.assigned_worker_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  IF b.customer_lat IS NOT NULL AND b.customer_lng IS NOT NULL THEN
    t_lat := b.customer_lat;
    t_lng := b.customer_lng;
  ELSE
    SELECT lat, lng INTO t_lat, t_lng FROM (
      VALUES ('Narsingi', 17.3894, 78.3517),
             ('Kokapet',  17.3990, 78.3400),
             ('Kanapur',  17.3612, 78.3305)
    ) AS a(area, lat, lng) WHERE a.area = b.area;
  END IF;

  SELECT w.id INTO w_id
  FROM public.workers w
  CROSS JOIN LATERAL public.worker_score_parts(w.id) p
  WHERE w.is_online = true
    AND w.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings ab
      WHERE ab.assigned_worker_id = w.id
        AND ab.status IN ('assigned', 'arrived', 'in_progress')
    )
    AND NOT (w.id = ANY (COALESCE(b.offered_worker_ids, '{}'::uuid[])))
  ORDER BY
    (
      0.5 * (
        CASE
          WHEN t_lat IS NULL OR w.current_lat IS NULL OR w.current_lng IS NULL THEN 0.0
          ELSE greatest(0.0, 1.0 - least(1.0, (
            2 * 6371 * asin(sqrt(
              power(sin(radians(t_lat - w.current_lat) / 2), 2) +
              cos(radians(w.current_lat)) * cos(radians(t_lat)) *
              power(sin(radians(t_lng - w.current_lng) / 2), 2)
            ))
          ) / 10.0))
        END
      )
      + 0.25 * p.rating_score
      + 0.15 * p.load_score
      + 0.10 * p.acceptance_score
    ) DESC,
    w.last_location_update DESC NULLS LAST
  LIMIT 1;

  IF w_id IS NULL THEN
    IF COALESCE(b.offered_worker_ids, '{}'::uuid[]) = '{}'::uuid[] THEN
      RETURN NULL;
    END IF;
    IF b.offer_cycle_at IS NULL THEN
      UPDATE public.bookings SET offer_cycle_at = now() WHERE id = _booking_id;
      RETURN NULL;
    END IF;
    IF b.offer_cycle_at > now() - interval '3 minutes' THEN
      RETURN NULL;
    END IF;
    UPDATE public.bookings
       SET offered_worker_ids = '{}'::uuid[], offer_cycle_at = NULL
     WHERE id = _booking_id AND status = 'pending';
    RETURN public.assign_nearest_worker(_booking_id);
  END IF;

  UPDATE public.bookings
     SET assigned_worker_id = w_id,
         offered_at = now(),
         offer_cycle_at = NULL
   WHERE id = _booking_id
     AND status = 'pending'
     AND assigned_worker_id IS NULL;

  RETURN w_id;
END;
$function$;