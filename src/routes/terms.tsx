import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/rg/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Rating Guard" },
      { name: "description", content: "Rating Guard terms of service (draft placeholder)." },
      { property: "og:title", content: "Terms of Service — Rating Guard" },
      { property: "og:description", content: "Rating Guard terms of service." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Terms of Service"
      sections={[
        "Acceptance of terms",
        "Description of service",
        "Acceptable use",
        "No guarantee of removal",
        "Fees and billing",
        "Liability",
        "Termination",
        "Governing law",
      ]}
    />
  ),
});
