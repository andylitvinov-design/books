# Client Memory & Care Journey · implementation candidate v4 · 2026-11-06

**Release status:** staged source **only**. Feature flag `HH_CLIENT_MEMORY_ENABLED` OFF until protected checks, reviewed database migration, real two-account+two-practitioner RLS and Telegram identity validation. Existing foundation PR #2557 (preferences), #2613 (feedback), #3647 (Telegram queues), #3687 (messenger proof) must be reconciled; do not create a duplicate system or claim LIVE from source alone.

## Product flow

- A verified user independently opts in to long-term memory, then explicitly approves each non-sensitive fact/goal. No raw chats or clinical notes become saved facts. Separate opt-ins for sensitive records, reminders, sharing and external processing all default to false.
- Up to 150 encrypted records/user, each with UUID, origin, confirmation time, expiry, consent revision and owner-bound AES-256-GCM AAD. Export, edit, erase and consent revocation are owner-only. Recall is restricted to eight relevant, confirmed, unexpired records (no sensitive quotations in ordinary chat).
- A verified master with an active, approved practitioner account and a linked consultation request can **offer** an encrypted practical exercise. The client accepts/declines, records self-reported progress and a master can review. All task state changes use deterministic transitions, revision CAS and append-only events; internal `app.practitioner_request_tasks` is not repurposed.
- Site UI: `/<locale>/app/memory` (en/ru/es) plus a link from My Progress and master request view. Dialog bridge reads owner facts only in authenticated, safe, local-rules mode after explicit personalization authorization. Unlinked Telegram receives no private memory; /stop cuts off any future recall/delivery once identity-verified queue #3647 is approved.

## Source and verification

- `app/api/app/client-memory` and `app/api/app/client-care-tasks`: same-origin, verified session, RLS owner-scoped, rate-limited, private response cache headers, no client-selected master role.
- `lib/app/client-memory-store.js`, `lib/app/client-care-task-store.js`, `lib/holistic-support/client-memory-core.mjs` and dialogue adapter: encrypted storage and deterministic decisions.
- `docs/coaching/CLIENT_MEMORY_CARE_JOURNEY_DRAFT.sql`: **review-only** SQL. Do not execute on production. Create a real migration with Supabase CLI after reviews; verify grants and FORCE RLS in a real isolated PostgreSQL fixture.
- Focused local `node --test tests/client-memory-*.test.mjs` and `node --check` pass on the prepared source. All PostgreSQL, live OAuth, Next production compilation and Telegram E2E remain unverified until exercised on correct head.

## Acceptance / R0–R4

R0: Confirm one-root-one-PR, source owner and cost; reconcile foundation branches. R1: security-reviewed migration with real 2-owner and 2-master RLS, consent/delete/revoke and immutable bindings. R2: client task status/events, master-client request binding, cross-user negative HTTP. R3: website AI rules memory adapter and Telegram verified-account integration with STOP/retry. R4: one protected source publication, exact-HEAD Core/Guard/Specialist, verified Vercel served SHA and signed-in iPhone/Telegram E2E before feature flag ON.

**Stop if** identity or consent is unverified, draft status/lease unknown, unexpected paid services/builds, red required CI, missing migration, missing production schema, or unsafe personal data in logs. Never bypass checks to claim LIVE.

## Client Memory 2.0 — «Обо мне» / owner-authored questionnaire (2026-11-08)
Canonical product specification: https://github.com/andylitvinov-design/books/issues/1774#issuecomment-6715985895

Additive implementation only: `lib/holistic-support/client-memory-questions.mjs` defines 76 optional questions, 13 categories, RU/EN/ES prompts and a three-question entry sequence. `components/app/client-about-me.jsx` is embedded in the **existing** private `/[locale]/app/memory` workspace; existing My Progress links to this space. No second account, paid provider, test history duplicate or CRM personal-data export.

Storage stays in `app_private.client_ai_memory_items`, using an *encrypted questionKey within the existing row payload*, validated server-side against the allowlisted catalog and category. Confirm requires `userConfirmed:true`, live owner-bound memory opt-in and sensitive opt-in when applicable. Update preserves the encrypted questionKey; UI supports one question at a time, Skip/Back, edit existing answer and Forget. Existing owner-locked transactions reject duplicate confirmed question-key entries across tabs. The first three questions are purely optional; no marketing consent is inferred from answers.

**Privacy and release:** No automatic transcript extraction, no implicit health profiling, no unauthenticated Telegram/WhatsApp recall. Current grant/CONSENT and FORCE RLS requirements remain mandatory; the attached SQL RLS recursion repair candidate must pass disposable PostgreSQL 2-owner/2-master tests and review. Existing feature flag OFF until verified migration, exact-HEAD mandatory CI, Vercel served SHA, and real signed-in mobile acceptance.

**Not yet implemented here:** user-approved conversational proposal button wiring, durable per-question 'do not ask' setting, verified messenger sharing, manual personalized practitioner-per-record grant UI. Do not claim those flows LIVE from catalog/UI code.
