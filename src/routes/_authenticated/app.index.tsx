import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatCard } from "@/components/rg/primitives";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { QueryState, useRoleCatalog, LEVEL_LABEL } from "@/components/rg/manage";
import { getDashboard } from "@/lib/workspace.functions";
import { DASHBOARDS, METRIC_LABEL, primaryRole } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/app/")({
  validateSearch: (s: Record<string, unknown>): { denied?: "admin" } =>
    s["denied"] === "admin" ? { denied: "admin" } : {},
  head: meta("Overview", "Your role-based reputation workspace dashboard."),
  component: Overview,
});

function Overview() {
  const { denied } = Route.useSearch();
  const fn = useServerFn(getDashboard);
  const q = useQuery({ queryKey: ["mgmt", "dashboard"], queryFn: () => fn() });
  const roles = useRoleCatalog();
  const roleName = (k: string) => roles.data?.roles.find((r) => r.key === k)?.name ?? k;
  const d = q.data;
  const all = d
    ? [
        ...d.platform_roles,
        ...d.reseller_roles.map((r) => r.role_key),
        ...d.org_roles.map((r) => r.role_key),
        ...d.team_roles.map((r) => r.role_key),
      ]
    : [];
  const spec = DASHBOARDS[primaryRole(all)];

  return (
    <InfoPage
      connected
      title={d ? spec.title : "Overview"}
      description={d ? spec.summary : "Loading your dashboard…"}
    >
      {denied === "admin" && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <ShieldAlert className="h-4 w-4 text-destructive" /> You don't have access to the Super
          Admin area.
        </div>
      )}
      <QueryState q={q}>
        {d && (
          <>
            {spec.metrics.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {spec.metrics.map((k) => {
                  const v = d.counts[k];
                  return (
                    <StatCard
                      key={k}
                      label={METRIC_LABEL[k]}
                      value={v == null ? null : String(v)}
                      hint="Records you're allowed to see"
                    />
                  );
                })}
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <Section
                title="Your access"
                description="Where you hold a role. Data on this page is limited to these scopes."
              >
                {all.length === 0 ? (
                  <EmptyState
                    title="No roles assigned"
                    description="Ask an administrator to invite you."
                  />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {d.platform_roles.map((r) => (
                      <li
                        key={r}
                        className="flex items-center justify-between rounded-md border p-2.5"
                      >
                        <span>Platform</span>
                        <Badge variant="secondary">{roleName(r)}</Badge>
                      </li>
                    ))}
                    {d.reseller_roles.map((r) => (
                      <li
                        key={r.reseller_id + r.role_key}
                        className="flex items-center justify-between rounded-md border p-2.5"
                      >
                        <span>{r.reseller_name}</span>
                        <Badge variant="secondary">{roleName(r.role_key)}</Badge>
                      </li>
                    ))}
                    {d.org_roles.map((r) => (
                      <li
                        key={r.org_id + r.role_key}
                        className="flex items-center justify-between gap-2 rounded-md border p-2.5"
                      >
                        <span>
                          {r.org_name}
                          {r.region && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {LEVEL_LABEL[r.region_level ?? ""] ?? r.region_level}: {r.region}
                            </span>
                          )}
                        </span>
                        <Badge variant="secondary">{roleName(r.role_key)}</Badge>
                      </li>
                    ))}
                    {d.team_roles.map((r) => (
                      <li
                        key={r.team_id + r.role_key}
                        className="flex items-center justify-between rounded-md border p-2.5"
                      >
                        <span>Team: {r.team_name}</span>
                        <Badge variant="secondary">{roleName(r.role_key)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Quick actions" description="Pages your role can use.">
                <div className="flex flex-wrap gap-2">
                  {spec.links.map((l) => (
                    <Button key={l.to} asChild size="sm" variant="outline">
                      <Link to={l.to}>{l.label}</Link>
                    </Button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Case, review and removal metrics will appear once the removal workflow is built.
                  Nothing here is estimated.
                </p>
              </Section>
            </div>
          </>
        )}
      </QueryState>
    </InfoPage>
  );
}
