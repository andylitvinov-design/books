# Wave Telegram: native voice notes in the signed CRM bot

**Release scope:** @holistichouse_bot private chats, not @holistichouse
Telegram Business messages or the separately configured subscriber eBot.
The existing V3 Wave dialogue, STOP, quota, encryption and consent are reused;
no new chatbot, model, database table, bucket, cron, payment or new provider.

1. First chat follows the existing Wave consent flow. On a native Telegram voice
   note, Wave requests **separate, purpose-bound Groq Whisper audio consent**
   with localized inline buttons. No getFile or STT occurs before it.
2. After opt-in, each <=60 s / <=2 MB OGG/Opus note is downloaded only from
   verified Telegram file paths and streamed with a hard size limit. Existing
   Studio **free-attested** Whisper API and **shared 20/day, 3/min** quotas are
   reused; max 8/day/chat. No premium overages or automatic provider retry.
3. The transcribed words enter the SAME owner-encrypted V3 turn history and the
   SAME Wave native/role-mind/free-model/fallback pipeline as typed messages.
   The reply includes a short transcript preview so users can correct mistakes.
4. /voice_off revokes speech consent and cancels pending speech before final
   send. /stop cancels the entire V3 dialogue. These checks happen before
   download, after STT and after Wave inference.
5. The webhook never persists or logs audio, file IDs, tokens or raw transcripts
   outside the existing encrypted V3 conversation context. Unconsented and
   forwarded voice messages never become fake generic CRM leads.

**Feature gates (already-existing server environment):**
- Verified signed CRM Telegram webhook with V3 schema, auth, private RLS and
  Wave enabled; client must explicitly consent to the AI chat first.
- HH_AUDIO_STT_FREE_CONFIRMED=true
- HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED=true
- HH_FIRST_VIDEO_GROQ_API_KEY configured to an **independently attested
  non-billable free** Groq project. Do not toggle either safety attestation
  without actual provider/usage review, and never paste token values into logs.

**Acceptance:** isolated Node policy/STT tests, required protected Core/Guard/
Specialist and privacy checks on exact PR HEAD, protected merge into
codex/public-book-library, served Vercel production SHA/ancestry, and a real
consenting Telegram second-account test: existing text chat → first native
voice shows disclosure → Allow voice → fresh voice → transcript AND
contextual Wave answer → /voice_off → no further audio download or voice
reply → text still works → /stop suppresses everything. Provider 429/free
quota exhausted must fail closed and report unavailable, not bill.

A passed synthetic/mock test or merged PR is **not** physical Telegram LIVE.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial;
post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
