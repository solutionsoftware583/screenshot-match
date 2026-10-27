import { createFileRoute, Link } from "@tanstack/react-router";
import { Radar, Sparkles, FolderLock, Send, ShieldCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/rg/PublicLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rating Guard — Reputation & Content Removal Management" },
      {
        name: "description",
        content:
          "Monitor reviews, assess policy violations, organise evidence and manage removal requests in one auditable workspace.",
      },
      { property: "og:title", content: "Rating Guard — Reputation & Content Removal Management" },
      {
        property: "og:description",
        content:
          "Monitor reviews, organise evidence and manage removal cases. Powered by Software Vala™.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Radar,
    title: "Discover",
    text: "Monitor review platforms and the open web for content about your business.",
  },
  {
    icon: Sparkles,
    title: "Assess",
    text: "AI-assisted analysis maps content against platform policies, with rationale you can review.",
  },
  {
    icon: FolderLock,
    title: "Document",
    text: "Keep tamper-evident evidence attached to every case.",
  },
  {
    icon: Send,
    title: "Request",
    text: "Prepare, approve and track removal requests through each platform's official channels.",
  },
];

function Landing() {
  return (
    <PublicLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">
              <ShieldCheck className="h-3.5 w-3.5" /> Reputation operations, done properly
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Handle harmful reviews with evidence, not guesswork.
            </h1>
            <p className="mt-5 max-w-lg text-primary-foreground/75">
              Rating Guard gives your team one auditable workspace to find policy-violating content,
              build the case, and file requests through legitimate platform processes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/register">Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/app">Explore the workspace</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-primary-foreground/60">
              <Scale className="h-3.5 w-3.5" /> Platforms make the final decision. We never
              guarantee removal.
            </p>
          </div>
          <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 shadow-glow">
            <div className="mb-3 flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground/30" />
            </div>
            <div className="space-y-2 text-sm">
              {["Discover", "Assess", "Document", "Approve", "Submit", "Follow up"].map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-md bg-primary-foreground/5 px-3 py-2.5"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  {s}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-primary-foreground/50">
              Case lifecycle illustration
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-semibold">One workflow, end to end</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-lg border bg-card p-5">
              <p.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
