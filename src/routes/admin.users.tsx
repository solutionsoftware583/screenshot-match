import { createFileRoute } from "@tanstack/react-router";
import type { TeamMember } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — Super Admin" },
      { name: "description", content: "All users across tenants." },
      { property: "og:title", content: "Users — Super Admin" },
      { property: "og:description", content: "All users across tenants." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<TeamMember>
      title="Users"
      description="All users across tenants."
      queryKey="admin.users"
      load={services.team.list}
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
      ]}
      emptyTitle="No users"
      emptyDescription="No user accounts exist yet."
    />
  );
}
