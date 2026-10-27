import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/rg/AppShell";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => <AppShell variant="app" />,
});
