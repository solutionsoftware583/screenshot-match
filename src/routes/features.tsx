import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/rg/PublicLayout";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Rating Guard" },
      { name: "description", content: "Review monitoring, AI policy analysis, evidence vault, case management, approvals and reporting." },
      { property: "og:title", content: "Features — Rating Guard" },
      { property: "og:description", content: "Everything a reputation team needs to manage content cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Features,
});

const F = [
  ["Review monitoring", "Track reviews across connected platforms and locations in one queue."],
  ["Content discovery", "Find mentions of your business across the web for triage."],
  ["AI policy analysis", "Get an assessment with confidence and rationale — always reviewed by a person."],
  ["Evidence vault", "Store screenshots and documents with integrity hashes and case links."],
  ["Case management", "Statuses, priorities, owners, follow-up dates and a full activity timeline."],
  ["Approval queue", "Nothing is submitted without an explicit, recorded approval."],
  ["Submission tracking", "Record what was filed where, and the platform's actual response."],
  ["Appeals & follow-ups", "Never lose track of a rejected request or a pending reply."],
  ["Reporting", "Outcome and workload reporting based solely on verified records."],
  ["Teams & roles", "Granular permissions with separation of internal and client-visible notes."],
];

function Features() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-semibold">Features</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Built for agencies and in-house teams who need a defensible, auditable process.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {F.map(([t, d]) => (
            <div key={t} className="rounded-lg border bg-card p-5"><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
