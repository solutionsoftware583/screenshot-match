import { createFileRoute, Link } from "@tanstack/react-router";
import type { Case } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage, STATUS_OPTIONS } from "@/components/rg/ListPage";
import { UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/cases/")({
  head: () => ({ meta: [{ title: "Cases — Rating Guard" }, { name: "description", content: "Every removal or documentation case, with status, priority and owner." }, { property: "og:title", content: "Cases — Rating Guard" }, { property: "og:description", content: "Every removal or documentation case, with status, priority and owner." }] }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Case>
      title="Cases"
      description="Every removal or documentation case, with status, priority and owner."
      queryKey="app.cases.index"
      load={services.cases.list}
      columns={[{key:"reference",label:"Case ID",render:(r)=><Link to="/app/cases/$id" params={{id:r.id}} className="font-mono text-primary underline">{r.reference}</Link>},{key:"platform",label:"Platform"},{key:"status",label:"Status"},{key:"priority",label:"Priority"},{key:"ownerName",label:"Owner"}]}
      emptyTitle="No cases"
      emptyDescription="Cases are created from reviews or findings once data is connected."
      filter={{key:"status",label:"Statuses",options:STATUS_OPTIONS}}
      actions={<UnavailableButton>New case</UnavailableButton>}
    />
  );
}
