// Removal case lifecycle. Approval state machine adapted from Tenex
// (supabase/migrations/003_workflows_schema.sql, MIT); submission/recurrence
// lifecycle ported from PrivacyScrub (models.py, reappearance.py, MIT).
// The database function rg_case_transition_perm enforces the same table.

export const CASE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "submitted",
  "removed",
  "declined",
  "appealed",
  "reappeared",
  "closed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Submitted",
  removed: "Removed",
  declined: "Declined by platform",
  appealed: "Appealed",
  reappeared: "Reappeared",
  closed: "Closed",
};

type Perm = "cases.edit" | "cases.approve";
const T: Record<string, Partial<Record<CaseStatus, Perm>>> = {
  draft: { pending_approval: "cases.edit", closed: "cases.edit" },
  rejected: { draft: "cases.edit", closed: "cases.edit" },
  pending_approval: { approved: "cases.approve", rejected: "cases.approve" },
  approved: { submitted: "cases.edit" },
  submitted: { removed: "cases.edit", declined: "cases.edit" },
  appealed: { removed: "cases.edit", declined: "cases.edit" },
  declined: { appealed: "cases.edit", closed: "cases.edit" },
  removed: { reappeared: "cases.edit", closed: "cases.edit" },
  reappeared: { draft: "cases.edit", closed: "cases.edit" },
  closed: {},
};

/** Permission needed to move a case, or null when the move is not allowed. */
export function transitionPermission(from: CaseStatus, to: CaseStatus): Perm | null {
  return T[from]?.[to] ?? null;
}

/** Next statuses the user can choose, given their permissions in the org. */
export function nextStatuses(from: CaseStatus, perms: readonly string[]): CaseStatus[] {
  return (Object.entries(T[from] ?? {}) as [CaseStatus, Perm][])
    .filter(([, p]) => perms.includes(p))
    .map(([s]) => s);
}

/**
 * Recheck due date for a removed case (PrivacyScrub get_due_optouts rule):
 * the window starts at the latest of removed_at / last_checked_at and lasts
 * recheck_days. 0 days = never rechecked. Returns null when not applicable.
 */
export function recheckDueAt(c: {
  status: string;
  recheck_days: number;
  removed_at: string | null;
  last_checked_at: string | null;
}): Date | null {
  if (c.status !== "removed" || c.recheck_days <= 0) return null;
  const anchors = [c.removed_at, c.last_checked_at]
    .filter((v): v is string => !!v)
    .map((v) => new Date(v).getTime())
    .filter((n) => !Number.isNaN(n));
  if (anchors.length === 0) return null;
  return new Date(Math.max(...anchors) + c.recheck_days * 86_400_000);
}

export function isRecheckDue(c: Parameters<typeof recheckDueAt>[0], now = new Date()) {
  const due = recheckDueAt(c);
  return due !== null && now.getTime() >= due.getTime();
}

/** SHA-256 hex of a file, computed in the browser before metadata is saved. */
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
