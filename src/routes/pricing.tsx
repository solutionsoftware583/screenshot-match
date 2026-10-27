import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/rg/PublicLayout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Rating Guard" },
      { name: "description", content: "Plans for single businesses, multi-location brands and agencies." },
      { property: "og:title", content: "Pricing — Rating Guard" },
      { property: "og:description", content: "Rating Guard plans and what's included." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  { name: "Starter", f: ["1 business", "Review monitoring", "Case management", "Evidence vault"] },
  { name: "Growth", f: ["Up to 10 locations", "AI policy analysis", "Approval workflows", "Reports"], featured: true },
  { name: "Agency", f: ["Unlimited clients", "Client-visible portal", "Roles & permissions", "Priority support"] },
];

function Pricing() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="mt-3 text-muted-foreground">Prices are not yet published. Contact Software Vala™ for a quote.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-xl border bg-card p-6 ${p.featured ? "border-accent shadow-glow" : ""}`}>
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="mt-2 font-display text-3xl">Price TBC</p>
              <ul className="mt-5 space-y-2 text-sm">{p.f.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-success" />{x}</li>)}</ul>
              <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "outline"}><Link to="/register">Get started</Link></Button>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
