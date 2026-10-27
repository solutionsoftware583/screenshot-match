import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/rg/PublicLayout";

export const Route = createFileRoute("/workflows")({
  head: () => ({
    meta: [
      { title: "Supported Workflows — Rating Guard" },
      { name: "description", content: "How Rating Guard supports policy-violation reporting, defamation documentation, appeals and client reporting." },
      { property: "og:title", content: "Supported Workflows — Rating Guard" },
      { property: "og:description", content: "Legitimate, platform-compliant reputation workflows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workflows,
});

const W = [
  { t: "Policy-violation reporting", s: ["Identify review", "AI policy check", "Attach evidence", "Approve", "Flag via platform channel", "Record response"] },
  { t: "Legal documentation", s: ["Open case", "Collect evidence", "Internal legal notes", "Export package for counsel"] },
  { t: "Appeals", s: ["Rejected submission", "Add new evidence", "Re-approve", "File appeal", "Track follow-up"] },
  { t: "Client reporting (agencies)", s: ["Client-visible updates", "Verified outcomes only", "Scheduled reports"] },
];

function Workflows() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-semibold">Supported workflows</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Rating Guard works through each platform's official processes. Outcomes are decided by the platform.</p>
        <div className="mt-10 space-y-5">
          {W.map((w) => (
            <div key={w.t} className="rounded-lg border bg-card p-5">
              <h2 className="font-semibold">{w.t}</h2>
              <ol className="mt-3 flex flex-wrap gap-2 text-sm">
                {w.s.map((s, i) => <li key={s} className="rounded-full bg-muted px-3 py-1"><span className="mr-1 text-accent-foreground/60">{i + 1}.</span>{s}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
