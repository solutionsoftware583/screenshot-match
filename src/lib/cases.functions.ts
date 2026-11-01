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
  storage_path: string | null;
  mime_type: string | null;
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
  const priority = String(d['priority'] ?? "normal");
  if (!PRIORITIES.includes(priority)) throw new Error("Invalid priority");
  const recheck = Number(d['recheckDays'] ?? 30);
  if (!Number.isInteger(recheck) || recheck < 0 || recheck > 365)
    throw new Error("Recheck days must be 0–365");
  return {
    _title: text(d['title'], "Title", 3, 200),
    _platform: text(d['platform'], "Platform", 2, 80),
    _url: url(d['reviewUrl']),
    _reason: text(d['reason'], "Reason", 10, 4000),
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
  .inputValidator((d: Record<string, unknown>) => ({ _org: uuid(d['orgId']), ...caseInput(d) }))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("rg_create_case", data);
    if (error) throw new Error(error.message);
    return id as string;
  });

export const updateCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({ _id: uuid(d['id']), ...caseInput(d) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_update_case", data);
    if (error) throw new Error(error.message);
  });

export const transitionCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const to = String(d['to']);
    if (!(CASE_STATUSES as readonly string[]).includes(to)) throw new Error("Invalid status");
    return {
      _id: uuid(d['id']),
      _to: to,
      _note: opt(d['note'], 2000),
      _channel: opt(d['channel'], 120),
      _ref: opt(d['ref'], 200),
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_transition_case", data);
    if (error) throw new Error(error.message);
  });

export const recordRecheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({
    _id: uuid(d['id']),
    _still_removed: d['stillRemoved'] === true,
    _note: opt(d['note'], 2000),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_record_recheck", data);
    if (error) throw new Error(error.message);
  });

export const addEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const kind = String(d['kind']);
    if (!["screenshot", "document", "link", "note"].includes(kind)) throw new Error("Invalid type");
    const sha = opt(d['sha256'], 64).toLowerCase();
    if (sha && !/^[0-9a-f]{64}$/.test(sha)) throw new Error("Invalid file fingerprint");
    const size = d['fileSize'] == null ? null : Number(d['fileSize']);
    return {
      _case: uuid(d['caseId']),
      _title: text(d['title'], "Title", 2, 200),
      _kind: kind,
      _url: url(d['sourceUrl']),
      _file: opt(d['fileName'], 255),
      _size: size != null && Number.isFinite(size) ? Math.max(0, Math.floor(size)) : null,
      _sha: sha,
      _notes: opt(d['notes'], 2000),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("rg_add_evidence", data as typeof data & { _size: number });
    if (error) throw new Error(error.message);
    return id as string;
  });

export interface LetterRow {
  id: string;
  body: string;
  source: string;
  model: string | null;
  created_by: string;
  created_at: string;
}

export const listLetters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string }) => ({ caseId: uuid(d.caseId) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("case_letters")
      .select("id, body, source, model, created_by, created_at")
      .eq("case_id", data.caseId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as LetterRow[];
  });

export const draftLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({ caseId: uuid(d["caseId"]), extra: opt(d["extra"], 3000) }))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { data: c, error } = await s.from("cases").select("*").eq("id", data.caseId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Case not found");
    // Check admin permission before spending AI credits; rg_save_letter re-checks.
    const { data: perms } = await s.rpc("rg_org_permissions", { _org: c.organization_id });
    if (!((perms ?? []) as string[]).includes("roles.assign"))
      throw new Error("Only organization admins can draft letters");
    const [{ data: org }, { data: ev }] = await Promise.all([
      s.from("organizations").select("name").eq("id", c.organization_id).maybeSingle(),
      s.from("case_evidence").select("title, kind, notes, sha256, captured_at").eq("case_id", c.id).order("captured_at"),
    ]);
    const { draftLetterText, LETTER_MODEL } = await import("./letter-ai.server");
    const body = await draftLetterText({
      orgName: org?.name ?? "[ORGANIZATION]",
      title: c.title,
      platform: c.platform,
      reviewUrl: c.review_url,
      reason: c.reason,
      extra: data.extra,
      evidence: (ev ?? []) as { title: string; kind: string; notes: string | null; sha256: string | null; captured_at: string }[],
    });
    const { error: e2 } = await s.rpc("rg_save_letter", { _case: c.id, _body: body, _source: "ai_draft", _model: LETTER_MODEL });
    if (e2) throw new Error(e2.message);
    return body;
  });

export const saveLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({ _case: uuid(d["caseId"]), _body: text(d["body"], "Letter", 20, 20000) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_save_letter", { ...data, _source: "edited", _model: "" });
    if (error) throw new Error(error.message);
  });

export const attachEvidenceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({
    _evidence: uuid(d["evidenceId"]),
    _path: text(d["path"], "Path", 10, 500),
    _mime: opt(d["mime"], 120),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_attach_evidence_file", data);
    if (error) throw new Error(error.message);
  });

export interface NotificationRow {
  id: string;
  case_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, case_id, kind, title, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as NotificationRow[];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] | null }) => ({ _ids: d.ids === null ? null : d.ids.map(uuid) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_mark_notifications_read", data as { _ids: string[] });
    if (error) throw new Error(error.message);
  });

export const getCaseWatchers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string; orgId: string }) => ({ caseId: uuid(d.caseId), orgId: uuid(d.orgId) }))
  .handler(async ({ data, context }) => {
    const [w, p] = await Promise.all([
      context.supabase.from("case_watchers").select("user_id").eq("case_id", data.caseId),
      context.supabase.rpc("rg_org_people", { _org: data.orgId }),
    ]);
    if (w.error) throw new Error(w.error.message);
    return {
      watchers: (w.data ?? []).map((r: { user_id: string }) => r.user_id),
      people: (p.error ? [] : (p.data ?? [])) as { user_id: string; email: string; full_name: string | null }[],
      me: context.userId,
    };
  });

export const setCaseWatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({ _case: uuid(d["caseId"]), _user: uuid(d["userId"]), _watch: d["watch"] === true }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("rg_set_case_watcher", data);
    if (error) throw new Error(error.message);
  });

export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid(d.orgId) }))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const [c, perms] = await Promise.all([
      s.from("cases").select("*").eq("organization_id", data.orgId).eq("status", "pending_approval").order("updated_at"),
      s.rpc("rg_org_permissions", { _org: data.orgId }),
    ]);
    if (c.error) throw new Error(c.error.message);
    const cases = (c.data ?? []) as CaseRow[];
    const ids = cases.map((x) => x.id);
    const ev = ids.length
      ? await s.from("case_evidence").select("*").in("case_id", ids).order("captured_at")
      : { data: [], error: null };
    if (ev.error) throw new Error(ev.error.message);
    return {
      cases: cases.map((x) => ({
        ...x,
        evidence: ((ev.data ?? []) as (EvidenceRow & { case_id: string })[]).filter((e) => e.case_id === x.id),
      })),
      canApprove: ((perms.data ?? []) as string[]).includes("cases.approve"),
      me: context.userId,
    };
  });
