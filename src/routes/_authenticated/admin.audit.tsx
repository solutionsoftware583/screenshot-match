import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, meta } from "@/components/rg/InfoPage";
import { AuditLogView } from "@/components/rg/AuditLogView";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: meta("Audit Logs", "Read-only record of security-relevant actions across the platform.", "Super Admin"),
  component: () => (
    <InfoPage connected title="Audit Logs" description="Read-only record of security-relevant actions across the platform.">
      <AuditLogView scope="platform" />
    </InfoPage>
  ),
});
