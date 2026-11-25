# Holistic House eBot · native Telegram voice to AI Companion text

Status: SOURCE CANDIDATE, NOT AUTOMATICALLY ENABLED. Implementation targets the
existing subscriber/client notification bot and its rules-based AI Companion,
merged via #3665. This is NOT the unapproved CRM video-render queue #3647.

## Client flow

1. /ai → versioned first-party AI consent → menu; plain text still works.
2. /voice → separate 15-minute privacy disclosure, RU/EN/ES.
3. Only a verified inline callback hhai:voice-agree grants audio processing.
4. Telegram native OGG/Opus voice note (max 60 sec, 2 MB) enters the signed,
   exact-bot private chat update. Owner audio/video, /start verification,
   /stop, /ai_off, practitioner Reply, CRM and materials retain priority.
5. Before consent, neither raw audio nor Telegram file_id is fetched or
   persisted. After consent, bounded encrypted file_id metadata enters the
   existing subscriber AI outbox; no extra storage or media bucket.
6. Existing worker checks AI+voice consent, free-tier flag and quotas before
   getFile. It limits Telegram file download, checks OGG/Opus magic and sends
   audio only to the separately approved Gemini Free Tier project.
7. Only the transcription, NOT audio, is put through the existing reviewed
   RU/EN/ES reply and urgent-risk routing. The bot responds in the same
   Telegram chat with “I heard / Я услышал” and an ordinary AI Companion reply.
8. /voice_off disables speech and suppresses queued STT. /ai_off and /stop
   additionally revoke speech; /stop preserves normal subscription revocation.
   Consent is rechecked after Google returns, before any reply is queued.
   Timeouts/unknown provider results are not automatically resent.

## No-cost / data-use gates

All gates default **OFF**, are server-only and require an operator-read
provider attestation. No paid fallback, new service, bot, cron or bucket.

- Existing HH_CLIENT_TG_LINK_ENABLED and verified actual bot credentials,
  signed webhook and non-owner role.
- Existing HH_SUBSCRIBER_AI_SCHEMA_READY, HH_SUBSCRIBER_AI_ENABLED and
  HH_SUBSCRIBER_AI_SEND_ENABLED after opted-in first-party owner-approved pilot.
- New HH_SUBSCRIBER_AI_VOICE_SCHEMA_READY after both additive migrations,
  verified private FORCE RLS and revised outbox kind constraint.
- New HH_SUBSCRIBER_AI_STT_ENABLED plus HH_SUBSCRIBER_AI_STT_FREE_CONFIRMED,
  and dedicated secret HH_SUBSCRIBER_AI_STT_GEMINI_KEY. Do not re-use the
  Council or Voice Studio API key or assume a billing-enabled project is free.
- Google Gemini Free Tier may process voluntarily submitted audio for
  improving Google products. All UI locales disclose this before opt-in.
  No medical or confidential recordings should be submitted. External
  provider acceptance != end-user read receipt.
- 30 global and 8 per-chat audio requests per day in the existing PostgreSQL
  rate service; provider 429 stops. Text chat incurs no STT charges.

## Migrations

The production app's subscriber AI base tables were **absent** when audited on
2026-11-06. The already-merged base migration
`20261106080000_hh_subscriber_ai_companion_v1.sql` contains a duplicated
`updated_at` declaration in the outbox. Fix that first (included in this
source change). AFTER protected merge and security review, apply this base
migration then the new additive voice migration
`20261106120000_hh_subscriber_ai_voice_consent.sql`. Do NOT set schema-ready
before verifying both tables, private grants, FORCE RLS and the two voice
consent timestamps. Neither source merge nor Vercel READY applies DB schema.

## Acceptance (must be evidenced before calling it LIVE)

- Node focused policy/voice tests plus exact-HEAD protected Core, Guard and
  Messenger Specialist and Vercel production READY on the merged SHA.
- Verified getMe/getWebhookInfo/allowed_updates for the actual subscriber
  bot, without setWebhook or touching a foreign bot.
- Signed, deliberately consenting test chat: /ai → consent → ordinary text,
  /voice → voice consent → RU/EN/ES real audio → text reply in the same chat;
  /voice_off and /ai_off preserve materials; /stop erases and stops.
- Duplicate and stale callback, owner command, forged bot, 429, network
  failure, quota, STOP-during-STT, denied consent, oversized/invalid Opus,
  response delivery unknown and third-account isolation tests.
- Confirm provider is non-billable for audio, quotas/usage, no raw audio or
  secrets in logs, and data-use disclosure.

No claim of production voice response is made by mocked tests or READY alone.
No personal video generation, XP charge or private test data is added here.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial;
post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES

## Revocation hardening — 6 November 2026

After STT, the encrypted outbox retains the distinct `voice_reply` kind
instead of converting audio-derived content into an ordinary `chat` job.
The `/voice_off` handler suppresses queued `voice` and `voice_reply`
work, and the final Telegram sender checks both AI consent and the current
STT consent/provider gate while holding the recipient session lock.
Ordinary typed messages continue uninterrupted. A message already accepted
by Telegram cannot be retracted by a subsequent revoke.

Apply `20261106151500_hh_subscriber_ai_voice_reply_revocation.sql` only
after reviewed protected merge. Recheck FORCE RLS and the outbox kind
constraint before enabling the voice feature.
