import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";

export const Route = createFileRoute("/_authenticated/app/roles")({
  head: meta("Roles & Permissions", "What each role can do in your organization."),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Roles & Permissions" description="What each role can do in your organization.">
      <Section
        title="Role matrix"
        description="Planned defaults. Enforcement will happen server-side."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Permission</th>
                {["Owner", "Admin", "Analyst", "Viewer"].map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["View cases", 1, 1, 1, 1],
                  ["Edit cases", 1, 1, 1, 0],
                  ["Approve requests", 1, 1, 0, 0],
                  ["Manage team", 1, 1, 0, 0],
                  ["Billing", 1, 0, 0, 0],
                ] as const
              ).map(([p, ...v]) => (
                <tr key={p} className="border-t">
                  <td className="py-2">{p}</td>
                  {v.map((x, i) => (
                    <td key={i}>{x ? "✓" : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </InfoPage>
  );
}
