import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthCard } from "@/components/rg/PublicLayout";
import { AuthForm, rules } from "@/components/rg/AuthForm";
import { SocialSignIn } from "@/components/rg/SocialSignIn";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Sign in — Rating Guard" },
      { name: "description", content: "Sign in to your Rating Guard workspace." },
      { property: "og:title", content: "Sign in — Rating Guard" },
      { property: "og:description", content: "Sign in to your Rating Guard workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safeRedirect(search.redirect);

  // Already signed in (or just returned from Google/Lovable): continue to the workspace.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const stored = sessionStorage.getItem("rg_post_login");
        sessionStorage.removeItem("rg_post_login");
        navigate({ to: safeRedirect(stored ?? target), replace: true });
      }
    });
  }, [navigate, target]);

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to Rating Guard.">
      <SocialSignIn redirectTo={target} />
      <AuthForm
        submitLabel="Sign in"
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
            validate: rules.email,
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
            validate: rules.required("Password"),
          },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.auth.signInWithPassword({
            email: (v["email"] ?? "").trim(),
            password: v["password"] ?? "",
          });
          if (error) {
            return {
              error: /confirm/i.test(error.message)
                ? "Please confirm your email first — check your inbox for the link."
                : "Email or password is incorrect.",
            };
          }
          navigate({ to: target, replace: true });
        }}
      />
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
        <Link to="/register" className="font-medium text-primary">
          Create account
        </Link>
      </div>
    </AuthCard>
  );
}
