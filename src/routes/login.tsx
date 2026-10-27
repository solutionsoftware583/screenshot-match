import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/rg/PublicLayout";
import { AuthForm, rules } from "@/components/rg/AuthForm";

export const Route = createFileRoute("/login")({
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
  component: () => (
    <AuthCard title="Sign in" subtitle="Welcome back to Rating Guard.">
      <AuthForm submitLabel="Sign in" fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "email", validate: rules.email },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password", validate: rules.required("Password") },
      ]} />
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
        <Link to="/register" className="font-medium text-primary">Create account</Link>
      </div>
    </AuthCard>
  ),
});
