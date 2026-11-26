# Goal Filter → encrypted Cabinet handoff, safe extraction of #2609
23 November 2026. Target: existing EN/RU/ES mobile filter and signed-in portrait Cabinet.
- Remove the nine-format step four; keep all published recommendation formats available. Preserve local Save, Next, Show recommendations and Reset.
- The final voluntary button is “Save data and take free tests”. On this explicit click only, validate bounded self-ratings and stage them in same-tab sessionStorage for at most one hour; no raw ratings in URL, OAuth state, CRM or analytics.
- Existing authenticated account check is `auth/contact-profile`; otherwise start existing Google PKCE with allowlisted `continueTo=cabinet`.
- On verified account load, reuse encrypted owner-scoped development-goals API with revision, POST and GET readback; clear staging only after readback equality. New optional supportProfile is in backend #5496; preserve vectors and lifeContext.
- No extra migration, new service, provider, email, payment or new Vercel deployment.
- This frontend PR is stacked on #5496. After parent protected merge, reconcile modern #5491 App Workspace and rebase safely without force-push, retarget to protected codex/public-book-library.
- Before LIVE: exact-head node tests, TypeScript/Next, browser mobile 320/354/390/430, RU/EN/ES, real signed-in/first-account Google PKCE, two-owner RLS/isolation and encrypted POST/GET; protected native merge and existing cost-capped hourly publisher only.
