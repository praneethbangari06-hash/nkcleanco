ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
-- assignment must skip deactivated cleaners
CREATE OR REPLACE FUNCTION public.assign_nearest_worker(_booking_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  WHERE w.is_online = true
    AND w.is_active = true
    AND w.status <> 'on_job'
    AND NOT (w.id = ANY (COALESCE(b.offered_worker_ids, '{}'::uuid[])))
  ORDER BY
    CASE
      WHEN t_lat IS NULL OR w.current_lat IS NULL OR w.current_lng IS NULL THEN 1e9
      ELSE 2 * 6371 * asin(sqrt(
        power(sin(radians(t_lat - w.current_lat) / 2), 2) +
        cos(radians(w.current_lat)) * cos(radians(t_lat)) *
        power(sin(radians(t_lng - w.current_lng) / 2), 2)
      ))
    END ASC,
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