-- Removal case workflow check (rolled back). Expected: ERROR: CASES_RESULT:ALL_PASSED
DO $$
DECLARE
  sa uuid := gen_random_uuid(); oadm uuid := gen_random_uuid(); mem uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  o1 uuid; o2 uuid; c uuid; tm uuid; n int; fails text := '';
BEGIN
  INSERT INTO auth.users(id, email, aud, role) VALUES
    (sa,'c-sa@test.invalid','authenticated','authenticated'),(oadm,'c-oadm@test.invalid','authenticated','authenticated'),
    (mem,'c-mem@test.invalid','authenticated','authenticated'),(outsider,'c-out@test.invalid','authenticated','authenticated');
  INSERT INTO user_roles(user_id, role_key) VALUES (sa,'super_admin');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', sa)::text, true);
  o1 := rg_create_org('C Org 1', NULL); o2 := rg_create_org('C Org 2', NULL);
  INSERT INTO organization_memberships(organization_id,user_id,role_key) VALUES (o1,oadm,'org_admin'),(o2,outsider,'org_admin');
  tm := rg_save_team(o1, NULL, 'C Team', NULL);
  INSERT INTO team_memberships(team_id,organization_id,user_id,role_key) VALUES (tm,o1,mem,'team_member');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', mem)::text, true);
  c := rg_create_case(o1,'Fake review','Google','https://example.com/r','Posted by a non-customer, violates policy','normal',30);
  BEGIN PERFORM rg_transition_case(c,'pending_approval',NULL,NULL,NULL); fails := fails||' approval_without_evidence;'; EXCEPTION WHEN raise_exception THEN NULL; END;
  PERFORM rg_add_evidence(c,'Screenshot','screenshot',NULL,'a.png',10,repeat('a',64),NULL);
  PERFORM rg_transition_case(c,'pending_approval',NULL,NULL,NULL);
  BEGIN PERFORM rg_transition_case(c,'approved',NULL,NULL,NULL); fails := fails||' member_approves;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM rg_transition_case(c,'submitted',NULL,'x',NULL); fails := fails||' skip_approval;'; EXCEPTION WHEN raise_exception THEN NULL; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', outsider)::text, true);
  BEGIN PERFORM rg_transition_case(c,'approved',NULL,NULL,NULL); fails := fails||' cross_org_approve;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM rg_add_evidence(c,'x','note',NULL,NULL,NULL,NULL,NULL); fails := fails||' cross_org_evidence;'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', oadm)::text, true);
  PERFORM rg_transition_case(c,'approved','ok',NULL,NULL);
  PERFORM rg_transition_case(c,'submitted',NULL,'Google report form','T-1');
  PERFORM rg_transition_case(c,'declined',NULL,NULL,NULL);
  PERFORM rg_transition_case(c,'appealed',NULL,'Google appeal',NULL);
  PERFORM rg_transition_case(c,'removed',NULL,NULL,NULL);
  PERFORM rg_record_recheck(c,true,NULL);
  PERFORM rg_record_recheck(c,false,'Back online');
  IF (SELECT status FROM cases WHERE id=c) <> 'reappeared' THEN fails := fails||' recheck_reappear;'; END IF;
  -- Self-approval blocked
  c := rg_create_case(o1,'Own case','Yelp',NULL,'Own case needs another approver','low',0);
  PERFORM rg_add_evidence(c,'n','note',NULL,NULL,NULL,NULL,NULL);
  PERFORM rg_transition_case(c,'pending_approval',NULL,NULL,NULL);
  BEGIN PERFORM rg_transition_case(c,'approved',NULL,NULL,NULL); fails := fails||' self_approve;'; EXCEPTION WHEN raise_exception THEN NULL; END;
  SELECT count(*) INTO n FROM audit_events WHERE organization_id=o1 AND action LIKE 'case.%';
  IF n < 9 THEN fails := fails||' audit_count('||n||');'; END IF;
  -- RLS: outsider sees no cases of org 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', outsider, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM cases WHERE organization_id=o1;
  RESET ROLE;
  IF n <> 0 THEN fails := fails||' rls_leak;'; END IF;
  IF fails = '' THEN RAISE EXCEPTION 'CASES_RESULT:ALL_PASSED'; ELSE RAISE EXCEPTION 'CASES_RESULT:FAILED:%', fails; END IF;
END $$;
