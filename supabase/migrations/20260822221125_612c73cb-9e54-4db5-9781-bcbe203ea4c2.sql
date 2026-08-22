CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer','worker')),
  message_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX messages_booking_id_created_at_idx ON public.messages (booking_id, created_at);

GRANT SELECT ON public.messages TO anon;
GRANT SELECT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages are readable by booking participants"
  ON public.messages FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

ALTER TABLE public.bookings ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5);