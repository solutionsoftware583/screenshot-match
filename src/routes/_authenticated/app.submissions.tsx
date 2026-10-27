import { createFileRoute } from "@tanstack/react-router";
import type { Submission } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/_authenticated/app/submissions")({
  head: () => ({
    meta: [
      { title: "Submission History — Rating Guard" },
      {
        name: "description",
        content: "Requests filed with platforms and their verified responses.",
      },
      { property: "og:title", content: "Submission History — Rating Guard" },
      {
        property: "og:description",
        content: "Requests filed with platforms and their verified responses.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Submission>
      title="Submission History"
      description="Requests filed with platforms and their verified responses."
      queryKey="app.submissions"
      load={services.submissions.list}
      columns={[
        { key: "caseId", label: "Case" },
        { key: "platform", label: "Platform" },
        { key: "submittedAt", label: "Submitted" },
        { key: "outcome", label: "Outcome" },
      ]}
      emptyTitle="No submissions"
      emptyDescription="Nothing has been submitted to any platform."
      filter={{
        key: "outcome",
        label: "Outcomes",
        options: [
          { value: "pending", label: "Pending" },
          { value: "accepted", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
          { value: "unverified", label: "Unverified" },
        ],
      }}
    />
  );
}
