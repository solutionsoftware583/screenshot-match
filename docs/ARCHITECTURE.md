# Rating Guard — Architecture (Part 2 foundation)

Powered by Software Vala™

## 1. Repository audit (at start of Part 2)

| Area | Finding |
| --- | --- |
| Framework | TanStack Start v1 (React 19, Vite 7), deployed to an edge worker runtime |
| Package manager | Bun (`bun.lock`) |
| Styling | Tailwind CSS v4, tokens in `src/styles.css` (red/white brand) |
| Routes | Public pages top-level in `src/routes/`; signed-in pages in `src/routes/_authenticated/` (`/app/*`, `/admin/*`) |
| Auth | Lovable Cloud auth: email/password, Google, Lovable; client-only route gate |
| Database | Lovable Cloud Postgres. Before Part 2 only `profiles` existed |
| Migrations | SQL files in `drizzle/migrations/`, applied by the platform migration tool |
| Tests | Vitest: routing smoke test; added RBAC + env tests in Part 2 |
| Data layer | `src/services` returns empty data with `connected: false`; no screens read the new tables yet |
| Reference repos | ReplyBuzz / Tenex were **not** imported; no code reused, so no license obligations |

Working in Part 1: navigation, page search, filters/sort/pagination on empty data, form validation, sign-up/sign-in/password reset, sign-out.
Placeholders: every data list, integrations, billing, AI analysis, evidence upload, notifications.

## 2. Organization hierarchy

```text
Platform (super_admin, global_manager, auditor)          -> user_roles
└── Reseller                                             -> resellers
    ├── reseller_admin   (all of the reseller's clients) -> reseller_memberships
    ├── reseller_staff   (only assigned clients)         -> reseller_client_assignments
    └── Client Organization                              -> organizations (reseller_id nullable = direct client)
        ├── org_admin, org_auditor, client_user          -> organization_memberships
        ├── Geographic managers (optional per org)       -> geographic_scopes + organization_memberships.geographic_scope_id
        │     country → state → division → district      (geo_hierarchy_enabled flag)
        └── Teams (optional per org, teams_enabled)      -> teams
              team_manager, team_leader, team_member     -> team_memberships
```

Geographic levels and teams are opt-in per organization; nothing forces them.

## 3. Role-permission matrix

Source of truth: `src/lib/rbac.ts`, loaded into `role_definitions`, `permissions`, `role_permissions`
(`bun run rbac:seed-sql` prints the sync SQL). ✓ = granted, blank = denied.

| Permission | Super | Global Mgr | Auditor | Reseller Admin | Reseller Staff | Org Admin | Geo Mgrs | Org Auditor | Client | Team Mgr | Team Lead | Member |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| platform.view_all | ✓ | ✓ | ✓ | | | | | | | | | |
| platform.configure | ✓ | | | | | | | | | | | |
| resellers.manage | ✓ | | | | | | | | | | | |
| org.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| org.manage | ✓ | | | ✓ | | ✓ | | | | | | |
| members.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | |
| members.invite | ✓ | | | ✓ | | ✓ | | | | | | |
| roles.assign | ✓ | | | ✓ | | ✓ | | | | | | |
| teams.manage | ✓ | ✓ | | ✓ | | ✓ | | | | ✓ | | |
| geo.manage | ✓ | | | | | ✓ | | | | | | |
| cases.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ |
| cases.edit | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | ✓ |
| cases.approve | ✓ | ✓ | | | | ✓ | ✓ | | | ✓ | | |
| reviews.view / evidence.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ |
| evidence.upload | ✓ | | | | ✓ | ✓ | | | | ✓ | ✓ | ✓ |
| reports.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| billing.manage | ✓ | | | ✓ | | ✓ | | | | | | |
| audit.read | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ | | | | |
| client_portal.view | ✓ | | | | | | | | ✓ | | | |

## 4. Security model

- **Deny by default.** Every table has RLS on. Signed-in users get `SELECT` only, filtered by scope. There are **no** insert/update/delete policies: all writes must go through server functions that check `has_org_permission` and write an `audit_events` row.
- **Authorization lives in the database:** `has_platform_role`, `has_platform_permission`, `can_access_reseller`, `has_org_permission(uid, org, perm)`, `can_access_org` (all `SECURITY DEFINER`, not callable by anonymous visitors).
- **Integrity triggers:** a role can only be used at its own scope (e.g. `super_admin` can't be put in an org membership); team memberships must match the team's organization; reseller staff can only be assigned to that reseller's clients; `audit_events` is append-only.
- **Invitations** store only a `token_hash`; that column is not readable by app users.
- Platform roles are in `user_roles`, never on `profiles`.

### Known limits (to address in later parts)
- Geographic managers and team roles currently grant permissions organization-wide; narrowing to their geographic scope / team happens when case tables exist (Part 3+).
- No server functions for creating resellers, organizations, invitations or role assignments yet — the UI cannot write these tables.
- No first Super Admin is assigned. Assign one deliberately (see below) — never via the UI.

## 5. Environments

| Env | Where | Notes |
|---|---|---|
| development | Lovable preview | Same Cloud backend as published app today |
| test | `vitest` (`MODE=test`) | Unit tests, no network |
| production | Published app | Values injected by the platform |

Variables are listed in `.env.example` (placeholders only). Client values are validated by `parseClientEnv` in `src/lib/env.ts`. The service-role key exists only on trusted servers.

## 6. Checks

- `bun run typecheck`, `bun run test`, `bun run build`, `bun run lint` (CI: `.github/workflows/ci.yml` runs the first three).
- `db/tests/tenant_isolation.sql`: run in the database; it always rolls back and reports `ISOLATION_RESULT:ALL_PASSED` or the failed checks.

## 7. Git workflow

Lovable commits each change to the synced branch. Work locally on feature branches and merge via pull request; never force-push or rewrite history.
