import {
  LayoutDashboard, Radar, Star, FileSearch, Briefcase, FolderLock, CheckCheck, Send, RotateCcw,
  Building2, Plug, Users, BarChart3, CreditCard, Settings, Globe, UserCog, Activity, Cog, ScrollText,
  LifeBuoy, Server, Receipt, Sparkles, FilePen, Bell, KeyRound, UserCircle,
} from "lucide-react";

export interface NavItem { title: string; to: string; icon: typeof Star }

export const APP_NAV: NavItem[] = [
  { title: "Overview", to: "/app", icon: LayoutDashboard },
  { title: "Discover", to: "/app/discover", icon: Radar },
  { title: "Reviews", to: "/app/reviews", icon: Star },
  { title: "Content Findings", to: "/app/findings", icon: FileSearch },
  { title: "Cases", to: "/app/cases", icon: Briefcase },
  { title: "Evidence", to: "/app/evidence", icon: FolderLock },
  { title: "Approvals", to: "/app/approvals", icon: CheckCheck },
  { title: "Submissions", to: "/app/submissions", icon: Send },
  { title: "Appeals", to: "/app/appeals", icon: RotateCcw },
  { title: "Businesses", to: "/app/businesses", icon: Building2 },
  { title: "Integrations", to: "/app/integrations", icon: Plug },
  { title: "Team", to: "/app/team", icon: Users },
  { title: "Reports", to: "/app/reports", icon: BarChart3 },
  { title: "Billing", to: "/app/billing", icon: CreditCard },
  { title: "Settings", to: "/app/settings", icon: Settings },
];

export const APP_SECONDARY: NavItem[] = [
  { title: "AI Analysis", to: "/app/analysis", icon: Sparkles },
  { title: "Removal Requests", to: "/app/removals", icon: FilePen },
  { title: "Roles & Permissions", to: "/app/roles", icon: KeyRound },
  { title: "Notifications", to: "/app/notifications", icon: Bell },
  { title: "Profile & Security", to: "/app/profile", icon: UserCircle },
];

export const ADMIN_NAV: NavItem[] = [
  { title: "Global Dashboard", to: "/admin", icon: Globe },
  { title: "Tenants", to: "/admin/tenants", icon: Building2 },
  { title: "Users", to: "/admin/users", icon: UserCog },
  { title: "Subscriptions", to: "/admin/subscriptions", icon: Receipt },
  { title: "Integration Health", to: "/admin/integrations", icon: Activity },
  { title: "Background Jobs", to: "/admin/jobs", icon: Server },
  { title: "Audit Logs", to: "/admin/audit", icon: ScrollText },
  { title: "Platform Config", to: "/admin/config", icon: Cog },
  { title: "Support Queue", to: "/admin/support", icon: LifeBuoy },
];
