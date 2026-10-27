import { createFileRoute } from "@tanstack/react-router";
import type { AuditLog } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — Super Admin" }, { name: "description", content: "Immutable record of security-relevant actions across the platform." }, { property: "og:title", content: "Audit Logs — Super Admin" }, { property: "og:description", content: "Immutable record of security-relevant actions across the platform." }] }),
  component: Page,
});

function Page() {
  return (
    <ListPage<AuditLog>
      title="Audit Logs"
      description="Immutable record of security-relevant actions across the platform."
      queryKey="admin.audit"
      load={services.audit.list}
      columns={[{key:"at",label:"Time"},{key:"actor",label:"Actor"},{key:"action",label:"Action"},{key:"target",label:"Target"}]}
      emptyTitle="No audit events"
      emptyDescription="Audit logging starts once the backend is live."
    />
  );
}
