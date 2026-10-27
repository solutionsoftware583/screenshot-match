import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState, StatCard } from "@/components/rg/primitives";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";

export const Route = createFileRoute("/app/")({
  head: meta("Overview", "Your reputation workspace at a glance."),
  component: Overview,
});

function Overview() {
  return (
    <InfoPage title="Overview" description="Your reputation workspace at a glance. Metrics appear only when real data is available.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open cases" value={null} />
        <StatCard label="Reviews monitored" value={null} />
        <StatCard label="Awaiting approval" value={null} />
        <StatCard label="Verified outcomes" value={null} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Recent activity"><EmptyState title="No activity yet" description="Case and review activity will be listed here." /></Section>
        <Section title="Get started" description="Steps that become available as services are connected.">
          <ol className="space-y-2 text-sm">
            {[["Add a business", "/app/businesses"], ["Connect a review platform", "/app/integrations"], ["Invite your team", "/app/team"]].map(([t, to], i) => (
              <li key={t} className="flex items-center justify-between rounded-md border p-3">
                <span><span className="mr-2 text-muted-foreground">{i + 1}.</span>{t}</span>
                <Button asChild size="sm" variant="outline"><Link to={to}>Open</Link></Button>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </InfoPage>
  );
}
