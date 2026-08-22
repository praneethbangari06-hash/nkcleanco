DROP POLICY IF EXISTS "Chat messages are readable by booking participants" ON public.messages;

REVOKE SELECT ON public.messages FROM anon;

CREATE POLICY "Admins can view chat messages"
ON public.messages
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
));

GRANT SELECT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;