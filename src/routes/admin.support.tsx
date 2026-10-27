import { createFileRoute } from "@tanstack/react-router";
import type { Case } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support & Escalations — Super Admin" }, { name: "description", content: "Customer support tickets and escalated cases." }, { property: "og:title", content: "Support & Escalations — Super Admin" }, { property: "og:description", content: "Customer support tickets and escalated cases." }] }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Case>
      title="Support & Escalations"
      description="Customer support tickets and escalated cases."
      queryKey="admin.support"
      load={services.cases.list}
      columns={[{key:"reference",label:"Ticket"},{key:"priority",label:"Priority"},{key:"status",label:"Status"},{key:"createdAt",label:"Opened"}]}
      emptyTitle="Queue is empty"
      emptyDescription="No support tickets have been received."
      filter={{key:"priority",label:"Priorities",options:[{value:"low",label:"Low"},{value:"medium",label:"Medium"},{value:"high",label:"High"},{value:"critical",label:"Critical"}]}}
    />
  );
}
