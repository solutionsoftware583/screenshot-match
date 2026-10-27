import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/rg/AppShell";
import { getMyAccess } from "@/lib/management.functions";

// Route gate: only platform roles holding platform.view_all may open /admin.
// This is UX; every admin read/write is re-authorized in the database
// (RLS + rg_* functions) regardless of what the browser shows.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    let allowed = false;
    try {
      allowed = !!(await getMyAccess()).can_view_platform;
    } catch {
      allowed = false;
    }
    if (!allowed) throw redirect({ to: "/app", search: { denied: "admin" } as never });
  },
  component: () => <AppShell variant="admin" />,
});
