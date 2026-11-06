# Holistic House · Telegram Test Chat v1 (2026-11-06)

## Status and dependency
Native Telegram questionnaire feature. Independent source PR, with the exact same shared helper staged until **web Test Chat PR #3714** lands on `codex/public-book-library`; the native PR must not merge before its web dependency is reconciled. Reuses `lib/assessments/test-chat-flow.mjs`, registered `ASSESSMENT_DEFINITIONS`, `MONITORING_CATALOG`, and existing `scoreAssessment` (no new scoring logic, no new LLM or provider).

The feature is **OFF by default**, guarded by `HH_SUBSCRIBER_AI_QUIZ_SCHEMA_READY=true` and existing `HH_SUBSCRIBER_AI_*` consented client-bot flags. Do not turn it on before the migration is applied and verified. No new paid bot, cron, queue or hosting service.

## User experience

1. Existing Telegram Companion `/ai` consent and private bot/chat verification remain mandatory.
2. `/tests` or `hhai:tests` shows a small, pageable test catalogue (five per page); only rights-cleared, guest-eligible, authentic registered questionnaires. `/tests_off` and Stop revoke quiz data without disabling materials.
3. User selects instrument. Separate age-18 and temporary-storage consent is shown along with mandatory source instructions/notice. No answer is saved without explicit `hhq:g`.
4. One source question at a time, original phrasing and numerical response anchors. Long numeric (0–30) option scales use pageable 10-option keyboards. The next reply echoes `Спасибо. Принято.`, selected answer and next question. Stale replies using old revision never change data. Back allows editing the previous persisted answer.
5. Encrypted private answers live in `app_private.subscriber_quiz_runs`, one row per verified AI-chat session, with a 7-day expiration; `/stop`, `/ai_off`, `/tests_off` delete them. Expired rows are deleted by the **existing** Companion housekeeping worker. The user can separately delete already delivered Telegram messages from their app.
6. Self-harm risk response immediately pauses until acknowledgement, with existing advice to seek help; no automatic diagnosis and no false claim of live clinician monitoring.
7. Results are calculated exclusively on the server using the same `scoreAssessment` used by Web Test Chat and the canonical run APIs. The bot sends only a brief non-diagnostic overview of the first measures. The complete original result remains in encrypted quiz data, not in AI dialogue history.
8. Results **do not auto-sync** to My House: no inferred account binding from username/chat ID. A later phase may enable explicit transfer only through the already verified Google ↔ Telegram identity bridge and user-approved transfer. Telegram consent is separate from AI chat and marketing consent.

## Safety constraints

- Telegram parser requires exact bot username, private chat, sender=chat, unique update ID, only known callback prefix and max 64-byte callback_data.
- Quiz commands have strict grammar: `hhq:m:N` (catalog page), `hhq:s:N` (test index), `hhq:g:TEST_KEY` (separate consent bound to exact instrument), `hhq:a:REV:VALUE` (one answer), `hhq:p:REV:PAGE` (numeric options page), `hhq:b:REV` (back), `hhq:k:REV` (risk acknowledgement), `hhq:r` (result), `hhq:n` (new test), `hhq:x` (stop). No account identity, token, or sensitive text in callbacks.
- Advisory repeat and stale protection: same event ID deduped by existing subscriber session; revision checked against single DB row under the same transaction/lock. Outbound messages use existing encrypted `subscriber_ai_outbox` kind `tests`. Unknown sends are not blindly retried; `/tests` reopens current question.
- Risky/extra-consent trauma screening or rights-restricted methods are not offered for Telegram delivery; use protected website runner. Original ASRS-6 shaded markers and CDC 0-day consistency rules reuse already-approved Web Test Chat presentation helper.
- No external LLM receives answers. No raw answer transcript is appended to AI dialogue logs, event metrics or public reports.
- `subscriber_ai_sessions` existing opt-out paths and owner-bot protections are preserved.
- Rate cap limits excess Telegram messages while allowing 115-question tests; no paid broadcasts.

## Production rollout

1. Merge #3714 with required exact-HEAD checks; verify website LIVE before announcing a native Telegram release.
2. Publish this PR from the then-current protected website branch after local policy tests and one atomic source update. Let Core/Specialist/security/browser tests run; do not disable or bypass `hh-merge-check`.
3. Merge native PR only once protected checks pass.
4. Apply SQL migration `20261106174500_hh_subscriber_quiz_private_v1.sql` through the connected Supabase project, verify single table, RLS policies, backend grants, and select/insert permissions for the existing `hh_app_backend` role. If the migration pipeline already applied it, *verify*, do not reapply.
5. Enable `HH_SUBSCRIBER_AI_QUIZ_SCHEMA_READY=true` only in production after schema verification, using the existing Vercel project environment configuration. Do not expose secrets or incur new paid provider usage.
6. Using an opted-in **test chat**: check callback identity, /tests, page 2, consent, 0 answer, mid-test interruption, refresh via /tests, back/re-answer, final result, duplicate callbacks, outdated revision, /tests_off and /ai_off, risk warning, owner chat isolation, and consent revocation. Verify real Telegram delivery receipts, privacy, and deletion.
7. Record exact merged commit, Vercel READY deployment, correct production alias and functional Telegram E2E evidence before claiming LIVE.

## Further improvements (separate scope)
- Verified signed-in account ↔ Telegram transcript import with optional consent and audit trail.
- Voice answers after independent voice consent, STT confidence and explicit final answer confirmation.
- Cross-device continuous My House results only when explicit consent and verified identity links exist.
