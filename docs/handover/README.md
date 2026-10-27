# Rating Guard — Coding Agent Handover

Rating Guard — "We Manage Reviews & Ratings". Powered by Software Vala™.
Stack: TanStack Start v1 (React 19, Vite 7), Tailwind v4, Lovable Cloud (Postgres + Auth). Read `AGENTS.md` and `docs/ARCHITECTURE.md` first.

## Documents in this folder
- `UI_UX_HANDOVER_REPORT.md` — UI/UX audit, full page inventory (40 pages), test results.
- `FUNCTIONALITY_AUDIT.md` — route/button status (Working / Partly / Not connected), issues, blockers.
- `README.md` — this file: known issues, incomplete integrations, what is NOT in Git.

## Status at handover (2026-10-27)
- Unit tests: 17/17 pass (`bunx vitest run`).
- Production build: passes (`bun run build`).
- Type check: clean.
- DB permission tests: `db/tests/management.sql`, `db/tests/tenant_isolation.sql` (passed when last run).
- Browser checks: 693 page loads across desktop/tablet/phone and all demo roles, no errors.

## 17 code-quality warnings (`@typescript-eslint/no-explicit-any`)
Untyped database RPC replies; no runtime impact. Fix by typing RPC results.
```
src/lib/management.functions.ts:7:24
src/lib/management.functions.ts:68:33
src/lib/management.functions.ts:86:33
src/lib/management.functions.ts:110:16
src/lib/management.functions.ts:113:23
src/lib/management.functions.ts:114:20
src/lib/management.functions.ts:249:40
src/lib/management.functions.ts:259:28
src/lib/workspace.functions.ts:36:36
src/lib/workspace.functions.ts:38:29
src/lib/workspace.functions.ts:62:52
src/lib/workspace.functions.ts:94:42
src/lib/workspace.functions.ts:101:47
src/lib/workspace.functions.ts:106:43
src/lib/workspace.functions.ts:170:62
src/lib/workspace.functions.ts:202:56
src/lib/workspace.functions.ts:217:33
```
Also: 21 `react-refresh/only-export-components` warnings and Prettier formatting differences (auto-fixable with `bunx eslint . --fix`).

## Known issues (open)
1. **Regional data scoping.** Country/State/Divisional/District managers currently get organization-wide access. They must see only data belonging to their assigned region (and its descendants). Fix in RLS / `has_org_permission` using `geo_scope` bindings on memberships once case data exists.
2. **Read-only roles see change buttons.** Global Manager and Auditor can open admin/workspace pages where change buttons are visible (the database refuses the write, so nothing changes). Hide/disable those buttons using `rg_my_access` / `rg_org_permissions`.

## Incomplete integrations (not built — UI shows "not connected")
- Removal workflow: cases, findings, evidence uploads, AI analysis, approvals, submissions, platform responses, appeals — no tables yet.
- Review-platform connections (Google, Trustpilot, etc.) — none connected.
- Billing / payments — no provider.
- Notifications — none.
- Email delivery — invitations and password resets use manually shared links; no email domain set up.
- Also missing: password change, two-factor, session management, background jobs.

## NOT included in GitHub
- **Database records**: organizations, resellers, teams, memberships, invitations, audit events, profiles. Not backed up by Git and not independently verified as backed up.
- **User accounts** (auth users incl. the owner account and 14 `@ratingguard.test` demo accounts) and their passwords. Demo credentials live only in a private Lovable file, never in the repo.
- **Applied database state**: migrations in `drizzle/migrations/` are the source, but role/permission seed rows and the super-admin assignment were applied directly; regenerate role seed SQL with `bun run rbac:seed-sql`.
- **Storage files**: uploaded logos are hosted via Lovable Assets (`*.asset.json` pointers in repo, not the binaries).
- **Secrets**: service-role key, database password, `LOVABLE_API_KEY`, any connector keys. `.env` contains only public publishable keys/URL.
- **External configuration**: auth provider settings (email, Google, Lovable sign-in), redirect URLs, domains, hosting settings.

## Before launch
Remove or disable the demo accounts and `[DEMO]` organizations (one database serves preview and live site).
