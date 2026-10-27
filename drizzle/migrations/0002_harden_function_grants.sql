CREATE OR REPLACE FUNCTION public.audit_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;