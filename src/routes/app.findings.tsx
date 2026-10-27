import { createFileRoute } from "@tanstack/react-router";
import type { ContentFinding } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage, PLATFORM_OPTIONS } from "@/components/rg/ListPage";

export const Route = createFileRoute("/app/findings")({
  head: () => ({
    meta: [
      { title: "Content Findings — Rating Guard" },
      {
        name: "description",
        content: "Content flagged for triage, with risk scores once analysis is available.",
      },
      { property: "og:title", content: "Content Findings — Rating Guard" },
      {
        property: "og:description",
        content: "Content flagged for triage, with risk scores once analysis is available.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<ContentFinding>
      title="Content Findings"
      description="Content flagged for triage, with risk scores once analysis is available."
      queryKey="app.findings"
      load={services.findings.list}
      columns={[
        { key: "url", label: "URL" },
        { key: "category", label: "Category" },
        { key: "riskScore", label: "Risk" },
        { key: "discoveredAt", label: "Found" },
      ]}
      emptyTitle="No findings"
      emptyDescription="Findings appear here after discovery or review monitoring flags content."
      filter={{ key: "platform", label: "Platforms", options: PLATFORM_OPTIONS }}
    />
  );
}
