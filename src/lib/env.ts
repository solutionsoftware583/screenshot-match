import { z } from "zod";

// Browser-safe configuration. Server-only values are read inside server handlers via process.env.
const clientSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
});

export type ClientEnv = z.infer<typeof clientSchema>;

export function parseClientEnv(source: Record<string, unknown>): ClientEnv {
  const result = clientSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid client configuration: ${missing}`);
  }
  return result.data;
}

export const APP_ENV: "development" | "test" | "production" =
  import.meta.env.MODE === "test" ? "test" : import.meta.env.PROD ? "production" : "development";
