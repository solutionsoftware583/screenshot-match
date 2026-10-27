import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/billing")({
  head: meta("Billing & Subscription", "Your plan, invoices and payment method."),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Billing & Subscription" description="Your plan, invoices and payment method.">
      <Section title="Current plan"><p className="text-sm text-muted-foreground">No subscription. Billing is not connected.</p><div className="mt-3"><Button asChild variant="outline"><Link to="/pricing">View plans</Link></Button></div></Section><Section title="Invoices"><EmptyState title="No invoices" /></Section>
    </InfoPage>
  );
}
