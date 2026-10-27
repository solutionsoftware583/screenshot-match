import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/rg/InfoPage";
import { PageHeader } from "@/components/rg/primitives";
import { QueryState, useRoleCatalog } from "@/components/rg/manage";

export const Route = createFileRoute("/_authenticated/app/roles")({
  head: meta("Roles & Permissions", "What each role can do. Enforced by the database on every action."),
  component: Page,
});

const SCOPE: Record<string, string> = { platform: "Platform", reseller: "Reseller", organization: "Organization", team: "Team" };

function Page() {
  const q = useRoleCatalog();
  const roles = q.data?.roles ?? [];
  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Live role catalog. Every change is checked by the database against these permissions — hiding a button is never the only protection." />
      <QueryState q={q}>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                <th className="sticky left-0 bg-card p-2">Permission</th>
                {roles.map((r) => (
                  <th key={r.key} className="p-2 align-bottom font-medium" title={r.description ?? ""}>
                    <div className="text-[10px] uppercase text-muted-foreground">{SCOPE[r.scope]}</div>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.data?.permissions ?? []).map((p) => (
                <tr key={p.key} className="border-t">
                  <td className="sticky left-0 bg-card p-2">{p.description}</td>
                  {roles.map((r) => (
                    <td key={r.key} className="p-2 text-center" aria-label={r.permissions.includes(p.key) ? "Allowed" : "Not allowed"}>
                      {r.permissions.includes(p.key) ? <span className="text-success">✓</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
