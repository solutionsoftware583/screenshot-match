import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/rg/PublicLayout";
import { AuthForm, rules } from "@/components/rg/AuthForm";
import { supabase } from "@/integrations/supabase/client";

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
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new password.">
      <AuthForm
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email", validate: rules.email }]}
        onSubmit={async (v) => {
          await supabase.auth.resetPasswordForEmail((v["email"] ?? "").trim(), { redirectTo: window.location.origin + "/reset-password" });
          return { success: "If an account exists for that email, a reset link is on its way." };
        }}
      />
      <p className="mt-4 text-center text-sm"><Link to="/login" className="text-muted-foreground hover:text-foreground">Back to sign in</Link></p>
    </AuthCard>
  ),
});
