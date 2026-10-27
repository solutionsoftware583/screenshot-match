import { describe, expect, it } from "vitest";
import { isRecheckDue, nextStatuses, recheckDueAt, sha256Hex, transitionPermission } from "./caseflow";

describe("case transitions", () => {
  it("only approvers can approve or reject", () => {
    expect(transitionPermission("pending_approval", "approved")).toBe("cases.approve");
    expect(nextStatuses("pending_approval", ["cases.edit"])).toEqual([]);
    expect(nextStatuses("pending_approval", ["cases.approve"]).sort()).toEqual(["approved", "rejected"]);
  });
  it("cannot submit before approval", () => {
    expect(transitionPermission("draft", "submitted")).toBeNull();
  });
  it("closed is final", () => {
    expect(nextStatuses("closed", ["cases.edit", "cases.approve"])).toEqual([]);
  });
});

describe("recheck window", () => {
  const base = { status: "removed", recheck_days: 30, removed_at: "2026-01-01T00:00:00Z", last_checked_at: null };
  it("is due 30 days after removal", () => {
    expect(recheckDueAt(base)?.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(isRecheckDue(base, new Date("2026-01-30T23:59:00Z"))).toBe(false);
    expect(isRecheckDue(base, new Date("2026-01-31T00:00:00Z"))).toBe(true);
  });
  it("a clean recheck restarts the window", () => {
    const c = { ...base, last_checked_at: "2026-02-10T00:00:00Z" };
    expect(isRecheckDue(c, new Date("2026-02-15T00:00:00Z"))).toBe(false);
  });
  it("0 days or non-removed cases are never due", () => {
    expect(recheckDueAt({ ...base, recheck_days: 0 })).toBeNull();
    expect(recheckDueAt({ ...base, status: "submitted" })).toBeNull();
  });
});

it("hashes evidence with SHA-256", async () => {
  const h = await sha256Hex(new TextEncoder().encode("abc").buffer as ArrayBuffer);
  expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
