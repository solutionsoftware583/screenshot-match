// Single source of truth for the default role/permission catalog.
// The database tables role_definitions / permissions / role_permissions are
// seeded from this file (scripts/rbac-seed.ts). Server-side checks run in the
// database (has_org_permission); this module is for UI hints and tests only —
// never use it as the authority for access decisions.

export const PERMISSIONS = {
  "platform.view_all": "View every reseller and organization on the platform",
  "platform.configure": "Change platform configuration",
  "resellers.manage": "Create and manage resellers",
  "org.view": "View the organization",
  "org.manage": "Edit organization settings",
  "members.view": "View members and memberships",
  "members.invite": "Invite people",
  "roles.assign": "Assign or change roles",
  "teams.manage": "Create teams and manage team membership",
  "geo.manage": "Manage geographic scopes",
  "cases.view": "View cases",
  "cases.edit": "Create and edit cases",
  "cases.approve": "Approve removal requests",
  "reviews.view": "View monitored reviews",
  "evidence.view": "View evidence",
  "evidence.upload": "Upload evidence",
  "reports.view": "View reports",
  "billing.manage": "Manage billing and subscriptions",
  "audit.read": "Read audit logs",
  "client_portal.view": "Use the client portal",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type RoleScope = "platform" | "reseller" | "organization" | "team";

export interface RoleDef {
  scope: RoleScope;
  name: string;
  description: string;
  permissions: readonly Permission[];
}

const READ_ONLY: Permission[] = [
  "org.view",
  "members.view",
  "cases.view",
  "reviews.view",
  "evidence.view",
  "reports.view",
  "audit.read",
];
const GEO_MANAGER: Permission[] = [
  "org.view",
  "members.view",
  "cases.view",
  "cases.edit",
  "cases.approve",
  "reviews.view",
  "evidence.view",
  "reports.view",
];

export const ROLES = {
  super_admin: {
    scope: "platform",
    name: "Super Admin",
    description: "Full platform control",
    permissions: Object.keys(PERMISSIONS) as Permission[],
  },
  global_manager: {
    scope: "platform",
    name: "Global Manager",
    description: "Oversees work across all organizations",
    permissions: ["platform.view_all", ...GEO_MANAGER, "teams.manage", "audit.read"],
  },
  auditor: {
    scope: "platform",
    name: "Read-only Auditor",
    description: "Read-only access across the platform",
    permissions: ["platform.view_all", ...READ_ONLY],
  },
  reseller_admin: {
    scope: "reseller",
    name: "Reseller Admin",
    description: "Manages the reseller and all its client organizations",
    permissions: [
      "org.view",
      "org.manage",
      "members.view",
      "members.invite",
      "roles.assign",
      "teams.manage",
      "cases.view",
      "cases.edit",
      "reviews.view",
      "evidence.view",
      "reports.view",
      "billing.manage",
      "audit.read",
    ],
  },
  reseller_staff: {
    scope: "reseller",
    name: "Reseller Staff",
    description: "Works only on assigned client organizations",
    permissions: [
      "org.view",
      "members.view",
      "cases.view",
      "cases.edit",
      "reviews.view",
      "evidence.view",
      "evidence.upload",
      "reports.view",
    ],
  },
  org_admin: {
    scope: "organization",
    name: "Organization Admin",
    description: "Administers one client organization",
    permissions: [
      "org.view",
      "org.manage",
      "members.view",
      "members.invite",
      "roles.assign",
      "teams.manage",
      "geo.manage",
      "cases.view",
      "cases.edit",
      "cases.approve",
      "reviews.view",
      "evidence.view",
      "evidence.upload",
      "reports.view",
      "billing.manage",
      "audit.read",
    ],
  },
  country_manager: {
    scope: "organization",
    name: "Country Manager",
    description: "Manages work within a country scope",
    permissions: GEO_MANAGER,
  },
  state_manager: {
    scope: "organization",
    name: "State Manager",
    description: "Manages work within a state scope",
    permissions: GEO_MANAGER,
  },
  divisional_manager: {
    scope: "organization",
    name: "Divisional Manager",
    description: "Manages work within a division scope",
    permissions: GEO_MANAGER,
  },
  district_manager: {
    scope: "organization",
    name: "District Manager",
    description: "Manages work within a district scope",
    permissions: GEO_MANAGER,
  },
  org_auditor: {
    scope: "organization",
    name: "Organization Auditor",
    description: "Read-only access to one organization",
    permissions: READ_ONLY,
  },
  client_user: {
    scope: "organization",
    name: "Client User",
    description: "Client portal access only",
    permissions: ["org.view", "client_portal.view", "reports.view"],
  },
  team_manager: {
    scope: "team",
    name: "Team Manager",
    description: "Manages a team and approves its work",
    permissions: [
      "org.view",
      "members.view",
      "teams.manage",
      "cases.view",
      "cases.edit",
      "cases.approve",
      "reviews.view",
      "evidence.view",
      "evidence.upload",
      "reports.view",
    ],
  },
  team_leader: {
    scope: "team",
    name: "Team Leader",
    description: "Leads members and assigned work",
    permissions: [
      "org.view",
      "members.view",
      "cases.view",
      "cases.edit",
      "reviews.view",
      "evidence.view",
      "evidence.upload",
    ],
  },
  team_member: {
    scope: "team",
    name: "Team Member",
    description: "Works on assigned cases",
    permissions: [
      "org.view",
      "cases.view",
      "cases.edit",
      "reviews.view",
      "evidence.view",
      "evidence.upload",
    ],
  },
} as const satisfies Record<string, RoleDef>;

export type RoleKey = keyof typeof ROLES;

/** Deny by default: unknown roles or permissions are never granted. */
export function roleHas(role: string, perm: string): boolean {
  const def = (ROLES as Record<string, RoleDef>)[role];
  return !!def && (def.permissions as readonly string[]).includes(perm);
}

export function seedSql(): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  const perms = Object.entries(PERMISSIONS)
    .map(([k, d]) => `('${k}','${esc(d)}')`)
    .join(",");
  const roles = Object.entries(ROLES)
    .map(([k, r]) => `('${k}','${r.scope}','${esc(r.name)}','${esc(r.description)}')`)
    .join(",");
  const rp = Object.entries(ROLES)
    .flatMap(([k, r]) => [...new Set(r.permissions)].map((p) => `('${k}','${p}')`))
    .join(",");
  return [
    `INSERT INTO public.permissions(key, description) VALUES ${perms} ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;`,
    `INSERT INTO public.role_definitions(key, scope, name, description) VALUES ${roles} ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;`,
    `INSERT INTO public.role_permissions(role_key, permission_key) VALUES ${rp} ON CONFLICT DO NOTHING;`,
  ].join("\n");
}
