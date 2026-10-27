import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/config")({
  head: meta("Platform Configuration", "Global feature flags and limits.", "Super Admin"),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Platform Configuration" description="Global feature flags and limits.">
      <Section title="Feature flags" description="Configuration storage is not connected."><div className="space-y-3">{["AI analysis","Web discovery","Client portal"].map((n)=><label key={n} className="flex items-center justify-between text-sm">{n}<Switch disabled aria-label={n} /></label>)}</div></Section>
    </InfoPage>
  );
}
