import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/rg/AppShell";

// NOTE: This UI is not access control. Super Admin authorization must be
// enforced server-side once authentication is implemented.
export const Route = createFileRoute("/_authenticated/admin")({
  component: () => <AppShell variant="admin" />,
});
