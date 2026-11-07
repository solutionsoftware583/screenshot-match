ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS geographic_scope_id uuid REFERENCES public.geographic_scopes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cases_geo_idx ON public.cases(geographic_scope_id);

CREATE OR REPLACE FUNCTION public.rg_geo_limited(_uid uuid, _org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _uid IS NOT NULL
    AND NOT public.has_platform_permission(_uid, 'platform.view_all')
    AND EXISTS (SELECT 1 FROM organization_memberships WHERE user_id=_uid AND organization_id=_org AND geographic_scope_id IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM organization_memberships WHERE user_id=_uid AND organization_id=_org AND geographic_scope_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM team_memberships WHERE user_id=_uid AND organization_id=_org)
    AND NOT EXISTS (SELECT 1 FROM organizations o JOIN reseller_memberships rm ON rm.reseller_id=o.reseller_id AND rm.user_id=_uid WHERE o.id=_org)
$$;

CREATE OR REPLACE FUNCTION public.rg_user_geo_ids(_uid uuid, _org uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH RECURSIVE t AS (
    SELECT g.id FROM geographic_scopes g JOIN organization_memberships m ON m.geographic_scope_id=g.id
      WHERE m.user_id=_uid AND m.organization_id=_org
    UNION SELECT g.id FROM geographic_scopes g JOIN t ON g.parent_id=t.id
  ) SELECT id FROM t
$$;

CREATE OR REPLACE FUNCTION public.rg_in_region(_uid uuid, _org uuid, _geo uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT public.rg_geo_limited(_uid, _org)
      OR (_geo IS NOT NULL AND _geo IN (SELECT public.rg_user_geo_ids(_uid, _org)))
$$;

CREATE OR REPLACE FUNCTION public.rg_case_in_scope(_uid uuid, _case uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM cases c WHERE c.id=_case AND public.rg_in_region(_uid, c.organization_id, c.geographic_scope_id))
$$;

-- Read policies
DROP POLICY IF EXISTS "Case viewers" ON public.cases;
CREATE POLICY "Case viewers" ON public.cases FOR SELECT TO authenticated USING (
  (public.has_org_permission(auth.uid(), organization_id, 'cases.view') AND public.rg_in_region(auth.uid(), organization_id, geographic_scope_id))
  OR public.has_platform_permission(auth.uid(), 'platform.view_all'));
DROP POLICY IF EXISTS "Evidence viewers" ON public.case_evidence;
CREATE POLICY "Evidence viewers" ON public.case_evidence FOR SELECT TO authenticated USING (
  (public.has_org_permission(auth.uid(), organization_id, 'evidence.view') AND public.rg_case_in_scope(auth.uid(), case_id))
  OR public.has_platform_permission(auth.uid(), 'platform.view_all'));
DROP POLICY IF EXISTS "Case event viewers" ON public.case_events;
CREATE POLICY "Case event viewers" ON public.case_events FOR SELECT TO authenticated USING (
  (public.has_org_permission(auth.uid(), organization_id, 'cases.view') AND public.rg_case_in_scope(auth.uid(), case_id))
  OR public.has_platform_permission(auth.uid(), 'platform.view_all'));
DROP POLICY IF EXISTS "Letter viewers" ON public.case_letters;
CREATE POLICY "Letter viewers" ON public.case_letters FOR SELECT TO authenticated USING (
  (public.has_org_permission(auth.uid(), organization_id, 'cases.view') AND public.rg_case_in_scope(auth.uid(), case_id))
  OR public.has_platform_permission(auth.uid(), 'platform.view_all'));
DROP POLICY IF EXISTS "Watcher viewers" ON public.case_watchers;
CREATE POLICY "Watcher viewers" ON public.case_watchers FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR (public.has_org_permission(auth.uid(), organization_id, 'cases.view') AND public.rg_case_in_scope(auth.uid(), case_id)));
DROP POLICY IF EXISTS "Org scope" ON public.teams;
CREATE POLICY "Org scope" ON public.teams FOR SELECT TO authenticated USING (
  public.can_access_org(auth.uid(), organization_id) AND public.rg_in_region(auth.uid(), organization_id, geographic_scope_id));

-- New cases from a regional manager default to their region
CREATE OR REPLACE FUNCTION public.rg_case_default_region() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.geographic_scope_id IS NULL AND public.rg_geo_limited(auth.uid(), NEW.organization_id) THEN
    SELECT geographic_scope_id INTO NEW.geographic_scope_id FROM organization_memberships
      WHERE user_id=auth.uid() AND organization_id=NEW.organization_id AND geographic_scope_id IS NOT NULL LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rg_case_default_region ON public.cases;
CREATE TRIGGER rg_case_default_region BEFORE INSERT ON public.cases FOR EACH ROW EXECUTE FUNCTION public.rg_case_default_region();

-- Every write path to a case must be inside the caller's region
CREATE OR REPLACE FUNCTION public.rg_enforce_case_region() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _case uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  _case := CASE WHEN TG_TABLE_NAME = 'cases' THEN NEW.id ELSE NEW.case_id END;
  IF TG_TABLE_NAME = 'cases' THEN
    IF NOT public.rg_in_region(auth.uid(), OLD.organization_id, OLD.geographic_scope_id)
       OR NOT public.rg_in_region(auth.uid(), NEW.organization_id, NEW.geographic_scope_id) THEN
      RAISE EXCEPTION 'This case is outside your assigned region';
    END IF;
  ELSIF NOT public.rg_case_in_scope(auth.uid(), _case) THEN
    RAISE EXCEPTION 'This case is outside your assigned region';
  END IF;
  IF TG_TABLE_NAME = 'case_watchers' AND NOT public.rg_case_in_scope(NEW.user_id, _case) THEN
    RAISE EXCEPTION 'That person cannot view this case';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rg_enforce_region ON public.cases;
CREATE TRIGGER rg_enforce_region BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.rg_enforce_case_region();
DROP TRIGGER IF EXISTS rg_enforce_region ON public.case_evidence;
CREATE TRIGGER rg_enforce_region BEFORE INSERT OR UPDATE ON public.case_evidence FOR EACH ROW EXECUTE FUNCTION public.rg_enforce_case_region();
DROP TRIGGER IF EXISTS rg_enforce_region ON public.case_events;
CREATE TRIGGER rg_enforce_region BEFORE INSERT ON public.case_events FOR EACH ROW EXECUTE FUNCTION public.rg_enforce_case_region();
DROP TRIGGER IF EXISTS rg_enforce_region ON public.case_letters;
CREATE TRIGGER rg_enforce_region BEFORE INSERT ON public.case_letters FOR EACH ROW EXECUTE FUNCTION public.rg_enforce_case_region();
DROP TRIGGER IF EXISTS rg_enforce_region ON public.case_watchers;
CREATE TRIGGER rg_enforce_region BEFORE INSERT ON public.case_watchers FOR EACH ROW EXECUTE FUNCTION public.rg_enforce_case_region();

-- Set a case's region
CREATE OR REPLACE FUNCTION public.rg_set_case_region(_case uuid, _geo uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.cases;
BEGIN
  SELECT * INTO c FROM cases WHERE id=_case;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'cases.edit'));
  IF _geo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM geographic_scopes WHERE id=_geo AND organization_id=c.organization_id) THEN
    RAISE EXCEPTION 'Region not in this organization';
  END IF;
  UPDATE cases SET geographic_scope_id=_geo, updated_at=now() WHERE id=_case;
  PERFORM public.rg_audit('case.region', c.organization_id, NULL, 'case', _case::text, jsonb_build_object('geo', _geo));
END $$;
GRANT EXECUTE ON FUNCTION public.rg_set_case_region(uuid, uuid) TO authenticated;

-- Notifications only to people who can see the case's region
CREATE OR REPLACE FUNCTION public.rg_notify_case_event()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.cases; _title text; _kind text;
BEGIN
  IF NEW.kind NOT IN ('status','recheck_clean') THEN RETURN NEW; END IF;
  SELECT * INTO c FROM public.cases WHERE id = NEW.case_id;
  _kind := CASE WHEN NEW.kind = 'recheck_clean' THEN 'recheck' ELSE NEW.to_status END;
  _title := c.reference || ': ' || CASE _kind
    WHEN 'pending_approval' THEN 'approval requested'
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'submitted' THEN 'submitted to ' || c.platform
    WHEN 'removed' THEN 'marked removed'
    WHEN 'declined' THEN 'declined by platform'
    WHEN 'appealed' THEN 'appeal filed'
    WHEN 'reappeared' THEN 'found again on recheck'
    WHEN 'recheck' THEN 'recheck: still removed'
    WHEN 'closed' THEN 'closed'
    WHEN 'draft' THEN 'reopened as draft'
    ELSE _kind END;
  INSERT INTO public.notifications(user_id, organization_id, case_id, kind, title, body)
  SELECT r, c.organization_id, c.id, _kind, _title, left(coalesce(NEW.note, c.title), 300)
  FROM (
    SELECT c.created_by r
    UNION SELECT user_id FROM public.case_watchers WHERE case_id = c.id
    UNION SELECT actor_id FROM public.case_events WHERE case_id = c.id AND actor_id IS NOT NULL
    UNION SELECT u FROM public.rg_org_users_with(c.organization_id, 'cases.approve') u WHERE _kind = 'pending_approval'
  ) rec
  WHERE r IS NOT NULL AND r IS DISTINCT FROM NEW.actor_id
    AND public.has_org_permission(r, c.organization_id, 'cases.view')
    AND public.rg_in_region(r, c.organization_id, c.geographic_scope_id);
  RETURN NEW;
END $function$;