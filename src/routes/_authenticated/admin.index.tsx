import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { InfoPage, meta } from "@/components/rg/InfoPage";
import { StatCard } from "@/components/rg/primitives";
import { QueryState } from "@/components/rg/manage";
import { getDashboard } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: meta("Global Dashboard", "Platform-wide health and usage.", "Super Admin"),
  component: Page,
});

function Page() {
  const fn = useServerFn(getDashboard);
  const q = useQuery({ queryKey: ["mgmt", "dashboard"], queryFn: () => fn() });
  const c = q.data?.counts;
  const v = (n: number | null | undefined) => (n == null ? null : String(n));
  return (
    <InfoPage connected title="Global Dashboard" description="Platform-wide counts from the live database.">
      <QueryState q={q}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Organizations" value={v(c?.organizations)} hint="Across all resellers" />
          <StatCard label="Resellers" value={v(c?.resellers)} hint="Active reseller partners" />
          <StatCard label="Platform users" value={v(c?.platform_users)} hint="Registered accounts" />
          <StatCard label="Audit events (7 days)" value={v(c?.audit_7d)} hint="Recorded changes" />
          <StatCard label="Active jobs" value={null} />
          <StatCard label="Open escalations" value={null} />
        </div>
      </QueryState>
    </InfoPage>
  );
}
