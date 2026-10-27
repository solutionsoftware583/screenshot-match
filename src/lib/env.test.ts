import { describe, expect, it } from "vitest";
import { parseClientEnv } from "./env";

describe("client env validation", () => {
  it("accepts a valid configuration", () => {
    expect(parseClientEnv({ VITE_SUPABASE_URL: "https://x.example", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc" }).VITE_SUPABASE_URL).toBe("https://x.example");
  });
  it("rejects a missing key", () => {
    expect(() => parseClientEnv({ VITE_SUPABASE_URL: "https://x.example" })).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY/);
  });
  it("rejects a malformed URL", () => {
    expect(() => parseClientEnv({ VITE_SUPABASE_URL: "nope", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc" })).toThrow(/VITE_SUPABASE_URL/);
  });
});
