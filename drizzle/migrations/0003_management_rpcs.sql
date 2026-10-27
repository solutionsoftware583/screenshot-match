-- Management write paths: SECURITY DEFINER functions that check the caller's permission,
-- perform the change and append an audit event in one transaction.

CREATE OR REPLACE FUNCTION public.rg_audit(_action text, _org uuid, _reseller uuid, _type text, _target text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_events(actor_id, organization_id, reseller_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _org, _reseller, _action, _type, _target, coalesce(_meta,'{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.rg_audit(text, uuid, uuid, text, text, jsonb) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rg_require(_ok boolean)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT coalesce(_ok, false) THEN RAISE EXCEPTION 'You do not have permission for this action' USING ERRCODE = '42501'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.rg_require(boolean) FROM public, anon;

-- ---------- Resellers ----------
CREATE OR REPLACE FUNCTION public.rg_create_reseller(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage'));
  INSERT INTO public.resellers(name, created_by) VALUES (trim(_name), auth.uid()) RETURNING id INTO _id;
  PERFORM public.rg_audit('reseller.create', NULL, _id, 'reseller', _id::text, jsonb_build_object('name', trim(_name)));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.rg_update_reseller(_id uuid, _name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage'));
  UPDATE public.resellers SET name = trim(_name), updated_at = now() WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reseller not found'; END IF;
  PERFORM public.rg_audit('reseller.update', NULL, _id, 'reseller', _id::text, jsonb_build_object('name', trim(_name)));
END $$;

CREATE OR REPLACE FUNCTION public.rg_delete_reseller(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage'));
  IF EXISTS (SELECT 1 FROM public.organizations WHERE reseller_id = _id) THEN
    RAISE EXCEPTION 'Move or remove this reseller''s organizations first';
  END IF;
  DELETE FROM public.reseller_memberships WHERE reseller_id = _id;
  UPDATE public.invitations SET revoked_at = now() WHERE reseller_id = _id AND accepted_at IS NULL AND revoked_at IS NULL;
  DELETE FROM public.resellers WHERE id = _id AND NOT EXISTS (SELECT 1 FROM public.invitations WHERE reseller_id = _id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reseller has invitation history and cannot be deleted';
  END IF;
  PERFORM public.rg_audit('reseller.delete', NULL, NULL, 'reseller', _id::text);
END $$;

-- ---------- Organizations ----------
CREATE OR REPLACE FUNCTION public.rg_create_org(_name text, _reseller uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  PERFORM public.rg_require(
    public.has_platform_permission(auth.uid(), 'resellers.manage')
    OR (_reseller IS NOT NULL AND EXISTS (SELECT 1 FROM public.reseller_memberships
        WHERE reseller_id = _reseller AND user_id = auth.uid() AND role_key = 'reseller_admin')));
  INSERT INTO public.organizations(name, reseller_id, created_by) VALUES (trim(_name), _reseller, auth.uid()) RETURNING id INTO _id;
  PERFORM public.rg_audit('org.create', _id, _reseller, 'organization', _id::text, jsonb_build_object('name', trim(_name)));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.rg_update_org(_id uuid, _name text, _geo boolean, _teams boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _id, 'org.manage'));
  UPDATE public.organizations SET name = trim(_name), geo_hierarchy_enabled = _geo, teams_enabled = _teams, updated_at = now() WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  PERFORM public.rg_audit('org.update', _id, NULL, 'organization', _id::text,
    jsonb_build_object('name', trim(_name), 'geo_hierarchy_enabled', _geo, 'teams_enabled', _teams));
END $$;

CREATE OR REPLACE FUNCTION public.rg_set_org_reseller(_id uuid, _reseller uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage'));
  DELETE FROM public.reseller_client_assignments WHERE organization_id = _id;
  UPDATE public.organizations SET reseller_id = _reseller, updated_at = now() WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  PERFORM public.rg_audit('org.set_reseller', _id, _reseller, 'organization', _id::text);
END $$;

CREATE OR REPLACE FUNCTION public.rg_delete_org(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage'));
  IF EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id = _id)
     OR EXISTS (SELECT 1 FROM public.teams WHERE organization_id = _id)
     OR EXISTS (SELECT 1 FROM public.geographic_scopes WHERE organization_id = _id)
     OR EXISTS (SELECT 1 FROM public.invitations WHERE organization_id = _id) THEN
    RAISE EXCEPTION 'Only empty organizations (no members, teams, regions or invitations) can be deleted';
  END IF;
  DELETE FROM public.reseller_client_assignments WHERE organization_id = _id;
  DELETE FROM public.organizations WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  PERFORM public.rg_audit('org.delete', NULL, NULL, 'organization', _id::text);
END $$;

-- Reseller staff assigned to client organizations
CREATE OR REPLACE FUNCTION public.rg_assign_reseller_staff(_org uuid, _user uuid, _assign boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _reseller uuid;
BEGIN
  SELECT reseller_id INTO _reseller FROM public.organizations WHERE id = _org;
  IF _reseller IS NULL THEN RAISE EXCEPTION 'Organization has no reseller'; END IF;
  PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage')
    OR EXISTS (SELECT 1 FROM public.reseller_memberships WHERE reseller_id = _reseller AND user_id = auth.uid() AND role_key = 'reseller_admin'));
  IF NOT EXISTS (SELECT 1 FROM public.reseller_memberships WHERE reseller_id = _reseller AND user_id = _user) THEN
    RAISE EXCEPTION 'User is not a member of this reseller';
  END IF;
  IF _assign THEN
    INSERT INTO public.reseller_client_assignments(reseller_id, organization_id, user_id) VALUES (_reseller, _org, _user) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.reseller_client_assignments WHERE organization_id = _org AND user_id = _user;
  END IF;
  PERFORM public.rg_audit(CASE WHEN _assign THEN 'reseller.assign_staff' ELSE 'reseller.unassign_staff' END, _org, _reseller, 'user', _user::text);
END $$;

-- ---------- Geographic scopes ----------
CREATE OR REPLACE FUNCTION public.rg_create_geo(_org uuid, _parent uuid, _level text, _name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _plevel text; _order text[] := ARRAY['country','state','division','district'];
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'geo.manage'));
  IF NOT (SELECT geo_hierarchy_enabled FROM public.organizations WHERE id = _org) THEN
    RAISE EXCEPTION 'Enable the geographic hierarchy in organization settings first';
  END IF;
  IF _parent IS NULL THEN
    IF _level <> 'country' THEN RAISE EXCEPTION 'Top-level regions must be countries'; END IF;
  ELSE
    SELECT level INTO _plevel FROM public.geographic_scopes WHERE id = _parent AND organization_id = _org;
    IF _plevel IS NULL THEN RAISE EXCEPTION 'Parent region not found in this organization'; END IF;
    IF array_position(_order, _level) IS DISTINCT FROM array_position(_order, _plevel) + 1 THEN
      RAISE EXCEPTION 'A % must sit directly under a %', _level, _order[array_position(_order, _level) - 1];
    END IF;
  END IF;
  INSERT INTO public.geographic_scopes(organization_id, parent_id, level, name) VALUES (_org, _parent, _level, trim(_name)) RETURNING id INTO _id;
  PERFORM public.rg_audit('geo.create', _org, NULL, 'geographic_scope', _id::text, jsonb_build_object('level', _level, 'name', trim(_name)));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.rg_rename_geo(_id uuid, _name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.geographic_scopes WHERE id = _id;
  PERFORM public.rg_require(_org IS NOT NULL AND public.has_org_permission(auth.uid(), _org, 'geo.manage'));
  UPDATE public.geographic_scopes SET name = trim(_name) WHERE id = _id;
  PERFORM public.rg_audit('geo.rename', _org, NULL, 'geographic_scope', _id::text, jsonb_build_object('name', trim(_name)));
END $$;

CREATE OR REPLACE FUNCTION public.rg_delete_geo(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.geographic_scopes WHERE id = _id;
  PERFORM public.rg_require(_org IS NOT NULL AND public.has_org_permission(auth.uid(), _org, 'geo.manage'));
  IF EXISTS (SELECT 1 FROM public.geographic_scopes WHERE parent_id = _id) THEN RAISE EXCEPTION 'Remove the sub-regions first'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_memberships WHERE geographic_scope_id = _id)
     OR EXISTS (SELECT 1 FROM public.teams WHERE geographic_scope_id = _id) THEN
    RAISE EXCEPTION 'Region is still assigned to managers or teams';
  END IF;
  DELETE FROM public.geographic_scopes WHERE id = _id;
  PERFORM public.rg_audit('geo.delete', _org, NULL, 'geographic_scope', _id::text);
END $$;

-- ---------- Teams ----------
CREATE OR REPLACE FUNCTION public.rg_save_team(_org uuid, _id uuid, _name text, _geo uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid uuid := _id;
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'teams.manage'));
  IF NOT (SELECT teams_enabled FROM public.organizations WHERE id = _org) THEN RAISE EXCEPTION 'Teams are disabled for this organization'; END IF;
  IF _geo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.geographic_scopes WHERE id = _geo AND organization_id = _org) THEN
    RAISE EXCEPTION 'Region not found in this organization';
  END IF;
  IF _tid IS NULL THEN
    INSERT INTO public.teams(organization_id, name, geographic_scope_id) VALUES (_org, trim(_name), _geo) RETURNING id INTO _tid;
    PERFORM public.rg_audit('team.create', _org, NULL, 'team', _tid::text, jsonb_build_object('name', trim(_name)));
  ELSE
    UPDATE public.teams SET name = trim(_name), geographic_scope_id = _geo WHERE id = _tid AND organization_id = _org;
    IF NOT FOUND THEN RAISE EXCEPTION 'Team not found'; END IF;
    PERFORM public.rg_audit('team.update', _org, NULL, 'team', _tid::text, jsonb_build_object('name', trim(_name)));
  END IF;
  RETURN _tid;
END $$;

CREATE OR REPLACE FUNCTION public.rg_delete_team(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.teams WHERE id = _id;
  PERFORM public.rg_require(_org IS NOT NULL AND public.has_org_permission(auth.uid(), _org, 'teams.manage'));
  IF EXISTS (SELECT 1 FROM public.invitations WHERE team_id = _id) THEN
    UPDATE public.invitations SET revoked_at = now() WHERE team_id = _id AND accepted_at IS NULL AND revoked_at IS NULL;
    RAISE EXCEPTION 'Team has invitation history; remove its members instead of deleting it';
  END IF;
  DELETE FROM public.team_memberships WHERE team_id = _id;
  DELETE FROM public.teams WHERE id = _id;
  PERFORM public.rg_audit('team.delete', _org, NULL, 'team', _id::text);
END $$;

CREATE OR REPLACE FUNCTION public.rg_set_team_member(_team uuid, _user uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.teams WHERE id = _team;
  PERFORM public.rg_require(_org IS NOT NULL AND public.has_org_permission(auth.uid(), _org, 'teams.manage'));
  IF _user = auth.uid() AND NOT public.has_org_permission(auth.uid(), _org, 'roles.assign') THEN
    RAISE EXCEPTION 'You cannot change your own team role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id = _org AND user_id = _user)
     AND NOT EXISTS (SELECT 1 FROM public.team_memberships WHERE organization_id = _org AND user_id = _user) THEN
    RAISE EXCEPTION 'Add this person to the organization first (invite them)';
  END IF;
  INSERT INTO public.team_memberships(team_id, organization_id, user_id, role_key) VALUES (_team, _org, _user, _role)
  ON CONFLICT (team_id, user_id) DO UPDATE SET role_key = EXCLUDED.role_key;
  PERFORM public.rg_audit('team.set_member', _org, NULL, 'user', _user::text, jsonb_build_object('team_id', _team, 'role', _role));
END $$;

CREATE OR REPLACE FUNCTION public.rg_remove_team_member(_team uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.teams WHERE id = _team;
  PERFORM public.rg_require(_org IS NOT NULL AND public.has_org_permission(auth.uid(), _org, 'teams.manage'));
  DELETE FROM public.team_memberships WHERE team_id = _team AND user_id = _user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a member of this team'; END IF;
  PERFORM public.rg_audit('team.remove_member', _org, NULL, 'user', _user::text, jsonb_build_object('team_id', _team));
END $$;

-- ---------- Organization roles ----------
CREATE OR REPLACE FUNCTION public.rg_set_org_role(_org uuid, _user uuid, _role text, _geo uuid, _remove boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _need text;
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'roles.assign'));
  IF _user = auth.uid() AND NOT public.has_platform_permission(auth.uid(), 'platform.configure') THEN
    RAISE EXCEPTION 'You cannot change your own roles';
  END IF;
  IF _remove THEN
    DELETE FROM public.organization_memberships WHERE organization_id = _org AND user_id = _user AND role_key = _role;
    IF NOT FOUND THEN RAISE EXCEPTION 'Role assignment not found'; END IF;
    PERFORM public.rg_audit('role.revoke', _org, NULL, 'user', _user::text, jsonb_build_object('role', _role));
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id = _org AND user_id = _user)
     AND NOT EXISTS (SELECT 1 FROM public.team_memberships WHERE organization_id = _org AND user_id = _user) THEN
    RAISE EXCEPTION 'Add this person to the organization first (invite them)';
  END IF;
  _need := CASE _role WHEN 'country_manager' THEN 'country' WHEN 'state_manager' THEN 'state'
    WHEN 'divisional_manager' THEN 'division' WHEN 'district_manager' THEN 'district' END;
  IF _need IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.geographic_scopes WHERE id = _geo AND organization_id = _org AND level = _need) THEN
      RAISE EXCEPTION 'Choose a % region for this role', _need;
    END IF;
  ELSE
    _geo := NULL;
  END IF;
  INSERT INTO public.organization_memberships(organization_id, user_id, role_key, geographic_scope_id) VALUES (_org, _user, _role, _geo)
  ON CONFLICT (organization_id, user_id, role_key) DO UPDATE SET geographic_scope_id = EXCLUDED.geographic_scope_id;
  PERFORM public.rg_audit('role.assign', _org, NULL, 'user', _user::text, jsonb_build_object('role', _role, 'geographic_scope_id', _geo));
END $$;

CREATE OR REPLACE FUNCTION public.rg_remove_member(_org uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'roles.assign'));
  IF _user = auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  DELETE FROM public.team_memberships WHERE organization_id = _org AND user_id = _user;
  DELETE FROM public.organization_memberships WHERE organization_id = _org AND user_id = _user;
  DELETE FROM public.reseller_client_assignments WHERE organization_id = _org AND user_id = _user;
  PERFORM public.rg_audit('member.remove', _org, NULL, 'user', _user::text);
END $$;

-- Platform roles (Super Admin, Global Manager, Auditor) — Super Admin only
CREATE OR REPLACE FUNCTION public.rg_set_platform_role(_email text, _role text, _remove boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid;
BEGIN
  PERFORM public.rg_require(public.has_platform_role(auth.uid(), 'super_admin'));
  SELECT id INTO _user FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _user IS NULL THEN RAISE EXCEPTION 'No account exists with that email'; END IF;
  IF _user = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own platform roles'; END IF;
  IF _remove THEN
    DELETE FROM public.user_roles WHERE user_id = _user AND role_key = _role;
    IF NOT FOUND THEN RAISE EXCEPTION 'Role assignment not found'; END IF;
  ELSE
    INSERT INTO public.user_roles(user_id, role_key, granted_by) VALUES (_user, _role, auth.uid()) ON CONFLICT DO NOTHING;
  END IF;
  PERFORM public.rg_audit(CASE WHEN _remove THEN 'platform_role.revoke' ELSE 'platform_role.grant' END, NULL, NULL, 'user', _user::text, jsonb_build_object('role', _role));
END $$;

-- ---------- Invitations ----------
CREATE OR REPLACE FUNCTION public.rg_create_invitation(_org uuid, _reseller uuid, _team uuid, _email text, _role text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _token text := encode(extensions.gen_random_bytes(24), 'hex'); _scope text; _id uuid; _email_n text := lower(trim(_email));
BEGIN
  IF _email_n !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
  SELECT scope INTO _scope FROM public.role_definitions WHERE key = _role;
  IF _org IS NOT NULL THEN
    PERFORM public.rg_require(public.has_org_permission(auth.uid(), _org, 'members.invite'));
    IF _scope NOT IN ('organization','team') THEN RAISE EXCEPTION 'Choose an organization or team role'; END IF;
    IF _role IN ('org_admin') AND NOT public.has_org_permission(auth.uid(), _org, 'roles.assign') THEN
      RAISE EXCEPTION 'Only people who can assign roles may invite administrators';
    END IF;
    IF _scope = 'team' AND (_team IS NULL OR NOT EXISTS (SELECT 1 FROM public.teams WHERE id = _team AND organization_id = _org)) THEN
      RAISE EXCEPTION 'Choose a team for a team role';
    END IF;
    IF _scope = 'organization' THEN _team := NULL; END IF;
    _reseller := NULL;
  ELSIF _reseller IS NOT NULL THEN
    PERFORM public.rg_require(public.has_platform_permission(auth.uid(), 'resellers.manage'));
    IF _scope <> 'reseller' THEN RAISE EXCEPTION 'Choose a reseller role'; END IF;
    _team := NULL;
  ELSE
    RAISE EXCEPTION 'Choose an organization or reseller';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invitations WHERE lower(email) = _email_n AND role_key = _role
             AND organization_id IS NOT DISTINCT FROM _org AND reseller_id IS NOT DISTINCT FROM _reseller
             AND team_id IS NOT DISTINCT FROM _team
             AND accepted_at IS NULL AND revoked_at IS NULL AND rejected_at IS NULL AND expires_at > now()) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email and role';
  END IF;
  INSERT INTO public.invitations(organization_id, reseller_id, team_id, email, role_key, token_hash, expires_at, invited_by)
  VALUES (_org, _reseller, _team, _email_n, _role, encode(extensions.digest(_token, 'sha256'), 'hex'), now() + interval '7 days', auth.uid())
  RETURNING id INTO _id;
  PERFORM public.rg_audit('invitation.create', _org, _reseller, 'invitation', _id::text, jsonb_build_object('email', _email_n, 'role', _role, 'team_id', _team));
  RETURN _token;
END $$;

CREATE OR REPLACE FUNCTION public.rg_revoke_invitation(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.invitations;
BEGIN
  SELECT * INTO i FROM public.invitations WHERE id = _id;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  PERFORM public.rg_require(CASE WHEN i.organization_id IS NOT NULL
    THEN public.has_org_permission(auth.uid(), i.organization_id, 'members.invite')
    ELSE public.has_platform_permission(auth.uid(), 'resellers.manage') END);
  IF i.accepted_at IS NOT NULL OR i.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation is no longer pending'; END IF;
  UPDATE public.invitations SET revoked_at = now() WHERE id = _id;
  PERFORM public.rg_audit('invitation.revoke', i.organization_id, i.reseller_id, 'invitation', _id::text);
END $$;

-- Invitee view of an invitation by its secret token (no permission needed beyond holding the token + matching email)
CREATE OR REPLACE FUNCTION public.rg_invitation_by_token(_token text)
RETURNS TABLE(id uuid, email text, role_name text, org_name text, reseller_name text, team_name text, status text, email_matches boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.email, r.name, o.name, rs.name, t.name,
    CASE WHEN i.accepted_at IS NOT NULL THEN 'accepted' WHEN i.revoked_at IS NOT NULL THEN 'revoked'
         WHEN i.rejected_at IS NOT NULL THEN 'declined' WHEN i.expires_at <= now() THEN 'expired' ELSE 'pending' END,
    lower(i.email) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
  FROM public.invitations i
  JOIN public.role_definitions r ON r.key = i.role_key
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  LEFT JOIN public.resellers rs ON rs.id = i.reseller_id
  LEFT JOIN public.teams t ON t.id = i.team_id
  WHERE auth.uid() IS NOT NULL AND i.token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.rg_respond_invitation(_token text, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.invitations; _email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO i FROM public.invitations WHERE token_hash = encode(extensions.digest(_token, 'sha256'), 'hex') FOR UPDATE;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF lower(_email) <> lower(i.email) THEN RAISE EXCEPTION 'This invitation was sent to a different email address'; END IF;
  IF i.accepted_at IS NOT NULL OR i.revoked_at IS NOT NULL OR i.rejected_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation is no longer pending'; END IF;
  IF i.expires_at <= now() THEN RAISE EXCEPTION 'Invitation has expired'; END IF;
  IF NOT _accept THEN
    UPDATE public.invitations SET rejected_at = now() WHERE id = i.id;
    PERFORM public.rg_audit('invitation.decline', i.organization_id, i.reseller_id, 'invitation', i.id::text);
    RETURN;
  END IF;
  IF i.team_id IS NOT NULL THEN
    INSERT INTO public.team_memberships(team_id, organization_id, user_id, role_key) VALUES (i.team_id, i.organization_id, auth.uid(), i.role_key)
    ON CONFLICT (team_id, user_id) DO UPDATE SET role_key = EXCLUDED.role_key;
  ELSIF i.organization_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships(organization_id, user_id, role_key) VALUES (i.organization_id, auth.uid(), i.role_key) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.reseller_memberships(reseller_id, user_id, role_key) VALUES (i.reseller_id, auth.uid(), i.role_key)
    ON CONFLICT (reseller_id, user_id) DO UPDATE SET role_key = EXCLUDED.role_key;
  END IF;
  UPDATE public.invitations SET accepted_at = now() WHERE id = i.id;
  PERFORM public.rg_audit('invitation.accept', i.organization_id, i.reseller_id, 'invitation', i.id::text);
END $$;

-- ---------- Directory reads (names/emails are not otherwise visible across users) ----------
CREATE OR REPLACE FUNCTION public.rg_org_people(_org uuid)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, p.full_name FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_org_permission(auth.uid(), _org, 'members.view')
    AND (EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id = _org AND m.user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.team_memberships t WHERE t.organization_id = _org AND t.user_id = u.id))
$$;

CREATE OR REPLACE FUNCTION public.rg_reseller_people(_reseller uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, role_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, p.full_name, m.role_key FROM public.reseller_memberships m
  JOIN auth.users u ON u.id = m.user_id LEFT JOIN public.profiles p ON p.id = u.id
  WHERE m.reseller_id = _reseller AND public.can_access_reseller(auth.uid(), _reseller)
$$;

CREATE OR REPLACE FUNCTION public.rg_platform_people()
RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamptz, platform_roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, p.full_name, u.created_at,
    coalesce(array_agg(ur.role_key) FILTER (WHERE ur.role_key IS NOT NULL), '{}')
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.has_platform_permission(auth.uid(), 'platform.view_all')
  GROUP BY u.id, u.email, p.full_name, u.created_at
$$;

CREATE OR REPLACE FUNCTION public.rg_my_access()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'platform_roles', coalesce((SELECT jsonb_agg(role_key) FROM public.user_roles WHERE user_id = auth.uid()), '[]'::jsonb),
    'can_manage_resellers', public.has_platform_permission(auth.uid(), 'resellers.manage'),
    'can_view_platform', public.has_platform_permission(auth.uid(), 'platform.view_all'),
    'is_super_admin', public.has_platform_role(auth.uid(), 'super_admin'),
    'reseller_admin_of', coalesce((SELECT jsonb_agg(reseller_id) FROM public.reseller_memberships WHERE user_id = auth.uid() AND role_key = 'reseller_admin'), '[]'::jsonb))
$$;

CREATE OR REPLACE FUNCTION public.rg_org_permissions(_org uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(p.key), '{}') FROM public.permissions p WHERE public.has_org_permission(auth.uid(), _org, p.key)
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'rg_create_reseller(text)','rg_update_reseller(uuid,text)','rg_delete_reseller(uuid)',
    'rg_create_org(text,uuid)','rg_update_org(uuid,text,boolean,boolean)','rg_set_org_reseller(uuid,uuid)','rg_delete_org(uuid)',
    'rg_assign_reseller_staff(uuid,uuid,boolean)','rg_create_geo(uuid,uuid,text,text)','rg_rename_geo(uuid,text)','rg_delete_geo(uuid)',
    'rg_save_team(uuid,uuid,text,uuid)','rg_delete_team(uuid)','rg_set_team_member(uuid,uuid,text)','rg_remove_team_member(uuid,uuid)',
    'rg_set_org_role(uuid,uuid,text,uuid,boolean)','rg_remove_member(uuid,uuid)','rg_set_platform_role(text,text,boolean)',
    'rg_create_invitation(uuid,uuid,uuid,text,text)','rg_revoke_invitation(uuid)','rg_invitation_by_token(text)','rg_respond_invitation(text,boolean)',
    'rg_org_people(uuid)','rg_reseller_people(uuid)','rg_platform_people()','rg_my_access()','rg_org_permissions(uuid)']
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM public, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;