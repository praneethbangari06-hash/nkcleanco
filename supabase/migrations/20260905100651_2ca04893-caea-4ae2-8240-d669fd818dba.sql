CREATE TABLE public.cleaner_credentials (
  worker_id uuid PRIMARY KEY REFERENCES public.workers(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cleaner_credentials TO service_role;

ALTER TABLE public.cleaner_credentials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cleaner_credentials_updated_at
BEFORE UPDATE ON public.cleaner_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cleaner_credentials (worker_id, password_hash)
SELECT id, password_hash FROM public.workers
ON CONFLICT (worker_id) DO NOTHING;

ALTER TABLE public.workers DROP COLUMN password_hash;