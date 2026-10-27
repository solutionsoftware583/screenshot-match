import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ActionMessage, NoOrg, QueryState, fmtDate, inviteStatus, useAction, useCurrentOrg, useOrgDetail, useRoleCatalog,
} from "@/components/rg/manage";
import { InviteLink } from "@/components/rg/InviteLink";
import { createInvitation, revokeInvitation } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/app/invitations")({
  head: meta("Invitations", "Invite people to your organization or a team with a specific role."),
  component: Page,
});

function Page() {
  const cur = useCurrentOrg();
  const q = useOrgDetail(cur.orgId);
  const catalog = useRoleCatalog();
  const d = q.data;
  const canInvite = !!d?.permissions.includes("members.invite");
  const roles = (catalog.data?.roles ?? []).filter((r) => r.scope === "organization" || (r.scope === "team" && d?.org.teams_enabled));
  const roleName = (k: string) => catalog.data?.roles.find((r) => r.key === k)?.name ?? k;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [team, setTeam] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const invite = useAction(useServerFn(createInvitation));
  const revoke = useAction(useServerFn(revokeInvitation), "Invitation revoked");
  const isTeamRole = catalog.data?.roles.find((r) => r.key === role)?.scope === "team";

  return (
    <div className="space-y-5">
      <PageHeader title="Invitations" description="Invitations expire after 7 days and can only be accepted by the invited email address." />
      <QueryState q={cur.orgs}>
        {!cur.orgId ? <NoOrg /> : (
          <QueryState q={q}>
            {d && (!canInvite ? <EmptyState title="No access" description="Your role doesn't include inviting people." /> : (
              <>
                <Section title="Invite someone">
                  <form className="flex flex-wrap gap-2" onSubmit={(e) => {
                    e.preventDefault();
                    setToken(null);
                    invite.mutate({ data: { orgId: d.org.id, email, role, teamId: isTeamRole ? team : null } },
                      { onSuccess: (t) => { setToken(t); setEmail(""); } });
                  }}>
                    <Input type="email" className="max-w-xs" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="w-52" aria-label="Role"><SelectValue placeholder="Choose role" /></SelectTrigger>
                      <SelectContent>{roles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {isTeamRole && (
                      <Select value={team} onValueChange={setTeam}>
                        <SelectTrigger className="w-48" aria-label="Team"><SelectValue placeholder={d.teams.length ? "Choose team" : "Create a team first"} /></SelectTrigger>
                        <SelectContent>{d.teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    <Button type="submit" disabled={!role || (isTeamRole && !team) || invite.isPending}>{invite.isPending ? "Creating…" : "Create invitation"}</Button>
                  </form>
                  <div className="mt-3 space-y-2">
                    <ActionMessage msg={invite.msg} />
                    {token && <InviteLink token={token} />}
                    <p className="text-xs text-muted-foreground">Geographic manager roles are assigned after the person joins, from Members & Roles, so you can pick their region.</p>
                  </div>
                </Section>
                <ActionMessage msg={revoke.msg} />
                {d.invitations.length === 0 ? <EmptyState title="No invitations yet" /> : (
                  <div className="overflow-x-auto rounded-lg border bg-card">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Email</th><th>Role</th><th>Team</th><th>Status</th><th>Sent</th><th /></tr></thead>
                      <tbody>
                        {d.invitations.map((i) => {
                          const st = inviteStatus(i);
                          return (
                            <tr key={i.id} className="border-t">
                              <td className="p-3">{i.email}</td>
                              <td>{roleName(i.role_key)}</td>
                              <td>{d.teams.find((t) => t.id === i.team_id)?.name ?? "—"}</td>
                              <td>{st}</td>
                              <td>{fmtDate(i.created_at)}</td>
                              <td className="p-2 text-right">
                                {st === "Pending" && <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate({ data: { id: i.id } })}>Revoke</Button>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ))}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}
