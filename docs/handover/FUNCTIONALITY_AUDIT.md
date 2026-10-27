# Rating Guard: Functionality Audit
Powered by Software Vala™ · Audit date: 27 Oct 2026

Status key: **Working** = connected to the real database and tested · **Partly** = page exists, some actions real · **Not connected** = only shows an honest empty state, and its buttons are disabled with a "not connected" notice · **Static** = information page, nothing to connect.

## 1. Summary
| Area | Status |
|---|---|
| Sign-up, sign-in, sign-out, password reset, protected pages | Working |
| Resellers, organizations, teams, invitations, roles, geography | Working (tested as 14 roles) |
| Role-based access in the database | Working (tested; see section 5) |
| Dashboards (workspace + Super Admin) | Not connected: same empty layout for every role |
| Removal workflow (discover → analysis → evidence → cases → approvals → submissions → responses → appeals) | Not connected: no database tables yet |
| Reviews, businesses, locations, integrations | Not connected |
| Reports, billing, notifications, email | Not connected: no payment or email provider configured |
| Profile and organization settings page | Partly: the profile edit button is disabled even though profile storage exists |

## 2. Route inventory
### Public pages
| Route | Purpose | Status |
|---|---|---|
| / | Landing page | Static |
| /features, /workflows, /pricing | Product information | Static |
| /terms, /privacy | Legal (placeholder text, clearly marked) | Static, needs real legal text |
| /login, /register, /forgot-password, /reset-password | Account access | Working |

### Workspace (/app)
| Route | Purpose | Data source | Disabled buttons | Status |
|---|---|---|---|---|
| /app | Overview dashboard | none | 0 | Not connected |
| /app/discover | Add content URL | none | 2 | Not connected |
| /app/reviews, /app/reviews/:id | Review monitoring | empty service | 0 | Not connected |
| /app/findings | Content findings | empty service | 0 | Not connected |
| /app/analysis | AI analysis | none | 2 | Not connected (AI not wired) |
| /app/evidence | Evidence vault | empty service | 2 | Not connected (no file storage) |
| /app/cases, /app/cases/:id | Case management | empty service | 2 / 3 | Not connected |
| /app/approvals | Approval queue | empty service | 0 | Not connected |
| /app/removals | Removal requests | none | 0 | Not connected |
| /app/submissions | Submission history | empty service | 0 | Not connected |
| /app/appeals | Appeals | empty service | 0 | Not connected |
| /app/businesses | Businesses/locations | empty service | 2 | Not connected |
| /app/integrations | Integrations | none | 2 | Not connected (no credentials) |
| /app/team | Members & roles, organization settings | database | 0 | **Working** |
| /app/teams | Teams, leaders, members | database | 0 | **Working** |
| /app/invitations | Invitations | database | 0 | **Working** (no email sending) |
| /app/geography | Country › State › Division › District | database | 0 | **Working** |
| /app/roles | Roles & permissions matrix | database | 0 | **Working** |
| /app/reports | Reports | none | 2 | Not connected |
| /app/billing | Billing | none | 0 | Not connected (no payment provider) |
| /app/notifications | Notifications | none | 0 | Not connected |
| /app/profile | Profile & security | none | 3 | Partly |
| /app/settings | Settings | none | 3 | Not connected |
| /invite?token= | Accept or decline an invitation | database | 0 | Working (tested in the database, not yet in the browser) |

### Super Admin (/admin)
| Route | Purpose | Status |
|---|---|---|
| /admin | Global dashboard | Not connected |
| /admin/resellers | Resellers, staff, client assignment | **Working** |
| /admin/tenants | Organizations | **Working** |
| /admin/users | All users and platform roles | **Working** |
| /admin/subscriptions | Subscriptions | Not connected |
| /admin/integrations | Integration health | Not connected |
| /admin/jobs | Background jobs | Not connected |
| /admin/audit | Audit logs | Not connected. The log *is* recorded in the database, but this page doesn't show it yet |
| /admin/config | Platform configuration | Not connected |
| /admin/support | Support queue | Not connected |

## 3. Button and action audit
- No button claims a success it didn't achieve. All 23 backend-dependent buttons on unconnected pages are disabled and say "not connected".
- Every action on the working management pages (about 40) saves to the database, shows a real success or error message, and is written to the audit log.
- Destructive actions (delete reseller, organization, team or region; remove a member, role or invitation) ask for confirmation, are permission-checked by the database and are audit-logged.
- The old placeholder organization switcher in the top bar has been replaced with a working one.

## 4. Issues found (in priority order)
1. **Super Admin pages open for any signed-in user.** Data on them is protected by the database, so nothing leaks, but the pages and menu still display. They should be hidden and redirect non-admins.
2. **Dashboards are identical for every role** and show no real numbers.
3. **The removal workflow has no database tables yet.** This covers cases, findings, evidence, approvals, submissions, responses and appeals, so the core product can't store anything.
4. **The audit log page doesn't show the recorded audit history.**
5. **The profile edit button is disabled** even though profiles are stored.
6. **No email sending:** invitations and password resets use links you share yourself.
7. **No payment provider:** billing and subscriptions can't work yet.
8. **Team Managers can manage every team in their organization**, not only their own.
9. **Regional managers aren't limited to their region's data yet.** This depends on case data.
10. **Demo accounts live alongside real accounts.** This project has one database for the preview and the live site, so the demo accounts exist on the live site too. Each has its own strong password; disable them before launch.

## 5. Tests actually run
| Test | Result |
|---|---|
| Code type check | Passed |
| Automated unit tests (11) | Passed |
| Database permission test (resellers, orgs, invitations, teams, geography, self-escalation, outsiders) | Passed |
| Tenant isolation test | Passed |
| Browser: create reseller, organization, team and invitation as Super Admin; data still there after reload | Passed |
| All 14 demo accounts sign in | Passed |
| Each demo account sees only its permitted organizations (the non-member "[DEMO] Other Org" is visible only to Super Admin, Global Manager and Auditor) | Passed |
| Each non-Super-Admin demo account is refused when trying to create a reseller (privilege escalation) | Passed (13/13 refused) |
| Phone and tablet layouts | Not tested |
| Accepting an invitation through the browser | Not tested |

## 6. Blockers needing you
- **Email provider:** needed for invitation, password-reset and notification emails.
- **Payment provider** (Stripe or Paddle): needed for billing.
- **Review platform access** (e.g. Google Business Profile API approval and credentials): needed for real discovery and submissions.
- **Real legal text** for the Terms and Privacy pages.

## 7. Recommended order for the next steps
1. Lock the Super Admin area to admins, and make dashboards role-based with real counts.
2. Removal workflow storage: businesses, findings, cases, evidence uploads, approvals, submissions, platform responses, appeals, all with permissions and audit logging.
3. AI analysis (built in, no key needed), clearly separating AI suggestions from verified evidence and human decisions.
4. Audit log page, profile editing, notifications.
5. Email sending, then billing, then platform integrations, once the providers above are chosen.
