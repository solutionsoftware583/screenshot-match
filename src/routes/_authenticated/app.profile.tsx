import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState, UnavailableButton } from "@/components/rg/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: meta("Profile & Security", "Your personal details, password and sessions."),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      title="Profile & Security"
      description="Your personal details, password and sessions."
    >
      <Section title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="n">Name</Label>
            <Input id="n" disabled placeholder="Signed-in account" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e">Email</Label>
            <Input id="e" disabled placeholder="Signed-in account" />
          </div>
        </div>
      </Section>
      <Section title="Security">
        <div className="flex flex-wrap gap-2">
          <UnavailableButton variant="outline">Change password</UnavailableButton>
          <UnavailableButton variant="outline">Enable two-factor</UnavailableButton>
        </div>
      </Section>
      <Section title="Active sessions">
        <EmptyState title="No sessions" />
      </Section>
    </InfoPage>
  );
}
