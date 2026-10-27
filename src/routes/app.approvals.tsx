import { createFileRoute } from "@tanstack/react-router";
import type { Case } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/app/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue — Rating Guard" },
      {
        name: "description",
        content: "Removal requests waiting for an explicit approval before submission.",
      },
      { property: "og:title", content: "Approval Queue — Rating Guard" },
      {
        property: "og:description",
        content: "Removal requests waiting for an explicit approval before submission.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Case>
      title="Approval Queue"
      description="Removal requests waiting for an explicit approval before submission."
      queryKey="app.approvals"
      load={services.cases.list}
      columns={[
        { key: "reference", label: "Case ID" },
        { key: "category", label: "Category" },
        { key: "priority", label: "Priority" },
        { key: "createdAt", label: "Requested" },
      ]}
      emptyTitle="Nothing awaiting approval"
      emptyDescription="Requests prepared for approval will appear here."
    />
  );
}
