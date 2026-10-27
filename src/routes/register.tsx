import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/rg/PublicLayout";
import { AuthForm, rules } from "@/components/rg/AuthForm";
import { SocialSignIn } from "@/components/rg/SocialSignIn";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Rating Guard" },
      { name: "description", content: "Create a Rating Guard workspace for your organization." },
      { property: "og:title", content: "Create account — Rating Guard" },
      { property: "og:description", content: "Create a Rating Guard workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthCard title="Create your account" subtitle="Set up a workspace for your organization.">
      <SocialSignIn redirectTo="/app" />
      <AuthForm
        submitLabel="Create account"
        fields={[
          { name: "name", label: "Full name", autoComplete: "name", validate: rules.required("Full name") },
          { name: "org", label: "Organization", autoComplete: "organization", validate: rules.required("Organization") },
          { name: "email", label: "Work email", type: "email", autoComplete: "email", validate: rules.email },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", validate: rules.password },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password", validate: (v, all) => (v && v === all["password"] ? null : "Passwords must match.") },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.auth.signUp({
            email: (v["email"] ?? "").trim(),
            password: v["password"] ?? "",
            options: {
              emailRedirectTo: window.location.origin + "/login",
              data: { full_name: (v["name"] ?? "").trim(), organization: (v["org"] ?? "").trim() },
            },
          });
          if (error) return { error: error.message };
          return { success: "Check your email and click the confirmation link, then sign in." };
        }}
      />
      <p className="mt-4 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-primary">Sign in</Link></p>
    </AuthCard>
  ),
});
