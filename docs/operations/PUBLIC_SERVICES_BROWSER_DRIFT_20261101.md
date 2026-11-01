# Public Services browser acceptance: current UI alignment — 1 Nov 2026

## Evidence and cause
The same broad `public-services` matrix failed on exact-head PR #2972, #2974 and #2975. Logs from #2972 run 41347980847 show missing outdated UI targets, not an independently proven messaging or navigation defect. Examples: recommendation button moved from left assessment to center profile; Home removed the old first-screen free-diagnosis banner; the Business route uses `DirectionOffers`, not the retired standalone finder; Holistic Support starts with three choices and mounts the Dao discovery only after a deliberate tap; public talisman catalog ratings are lazy-loaded.

## Focused correction without waiving safety
- Reuse reviewed, existing browser-verifier implementations from earlier open proposals #2641 (Support/Home/Holistic/Topics/Talisman) and #2272 (Business); verify source markers still exist on current production. No production UI, auth, CRM, RLS, analytics, payments, CI gates, required checks or provider requests are changed.
- Keep all original privacy gates and real browser scenarios; synthetic fixture traffic remains loopback-only and forbids external writes. Service worker interception is explicitly blocked where the suite stubs a published directory.
- Reiki and Storefront wait for real React hydration before clicking authenticated/consented public flows. Consent remains required, checkbox is genuinely clicked, and the synthetic CRM reference must be observed. Never fake checked/paid/sent state.
- Run Chromium/WebKit and exact-head production build before any protected merge, then independently verify Vercel LIVE exact merge commit. Any new assertion failure remains fatal.

## Owner acceptance
Restore `public-services` to SUCCESS only if every existing selected scenario actually passes. Do not relabel a failed specialist as advisory; do not bypass protected `hh-specialist`, `hh-core-verified` or legacy `release-ready`. This patch primarily repairs test-to-current-view identity. Keep the separate nav fix #2972 and six-tab AI design PRs #2974/#2975 independent until their own exact-head CI is green.
