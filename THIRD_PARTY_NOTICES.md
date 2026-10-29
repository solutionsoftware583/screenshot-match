# Third-party notices

Rating Guard ports logic (rewritten in TypeScript/SQL, no files copied verbatim) from these MIT-licensed projects:

- **PrivacyScrub** — https://github.com/bmcgarybot/privacyscrub — Copyright (c) 2026 PrivacyScrub Contributors.
  Used: submission lifecycle (`models.py`) and reappearance/recheck window rule (`reappearance.py`) → `src/lib/caseflow.ts`, `rg_record_recheck`.
- **Tenex** — https://github.com/krishnikbarman/tenex — Copyright (c) 2026 the Tenex authors.
  Used: org-scoped approval state machine (`supabase/migrations/003_workflows_schema.sql`) → `rg_case_transition_perm`, `rg_transition_case`.

MIT License text (applies to both):

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Not used: Takedown Atlas (no LICENSE file), Sniffer/forensics-pipeline (no license), ReplyBuzz (nothing needed yet), Google review removal audit tool (fabricated success rates). Evidence SHA-256 fingerprinting was built independently.
