import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import {
  ActionMessage,
  LEVEL_LABEL,
  MKEY,
  NoOrg,
  QueryState,
  personLabel,
  useAction,
  useCurrentOrg,
  useOrgDetail,
} from "@/components/rg/manage";
import { getRegionalTeam, setRegionalMember } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/app/regional-team")({
  head: meta(
    "Regional Team",
    "Managers assign their own regional team members; each member sees only their region.",
  ),
  component: Page,
});

const ROLE_FOR_LEVEL: Record<string, string> = {
  country: "country_manager",
  state: "state_manager",
  division: "divisional_manager",
  district: "district_manager",
};
const ROLE_LABEL: Record<string, string> = {
  regional_member: "Regional Team Member",
  country_manager: "Country Manager",
  state_manager: "State Manager",
  divisional_manager: "Divisional Manager",
  district_manager: "District Manager",
};

function Page() {
  const cur = useCurrentOrg();
  const detail = useOrgDetail(cur.orgId);
  const fn = useServerFn(getRegionalTeam);
  const q = useQuery({
    queryKey: [...MKEY, "regional", cur.orgId],
    queryFn: () => fn({ data: { orgId: cur.orgId! } }),
    enabled: !!cur.orgId,
  });
  const set = useAction(useServerFn(setRegionalMember), "Regional team updated");
  const [userId, setUserId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [kind, setKind] = useState<"member" | "manager">("member");

  const d = q.data;
  const region = d?.regions.find((r) => r.id === regionId);
  const role = kind === "member" ? "regional_member" : region ? ROLE_FOR_LEVEL[region.level] : "";
  const managerBlocked = kind === "manager" && !d?.isAdmin && !!region && d?.ownRegionIds.includes(region.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regional Team"
        description="Add people to your region. Regional team members and the managers you assign below you see only cases inside their own region on their dashboard."
      />
      <QueryState q={cur.orgs}>
        {!cur.orgId ? (
          <NoOrg />
        ) : (
          <QueryState q={q}>
            {d &&
              (d.regions.length === 0 ? (
                <EmptyState
                  title="No region assigned to you"
                  description="An Organization Admin must assign you a Country, State, Division or District first."
                />
              ) : (
                <>
                  <Section title="Add to my regional team">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <select aria-label="Person" className="h-10 rounded-md border bg-background px-3 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)}>
                        <option value="">Choose person…</option>
                        {(detail.data?.people ?? []).map((p) => (
                          <option key={p.user_id} value={p.user_id}>{personLabel(p, p.user_id)}</option>
                        ))}
                      </select>
                      <select aria-label="Region" className="h-10 rounded-md border bg-background px-3 text-sm" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                        <option value="">Choose region…</option>
                        {d.regions.map((r) => (
                          <option key={r.id} value={r.id}>{LEVEL_LABEL[r.level]}: {r.name}</option>
                        ))}
                      </select>
                      <select aria-label="Role" className="h-10 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as "member" | "manager")}>
                        <option value="member">Regional Team Member</option>
                        <option value="manager">Manager of that region</option>
                      </select>
                      <Button
                        disabled={!userId || !regionId || !role || managerBlocked || set.isPending}
                        onClick={() => set.mutate({ data: { orgId: cur.orgId!, userId, role, regionId } })}
                      >
                        {set.isPending ? "Saving…" : "Add"}
                      </Button>
                    </div>
                    {managerBlocked && (
                      <p className="mt-2 text-sm text-muted-foreground">You can only assign managers to regions below your own.</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      People must already be in the organization (invited). Members can create cases and add evidence but cannot approve.
                    </p>
                    <div className="mt-2"><ActionMessage msg={set.msg} /></div>
                  </Section>
                  <Section title={`My regional team (${d.team.length})`}>
                    {d.team.length === 0 ? (
                      <EmptyState title="No one yet" description="Add your first regional team member above." />
                    ) : (
                      <ul className="divide-y rounded-lg border bg-card shadow-card">
                        {d.team.map((m) => (
                          <li key={`${m.user_id}-${m.role_key}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                            <div>
                              <div className="font-medium">{personLabel(m, m.user_id)}</div>
                              <div className="text-muted-foreground">
                                {ROLE_LABEL[m.role_key] ?? m.role_key} · {LEVEL_LABEL[m.region_level]}: {m.region_name}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={set.isPending}
                              onClick={() => set.mutate({ data: { orgId: cur.orgId!, userId: m.user_id, role: m.role_key, regionId: m.geographic_scope_id, remove: true } })}
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </>
              ))}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}
