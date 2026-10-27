import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState } from "@/components/rg/primitives";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/app/notifications")({
  head: meta("Notifications", "Your notifications and delivery preferences."),
  component: Page,
});

function Page() {
  return (
    <InfoPage title="Notifications" description="Your notifications and delivery preferences.">
      <Section title="Inbox">
        <EmptyState title="No notifications" />
      </Section>
      <Section title="Preferences" description="Saving preferences requires the backend.">
        <div className="space-y-3">
          {[
            "New review flagged",
            "Approval requested",
            "Platform response received",
            "Follow-up due",
          ].map((n) => (
            <label key={n} className="flex items-center justify-between text-sm">
              {n}
              <Switch disabled aria-label={n} />
            </label>
          ))}
        </div>
      </Section>
    </InfoPage>
  );
}
