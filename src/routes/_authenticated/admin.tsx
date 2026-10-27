import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/rg/AppShell";

// NOTE: This UI is not access control. Every admin read/write is authorized
// in the database (RLS + rg_* functions), whatever the navigation shows.
export const Route = createFileRoute("/_authenticated/admin")({
  component: () => <AppShell variant="admin" />,
});
