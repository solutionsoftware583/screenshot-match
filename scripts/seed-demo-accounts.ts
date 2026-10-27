// DEVELOPMENT/TEST ONLY. Creates the 14 Rating Guard demo accounts with a
// unique random password each, plus a "[DEMO]" reseller, organization,
// regions and team, and assigns every role through the real permission tables.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/seed-demo-accounts.ts <output-file>
// Re-running resets the demo passwords. Never ship this to the browser.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const out = process.argv[2];
if (!url || !key || !out)
  throw new Error("Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and an output file path");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const ACCOUNTS = [
  ["superadmin", "Super Admin", "super_admin"],
  ["global.manager", "Global Manager", "global_manager"],
  ["country.manager", "Country Manager", "country_manager"],
  ["state.manager", "State Manager", "state_manager"],
  ["divisional.manager", "Divisional Manager", "divisional_manager"],
  ["district.manager", "District Manager", "district_manager"],
  ["reseller.admin", "Reseller Admin", "reseller_admin"],
  ["reseller.staff", "Reseller Staff", "reseller_staff"],
  ["organization.admin", "Organization Admin", "org_admin"],
  ["team.manager", "Team Manager", "team_manager"],
  ["team.leader", "Team Leader", "team_leader"],
  ["team.member", "Team Member", "team_member"],
  ["client.user", "Client User", "client_user"],
  ["auditor", "Read-only Auditor", "auditor"],
] as const;

const password = () =>
  `Rg-${randomBytes(12).toString("base64url")}-${randomBytes(2).toString("hex")}!`;

async function check<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
  what: string,
) {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function one(table: string, match: Record<string, unknown>, insert: Record<string, unknown>) {
  let q = db.from(table).select("id");
  for (const [k, v] of Object.entries(match)) q = v === null ? q.is(k, null) : q.eq(k, v as string);
  const found = await check(q.limit(1), `find ${table}`);
  if (found?.[0]) return (found[0] as { id: string }).id;
  const row = await check(db.from(table).insert(insert).select("id").single(), `insert ${table}`);
  return (row as { id: string }).id;
}

const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
const ids: Record<string, string> = {};
const creds: string[] = [];
for (const [local, label, role] of ACCOUNTS) {
  const email = `${local}@ratingguard.test`;
  const pw = password();
  const existing = list?.users.find((u) => u.email === email);
  if (existing) {
    await check(
      db.auth.admin.updateUserById(existing.id, { password: pw, email_confirm: true }),
      `reset ${email}`,
    );
    ids[role] = existing.id;
  } else {
    const r = await check(
      db.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
        user_metadata: { full_name: `Demo ${label}`, organization: "[DEMO] Client Org" },
      }),
      `create ${email}`,
    );
    ids[role] = r.user!.id;
  }
  creds.push(`| ${label} | ${email} | \`${pw}\` |`);
}

const reseller = await one("resellers", { name: "[DEMO] Reseller" }, { name: "[DEMO] Reseller" });
const org = await one(
  "organizations",
  { name: "[DEMO] Client Org" },
  {
    name: "[DEMO] Client Org",
    reseller_id: reseller,
    geo_hierarchy_enabled: true,
    teams_enabled: true,
  },
);
await one(
  "organizations",
  { name: "[DEMO] Other Org (isolation check)" },
  { name: "[DEMO] Other Org (isolation check)", geo_hierarchy_enabled: false, teams_enabled: true },
);
const country = await one(
  "geographic_scopes",
  { organization_id: org, name: "India", level: "country" },
  { organization_id: org, level: "country", name: "India" },
);
const state = await one(
  "geographic_scopes",
  { organization_id: org, name: "Maharashtra", level: "state" },
  { organization_id: org, parent_id: country, level: "state", name: "Maharashtra" },
);
const division = await one(
  "geographic_scopes",
  { organization_id: org, name: "Pune Division", level: "division" },
  { organization_id: org, parent_id: state, level: "division", name: "Pune Division" },
);
const district = await one(
  "geographic_scopes",
  { organization_id: org, name: "Pune District", level: "district" },
  { organization_id: org, parent_id: division, level: "district", name: "Pune District" },
);
const team = await one(
  "teams",
  { organization_id: org, name: "[DEMO] Team" },
  { organization_id: org, name: "[DEMO] Team", geographic_scope_id: district },
);

const up = (table: string, row: Record<string, unknown>, onConflict: string) =>
  check(db.from(table).upsert(row, { onConflict, ignoreDuplicates: true }), `assign ${table}`);

for (const r of ["super_admin", "global_manager", "auditor"])
  await up("user_roles", { user_id: ids[r], role_key: r }, "user_id,role_key");
await up(
  "reseller_memberships",
  { reseller_id: reseller, user_id: ids["reseller_admin"], role_key: "reseller_admin" },
  "reseller_id,user_id",
);
await up(
  "reseller_memberships",
  { reseller_id: reseller, user_id: ids["reseller_staff"], role_key: "reseller_staff" },
  "reseller_id,user_id",
);
await up(
  "reseller_client_assignments",
  { reseller_id: reseller, organization_id: org, user_id: ids["reseller_staff"] },
  "organization_id,user_id",
);
const geo: Record<string, string> = {
  country_manager: country,
  state_manager: state,
  divisional_manager: division,
  district_manager: district,
};
for (const r of ["org_admin", "client_user", ...Object.keys(geo)])
  await up(
    "organization_memberships",
    { organization_id: org, user_id: ids[r], role_key: r, geographic_scope_id: geo[r] ?? null },
    "organization_id,user_id,role_key",
  );
for (const r of ["team_manager", "team_leader", "team_member"])
  await up(
    "team_memberships",
    { team_id: team, organization_id: org, user_id: ids[r], role_key: r },
    "team_id,user_id",
  );

writeFileSync(
  out,
  [
    "# Rating Guard — demo accounts (development/testing only)",
    "",
    "Each account has its own password. Keep this file private. Re-running the setup script replaces all passwords.",
    "All accounts belong to “[DEMO] Client Org” (reseller “[DEMO] Reseller”), regions India › Maharashtra › Pune Division › Pune District, team “[DEMO] Team”.",
    "",
    "| Role | Email | Password |",
    "|---|---|---|",
    ...creds,
    "",
  ].join("\n"),
);
console.log(`Provisioned ${ACCOUNTS.length} demo accounts.`);
