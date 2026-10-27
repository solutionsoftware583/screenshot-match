import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES, roleHas } from "./rbac";

describe("role-permission matrix", () => {
  it("denies unknown roles and unknown permissions", () => {
    expect(roleHas("hacker", "org.view")).toBe(false);
    expect(roleHas("org_admin", "made.up")).toBe(false);
  });

  it("only references permissions that exist", () => {
    for (const r of Object.values(ROLES))
      for (const p of r.permissions) expect(PERMISSIONS).toHaveProperty(p);
  });

  it("keeps auditors read-only", () => {
    for (const role of ["auditor", "org_auditor"]) {
      for (const p of [
        "cases.edit",
        "cases.approve",
        "members.invite",
        "roles.assign",
        "org.manage",
        "billing.manage",
        "evidence.upload",
      ]) {
        expect(roleHas(role, p)).toBe(false);
      }
    }
  });

  it("limits role assignment to super admin, reseller admin and org admin", () => {
    const assigners = Object.keys(ROLES)
      .filter((r) => roleHas(r, "roles.assign"))
      .sort();
    expect(assigners).toEqual(["org_admin", "reseller_admin", "super_admin"]);
  });

  it("restricts client users to the portal", () => {
    expect(roleHas("client_user", "client_portal.view")).toBe(true);
    expect(roleHas("client_user", "cases.view")).toBe(false);
    expect(roleHas("client_user", "evidence.view")).toBe(false);
  });

  it("does not let team leaders or members approve requests", () => {
    expect(roleHas("team_leader", "cases.approve")).toBe(false);
    expect(roleHas("team_member", "cases.approve")).toBe(false);
    expect(roleHas("team_manager", "cases.approve")).toBe(true);
  });

  it("keeps platform-wide visibility off reseller and organization roles", () => {
    for (const [k, r] of Object.entries(ROLES)) {
      if (r.scope !== "platform") expect(roleHas(k, "platform.view_all")).toBe(false);
    }
  });
});
