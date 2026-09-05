DROP POLICY IF EXISTS "job_photos_admin_read" ON storage.objects;
DROP POLICY IF EXISTS "job_photos_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "job_photos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "job_photos_admin_delete" ON storage.objects;

CREATE POLICY "job_photos_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-photos'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "job_photos_admin_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-photos'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "job_photos_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'job-photos'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
)
WITH CHECK (
  bucket_id = 'job-photos'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "job_photos_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-photos'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);