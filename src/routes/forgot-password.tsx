import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/rg/PublicLayout";
import { AuthForm, rules } from "@/components/rg/AuthForm";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Rating Guard" },
      { name: "description", content: "Recover access to your Rating Guard account." },
      { property: "og:title", content: "Reset password — Rating Guard" },
      { property: "og:description", content: "Recover access to your Rating Guard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a reset link once email delivery is connected."
    >
      <AuthForm
        submitLabel="Send reset link"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
            validate: rules.email,
          },
        ]}
      />
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  ),
});
