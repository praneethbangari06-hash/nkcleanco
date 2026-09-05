ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS before_photo_path text,
  ADD COLUMN IF NOT EXISTS after_photo_path text,
  ADD COLUMN IF NOT EXISTS photo_check_result text,
  ADD COLUMN IF NOT EXISTS photo_check_reason text,
  ADD COLUMN IF NOT EXISTS photo_checked_at timestamptz;