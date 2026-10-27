import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { INTEGRATION_CATALOGUE } from "@/services";

export const Route = createFileRoute("/admin/integrations")({
  head: meta("Integration Health", "Status of every platform connector.", "Super Admin"),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Integration Health" description="Status of every platform connector.">
      <Section title="Connectors"><ul className="divide-y text-sm">{INTEGRATION_CATALOGUE.map((i)=><li key={i.key} className="flex justify-between py-2"><span>{i.name}</span><span className="text-muted-foreground">Not built</span></li>)}</ul></Section>
    </InfoPage>
  );
}
