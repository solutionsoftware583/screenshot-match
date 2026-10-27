import { createFileRoute } from "@tanstack/react-router";
import type { Evidence } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";
import { UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/evidence")({
  head: () => ({ meta: [{ title: "Evidence Vault — Rating Guard" }, { name: "description", content: "Screenshots, documents and records attached to cases, with integrity hashes." }, { property: "og:title", content: "Evidence Vault — Rating Guard" }, { property: "og:description", content: "Screenshots, documents and records attached to cases, with integrity hashes." }] }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Evidence>
      title="Evidence Vault"
      description="Screenshots, documents and records attached to cases, with integrity hashes."
      queryKey="app.evidence"
      load={services.evidence.list}
      columns={[{key:"fileName",label:"File"},{key:"mimeType",label:"Type"},{key:"sha256",label:"SHA-256"},{key:"uploadedAt",label:"Uploaded"}]}
      emptyTitle="Vault is empty"
      emptyDescription="File storage is not connected yet, so uploads are disabled."
      actions={<UnavailableButton>Upload evidence</UnavailableButton>}
    />
  );
}
