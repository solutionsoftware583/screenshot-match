import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { UnavailableButton } from "@/components/rg/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/settings")({
  head: meta(
    "Organization Settings",
    "Name, branding defaults and data retention for your organization.",
  ),
  component: Page,
});

function Page() {
  return (
    <InfoPage
      title="Organization Settings"
      description="Name, branding defaults and data retention for your organization."
    >
      <Section title="General">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization name</Label>
            <Input id="org" disabled placeholder="Not connected" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tz">Time zone</Label>
            <Input id="tz" disabled placeholder="Not connected" />
          </div>
        </div>
        <div className="mt-4">
          <UnavailableButton>Save changes</UnavailableButton>
        </div>
      </Section>
      <Section title="Danger zone">
        <UnavailableButton variant="outline">Delete organization</UnavailableButton>
      </Section>
    </InfoPage>
  );
}
