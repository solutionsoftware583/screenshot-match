import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/rg/PublicLayout";
import { AuthForm, rules } from "@/components/rg/AuthForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Rating Guard" },
      { name: "description", content: "Set a new password for your Rating Guard account." },
      { property: "og:title", content: "Choose a new password — Rating Guard" },
      { property: "og:description", content: "Set a new password for your Rating Guard account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  return (
    <AuthCard title="Choose a new password" subtitle="Open this page from the link in your reset email.">
      <AuthForm
        submitLabel="Update password"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password", validate: rules.password },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password", validate: (v, all) => (v && v === all["password"] ? null : "Passwords must match.") },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.auth.updateUser({ password: v["password"] ?? "" });
          if (error) return { error: "This reset link is invalid or has expired. Request a new one." };
          navigate({ to: "/app", replace: true });
        }}
      />
    </AuthCard>
  );
}
