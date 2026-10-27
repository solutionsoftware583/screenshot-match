import { createFileRoute } from "@tanstack/react-router";
import type { ContentFinding } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage, PLATFORM_OPTIONS } from "@/components/rg/ListPage";
import { UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Rating Guard" },
      { name: "description", content: "Mentions of your businesses found across the web." },
      { property: "og:title", content: "Discover — Rating Guard" },
      { property: "og:description", content: "Mentions of your businesses found across the web." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<ContentFinding>
      title="Discover"
      description="Mentions of your businesses found across the web."
      queryKey="app.discover"
      load={services.findings.list}
      columns={[
        { key: "url", label: "URL" },
        { key: "platform", label: "Platform" },
        { key: "category", label: "Category" },
        { key: "discoveredAt", label: "Discovered" },
      ]}
      emptyTitle="No discoveries yet"
      emptyDescription="Discovery runs once web monitoring is connected."
      filter={{ key: "platform", label: "Platforms", options: PLATFORM_OPTIONS }}
      actions={<UnavailableButton>Run discovery scan</UnavailableButton>}
    />
  );
}
