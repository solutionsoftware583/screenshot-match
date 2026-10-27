import { createFileRoute } from "@tanstack/react-router";
import type { TeamMember } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";
import { UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/team")({
  head: () => ({ meta: [{ title: "Team — Rating Guard" }, { name: "description", content: "People in your organization and their roles." }, { property: "og:title", content: "Team — Rating Guard" }, { property: "og:description", content: "People in your organization and their roles." }] }),
  component: Page,
});

function Page() {
  return (
    <ListPage<TeamMember>
      title="Team"
      description="People in your organization and their roles."
      queryKey="app.team"
      load={services.team.list}
      columns={[{key:"name",label:"Name"},{key:"email",label:"Email"},{key:"role",label:"Role"}]}
      emptyTitle="No team members"
      emptyDescription="Invitations require accounts, which aren't connected yet."
      filter={{key:"role",label:"Roles",options:[{value:"owner",label:"Owner"},{value:"admin",label:"Admin"},{value:"analyst",label:"Analyst"},{value:"viewer",label:"Viewer"}]}}
      actions={<UnavailableButton>Invite member</UnavailableButton>}
    />
  );
}
