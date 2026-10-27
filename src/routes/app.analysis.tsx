import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState, UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/analysis")({
  head: meta("AI Analysis", "AI-assisted policy assessments with confidence and rationale. Always reviewed by a person."),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="AI Analysis" description="AI-assisted policy assessments with confidence and rationale. Always reviewed by a person." actions={<UnavailableButton>Analyze content</UnavailableButton>}>
      <Section title="Assessments"><EmptyState title="No assessments" description="AI analysis is not connected. Assessments will be advisory, never automatic decisions." /></Section>
    </InfoPage>
  );
}
