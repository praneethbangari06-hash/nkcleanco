ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS last_location_update timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS offered_worker_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS offered_at timestamptz;
CREATE INDEX IF NOT EXISTS bookings_pending_offer_idx ON public.bookings (status, offered_at);