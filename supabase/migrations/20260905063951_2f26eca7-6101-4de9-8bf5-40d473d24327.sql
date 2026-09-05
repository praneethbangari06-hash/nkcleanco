DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();

CREATE POLICY "Admins can add workers" ON public.workers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins can update workers" ON public.workers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins can delete workers" ON public.workers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins can add chat messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.workers TO service_role;
GRANT ALL ON public.messages TO service_role;