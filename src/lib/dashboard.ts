// Picks which dashboard a user sees from their real role assignments.
// Presentation only: data on every dashboard is still scoped by the database.

export const DASHBOARD_PRIORITY = [
  "super_admin",
  "global_manager",
  "auditor",
  "reseller_admin",
  "reseller_staff",
  "org_admin",
  "country_manager",
  "state_manager",
  "divisional_manager",
  "district_manager",
  "team_manager",
  "team_leader",
  "team_member",
  "client_user",
  "org_auditor",
] as const;

export type DashboardRole = (typeof DASHBOARD_PRIORITY)[number] | "none";

export function primaryRole(roles: string[]): DashboardRole {
  for (const r of DASHBOARD_PRIORITY) if (roles.includes(r)) return r;
  return "none";
}

export type MetricKey =
  | "platform_users"
  | "resellers"
  | "organizations"
  | "teams"
  | "regions"
  | "members"
  | "pending_invitations"
  | "audit_7d";

export interface DashboardSpec {
  title: string;
  summary: string;
  metrics: MetricKey[];
  links: { label: string; to: string }[];
}

const AUDIT = { label: "Audit log", to: "/app/audit" };

export const DASHBOARDS: Record<DashboardRole, DashboardSpec> = {
  super_admin: {
    title: "Super Admin dashboard",
    summary: "Full platform view across every reseller and organization.",
    metrics: [
      "platform_users",
      "resellers",
      "organizations",
      "teams",
      "pending_invitations",
      "audit_7d",
    ],
    links: [
      { label: "Super Admin panel", to: "/admin" },
      { label: "Resellers", to: "/admin/resellers" },
      { label: "Organizations", to: "/admin/tenants" },
      { label: "Platform users", to: "/admin/users" },
    ],
  },
  global_manager: {
    title: "Global Manager dashboard",
    summary: "Oversight of work across all organizations and regions.",
    metrics: ["organizations", "teams", "regions", "members", "audit_7d"],
    links: [
      { label: "Super Admin panel", to: "/admin" },
      { label: "Geography", to: "/app/geography" },
      { label: "Teams", to: "/app/teams" },
      AUDIT,
    ],
  },
  auditor: {
    title: "Read-only Auditor dashboard",
    summary: "Read-only view of platform activity. You can't change anything.",
    metrics: ["organizations", "resellers", "audit_7d", "platform_users"],
    links: [{ label: "Platform audit logs", to: "/admin/audit" }, AUDIT],
  },
  reseller_admin: {
    title: "Reseller Admin dashboard",
    summary: "Your reseller and its client organizations.",
    metrics: ["organizations", "teams", "members", "pending_invitations"],
    links: [
      { label: "Members & Roles", to: "/app/team" },
      { label: "Invitations", to: "/app/invitations" },
      AUDIT,
    ],
  },
  reseller_staff: {
    title: "Reseller Staff dashboard",
    summary: "The client organizations assigned to you.",
    metrics: ["organizations", "teams"],
    links: [{ label: "Teams", to: "/app/teams" }],
  },
  org_admin: {
    title: "Organization Admin dashboard",
    summary: "People, teams and regions in your organization.",
    metrics: ["members", "teams", "regions", "pending_invitations", "audit_7d"],
    links: [
      { label: "Members & Roles", to: "/app/team" },
      { label: "Teams", to: "/app/teams" },
      { label: "Invitations", to: "/app/invitations" },
      { label: "Geography", to: "/app/geography" },
      AUDIT,
    ],
  },
  country_manager: geo("Country Manager"),
  state_manager: geo("State Manager"),
  divisional_manager: geo("Divisional Manager"),
  district_manager: geo("District Manager"),
  team_manager: {
    title: "Team Manager dashboard",
    summary: "Teams you manage in your organization.",
    metrics: ["teams", "members"],
    links: [{ label: "Teams", to: "/app/teams" }],
  },
  team_leader: {
    title: "Team Leader dashboard",
    summary: "Your team and its members.",
    metrics: ["teams"],
    links: [{ label: "Teams", to: "/app/teams" }],
  },
  team_member: {
    title: "Team Member dashboard",
    summary: "Your team assignments.",
    metrics: ["teams"],
    links: [{ label: "Teams", to: "/app/teams" }],
  },
  client_user: {
    title: "Client dashboard",
    summary: "Your organization's reputation workspace.",
    metrics: ["organizations"],
    links: [{ label: "Profile", to: "/app/profile" }],
  },
  org_auditor: {
    title: "Organization Auditor dashboard",
    summary: "Read-only history for your organization.",
    metrics: ["audit_7d"],
    links: [AUDIT],
  },
  none: {
    title: "Welcome",
    summary: "You don't have a role yet. Ask an administrator to invite you to an organization.",
    metrics: [],
    links: [{ label: "Profile", to: "/app/profile" }],
  },
};

function geo(name: string): DashboardSpec {
  return {
    title: `${name} dashboard`,
    summary: "Your assigned region, its sub-regions and teams.",
    metrics: ["regions", "teams", "members"],
    links: [
      { label: "Geography", to: "/app/geography" },
      { label: "Teams", to: "/app/teams" },
    ],
  };
}

export const METRIC_LABEL: Record<MetricKey, string> = {
  platform_users: "Platform users",
  resellers: "Resellers",
  organizations: "Organizations",
  teams: "Teams",
  regions: "Regions",
  members: "Member roles",
  pending_invitations: "Pending invitations",
  audit_7d: "Audit events (7 days)",
};
