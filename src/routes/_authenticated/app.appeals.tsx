import { createFileRoute } from "@tanstack/react-router";
import type { Case } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/_authenticated/app/appeals")({
  head: () => ({
    meta: [
      { title: "Appeals & Follow-ups — Rating Guard" },
      {
        name: "description",
        content: "Rejected requests under appeal and upcoming follow-up dates.",
      },
      { property: "og:title", content: "Appeals & Follow-ups — Rating Guard" },
      {
        property: "og:description",
        content: "Rejected requests under appeal and upcoming follow-up dates.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Case>
      title="Appeals & Follow-ups"
      description="Rejected requests under appeal and upcoming follow-up dates."
      queryKey="app.appeals"
      load={services.cases.list}
      columns={[
        { key: "reference", label: "Case ID" },
        { key: "platform", label: "Platform" },
        { key: "followUpAt", label: "Follow-up" },
        { key: "status", label: "Status" },
      ]}
      emptyTitle="No appeals or follow-ups"
      emptyDescription="Appeals open when a platform rejects a submission."
    />
  );
}
