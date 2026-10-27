import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/rg/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Rating Guard" },
      { name: "description", content: "Rating Guard privacy policy (draft placeholder)." },
      { property: "og:title", content: "Privacy Policy — Rating Guard" },
      { property: "og:description", content: "Rating Guard privacy policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage title="Privacy Policy" sections={["Data we collect", "How we use data", "Evidence and uploaded content", "Sharing and processors", "Retention", "Your rights", "Contact"]} />,
});
