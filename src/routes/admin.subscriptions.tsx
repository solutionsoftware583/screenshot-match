import { createFileRoute } from "@tanstack/react-router";
import type { Tenant } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — Super Admin" },
      { name: "description", content: "Tenant plans and billing status." },
      { property: "og:title", content: "Subscriptions — Super Admin" },
      { property: "og:description", content: "Tenant plans and billing status." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Tenant>
      title="Subscriptions"
      description="Tenant plans and billing status."
      queryKey="admin.subscriptions"
      load={services.tenants.list}
      columns={[
        { key: "name", label: "Tenant" },
        { key: "plan", label: "Plan" },
        { key: "createdAt", label: "Since" },
      ]}
      emptyTitle="No subscriptions"
      emptyDescription="Billing is not connected."
    />
  );
}
