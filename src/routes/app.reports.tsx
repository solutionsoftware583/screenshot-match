import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState, StatCard, UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/reports")({
  head: meta("Analytics & Reports", "Reporting built only from verified records."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      title="Analytics & Reports"
      description="Reporting built only from verified records."
      actions={<UnavailableButton variant="outline">Export report</UnavailableButton>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Cases opened" value={null} />
        <StatCard label="Submissions" value={null} />
        <StatCard label="Verified removals" value={null} />
      </div>
      <Section title="Trends">
        <EmptyState
          title="No data to chart"
          description="Charts appear once real case data exists."
        />
      </Section>
    </InfoPage>
  );
}
