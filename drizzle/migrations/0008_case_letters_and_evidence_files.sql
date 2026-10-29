CREATE TABLE public.case_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  body text NOT NULL,
  source text NOT NULL CHECK (source IN ('ai_draft','edited')),
  model text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX case_letters_case_idx ON public.case_letters(case_id, created_at DESC);
GRANT SELECT ON public.case_letters TO authenticated;
GRANT ALL ON public.case_letters TO service_role;
ALTER TABLE public.case_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Letter viewers" ON public.case_letters FOR SELECT TO authenticated
  USING (public.has_org_permission(auth.uid(), organization_id, 'cases.view') OR public.has_platform_permission(auth.uid(), 'platform.view_all'));

-- Org admins = holders of roles.assign in the case's org.
CREATE OR REPLACE FUNCTION public.rg_save_letter(_case uuid, _body text, _source text, _model text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cases; _id uuid;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _case;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'roles.assign'));
  IF length(trim(coalesce(_body,''))) < 20 OR length(_body) > 20000 THEN RAISE EXCEPTION 'Letter must be 20–20000 characters'; END IF;
  INSERT INTO public.case_letters(case_id, organization_id, body, source, model, created_by)
  VALUES (_case, c.organization_id, _body, _source, _model, auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.case_events(case_id, organization_id, kind, note, actor_id)
  VALUES (_case, c.organization_id, CASE WHEN _source='ai_draft' THEN 'letter_drafted' ELSE 'letter_edited' END, NULL, auth.uid());
  PERFORM public.rg_audit('case.letter', c.organization_id, NULL, 'case', _case::text, jsonb_build_object('source', _source));
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.rg_save_letter(uuid,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rg_save_letter(uuid,text,text,text) TO authenticated;

-- Evidence files: path is "<org_id>/<case_id>/<uuid>-<name>".
ALTER TABLE public.case_evidence ADD COLUMN storage_path text;
ALTER TABLE public.case_evidence ADD COLUMN mime_type text;

CREATE OR REPLACE FUNCTION public.rg_attach_evidence_file(_evidence uuid, _path text, _mime text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.case_evidence;
BEGIN
  SELECT * INTO e FROM public.case_evidence WHERE id = _evidence;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Evidence not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), e.organization_id, 'evidence.upload'));
  IF e.storage_path IS NOT NULL THEN RAISE EXCEPTION 'A file is already attached'; END IF;
  IF split_part(_path,'/',1) <> e.organization_id::text OR split_part(_path,'/',2) <> e.case_id::text THEN
    RAISE EXCEPTION 'File path does not match this case';
  END IF;
  UPDATE public.case_evidence SET storage_path=_path, mime_type=_mime WHERE id=_evidence;
  PERFORM public.rg_audit('evidence.file', e.organization_id, NULL, 'evidence', _evidence::text, jsonb_build_object('path', _path));
END $$;
REVOKE EXECUTE ON FUNCTION public.rg_attach_evidence_file(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rg_attach_evidence_file(uuid,text,text) TO authenticated;

CREATE POLICY "Evidence files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-evidence' AND (
    public.has_org_permission(auth.uid(), (split_part(name,'/',1))::uuid, 'evidence.view')
    OR public.has_platform_permission(auth.uid(), 'platform.view_all')));
CREATE POLICY "Evidence files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case-evidence'
    AND public.has_org_permission(auth.uid(), (split_part(name,'/',1))::uuid, 'evidence.upload')
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id::text = split_part(name,'/',2) AND c.organization_id::text = split_part(name,'/',1) AND c.status <> 'closed'));