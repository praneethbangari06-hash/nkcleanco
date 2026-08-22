CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_online boolean NOT NULL DEFAULT false,
  current_lat double precision,
  current_lng double precision,
  status text NOT NULL DEFAULT 'available',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.workers TO service_role;

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view workers" ON public.workers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_assigned_worker_idx ON public.bookings (assigned_worker_id);

INSERT INTO public.workers (name, phone, password_hash, status)
VALUES ('Ravi Kumar', '9876543210', 'pbkdf2$100000$aaef2348b447f2ee8a27e35fc0df8de8$0ec932ab65a6d5554dabce6af4ee6d3113e73448df85b83aa16c9c03cdd7e070', 'available')
ON CONFLICT (phone) DO NOTHING;