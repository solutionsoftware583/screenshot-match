import { createFileRoute } from "@tanstack/react-router";
import type { Tenant } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — Super Admin" },
      { name: "description", content: "All customer organizations on the platform." },
      { property: "og:title", content: "Tenants — Super Admin" },
      { property: "og:description", content: "All customer organizations on the platform." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Tenant>
      title="Tenants"
      description="All customer organizations on the platform."
      queryKey="admin.tenants"
      load={services.tenants.list}
      columns={[
        { key: "name", label: "Tenant" },
        { key: "plan", label: "Plan" },
        { key: "users", label: "Users" },
        { key: "createdAt", label: "Created" },
      ]}
      emptyTitle="No tenants"
      emptyDescription="Tenants appear once multi-tenant accounts are implemented."
    />
  );
}
