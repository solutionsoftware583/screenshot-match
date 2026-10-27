-- Removal case management. Ported designs: approval state machine (Tenex 003, MIT),
-- submission lifecycle + recurrence windows (PrivacyScrub, MIT). Evidence hashing built independently.
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  reference text NOT NULL UNIQUE,
  title text NOT NULL,
  platform text NOT NULL,
  review_url text,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected','submitted','removed','declined','appealed','reappeared','closed')),
  recheck_days integer NOT NULL DEFAULT 30 CHECK (recheck_days BETWEEN 0 AND 365),
  removed_at timestamptz,
  last_checked_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cases_org_idx ON public.cases(organization_id, created_at DESC);
GRANT SELECT ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Case viewers" ON public.cases FOR SELECT TO authenticated
  USING (public.has_org_permission(auth.uid(), organization_id, 'cases.view') OR public.has_platform_permission(auth.uid(), 'platform.view_all'));

CREATE TABLE public.case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('screenshot','document','link','note')),
  source_url text,
  file_name text,
  file_size bigint,
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  notes text,
  captured_by uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_evidence TO authenticated;
GRANT ALL ON public.case_evidence TO service_role;
ALTER TABLE public.case_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Evidence viewers" ON public.case_evidence FOR SELECT TO authenticated
  USING (public.has_org_permission(auth.uid(), organization_id, 'evidence.view') OR public.has_platform_permission(auth.uid(), 'platform.view_all'));

CREATE TABLE public.case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  kind text NOT NULL,
  from_status text,
  to_status text,
  channel text,
  external_ref text,
  note text,
  actor_id uuid,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX case_events_case_idx ON public.case_events(case_id, at);
GRANT SELECT ON public.case_events TO authenticated;
GRANT ALL ON public.case_events TO service_role;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Case event viewers" ON public.case_events FOR SELECT TO authenticated
  USING (public.has_org_permission(auth.uid(), organization_id, 'cases.view') OR public.has_platform_permission(auth.uid(), 'platform.view_all'));

-- Allowed transitions (mirrors src/lib/caseflow.ts) and the permission each needs.
CREATE OR REPLACE FUNCTION public.rg_case_transition_perm(_from text, _to text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _from='draft' AND _to='pending_approval' THEN 'cases.edit'
    WHEN _from='rejected' AND _to='draft' THEN 'cases.edit'
    WHEN _from='pending_approval' AND _to IN ('approved','rejected') THEN 'cases.approve'
    WHEN _from='approved' AND _to='submitted' THEN 'cases.edit'
    WHEN _from IN ('submitted','appealed') AND _to IN ('removed','declined') THEN 'cases.edit'
    WHEN _from='declined' AND _to='appealed' THEN 'cases.edit'
    WHEN _from='removed' AND _to='reappeared' THEN 'cases.edit'
    WHEN _from='reappeared' AND _to='draft' THEN 'cases.edit'
    WHEN _from IN ('draft','rejected','declined','removed','reappeared') AND _to='closed' THEN 'cases.edit'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.rg_create_case(_org uuid, _title text, _platform text, _url text, _reason text, _priority text, _recheck integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _ref text;
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'cases.edit'));
  IF length(trim(coalesce(_title,''))) < 3 OR length(trim(coalesce(_reason,''))) < 10 THEN
    RAISE EXCEPTION 'Title (3+ chars) and reason (10+ chars) are required';
  END IF;
  _ref := 'RG-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text),1,6));
  INSERT INTO public.cases(organization_id, reference, title, platform, review_url, reason, priority, recheck_days, created_by)
  VALUES (_org, _ref, trim(_title), trim(_platform), nullif(trim(coalesce(_url,'')),''), trim(_reason), coalesce(_priority,'normal'), coalesce(_recheck,30), auth.uid())
  RETURNING id INTO _id;
  INSERT INTO public.case_events(case_id, organization_id, kind, to_status, actor_id) VALUES (_id, _org, 'created', 'draft', auth.uid());
  PERFORM public.rg_audit('case.create', _org, NULL, 'case', _id::text, jsonb_build_object('reference', _ref));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.rg_update_case(_id uuid, _title text, _platform text, _url text, _reason text, _priority text, _recheck integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cases;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'cases.edit'));
  IF c.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'Only draft or rejected cases can be edited'; END IF;
  IF length(trim(coalesce(_title,''))) < 3 OR length(trim(coalesce(_reason,''))) < 10 THEN
    RAISE EXCEPTION 'Title (3+ chars) and reason (10+ chars) are required';
  END IF;
  UPDATE public.cases SET title=trim(_title), platform=trim(_platform), review_url=nullif(trim(coalesce(_url,'')),''),
    reason=trim(_reason), priority=coalesce(_priority,'normal'), recheck_days=coalesce(_recheck,30), updated_at=now() WHERE id=_id;
  INSERT INTO public.case_events(case_id, organization_id, kind, actor_id) VALUES (_id, c.organization_id, 'edited', auth.uid());
  PERFORM public.rg_audit('case.update', c.organization_id, NULL, 'case', _id::text, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.rg_transition_case(_id uuid, _to text, _note text, _channel text, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cases; _perm text;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  _perm := public.rg_case_transition_perm(c.status, _to);
  IF _perm IS NULL THEN RAISE EXCEPTION 'A case cannot move from % to %', c.status, _to; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, _perm));
  IF _to IN ('approved','rejected') AND c.created_by = auth.uid() THEN
    RAISE EXCEPTION 'You cannot approve or reject a case you created';
  END IF;
  IF _to = 'rejected' AND length(trim(coalesce(_note,''))) < 3 THEN RAISE EXCEPTION 'A reason is required to reject'; END IF;
  IF _to IN ('submitted','appealed') AND length(trim(coalesce(_channel,''))) < 2 THEN RAISE EXCEPTION 'Say where it was submitted'; END IF;
  IF _to = 'pending_approval' AND NOT EXISTS (SELECT 1 FROM public.case_evidence WHERE case_id=_id) THEN
    RAISE EXCEPTION 'Add at least one piece of evidence before requesting approval';
  END IF;
  UPDATE public.cases SET status=_to, updated_at=now(),
    removed_at = CASE WHEN _to='removed' THEN now() ELSE removed_at END,
    last_checked_at = CASE WHEN _to IN ('removed','reappeared') THEN now() ELSE last_checked_at END
  WHERE id=_id;
  INSERT INTO public.case_events(case_id, organization_id, kind, from_status, to_status, channel, external_ref, note, actor_id)
  VALUES (_id, c.organization_id, 'status', c.status, _to, nullif(trim(coalesce(_channel,'')),''), nullif(trim(coalesce(_ref,'')),''), nullif(trim(coalesce(_note,'')),''), auth.uid());
  PERFORM public.rg_audit('case.status', c.organization_id, NULL, 'case', _id::text, jsonb_build_object('from', c.status, 'to', _to));
END $$;

-- Recurrence recheck: only a real observation changes state (PrivacyScrub rule).
CREATE OR REPLACE FUNCTION public.rg_record_recheck(_id uuid, _still_removed boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cases;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'cases.edit'));
  IF c.status <> 'removed' THEN RAISE EXCEPTION 'Only removed cases can be rechecked'; END IF;
  IF _still_removed THEN
    UPDATE public.cases SET last_checked_at=now(), updated_at=now() WHERE id=_id;
    INSERT INTO public.case_events(case_id, organization_id, kind, note, actor_id) VALUES (_id, c.organization_id, 'recheck_clean', nullif(trim(coalesce(_note,'')),''), auth.uid());
    PERFORM public.rg_audit('case.recheck', c.organization_id, NULL, 'case', _id::text, '{"result":"still_removed"}'::jsonb);
  ELSE
    PERFORM public.rg_transition_case(_id, 'reappeared', coalesce(_note,'Found again on recheck'), NULL, NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rg_add_evidence(_case uuid, _title text, _kind text, _url text, _file text, _size bigint, _sha text, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cases; _id uuid;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _case;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'evidence.upload'));
  IF c.status = 'closed' THEN RAISE EXCEPTION 'Case is closed'; END IF;
  INSERT INTO public.case_evidence(case_id, organization_id, title, kind, source_url, file_name, file_size, sha256, notes, captured_by)
  VALUES (_case, c.organization_id, trim(_title), _kind, nullif(trim(coalesce(_url,'')),''), nullif(_file,''), _size, nullif(lower(_sha),''), nullif(trim(coalesce(_notes,'')),''), auth.uid())
  RETURNING id INTO _id;
  INSERT INTO public.case_events(case_id, organization_id, kind, note, actor_id) VALUES (_case, c.organization_id, 'evidence_added', trim(_title), auth.uid());
  PERFORM public.rg_audit('evidence.add', c.organization_id, NULL, 'evidence', _id::text, jsonb_build_object('case', _case, 'sha256', _sha));
  RETURN _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.rg_create_case(uuid,text,text,text,text,text,integer), public.rg_update_case(uuid,text,text,text,text,text,integer),
  public.rg_transition_case(uuid,text,text,text,text), public.rg_record_recheck(uuid,boolean,text),
  public.rg_add_evidence(uuid,text,text,text,text,bigint,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rg_create_case(uuid,text,text,text,text,text,integer), public.rg_update_case(uuid,text,text,text,text,text,integer),
  public.rg_transition_case(uuid,text,text,text,text), public.rg_record_recheck(uuid,boolean,text),
  public.rg_add_evidence(uuid,text,text,text,text,bigint,text,text) TO authenticated;