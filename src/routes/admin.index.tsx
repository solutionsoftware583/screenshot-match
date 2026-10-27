import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/rg/InfoPage";
import { StatCard } from "@/components/rg/primitives";

export const Route = createFileRoute("/admin/")({
  head: meta("Global Dashboard", "Platform-wide health and usage.", "Super Admin"),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Global Dashboard" description="Platform-wide health and usage.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Tenants" value={null} /><StatCard label="Users" value={null} /><StatCard label="Active jobs" value={null} /><StatCard label="Open escalations" value={null} /></div>
    </InfoPage>
  );
}
