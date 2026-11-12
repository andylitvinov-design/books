# Telegram AI Diagnostics V3 — Release plan · 2026-11-10

Canonical engineering issue: https://github.com/andylitvinov-design/books/issues/4286

## Delivered code
- Reuses existing signed CRM Telegram webhook, HMAC identity, owner-encrypted CRM and existing site free-review deep links (hhreview_ru/en/es). No new bot or second CRM.
- Explicit consent for third-party AI text processing, then a separate explicit confirmation before client text and summary are stored in the owner CRM.
- Non-clinical contextual, one-question-at-a-time interview, RU/EN/ES with automatic language adaptation. No mandatory photo or drawing.
- Per-session AES-GCM-encrypted rolling history, two consent timestamps, latest update deduplication, STOP, no unconsented marketing.
- Only live-catalog-verified zero-priced OpenRouter text model, provider data_collection deny, no fallback, max_price 0, observed response cost 0.
- Best-effort post-commit model execution via existing Next.after. Pending work expires after 120 seconds; unknown Telegram sends are not blindly replayed.
- Legacy six-step V1/V2 and generic rules-only AI Companion remain independent.

## Production gate
1. Repo and branch: andylitvinov-design/books · codex/public-book-library. Vercel project: codex-public-book-library. URL: https://holistichouse.vercel.app
2. Run Node focused tests, existing Telegram regression, required protected CI and production build.
3. Apply additive production SQL migration file 20261110224654_hh_crm_tg_ai_diagnostic_v3.sql to Holistic House Supabase project shervdixkaxurnaecioe. Verify FORCE RLS, private grants, stage and flow version readback. Do NOT drop historical data.
4. Set HH_CRM_TG_AI_V3_SCHEMA_READY=true only AFTER DB migration. Flag defaults OFF.
5. Provide a separately approved zero-cost key as HH_CRM_TG_AI_V3_OPENROUTER_KEY, or explicitly authorize reuse of the existing Council Free key via HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED=true. Never publish credentials or create paid services.
6. Independently verify actual free catalog and $0 provider result. Set HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED=true, then HH_CRM_TG_AI_V3_ENABLED=true, only with owner-authorized test coverage. No paid fallback.
7. Verify actual CRM Telegram bot getMe/getWebhookInfo signed first-party webhook, real iPhone Start, consent, natural free text, adaptive follow-up, summary, separate submission, owner CRM readback, manual owner response and physical Telegram receipt, STOP.
8. Check EN/RU/ES + within-session language switch, duplicate update, forged callback, wrong owner, paused feature, quota and failure 429/timeout/ambiguous send. Do not claim physical delivery from provider HTTP 200.
9. Confirm protected merged SHA and Vercel Production READY/alias. Existing V1/V2 sessions must continue.

## Rollback
Set HH_CRM_TG_AI_V3_ENABLED=false and redeploy without rolling back the additive migration or disrupting existing V2.
Existing CRM conversations remain with their existing data retention/erasure policies.

## Current boundaries
Text-only V3; voice/STT lives separately and needs independent CRM-specific consent.
Next.after does not guarantee job recovery after a process crash. The encrypted pending state avoids permanent chat locks; a durable recovery worker/receipt ledger is a later hardening project.
Do not declare user-facing LIVE without a real bot receipt and deployed SHA verification.
