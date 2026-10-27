import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState } from "@/components/rg/primitives";

export const Route = createFileRoute("/admin/jobs")({
  head: meta("Background Jobs", "Scheduled scans, analysis and submission jobs.", "Super Admin"),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Background Jobs" description="Scheduled scans, analysis and submission jobs.">
      <Section title="Job queue"><EmptyState title="No job runner" description="Background processing is not implemented yet." /></Section>
    </InfoPage>
  );
}
