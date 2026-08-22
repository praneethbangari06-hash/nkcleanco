-- Nearest-online-worker assignment, implemented in the database so that ANY insert
-- (app, admin, direct SQL) gets offered to a cleaner automatically.
CREATE OR REPLACE FUNCTION public.assign_nearest_worker(_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Approximate centroids of the serviced areas.
  SELECT lat, lng INTO t_lat, t_lng FROM (
    VALUES ('Narsingi', 17.3894, 78.3517),
           ('Kokapet',  17.3990, 78.3400),
           ('Kanapur',  17.3612, 78.3305)
  ) AS a(area, lat, lng) WHERE a.area = b.area;

  SELECT w.id INTO w_id
  FROM public.workers w
  WHERE w.is_online = true
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
    RETURN NULL;
  END IF;

  UPDATE public.bookings
     SET assigned_worker_id = w_id,
         offered_at = now()
   WHERE id = _booking_id
     AND status = 'pending'
     AND assigned_worker_id IS NULL;

  RETURN w_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_nearest_worker(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_nearest_worker(uuid) TO service_role;

-- Fire on every new pending booking.
CREATE OR REPLACE FUNCTION public.handle_new_booking_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.assigned_worker_id IS NULL THEN
    PERFORM public.assign_nearest_worker(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created_assign ON public.bookings;
CREATE TRIGGER on_booking_created_assign
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_assignment();

-- Release offers nobody answered within 60s and roll them to the next cleaner.
CREATE OR REPLACE FUNCTION public.rotate_stale_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id, assigned_worker_id
    FROM public.bookings
    WHERE status = 'pending'
      AND assigned_worker_id IS NOT NULL
      AND offered_at IS NOT NULL
      AND offered_at < now() - interval '60 seconds'
  LOOP
    UPDATE public.bookings
       SET offered_worker_ids = (
             SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(offered_worker_ids, '{}'::uuid[]) || r.assigned_worker_id))
           ),
           assigned_worker_id = NULL,
           offered_at = NULL
     WHERE id = r.id AND status = 'pending';

    PERFORM public.assign_nearest_worker(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_stale_offers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_stale_offers() TO service_role;

-- Also assign any bookings that are currently stuck unassigned.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.bookings WHERE status = 'pending' AND assigned_worker_id IS NULL LOOP
    PERFORM public.assign_nearest_worker(r.id);
  END LOOP;
END $$;