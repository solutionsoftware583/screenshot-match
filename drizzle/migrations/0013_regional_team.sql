CREATE OR REPLACE FUNCTION public.rg_manages_geo(_uid uuid, _org uuid, _geo uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _geo IS NOT NULL AND (
    public.has_org_permission(_uid, _org, 'roles.assign')
    OR (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id=_uid AND organization_id=_org
          AND role_key IN ('country_manager','state_manager','divisional_manager','district_manager'))
        AND _geo IN (SELECT public.rg_user_geo_ids(_uid, _org)))
  )
$$;

CREATE OR REPLACE FUNCTION public.rg_regional_team(_org uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, role_key text, geographic_scope_id uuid, region_name text, region_level text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'members.view'));
  RETURN QUERY
  SELECT m.user_id, u.email::text, p.full_name, m.role_key, m.geographic_scope_id, g.name, g.level
  FROM organization_memberships m
  JOIN geographic_scopes g ON g.id = m.geographic_scope_id
  JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.organization_id = _org AND m.user_id <> auth.uid()
    AND public.rg_manages_geo(auth.uid(), _org, m.geographic_scope_id)
  ORDER BY g.level, g.name, u.email;
END $$;

CREATE OR REPLACE FUNCTION public.rg_set_regional_member(_org uuid, _user uuid, _role text, _geo uuid, _remove boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _need text; _admin boolean;
BEGIN
  IF _user = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own roles'; END IF;
  PERFORM public.rg_require(public.rg_manages_geo(auth.uid(), _org, _geo));
  _admin := public.has_org_permission(auth.uid(), _org, 'roles.assign');
  IF _role NOT IN ('regional_member','country_manager','state_manager','divisional_manager','district_manager') THEN
    RAISE EXCEPTION 'That role cannot be assigned to a regional team';
  END IF;
  -- Managers may only assign below their own assigned region (no peers or superiors)
  IF NOT _admin AND _role <> 'regional_member' AND EXISTS (
     SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = _org AND geographic_scope_id = _geo) THEN
    RAISE EXCEPTION 'You can only assign managers to regions below your own';
  END IF;
  IF _remove THEN
    DELETE FROM organization_memberships WHERE organization_id=_org AND user_id=_user AND role_key=_role AND geographic_scope_id=_geo;
    IF NOT FOUND THEN RAISE EXCEPTION 'Role assignment not found'; END IF;
    PERFORM public.rg_audit('regional.revoke', _org, NULL, 'user', _user::text, jsonb_build_object('role',_role,'geographic_scope_id',_geo));
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organization_memberships WHERE organization_id=_org AND user_id=_user)
     AND NOT EXISTS (SELECT 1 FROM team_memberships WHERE organization_id=_org AND user_id=_user) THEN
    RAISE EXCEPTION 'Add this person to the organization first (invite them)';
  END IF;
  IF NOT _admin AND EXISTS (SELECT 1 FROM organization_memberships m WHERE m.organization_id=_org AND m.user_id=_user
       AND (m.geographic_scope_id IS NULL OR NOT public.rg_manages_geo(auth.uid(), _org, m.geographic_scope_id))) THEN
    RAISE EXCEPTION 'This person has roles outside your region; ask an organization admin';
  END IF;
  _need := CASE _role WHEN 'country_manager' THEN 'country' WHEN 'state_manager' THEN 'state'
    WHEN 'divisional_manager' THEN 'division' WHEN 'district_manager' THEN 'district' END;
  IF NOT EXISTS (SELECT 1 FROM geographic_scopes WHERE id=_geo AND organization_id=_org AND (_need IS NULL OR level=_need)) THEN
    RAISE EXCEPTION 'Choose a % region for this role', coalesce(_need,'valid');
  END IF;
  INSERT INTO organization_memberships(organization_id, user_id, role_key, geographic_scope_id) VALUES (_org,_user,_role,_geo)
  ON CONFLICT (organization_id, user_id, role_key) DO UPDATE SET geographic_scope_id = EXCLUDED.geographic_scope_id;
  PERFORM public.rg_audit('regional.assign', _org, NULL, 'user', _user::text, jsonb_build_object('role',_role,'geographic_scope_id',_geo));
END $$;

REVOKE ALL ON FUNCTION public.rg_regional_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rg_set_regional_member(uuid,uuid,text,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rg_regional_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rg_set_regional_member(uuid,uuid,text,uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rg_manages_geo(uuid,uuid,uuid) TO authenticated;