import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/rg/AppShell";

export const Route = createFileRoute("/app")({
  component: () => <AppShell variant="app" />,
});
