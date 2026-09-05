DROP FUNCTION IF EXISTS public.worker_match_scores();
REVOKE ALL ON FUNCTION public.worker_score_parts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.worker_score_parts(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.worker_score_parts(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.worker_score_parts(uuid) TO service_role;