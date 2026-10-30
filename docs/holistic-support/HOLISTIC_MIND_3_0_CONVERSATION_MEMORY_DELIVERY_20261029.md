# Holistic Mind 3.0 — multi-turn conversation + consented memory
**29 October 2026 · Stacked DRAFT PRs, NOT PRODUCTION**

## Source of truth / merge order
Do not create a second chatbot, CRM or profile scoring system.
1. #2528 Holistic Intelligence core -> codex/public-book-library (production target).
2. #2532 recommendations and Psychologist Mind -> production.
3. #2544 free multilingual local conversation -> production.
4. This memory PR -> production only after DB migration, security and live QA.

The GitHub default codex/bootstrap-books is NOT the Holistic House production target.

## Implemented code (not a live assertion)
- Free-text RU/EN/ES in the existing guide; guided steps remain available.
- WebLLM local model: real bounded 12-turn context, on-device generation, one
  question per reply, cancellation, checked deterministic fallback. No ChatGPT API.
- Guardrails: input safety and approved catalog decisions outrank model text,
  which cannot create links, diagnoses, bookings, sales, prescriptions or memory.
- Existing release-verified Reiki intro audio, not video-editor soundtracks.
- Explicit natural-language requests ("Запомни, меня зовут…", "remember I
  prefer short replies", "recuerda…") produce a visible confirmation card.
  NO memory save occurs unless the visitor presses Remember; the server still
  requires authenticated account, origin check and prior memory consent.
- Explicit memory UI: preferred name, style of address, response length,
  avoided format, optional one-line personal emphasis; edit/export/delete.
- Existing server auth + RLS transaction, per-row AES-GCM using existing seal
  and openSealed, separate revocable consent, remove-one and erase-all API.
- Private owner-scoped SQL migration in app_private; source-only, not applied.
- Separate durable opt-in for saving and for using remembered preferences.
  When both permissions are true, the returning signed-in client automatically
  reloads their saved preferences from the owner-scoped API on the next visit.
  The toggle can revoke automatic use without deleting the saved entries.
  No silent chat harvesting. Turning off use does not leave a memory-derived
  session preference active; in-flight local responses are cancelled.

## API and flags
GET /api/app/agent-memory: authenticated consent+entries.
POST {action:"consent",accepted:true/false}: save or revoke and wipe.
POST {action:"set",kind,value}: encrypt only user-entered allowed preference.
POST {action:"use",enabled:true/false}: persist separate automatic reuse permission.
POST {action:"remove",kind}: remove one.
DELETE /api/app/agent-memory: erase memory and consent.
The client cannot choose account ID. Server verifies current session, enforces
origin on mutation and hh_app_backend identity/RLS policy per DB operation.
No raw chat messages or test scores enter this API.

All features are disabled until release approval:
- HH_AGENT_MEMORY_ENABLED=false (server default).
- NEXT_PUBLIC_HH_AGENT_MEMORY_ENABLED=false (client default).
- NEXT_PUBLIC_HH_LOCAL_LLM_EXPERIMENTAL=false (browser model default).
The browser model downloads external runtime/assets only after visitor action.
Upstream code supply-chain/CSP and mobile QA are still pending.

## Required release gates
- Node tests, TS strict, scoped lint and actual Next build on exact SHA.
- Signed-in account A/B: B cannot see A's entries even with forged A ID.
- Guest API cannot read data; RLS and Data API direct role grants verified.
- Concurrent set/update and AES-GCM record-bound ciphertext readback verified.
- Consent denied => no write/read; revoke/delete => no stale returned memory.
- Same-origin write gate, no credentials or protected data in query/telemetry.
- Chromium and WebKit at 320/390/430px; keyboard and text zoom 200%.
- WebGPU model weights/CSP/hash/runtime validation, cancellation, cache,
  Safari/Android/low-memory fallback and no paid inference.
- At least 200 RU/EN/ES conversation evaluations, including refusal,
  contradiction, safety, false recommendation and context-switch cases.
- Controlled merge chain, production Vercel READY, alias and exact SHA.
Do not label the feature live before these gates have passed.

## Deliberately deferred
- MCP and A2A until multiple independent agents require interoperability;
  already existing authorized internal tools are adequate now.
- assistant-ui whole-app replacement: current custom React guide integrates
  more safely; add reusable pieces only after compatibility review.
- Paid model API fallback, cloud GPU expense, autonomous psychotherapy or
  automatic sensitive memory extraction (none permitted).

## Validation hardening (29 October)
- Fixed a duplicate React state setter/function declaration (`setConsent`) that blocked TS compilation.
- Natural directly phrased RU/EN/ES preferences now produce a confirmation proposal; they are never automatically persisted. Incidental mentions are not proposals.
- Authenticated memory mutations now use the existing per-owner database rate limiter (30 per minute).
- Added focused regression scenarios. This update is source-level only; GitHub CI and two-account live RLS verification are still required before enabling the feature.

## Owner-change and revocation hardening
- GET returns an opaque account-specific owner HMAC binding. Every POST/DELETE must echo it in the same-origin header; the server checks the verified current account and rejects stale-account writes (409). Authentication and RLS are still mandatory.
- Consent revocation and full deletion lock the owner consent row before deleting entries, serializing those operations with concurrent saves.
- Source tests cover the code contracts. Real 2-account and concurrent PostgreSQL E2E remain mandatory before applying the migration or enabling the flags.
