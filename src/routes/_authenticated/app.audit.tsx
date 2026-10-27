import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/rg/InfoPage";
import { AuditLogView } from "@/components/rg/AuditLogView";

export const Route = createFileRoute("/_authenticated/app/audit")({
  head: meta("Audit Log", "Read-only history of changes in your organization."),
  component: () => (
    <InfoPage
      connected
      title="Audit Log"
      description="Read-only history of changes in the selected organization. Visible to roles with audit access."
    >
      <AuditLogView scope="org" />
    </InfoPage>
  ),
});
