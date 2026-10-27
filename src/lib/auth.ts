import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Only allow same-origin relative paths as post-login destinations. */
export function safeRedirect(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string") return fallback;
  try {
    const url = new URL(value, "http://x");
    if (value.startsWith("//") || (/^[a-z]+:/i.test(value) && url.origin !== "http://x")) {
      if (typeof window !== "undefined" && new URL(value).origin === window.location.origin)
        return url.pathname + url.search;
      return fallback;
    }
    return value.startsWith("/") ? value : fallback;
  } catch {
    return fallback;
  }
}

export function useSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, ready };
}
