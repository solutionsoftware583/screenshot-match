-- Management workflow check: exercises the rg_* write functions as different
-- users and ALWAYS raises at the end so every record is rolled back.
-- Expected output: ERROR: MANAGEMENT_RESULT:ALL_PASSED
DO $$
DECLARE
  sa uuid := gen_random_uuid(); radm uuid := gen_random_uuid(); oadm uuid := gen_random_uuid();
  lead uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  r uuid; o1 uuid; o2 uuid; t uuid; c uuid; s uuid; tok text; n int; fails text := '';
BEGIN
  INSERT INTO auth.users(id, email, aud, role) VALUES
    (sa,'t-sa@test.invalid','authenticated','authenticated'), (radm,'t-radm@test.invalid','authenticated','authenticated'),
    (oadm,'t-oadm@test.invalid','authenticated','authenticated'), (lead,'t-lead@test.invalid','authenticated','authenticated'),
    (outsider,'t-out@test.invalid','authenticated','authenticated');
  INSERT INTO user_roles(user_id, role_key) VALUES (sa,'super_admin');

  -- Super admin: reseller + orgs
  PERFORM set_config('request.jwt.claims', json_build_object('sub', sa, 'role','authenticated')::text, true);
  r := rg_create_reseller('T Reseller');
  o1 := rg_create_org('T Org 1', r);
  o2 := rg_create_org('T Org 2', NULL);
  tok := rg_create_invitation(NULL, r, NULL, 't-radm@test.invalid', 'reseller_admin');
  PERFORM rg_update_org(o1, 'T Org 1', true, true);

  -- Reseller admin accepts, sees own client org but not the direct org
  PERFORM set_config('request.jwt.claims', json_build_object('sub', radm)::text, true);
  PERFORM rg_respond_invitation(tok, true);
  IF NOT can_access_org(radm, o1) OR can_access_org(radm, o2) THEN fails := fails || ' reseller_scope;'; END IF;
  tok := rg_create_invitation(o1, NULL, NULL, 't-oadm@test.invalid', 'org_admin');
  BEGIN PERFORM rg_create_reseller('nope'); fails := fails || ' radm_creates_reseller;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM rg_update_org(o2, 'hack', false, false); fails := fails || ' radm_cross_org;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Wrong person cannot accept someone else's invitation
  PERFORM set_config('request.jwt.claims', json_build_object('sub', outsider)::text, true);
  BEGIN PERFORM rg_respond_invitation(tok, true); fails := fails || ' wrong_email_accept;'; EXCEPTION WHEN raise_exception THEN NULL; END;

  -- Org admin: geography, team, roles
  PERFORM set_config('request.jwt.claims', json_build_object('sub', oadm)::text, true);
  PERFORM rg_respond_invitation(tok, true);
  c := rg_create_geo(o1, NULL, 'country', 'T Country');
  s := rg_create_geo(o1, c, 'state', 'T State');
  BEGIN PERFORM rg_create_geo(o1, c, 'district', 'skip'); fails := fails || ' geo_level_order;'; EXCEPTION WHEN raise_exception THEN NULL; END;
  t := rg_save_team(o1, NULL, 'T Team', s);
  tok := rg_create_invitation(o1, NULL, t, 't-lead@test.invalid', 'team_leader');
  BEGIN PERFORM rg_set_org_role(o1, oadm, 'org_auditor', NULL, false); fails := fails || ' self_role_change;'; EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN PERFORM rg_save_team(o2, NULL, 'x', NULL); fails := fails || ' oadm_cross_org;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Team leader joins; cannot manage teams or invite
  PERFORM set_config('request.jwt.claims', json_build_object('sub', lead)::text, true);
  PERFORM rg_respond_invitation(tok, true);
  SELECT count(*) INTO n FROM team_memberships WHERE team_id = t AND user_id = lead AND role_key = 'team_leader';
  IF n <> 1 THEN fails := fails || ' team_invite_accept;'; END IF;
  BEGIN PERFORM rg_save_team(o1, NULL, 'x', NULL); fails := fails || ' leader_manages_teams;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM rg_create_invitation(o1, NULL, NULL, 'x@test.invalid', 'org_admin'); fails := fails || ' leader_invites;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Org admin assigns a state manager (needs a state-level region) and removes the leader
  PERFORM set_config('request.jwt.claims', json_build_object('sub', oadm)::text, true);
  BEGIN PERFORM rg_set_org_role(o1, lead, 'state_manager', c, false); fails := fails || ' geo_role_level;'; EXCEPTION WHEN raise_exception THEN NULL; END;
  PERFORM rg_set_org_role(o1, lead, 'state_manager', s, false);
  SELECT count(*) INTO n FROM rg_org_people(o1);
  IF n <> 3 THEN fails := fails || ' people_count=' || n || ';'; END IF;
  PERFORM rg_remove_member(o1, lead);
  IF has_org_permission(lead, o1, 'org.view') THEN fails := fails || ' remove_member;'; END IF;
  PERFORM rg_delete_team(t);

  -- Outsider sees nothing
  IF can_access_org(outsider, o1) OR can_access_reseller(outsider, r) THEN fails := fails || ' outsider;'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', outsider)::text, true);
  SELECT count(*) INTO n FROM rg_org_people(o1);
  IF n <> 0 THEN fails := fails || ' outsider_people;'; END IF;

  SELECT count(*) INTO n FROM audit_events WHERE organization_id = o1;
  IF n < 8 THEN fails := fails || ' audit_count=' || n || ';'; END IF;

  RAISE EXCEPTION 'MANAGEMENT_RESULT:%', CASE WHEN fails = '' THEN 'ALL_PASSED' ELSE fails END;
END $$;
