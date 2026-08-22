REVOKE ALL ON FUNCTION public.handle_new_booking_assignment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_booking_assignment() TO service_role;