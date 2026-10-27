-- Tenant-isolation check. Creates temporary records, asserts access rules,
-- then ALWAYS raises to roll everything back. Expected output:
--   ERROR: ISOLATION_RESULT:ALL_PASSED
-- Any other suffix lists the failed checks.
DO $$
DECLARE
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); o3 uuid := gen_random_uuid();
  admin1 uuid := gen_random_uuid(); staff1 uuid := gen_random_uuid(); orgadm2 uuid := gen_random_uuid();
  member2 uuid := gen_random_uuid(); stranger uuid := gen_random_uuid(); t2 uuid := gen_random_uuid();
  fails text := '';
BEGIN
  INSERT INTO resellers(id,name) VALUES (r1,'TEST-R1'),(r2,'TEST-R2');
  INSERT INTO organizations(id,name,reseller_id) VALUES (o1,'TEST-O1',r1),(o2,'TEST-O2',r1),(o3,'TEST-O3',r2);
  INSERT INTO reseller_memberships(reseller_id,user_id,role_key) VALUES (r1,admin1,'reseller_admin'),(r1,staff1,'reseller_staff');
  INSERT INTO reseller_client_assignments(reseller_id,organization_id,user_id) VALUES (r1,o1,staff1);
  INSERT INTO organization_memberships(organization_id,user_id,role_key) VALUES (o2,orgadm2,'org_admin');
  INSERT INTO teams(id,organization_id,name) VALUES (t2,o2,'TEST-T');
  INSERT INTO team_memberships(team_id,organization_id,user_id,role_key) VALUES (t2,o2,member2,'team_member');

  IF NOT has_org_permission(admin1,o1,'org.view') OR NOT has_org_permission(admin1,o2,'org.view') THEN fails := fails||' reseller_admin_own;'; END IF;
  IF has_org_permission(admin1,o3,'org.view') THEN fails := fails||' reseller_admin_cross;'; END IF;
  IF NOT has_org_permission(staff1,o1,'cases.view') THEN fails := fails||' staff_assigned;'; END IF;
  IF has_org_permission(staff1,o2,'org.view') THEN fails := fails||' staff_unassigned;'; END IF;
  IF has_org_permission(orgadm2,o1,'org.view') THEN fails := fails||' orgadmin_cross;'; END IF;
  IF has_org_permission(member2,o2,'cases.approve') OR has_org_permission(member2,o2,'members.invite') THEN fails := fails||' member_escalation;'; END IF;
  IF has_org_permission(stranger,o1,'org.view') OR has_org_permission(NULL,o1,'org.view') THEN fails := fails||' stranger;'; END IF;
  BEGIN
    INSERT INTO organization_memberships(organization_id,user_id,role_key) VALUES (o1,stranger,'super_admin');
    fails := fails||' scope_trigger;';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    INSERT INTO team_memberships(team_id,organization_id,user_id,role_key) VALUES (t2,o1,stranger,'team_member');
    fails := fails||' team_org_trigger;';
  EXCEPTION WHEN raise_exception THEN NULL; END;

  RAISE EXCEPTION 'ISOLATION_RESULT:%', CASE WHEN fails = '' THEN 'ALL_PASSED' ELSE fails END;
END $$;
