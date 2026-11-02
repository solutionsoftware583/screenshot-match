CREATE OR REPLACE FUNCTION public.rg_save_letter(_case uuid, _body text, _source text, _model text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.cases; _id uuid;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _case;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'roles.assign')
    OR public.has_org_permission(auth.uid(), c.organization_id, 'cases.approve'));
  IF length(trim(coalesce(_body,''))) < 20 OR length(_body) > 20000 THEN RAISE EXCEPTION 'Letter must be 20–20000 characters'; END IF;
  INSERT INTO public.case_letters(case_id, organization_id, body, source, model, created_by)
  VALUES (_case, c.organization_id, _body, _source, _model, auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.case_events(case_id, organization_id, kind, note, actor_id)
  VALUES (_case, c.organization_id, CASE WHEN _source='ai_draft' THEN 'letter_drafted' ELSE 'letter_edited' END, NULL, auth.uid());
  PERFORM public.rg_audit('case.letter', c.organization_id, NULL, 'case', _case::text, jsonb_build_object('source', _source));
  RETURN _id;
END $function$;