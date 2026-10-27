import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ActionMessage, GEO_ROLE_LEVEL, LEVEL_LABEL, NoOrg, QueryState, useAction, useCurrentOrg, useOrgDetail, useRoleCatalog,
} from "@/components/rg/manage";
import { removeOrgMember, setOrgRole, updateOrganization } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: meta("Members & Roles", "People in your organization, their roles and geographic assignments."),
  component: Page,
});

function Page() {
  const cur = useCurrentOrg();
  const q = useOrgDetail(cur.orgId);
  const catalog = useRoleCatalog();
  const roleName = (k: string) => catalog.data?.roles.find((r) => r.key === k)?.name ?? k;
  const d = q.data;
  const can = (p: string) => !!d?.permissions.includes(p);

  return (
    <div className="space-y-5">
      <PageHeader title="Members & Roles" description="Who belongs to this organization and what they can do. Invite people from Invitations." />
      <QueryState q={cur.orgs}>
        {!cur.orgId ? <NoOrg /> : (
          <QueryState q={q}>
            {d && (
              <>
                {can("org.manage") && <OrgSettings d={d} />}
                {!can("members.view") ? (
                  <EmptyState title="Member list hidden" description="Your role doesn't include viewing members." />
                ) : d.people.length === 0 ? (
                  <EmptyState title="No members yet" description="Invite people from the Invitations page." />
                ) : (
                  <div className="space-y-3">
                    {d.people.map((p) => (
                      <MemberCard key={p.user_id} orgId={d.org.id} person={p} d={d} roleName={roleName} canAssign={can("roles.assign")} />
                    ))}
                  </div>
                )}
              </>
            )}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

type Detail = NonNullable<ReturnType<typeof useOrgDetail>["data"]>;

function OrgSettings({ d }: { d: Detail }) {
  const [name, setName] = useState(d.org.name);
  const [geo, setGeo] = useState(d.org.geo_hierarchy_enabled);
  const [teams, setTeams] = useState(d.org.teams_enabled);
  const save = useAction(useServerFn(updateOrganization), "Organization settings saved");
  return (
    <Section title="Organization settings">
      <form className="flex flex-wrap items-center gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ data: { id: d.org.id, name, geo, teams } }); }}>
        <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} aria-label="Organization name" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={geo} onChange={(e) => setGeo(e.target.checked)} /> Geographic hierarchy</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={teams} onChange={(e) => setTeams(e.target.checked)} /> Teams</label>
        <Button type="submit" disabled={save.isPending}>Save</Button>
        <ActionMessage msg={save.msg} />
      </form>
    </Section>
  );
}

function MemberCard({ orgId, person, d, roleName, canAssign }: {
  orgId: string; person: Detail["people"][number]; d: Detail; roleName: (k: string) => string; canAssign: boolean;
}) {
  const catalog = useRoleCatalog();
  const orgRoles = (catalog.data?.roles ?? []).filter((r) => r.scope === "organization");
  const mine = d.memberships.filter((m) => m.user_id === person.user_id);
  const teams = d.teamMemberships.filter((m) => m.user_id === person.user_id);
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const set = useAction(useServerFn(setOrgRole), "Role updated");
  const remove = useAction(useServerFn(removeOrgMember));
  const needLevel = GEO_ROLE_LEVEL[role];
  const regions = d.geo.filter((g) => g.level === needLevel);
  const regionName = (id: string | null) => d.geo.find((g) => g.id === id)?.name;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{person.full_name ?? person.email}</p>
          <p className="text-xs text-muted-foreground">{person.email}</p>
        </div>
        {canAssign && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={remove.isPending}
            onClick={() => confirm(`Remove ${person.email} from this organization and all its teams?`) && remove.mutate({ data: { orgId, userId: person.user_id } })}>
            Remove from organization
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {mine.map((m) => (
          <Badge key={m.id} variant="secondary" className="gap-1">
            {roleName(m.role_key)}{m.geographic_scope_id && ` · ${regionName(m.geographic_scope_id)}`}
            {canAssign && (
              <button type="button" aria-label={`Remove ${roleName(m.role_key)}`} className="ml-1 hover:text-destructive"
                onClick={() => set.mutate({ data: { orgId, userId: person.user_id, role: m.role_key, remove: true } })}>×</button>
            )}
          </Badge>
        ))}
        {teams.map((t) => (
          <Badge key={t.id} variant="outline">{d.teams.find((x) => x.id === t.team_id)?.name} · {roleName(t.role_key)}</Badge>
        ))}
      </div>
      {canAssign && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => {
          e.preventDefault();
          set.mutate({ data: { orgId, userId: person.user_id, role, regionId: needLevel ? region : null } }, { onSuccess: () => { setRole(""); setRegion(""); } });
        }}>
          <Select value={role} onValueChange={(v) => { setRole(v); setRegion(""); }}>
            <SelectTrigger className="w-52" aria-label="Add role"><SelectValue placeholder="Add a role…" /></SelectTrigger>
            <SelectContent>{orgRoles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          {needLevel && (
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-52" aria-label="Region"><SelectValue placeholder={regions.length ? `Choose ${LEVEL_LABEL[needLevel]}` : `No ${LEVEL_LABEL[needLevel]} regions yet`} /></SelectTrigger>
              <SelectContent>{regions.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button type="submit" size="sm" disabled={!role || (!!needLevel && !region) || set.isPending}>Assign</Button>
        </form>
      )}
      <div className="mt-2"><ActionMessage msg={set.msg ?? remove.msg} /></div>
    </div>
  );
}
