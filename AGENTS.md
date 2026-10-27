<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- UI reads data only through `src/services` using types in `src/lib/contracts.ts`; components never contain fabricated records or business logic — keeps the swap to a real backend isolated.
- Until a service is truly connected it returns empty data with `connected: false`, and backend-dependent actions render disabled with a "not connected" notice — never fake success.
- Workspace pages live under `/app/*` and Super Admin under `/admin/*`, each with a layout route rendering `AppShell`; shared nav config is in `src/components/rg/nav.ts`.
- Admin access must be enforced server-side once auth exists; hidden navigation is not authorization.
