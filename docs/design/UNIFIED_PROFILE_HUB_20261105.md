# Unified Profile Hub — Holistic House — 2026-11-05

## Exact views / screenshot identity
Owner's image compares two distinct bottom navigation contexts: seven-item public homepage footer (Profile formerly public /{locale}/personality-profiles) versus six-item app/Practice dock (Profile /{en,ru}/app/portrait, ES uses existing EN protected fallback). Preserve the existing six-item dock and its iOS fixed behavior; do not open a second browser window.

## One profile, no duplicate store
The single Profile entry from both mobile menus is the protected Cabinet /{en,ru}/app/portrait (guest-safe sign-in view). A compact four-tab subnavigation provides:
1. Create /{locale}/personality-profiles: existing public builder; four life-area profile types, real eligible tests, no fabricated score/instant generation.
2. View /{accountLocale}/app/portrait: existing saved reports, recommendations, development, plus compact recent five of ALL account-owned test attempts.
3. Results /{accountLocale}/app/portfolio: existing source-backed charts, categories, dynamics, links to full history and saved test detail.
4. Settings /{accountLocale}/app/settings: existing verified account preferences, linked login, messaging and consent, subscription and privacy modules.

Keep the hub visible for signed-out protected entry and on public creator. Retain protected auth and account-scoped app.assessment_results SQL query; guest never receives private scores. No new CRM, tables, messaging, automatic test sharing, providers, or diagnoses.

## Visual contract
Holistic Light Warm & Alive, ivory panel, emerald active state, four accessible 58px sub-tabs/icons and labels, 320/390/430px. No modal or iframe. Existing fixed six-button dock remains one on each profile route, with protected runner/document exclusions.

## Release
Add source/route/privacy regression tests and extend existing guest WebKit/Chromium browser script. Exact-HEAD Core, Specialist and hh-merge-check; Vercel READY matching merged SHA and physical iPhone standalone E2E required for LIVE. Authenticated real account test history separately verified. No pay-provider calls.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
