import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ActionMessage,
  LEVEL_LABEL,
  NoOrg,
  QueryState,
  personLabel,
  useAction,
  useCurrentOrg,
  useOrgDetail,
} from "@/components/rg/manage";
import { deleteTeam, removeTeamMember, saveTeam, setTeamMember } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/app/teams")({
  head: meta("Teams", "Create teams and manage team managers, leaders and members."),
  component: Page,
});

const TEAM_ROLES: Record<string, string> = {
  team_manager: "Team Manager",
  team_leader: "Team Leader",
  team_member: "Team Member",
};
const NO_REGION = "__none";
type Detail = NonNullable<ReturnType<typeof useOrgDetail>["data"]>;

function Page() {
  const cur = useCurrentOrg();
  const q = useOrgDetail(cur.orgId);
  const d = q.data;
  const canManage = !!d?.permissions.includes("teams.manage");
  const create = useAction(useServerFn(saveTeam), "Team created");
  const [name, setName] = useState("");
  const [region, setRegion] = useState(NO_REGION);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        description="People can belong to several teams. Team Leaders and Members only work on their team's assignments."
      />
      <QueryState q={cur.orgs}>
        {!cur.orgId ? (
          <NoOrg />
        ) : (
          <QueryState q={q}>
            {d &&
              (!d.org.teams_enabled ? (
                <EmptyState
                  title="Teams are turned off"
                  description="An Organization Admin can enable teams in Members & Roles → Organization settings."
                />
              ) : (
                <>
                  {canManage && (
                    <Section title="New team">
                      <form
                        className="flex flex-wrap gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          create.mutate(
                            {
                              data: {
                                orgId: d.org.id,
                                name,
                                regionId: region === NO_REGION ? null : region,
                              },
                            },
                            { onSuccess: () => setName("") },
                          );
                        }}
                      >
                        <Input
                          className="max-w-xs"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Team name"
                          required
                          maxLength={200}
                        />
                        {d.geo.length > 0 && (
                          <RegionSelect d={d} value={region} onChange={setRegion} />
                        )}
                        <Button type="submit" disabled={create.isPending}>
                          Create team
                        </Button>
                        <ActionMessage msg={create.msg} />
                      </form>
                    </Section>
                  )}
                  {d.teams.length === 0 ? (
                    <EmptyState
                      title="No teams yet"
                      description={
                        canManage ? "Create your first team above." : "No teams have been created."
                      }
                    />
                  ) : (
                    d.teams.map((t) => <TeamCard key={t.id} team={t} d={d} canManage={canManage} />)
                  )}
                </>
              ))}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function RegionSelect({
  d,
  value,
  onChange,
}: {
  d: Detail;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-56" aria-label="Region">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_REGION}>No region</SelectItem>
        {d.geo.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {LEVEL_LABEL[g.level]}: {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TeamCard({
  team,
  d,
  canManage,
}: {
  team: Detail["teams"][number];
  d: Detail;
  canManage: boolean;
}) {
  const [edit, setEdit] = useState<{ name: string; region: string } | null>(null);
  const [user, setUser] = useState("");
  const [role, setRole] = useState("team_member");
  const save = useAction(useServerFn(saveTeam), "Team saved");
  const del = useAction(useServerFn(deleteTeam));
  const setMember = useAction(useServerFn(setTeamMember), "Team member saved");
  const removeMember = useAction(useServerFn(removeTeamMember), "Removed from team");
  const members = d.teamMemberships.filter((m) => m.team_id === team.id);
  const candidates = d.people.filter((p) => !members.some((m) => m.user_id === p.user_id));
  const person = (id: string) => d.people.find((p) => p.user_id === id);
  const region = d.geo.find((g) => g.id === team.geographic_scope_id);

  return (
    <Section
      title={team.name}
      description={region ? `${LEVEL_LABEL[region.level]}: ${region.name}` : ""}
    >
      {canManage && (
        <div className="mb-3 flex flex-wrap gap-2">
          {edit ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(
                  {
                    data: {
                      orgId: d.org.id,
                      id: team.id,
                      name: edit.name,
                      regionId: edit.region === NO_REGION ? null : edit.region,
                    },
                  },
                  { onSuccess: () => setEdit(null) },
                );
              }}
            >
              <Input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                required
                maxLength={200}
                aria-label="Team name"
                className="max-w-xs"
              />
              {d.geo.length > 0 && (
                <RegionSelect
                  d={d}
                  value={edit.region}
                  onChange={(v) => setEdit({ ...edit, region: v })}
                />
              )}
              <Button size="sm" type="submit">
                Save
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setEdit(null)}>
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEdit({ name: team.name, region: team.geographic_scope_id ?? NO_REGION })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() =>
                  confirm(`Delete team "${team.name}"?`) && del.mutate({ data: { id: team.id } })
                }
              >
                Delete
              </Button>
            </>
          )}
        </div>
      )}
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members in this team.</p>
      ) : (
        <ul className="text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 border-t py-2">
              <span className="min-w-0 flex-1 break-words">
                {personLabel(person(m.user_id), "Member")}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {canManage ? (
                  <Select
                    value={m.role_key}
                    onValueChange={(v) =>
                      setMember.mutate({ data: { teamId: team.id, userId: m.user_id, role: v } })
                    }
                  >
                    <SelectTrigger className="h-8 w-40" aria-label="Team role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEAM_ROLES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  TEAM_ROLES[m.role_key]
                )}
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      removeMember.mutate({ data: { teamId: team.id, userId: m.user_id } })
                    }
                  >
                    Remove
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMember.mutate(
              { data: { teamId: team.id, userId: user, role } },
              { onSuccess: () => setUser("") },
            );
          }}
        >
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Person">
              <SelectValue
                placeholder={
                  candidates.length
                    ? "Add an organization member…"
                    : "Everyone is already in this team"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {personLabel(p, "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-40" aria-label="Team role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEAM_ROLES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" type="submit" disabled={!user || setMember.isPending}>
            Add to team
          </Button>
        </form>
      )}
      <div className="mt-2">
        <ActionMessage msg={save.msg ?? del.msg ?? setMember.msg ?? removeMember.msg} />
      </div>
    </Section>
  );
}
