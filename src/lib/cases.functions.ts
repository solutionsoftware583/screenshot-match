// Case server functions. Reads run as the caller (RLS); writes call rg_* SECURITY
// DEFINER functions that re-check permission and write audit_events.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CASE_STATUSES, type CaseStatus } from "./caseflow";

export interface CaseRow {
  id: string;
  organization_id: string;
  reference: string;
  title: string;
  platform: string;
  review_url: string | null;
  reason: string;
  priority: string;
  status: CaseStatus;
  recheck_days: number;
  removed_at: string | null;
  last_checked_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface EvidenceRow {
  id: string;
  title: string;
  kind: string;
  source_url: string | null;
  file_name: string | null;
  file_size: number | null;
  sha256: string | null;
  notes: string | null;
  captured_by: string;
  captured_at: string;
}
export interface CaseEventRow {
  id: string;
  kind: string;
  from_status: string | null;
  to_status: string | null;
  channel: string | null;
  external_ref: string | null;
  note: string | null;
  actor_id: string | null;
  at: string;
}

const uuid = (v: unknown) => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("Invalid id");
  return v;
};
const text = (v: unknown, label: string, min: number, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < min || s.length > max) throw new Error(`${label} must be ${min}–${max} characters`);
  return s;
};
const opt = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw new Error(`Text too long (max ${max})`);
  return s;
};
const url = (v: unknown) => {
  const s = opt(v, 2000);
  if (s && !/^https?:\/\//i.test(s)) throw new Error("Links must start with http:// or https://");
  return s;
};
const PRIORITIES = ["low", "normal", "high", "urgent"];

function caseInput(d: Record<string, unknown>) {
  const priority = String(d.priority ?? "normal");
  if (!PRIORITIES.includes(priority)) throw new Error("Invalid priority");
  const recheck = Number(d.recheckDays ?? 30);
  if (!Number.isInteger(recheck) || recheck < 0 || recheck > 365)
    throw new Error("Recheck days must be 0–365");
  return {
    _title: text(d.title, "Title", 3, 200),
    _platform: text(d.platform, "Platform", 2, 80),
    _url: url(d.reviewUrl),
    _reason: text(d.reason, "Reason", 10, 4000),
    _priority: priority,
    _recheck: recheck,
  };
}

export const listCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid(d.orgId) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cases")
      .select("*")
      .eq("organization_id", data.orgId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []) as CaseRow[];
  });

export const getCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const [c, ev, evts] = await Promise.all([
      s.from("cases").select("*").eq("id", data.id).maybeSingle(),
      s.from("case_evidence").select("*").eq("case_id", data.id).order("captured_at"),
      s.from("case_events").select("*").eq("case_id", data.id).order("at"),
    ]);
    if (c.error) throw new Error(c.error.message);
    if (!c.data) return null;
    const perms = await s.rpc("rg_org_permissions", { _org: c.data.organization_id });
    return {
      case: c.data as CaseRow,
      evidence: (ev.data ?? []) as EvidenceRow[],
      events: (evts.data ?? []) as CaseEventRow[],
      permissions: (perms.data ?? []) as string[],
      me: context.userId,
    };
  });

export const createCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({ _org: uuid(d.orgId), ...caseInput(d) }))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("rg_create_case", data);
    if (error) throw new Error(error.message);
    return id as string;
  });

export const updateCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({ _id: uuid(d.id), ...caseInput(d) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_update_case", data);
    if (error) throw new Error(error.message);
  });

export const transitionCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const to = String(d.to);
    if (!(CASE_STATUSES as readonly string[]).includes(to)) throw new Error("Invalid status");
    return {
      _id: uuid(d.id),
      _to: to,
      _note: opt(d.note, 2000),
      _channel: opt(d.channel, 120),
      _ref: opt(d.ref, 200),
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_transition_case", data);
    if (error) throw new Error(error.message);
  });

export const recordRecheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({
    _id: uuid(d.id),
    _still_removed: d.stillRemoved === true,
    _note: opt(d.note, 2000),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_record_recheck", data);
    if (error) throw new Error(error.message);
  });

export const addEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const kind = String(d.kind);
    if (!["screenshot", "document", "link", "note"].includes(kind)) throw new Error("Invalid type");
    const sha = opt(d.sha256, 64).toLowerCase();
    if (sha && !/^[0-9a-f]{64}$/.test(sha)) throw new Error("Invalid file fingerprint");
    const size = d.fileSize == null ? null : Number(d.fileSize);
    return {
      _case: uuid(d.caseId),
      _title: text(d.title, "Title", 2, 200),
      _kind: kind,
      _url: url(d.sourceUrl),
      _file: opt(d.fileName, 255),
      _size: size != null && Number.isFinite(size) ? Math.max(0, Math.floor(size)) : null,
      _sha: sha,
      _notes: opt(d.notes, 2000),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("rg_add_evidence", data);
    if (error) throw new Error(error.message);
    return id as string;
  });
