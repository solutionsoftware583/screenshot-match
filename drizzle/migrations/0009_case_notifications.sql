CREATE TABLE public.case_watchers (
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, user_id)
);
GRANT SELECT ON public.case_watchers TO authenticated;
GRANT ALL ON public.case_watchers TO service_role;
ALTER TABLE public.case_watchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Watcher viewers" ON public.case_watchers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_permission(auth.uid(), organization_id, 'cases.view'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  case_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rg_set_case_watcher(_case uuid, _user uuid, _watch boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cases;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _case;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Case not found'; END IF;
  IF _user = auth.uid() THEN
    PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'cases.view'));
  ELSE
    PERFORM public.rg_require(public.has_org_permission(auth.uid(), c.organization_id, 'cases.edit'));
  END IF;
  IF _watch THEN
    IF NOT public.has_org_permission(_user, c.organization_id, 'cases.view') THEN
      RAISE EXCEPTION 'That person cannot view cases in this organization';
    END IF;
    INSERT INTO public.case_watchers(case_id, user_id, organization_id, added_by) VALUES (_case, _user, c.organization_id, auth.uid())
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.case_watchers WHERE case_id = _case AND user_id = _user;
  END IF;
  PERFORM public.rg_audit(CASE WHEN _watch THEN 'case.watch' ELSE 'case.unwatch' END, c.organization_id, NULL, 'case', _case::text, jsonb_build_object('user', _user));
END $$;

CREATE OR REPLACE FUNCTION public.rg_mark_notifications_read(_ids uuid[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL AND (_ids IS NULL OR id = ANY(_ids));
$$;

-- People in an org who hold a permission (org or team membership).
CREATE OR REPLACE FUNCTION public.rg_org_users_with(_org uuid, _perm text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u FROM (
    SELECT user_id u FROM public.organization_memberships WHERE organization_id = _org
    UNION SELECT user_id FROM public.team_memberships WHERE organization_id = _org
  ) x WHERE public.has_org_permission(u, _org, _perm);
$$;
REVOKE EXECUTE ON FUNCTION public.rg_org_users_with(uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rg_notify_case_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    AND public.has_org_permission(r, c.organization_id, 'cases.view');
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rg_notify_case_event() FROM public, anon, authenticated;
CREATE TRIGGER case_events_notify AFTER INSERT ON public.case_events FOR EACH ROW EXECUTE FUNCTION public.rg_notify_case_event();

REVOKE EXECUTE ON FUNCTION public.rg_set_case_watcher(uuid,uuid,boolean), public.rg_mark_notifications_read(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rg_set_case_watcher(uuid,uuid,boolean), public.rg_mark_notifications_read(uuid[]) TO authenticated;