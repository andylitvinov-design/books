# My Coach · 23 curated GROW prompts — safely extracted from PR #5233

Source: reviewed `#5233` (historical head `3d111fb0f953e30f2775fa19260f046bc7651ecd`) against protected production `1e3032b05c87a680168be7a4cf121d3eb8bf90ee` on 23 Nov 2026.

## Narrow release
- Reuse the **existing** production `coachSessionDirective` and its server-authorized GROW phase, one-question permission, missing client-authored evidence, safety overrides and optional 20-minute reflective close.
- Add the 23-versioned original RU/EN/ES question suggestions from the old draft. The model receives at most two candidates within the same authorized step and may ask **zero or one**; this is a phrasing aid, **never a phase advancement**.
- This PR intentionally does **not** import the old 23-file stacked #5233 branch, its alternate `session-authority.mjs` cookie system, its Supabase migration or a second provider, database operation, external inference or privacy grant.
- Old database migration `20261116231510` was reportedly applied separately. Verify actual migration version/table grants before adding reproducible schema source to protected production; **never reapply without reconciliation**.
- Keep current Gemini/Groq streaming and interruption, profile/axes, consented memory, PDFs, ratings and Samir motion untouched.

## Mandatory release gates
Focused Node tests; exact-head Coaching/Core, WebKit/Chromium, consent and security checks; verify directive fields match and no repeated or premature commitment question; native protected auto-merge only after green. Real multi-turn RU/EN/ES on physical iPhone remains separately unverified. Draft hold until P0 live microphone release #5447/#5466 settles and release owner reviews existing Director compatibility. No manual Vercel build or new paid services.

This scoped extraction is a *partial successor*, not evidence of parity with full #5233; keep #5233 draft until unique cookie/method state obligations are separately audited.