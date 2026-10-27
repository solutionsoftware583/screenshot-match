// Management server functions. Every write calls a SECURITY DEFINER database
// function (rg_*) that re-checks the caller's permission and appends an
// audit event in the same transaction. Reads run as the caller, so RLS applies.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any };

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function rpc<T = unknown>(ctx: Ctx, fn: string, args: Record<string, unknown> = {}) {
  const { data, error } = await ctx.supabase.rpc(fn, args);
  fail(error);
  return data as T;
}

const str = (v: unknown, label: string, max = 200) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s.length > max) throw new Error(`${label} is required (max ${max} characters)`);
  return s;
};
const uuid = (v: unknown) => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("Invalid id");
  return v;
};
const optUuid = (v: unknown) => (v == null || v === "" ? null : uuid(v));

// ---------- Types ----------
export interface MyAccess {
  platform_roles: string[];
  can_manage_resellers: boolean;
  can_view_platform: boolean;
  is_super_admin: boolean;
  reseller_admin_of: string[];
}
export interface OrgRow {
  id: string;
  name: string;
  reseller_id: string | null;
  reseller_name: string | null;
  geo_hierarchy_enabled: boolean;
  teams_enabled: boolean;
  created_at: string;
}
export interface RoleRow {
  key: string;
  scope: string;
  name: string;
  description: string | null;
  permissions: string[];
}

// ---------- Reads ----------
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => rpc<MyAccess>(context, "rg_my_access"));

export const listResellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("resellers")
      .select("id, name, created_at, organizations(count)")
      .order("name");
    fail(error);
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      name: r.name as string,
      created_at: r.created_at as string,
      org_count: (r.organizations?.[0]?.count ?? 0) as number,
    }));
  });

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("organizations")
      .select(
        "id, name, reseller_id, geo_hierarchy_enabled, teams_enabled, created_at, resellers(name)",
      )
      .order("name");
    fail(error);
    return (data ?? []).map((o: any): OrgRow => ({
      id: o.id,
      name: o.name,
      reseller_id: o.reseller_id,
      reseller_name: o.resellers?.name ?? null,
      geo_hierarchy_enabled: o.geo_hierarchy_enabled,
      teams_enabled: o.teams_enabled,
      created_at: o.created_at,
    }));
  });

export const listRoleCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [roles, rp, perms] = await Promise.all([
      context.supabase.from("role_definitions").select("key, scope, name, description"),
      context.supabase.from("role_permissions").select("role_key, permission_key"),
      context.supabase.from("permissions").select("key, description").order("key"),
    ]);
    fail(roles.error);
    fail(rp.error);
    fail(perms.error);
    const order = ["platform", "reseller", "organization", "team"];
    const roleRows: RoleRow[] = (roles.data ?? [])
      .map((r: any) => ({
        ...r,
        permissions: (rp.data ?? [])
          .filter((x: any) => x.role_key === r.key)
          .map((x: any) => x.permission_key),
      }))
      .sort((a: RoleRow, b: RoleRow) => order.indexOf(a.scope) - order.indexOf(b.scope));
    return {
      roles: roleRows,
      permissions: (perms.data ?? []) as { key: string; description: string }[],
    };
  });

export const getOrgDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid(d?.orgId) }))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const id = data.orgId;
    const [org, perms, people, mems, teams, tms, geo, inv] = await Promise.all([
      s
        .from("organizations")
        .select("id, name, reseller_id, geo_hierarchy_enabled, teams_enabled, created_at")
        .eq("id", id)
        .maybeSingle(),
      s.rpc("rg_org_permissions", { _org: id }),
      s.rpc("rg_org_people", { _org: id }),
      s
        .from("organization_memberships")
        .select("id, user_id, role_key, geographic_scope_id, created_at")
        .eq("organization_id", id),
      s
        .from("teams")
        .select("id, name, geographic_scope_id, created_at")
        .eq("organization_id", id)
        .order("name"),
      s.from("team_memberships").select("id, team_id, user_id, role_key").eq("organization_id", id),
      s
        .from("geographic_scopes")
        .select("id, parent_id, level, name")
        .eq("organization_id", id)
        .order("name"),
      s
        .from("invitations")
        .select(
          "id, email, role_key, team_id, expires_at, accepted_at, rejected_at, revoked_at, created_at",
        )
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
    ]);
    for (const r of [org, perms, mems, teams, tms, geo]) fail(r.error);
    if (!org.data) throw new Error("Organization not found or you do not have access");
    return {
      org: org.data as Omit<OrgRow, "reseller_name">,
      permissions: (perms.data ?? []) as string[],
      people: (people.error ? [] : (people.data ?? [])) as {
        user_id: string;
        email: string;
        full_name: string | null;
      }[],
      memberships: (mems.data ?? []) as {
        id: string;
        user_id: string;
        role_key: string;
        geographic_scope_id: string | null;
      }[],
      teams: (teams.data ?? []) as {
        id: string;
        name: string;
        geographic_scope_id: string | null;
      }[],
      teamMemberships: (tms.data ?? []) as {
        id: string;
        team_id: string;
        user_id: string;
        role_key: string;
      }[],
      geo: (geo.data ?? []) as {
        id: string;
        parent_id: string | null;
        level: string;
        name: string;
      }[],
      invitations: (inv.error ? [] : (inv.data ?? [])) as {
        id: string;
        email: string;
        role_key: string;
        team_id: string | null;
        expires_at: string;
        accepted_at: string | null;
        rejected_at: string | null;
        revoked_at: string | null;
        created_at: string;
      }[],
    };
  });

export const listPlatformPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    rpc<
      {
        user_id: string;
        email: string;
        full_name: string | null;
        created_at: string;
        platform_roles: string[];
      }[]
    >(context, "rg_platform_people"),
  );

export const getResellerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { resellerId: string }) => ({ resellerId: uuid(d?.resellerId) }))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const [people, inv, orgs, assigns] = await Promise.all([
      s.rpc("rg_reseller_people", { _reseller: data.resellerId }),
      s
        .from("invitations")
        .select("id, email, role_key, expires_at, accepted_at, rejected_at, revoked_at, created_at")
        .eq("reseller_id", data.resellerId)
        .is("organization_id", null)
        .order("created_at", { ascending: false }),
      s.from("organizations").select("id, name").eq("reseller_id", data.resellerId).order("name"),
      s
        .from("reseller_client_assignments")
        .select("organization_id, user_id")
        .eq("reseller_id", data.resellerId),
    ]);
    fail(people.error);
    fail(orgs.error);
    return {
      people: (people.data ?? []) as {
        user_id: string;
        email: string;
        full_name: string | null;
        role_key: string;
      }[],
      invitations: (inv.data ?? []) as any[],
      orgs: (orgs.data ?? []) as { id: string; name: string }[],
      assignments: (assigns.data ?? []) as { organization_id: string; user_id: string }[],
    };
  });

export const getInvitationByToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => ({ token: str(d?.token, "Token", 200) }))
  .handler(async ({ data, context }) => {
    const rows = await rpc<any[]>(context, "rg_invitation_by_token", { _token: data.token });
    return (rows?.[0] ?? null) as null | {
      id: string;
      email: string;
      role_name: string;
      org_name: string | null;
      reseller_name: string | null;
      team_name: string | null;
      status: string;
      email_matches: boolean;
    };
  });

// ---------- Writes ----------
export const createReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => ({ name: str(d?.name, "Name") }))
  .handler(async ({ data, context }) =>
    rpc<string>(context, "rg_create_reseller", { _name: data.name }),
  );

export const updateReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => ({
    id: uuid(d?.id),
    name: str(d?.name, "Name"),
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_update_reseller", { _id: data.id, _name: data.name });
    return true;
  });

export const deleteReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_delete_reseller", { _id: data.id });
    return true;
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; resellerId?: string | null }) => ({
    name: str(d?.name, "Name"),
    resellerId: optUuid(d?.resellerId),
  }))
  .handler(async ({ data, context }) =>
    rpc<string>(context, "rg_create_org", { _name: data.name, _reseller: data.resellerId }),
  );

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string; geo: boolean; teams: boolean }) => ({
    id: uuid(d?.id),
    name: str(d?.name, "Name"),
    geo: !!d?.geo,
    teams: !!d?.teams,
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_update_org", {
      _id: data.id,
      _name: data.name,
      _geo: data.geo,
      _teams: data.teams,
    });
    return true;
  });

export const setOrganizationReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; resellerId: string | null }) => ({
    id: uuid(d?.id),
    resellerId: optUuid(d?.resellerId),
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_set_org_reseller", { _id: data.id, _reseller: data.resellerId });
    return true;
  });

export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_delete_org", { _id: data.id });
    return true;
  });

export const assignResellerStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; userId: string; assign: boolean }) => ({
    orgId: uuid(d?.orgId),
    userId: uuid(d?.userId),
    assign: !!d?.assign,
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_assign_reseller_staff", {
      _org: data.orgId,
      _user: data.userId,
      _assign: data.assign,
    });
    return true;
  });

const LEVELS = ["country", "state", "division", "district"];
export const createRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; parentId?: string | null; level: string; name: string }) => {
    if (!LEVELS.includes(d?.level)) throw new Error("Invalid level");
    return {
      orgId: uuid(d.orgId),
      parentId: optUuid(d.parentId),
      level: d.level,
      name: str(d.name, "Name"),
    };
  })
  .handler(async ({ data, context }) =>
    rpc<string>(context, "rg_create_geo", {
      _org: data.orgId,
      _parent: data.parentId,
      _level: data.level,
      _name: data.name,
    }),
  );

export const renameRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => ({
    id: uuid(d?.id),
    name: str(d?.name, "Name"),
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_rename_geo", { _id: data.id, _name: data.name });
    return true;
  });

export const deleteRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_delete_geo", { _id: data.id });
    return true;
  });

export const saveTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { orgId: string; id?: string | null; name: string; regionId?: string | null }) => ({
      orgId: uuid(d?.orgId),
      id: optUuid(d?.id),
      name: str(d?.name, "Team name"),
      regionId: optUuid(d?.regionId),
    }),
  )
  .handler(async ({ data, context }) =>
    rpc<string>(context, "rg_save_team", {
      _org: data.orgId,
      _id: data.id,
      _name: data.name,
      _geo: data.regionId,
    }),
  );

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_delete_team", { _id: data.id });
    return true;
  });

const TEAM_ROLES = ["team_manager", "team_leader", "team_member"];
export const setTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamId: string; userId: string; role: string }) => {
    if (!TEAM_ROLES.includes(d?.role)) throw new Error("Invalid team role");
    return { teamId: uuid(d.teamId), userId: uuid(d.userId), role: d.role };
  })
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_set_team_member", {
      _team: data.teamId,
      _user: data.userId,
      _role: data.role,
    });
    return true;
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamId: string; userId: string }) => ({
    teamId: uuid(d?.teamId),
    userId: uuid(d?.userId),
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_remove_team_member", { _team: data.teamId, _user: data.userId });
    return true;
  });

export const setOrgRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      orgId: string;
      userId: string;
      role: string;
      regionId?: string | null;
      remove?: boolean;
    }) => ({
      orgId: uuid(d?.orgId),
      userId: uuid(d?.userId),
      role: str(d?.role, "Role", 50),
      regionId: optUuid(d?.regionId),
      remove: !!d?.remove,
    }),
  )
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_set_org_role", {
      _org: data.orgId,
      _user: data.userId,
      _role: data.role,
      _geo: data.regionId,
      _remove: data.remove,
    });
    return true;
  });

export const removeOrgMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; userId: string }) => ({
    orgId: uuid(d?.orgId),
    userId: uuid(d?.userId),
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_remove_member", { _org: data.orgId, _user: data.userId });
    return true;
  });

export const setPlatformRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: string; remove?: boolean }) => {
    if (!["super_admin", "global_manager", "auditor"].includes(d?.role))
      throw new Error("Invalid platform role");
    return { email: str(d.email, "Email", 320), role: d.role, remove: !!d.remove };
  })
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_set_platform_role", {
      _email: data.email,
      _role: data.role,
      _remove: data.remove,
    });
    return true;
  });

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      orgId?: string | null;
      resellerId?: string | null;
      teamId?: string | null;
      email: string;
      role: string;
    }) => ({
      orgId: optUuid(d?.orgId),
      resellerId: optUuid(d?.resellerId),
      teamId: optUuid(d?.teamId),
      email: str(d?.email, "Email", 320),
      role: str(d?.role, "Role", 50),
    }),
  )
  .handler(async ({ data, context }) =>
    rpc<string>(context, "rg_create_invitation", {
      _org: data.orgId,
      _reseller: data.resellerId,
      _team: data.teamId,
      _email: data.email,
      _role: data.role,
    }),
  );

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_revoke_invitation", { _id: data.id });
    return true;
  });

export const respondInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string; accept: boolean }) => ({
    token: str(d?.token, "Token", 200),
    accept: !!d?.accept,
  }))
  .handler(async ({ data, context }) => {
    await rpc(context, "rg_respond_invitation", { _token: data.token, _accept: data.accept });
    return true;
  });
