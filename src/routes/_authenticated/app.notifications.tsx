import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { NotificationList } from "@/components/rg/notifications";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  head: meta("Notifications", "Case updates for cases you created, worked on, or follow."),
  component: Page,
});

function Page() {
  return (
    <InfoPage connected title="Notifications" description="Case updates for cases you created, worked on, or follow.">
      <Section title="Inbox" description="You're told when a case you created, acted on, or follow changes status or is rechecked. Approvers are told when approval is requested. Email delivery isn't set up yet — notifications appear here and on the bell.">
        <NotificationList />
      </Section>
    </InfoPage>
  );
}
