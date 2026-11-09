CREATE OR REPLACE FUNCTION public.rg_enforce_case_region() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _case uuid; _user uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'cases' THEN
    IF NOT public.rg_in_region(auth.uid(), OLD.organization_id, OLD.geographic_scope_id)
       OR NOT public.rg_in_region(auth.uid(), NEW.organization_id, NEW.geographic_scope_id) THEN
      RAISE EXCEPTION 'This case is outside your assigned region';
    END IF;
    RETURN NEW;
  END IF;
  _case := (to_jsonb(NEW)->>'case_id')::uuid;
  IF NOT public.rg_case_in_scope(auth.uid(), _case) THEN
    RAISE EXCEPTION 'This case is outside your assigned region';
  END IF;
  IF TG_TABLE_NAME = 'case_watchers' THEN
    _user := (to_jsonb(NEW)->>'user_id')::uuid;
    IF NOT public.rg_case_in_scope(_user, _case) THEN RAISE EXCEPTION 'That person cannot view this case'; END IF;
  END IF;
  RETURN NEW;
END $$;