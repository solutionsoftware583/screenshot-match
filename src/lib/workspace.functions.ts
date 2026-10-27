// Dashboard, audit log and profile server functions. Reads run as the caller,
// so RLS / SECURITY DEFINER permission checks decide what is visible.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export interface DashboardData {
  platform_roles: string[];
  org_roles: {
    org_id: string;
    org_name: string;
    role_key: string;
    region: string | null;
    region_level: string | null;
  }[];
  reseller_roles: { reseller_id: string; reseller_name: string; role_key: string }[];
  team_roles: { team_id: string; team_name: string; org_id: string; role_key: string }[];
  counts: {
    organizations: number;
    resellers: number;
    teams: number;
    regions: number;
    members: number;
    pending_invitations: number;
    audit_7d: number;
    platform_users: number | null;
  };
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const sb = context.supabase as any;
    const uid = context.userId;
    const count = async (q: any) => {
      const { count: c, error } = await q;
      fail(error);
      return (c ?? 0) as number;
    };
    const head = (t: string) => sb.from(t).select("*", { count: "exact", head: true });
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

    const [pr, om, rm, tm] = await Promise.all([
      sb.from("user_roles").select("role_key").eq("user_id", uid),
      sb
        .from("organization_memberships")
        .select("organization_id, role_key, organizations(name), geographic_scopes(name, level)")
        .eq("user_id", uid),
      sb
        .from("reseller_memberships")
        .select("reseller_id, role_key, resellers(name)")
        .eq("user_id", uid),
      sb
        .from("team_memberships")
        .select("team_id, organization_id, role_key, teams(name)")
        .eq("user_id", uid),
    ]);
    [pr, om, rm, tm].forEach((r) => fail(r.error));
    const platform_roles = (pr.data ?? []).map((r: any) => r.role_key as string);

    const [organizations, resellers, teams, regions, members, pending_invitations, audit_7d] =
      await Promise.all([
        count(head("organizations")),
        count(head("resellers")),
        count(head("teams")),
        count(head("geographic_scopes")),
        count(head("organization_memberships")),
        count(
          head("invitations")
            .is("accepted_at", null)
            .is("rejected_at", null)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString()),
        ),
        count(head("audit_events").gte("at", weekAgo)),
      ]);

    let platform_users: number | null = null;
    const { data: canView } = await sb.rpc("has_platform_permission", {
      _uid: uid,
      _perm: "platform.view_all",
    });
    if (canView) {
      const { data, error } = await sb.rpc("rg_platform_people");
      fail(error);
      platform_users = (data ?? []).length;
    }

    return {
      platform_roles,
      org_roles: (om.data ?? []).map((m: any) => ({
        org_id: m.organization_id,
        org_name: m.organizations?.name ?? "Organization",
        role_key: m.role_key,
        region: m.geographic_scopes?.name ?? null,
        region_level: m.geographic_scopes?.level ?? null,
      })),
      reseller_roles: (rm.data ?? []).map((m: any) => ({
        reseller_id: m.reseller_id,
        reseller_name: m.resellers?.name ?? "Reseller",
        role_key: m.role_key,
      })),
      team_roles: (tm.data ?? []).map((m: any) => ({
        team_id: m.team_id,
        team_name: m.teams?.name ?? "Team",
        org_id: m.organization_id,
        role_key: m.role_key,
      })),
      counts: {
        organizations,
        resellers,
        teams,
        regions,
        members,
        pending_invitations,
        audit_7d,
        platform_users,
      },
    };
  });

export interface AuditRow {
  id: string;
  at: string;
  actor_id: string | null;
  actor_email: string | null;
  organization_id: string | null;
  org_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
}

const optUuid = (v: unknown) => {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("Invalid id");
  return v;
};
const optDate = (v: unknown) => {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || Number.isNaN(Date.parse(v))) throw new Error("Invalid date");
  return new Date(v).toISOString();
};

export const listAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      orgId?: string | null | undefined;
      search?: string | undefined;
      action?: string | undefined;
      from?: string | undefined;
      to?: string | undefined;
      page?: number;
      pageSize?: number;
    }) => ({
      orgId: optUuid(d.orgId),
      search: typeof d.search === "string" ? d.search.trim().slice(0, 100) : "",
      action: typeof d.action === "string" && d.action ? d.action.slice(0, 100) : null,
      from: optDate(d.from),
      to: optDate(d.to),
      page: Math.max(1, Math.floor(Number(d.page) || 1)),
      pageSize: Math.min(100, Math.max(5, Math.floor(Number(d.pageSize) || 25))),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any).rpc("rg_audit_list", {
      _org: data.orgId,
      _search: data.search || null,
      _action: data.action,
      _from: data.from,
      _to: data.to,
      _limit: data.pageSize,
      _offset: (data.page - 1) * data.pageSize,
    });
    fail(error);
    const list = (rows ?? []) as (AuditRow & { total: number })[];
    return {
      rows: list.map((r) => ({
        id: r.id,
        at: r.at,
        actor_id: r.actor_id,
        actor_email: r.actor_email,
        organization_id: r.organization_id,
        org_name: r.org_name,
        action: r.action,
        target_type: r.target_type,
        target_id: r.target_id,
      })),
      total: Number(list[0]?.total ?? 0),
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const listAuditActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("rg_audit_actions");
    fail(error);
    return (data ?? []) as string[];
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("full_name, organization, updated_at")
      .eq("id", context.userId)
      .maybeSingle();
    fail(error);
    return {
      email: (context.claims as any)?.email ?? null,
      full_name: data?.full_name ?? "",
      organization: data?.organization ?? "",
      updated_at: data?.updated_at ?? null,
    };
  });

/** Only name and organization label are editable; roles live in separate tables. */
export function validateProfileInput(d: { full_name?: unknown; organization?: unknown }) {
  const name = typeof d.full_name === "string" ? d.full_name.trim() : "";
  const org = typeof d.organization === "string" ? d.organization.trim() : "";
  if (name.length < 2 || name.length > 100) throw new Error("Name must be 2–100 characters");
  if (org.length > 120) throw new Error("Organization must be at most 120 characters");
  if (/[<>]/.test(name + org)) throw new Error("Names cannot contain < or >");
  return { full_name: name, organization: org || null };
}

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name?: unknown; organization?: unknown }) => validateProfileInput(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .upsert({
        id: context.userId,
        full_name: data.full_name,
        organization: data.organization,
        updated_at: new Date().toISOString(),
      })
      .select("full_name, organization")
      .single();
    fail(error);
    return row;
  });
