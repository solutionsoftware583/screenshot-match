CREATE OR REPLACE FUNCTION public.rg_delete_team(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _name text;
BEGIN
  SELECT organization_id, name INTO _org, _name FROM public.teams WHERE id = _id;
  PERFORM public.rg_require(_org IS NOT NULL AND public.has_org_permission(auth.uid(), _org, 'teams.manage'));
  UPDATE public.invitations SET revoked_at = now() WHERE team_id = _id AND accepted_at IS NULL AND revoked_at IS NULL AND rejected_at IS NULL;
  UPDATE public.invitations SET team_id = NULL WHERE team_id = _id;
  DELETE FROM public.team_memberships WHERE team_id = _id;
  DELETE FROM public.teams WHERE id = _id;
  PERFORM public.rg_audit('team.delete', _org, NULL, 'team', _id::text, jsonb_build_object('name', _name));
END $$;