import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { UnavailableButton } from "@/components/rg/primitives";
import { InfoPage, meta } from "@/components/rg/InfoPage";
import { INTEGRATION_CATALOGUE } from "@/services";

export const Route = createFileRoute("/app/integrations")({
  head: meta("Integrations", "Connect review platforms and tools."),
  component: () => (
    <InfoPage
      title="Integrations"
      description="Planned platform connections and their actual status."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_CATALOGUE.map((i) => (
          <div key={i.key} className="flex flex-col rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{i.name}</h2>
              <Badge variant="outline">
                {i.status === "not_available" ? "Not available yet" : i.status}
              </Badge>
            </div>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{i.description}</p>
            <div className="mt-4">
              <UnavailableButton variant="outline">Connect</UnavailableButton>
            </div>
          </div>
        ))}
      </div>
    </InfoPage>
  ),
});
