import { describe, expect, it } from "vitest";
import { primaryRole } from "./dashboard";
import { validateProfileInput } from "./workspace.functions";

describe("dashboard role selection", () => {
  it("super admin wins over org roles", () => expect(primaryRole(["team_member", "super_admin"])).toBe("super_admin"));
  it("org admin outranks district manager", () => expect(primaryRole(["district_manager", "org_admin"])).toBe("org_admin"));
  it("no roles gives the welcome dashboard", () => expect(primaryRole([])).toBe("none"));
});

describe("profile validation", () => {
  it("rejects a 1-character name", () => expect(() => validateProfileInput({ full_name: "A" })).toThrow());
  it("rejects names over 100 characters", () => expect(() => validateProfileInput({ full_name: "a".repeat(101) })).toThrow());
  it("only returns name and organization, never roles", () =>
    expect(validateProfileInput({ full_name: " Zed ", organization: "", role_key: "super_admin" } as never)).toEqual({ full_name: "Zed", organization: null }));
});
