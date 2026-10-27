import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";

export function SocialSignIn({ redirectTo }: { redirectTo: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function go(provider: "google" | "lovable") {
    setError(null);
    sessionStorage.setItem("rg_post_login", redirectTo);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/login" });
    if (result.error) return setError("Sign-in didn't complete. Please try again.");
    if (result.redirected) return;
    navigate({ to: redirectTo });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={() => go("google")}>Continue with Google</Button>
      <button type="button" className="lovable-auth-button w-full" onClick={() => go("lovable")}>Continue with Lovable</button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
    </div>
  );
}
