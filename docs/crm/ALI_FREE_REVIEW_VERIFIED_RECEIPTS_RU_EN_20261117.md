# Holistic House · Ali Free Diagnostic: verified receipt journey (RU / EN)
Date: 2026-11-17 · Source candidate, not LIVE acceptance.

## Source audit
Verified repository: `andylitvinov-design/books` protected `codex/public-book-library`.
Existing V2 (legacy) `lib/crm/telegram-diagnostic-v2.mjs` supports optional portrait, written answer and drawing, then a signed 60-minute coaching questionnaire. The newer, merged V3 Free Diagnostic already uses a natural six-stage RU/EN/ES interview but originally refused images and had no confirmed form receipt. The change connects the newer V3 **only**, without deleting V2, bypassing its consent/STOP/CRM guards or creating a second bot.

### Canonical client path
1. User opens `/start hhreview_{ru,en}` on the **existing** `@holistichouse_bot`. Bot explains free non-clinical scope, protected answer storage, possible neutral owner progress messages, optional photos processed also by Telegram and separate final approval. Choose explicit Start.
2. Six conversational fields (goal, challenge, situation, impact, attempts, support). Each answer is stored in the existing owner-encrypted `crm_tg_diagnostic_sessions.ai_context_ciphertext`. The already-existing local first-party Free Diagnostic + Reaction Mind answers actual questions before advancing fields. On new accepted field, a neutral owner notice (no message content) is eligible.
3. On **Finish interview**, the V3 bot offers optional portrait upload, max 5 MiB JPG/PNG. The signed media ID/declared size is stored **pending** only; the post-commit job downloads the actual bytes through the existing protected Telegram media proxy and checks actual size and JPEG/PNG magic. Only then does the encrypted context mark `received` and notify owner; otherwise it asks politely to resend. Explicit Skip records `skipped`, distinct from `missing`.
4. On portrait received/skipped, next offer is optional photo of “Me — Goal — Obstacle” drawing. Same actual bytes check, skip and polite resend. Without a reliable image content model, the bot never claims to understand a face, diagnose energy, or interpret a drawing. Image type follows the explicit step requested.
5. The client sees the **factual draft summary** from their own words and can edit or decline. Only the separate **Send for personal review** action writes confirmed summary and verified photo references into the EXISTING owner-encrypted CRM conversation. Each CRM write must return `saved=true` before V3 stage is recorded `done`; anything else rolls back.
6. Once the CRM transaction commits, the bot issues a new 60-minute, AES-GCM authenticated `h2.` Telegram-specific coaching form handoff. The URL fragment holds a short-lived opaque token, never a chat ID, raw text, photo or telephone number. The first-party form `/{locale}/coaching/intake` in free mode does not demand phone/email or upsell and sends all required responses through `/api/coaching-diagnostic/telegram`.
7. The form backend verifies h2 against the exact existing consented V3 session (owner/account/user/context/scope/locale/expiry) under the same advisory STOP/session lock, stores all questionnaire chunks atomically in the existing CRM thread, then records a bounded `formReceipt` in the encrypted V3 session. Only after commit does the web page say **saved** and queue a neutral owner notification. A lost HTTP response reuses an idempotent operation ID; repeated form receipt returns the original reference instead of duplicating data.
8. At any time, `/status` (or “Всё получено?”, “Did you receive everything?”) reports individual receipt statuses from the encrypted session: answers, personal photo, drawing photo and questionnaire. “Я отправил анкету” or “I submitted the form” yields a **verified** success only if `formReceipt` exists; otherwise a polite reminder to check the Send button and issue `/form` for a fresh secure link. Expired form pages explain how to renew the link.
9. The existing owner opt-in `@Andydotbot` gets a neutral, **HMAC-anonymized FR-XXXXXXXXXX case code** on per-stage notices. The same code is stored with the client-approved CRM summary to allow matching. Owner notices include received/skipped and confirmation only, never client words, photo or private Telegram identifiers. Notifier refuses wrong owner, disabled pilot, missing actual receipt or STOP and deduplicates event codes. Telegram API acceptance is not proof that owner has read it.

### User-facing statuses
- **Получено / Received:** only after an actual consented encrypted write/real media byte verification, or atomic form save.
- **Не получено / Not received:** missing or unverified; never guess from the user's “I sent it”.
- **Пропущено / Skipped:** explicit optional photo/drawing refusal; do not nag the client to send again.
- **Повторите, пожалуйста / Please resend:** invalid/oversized/failed media, expired form link or unconfirmed submission; keep previously confirmed steps intact.

### Privacy and safety
No new tables, external AI provider, recurring scheduler, Vercel project or paid preview. Retain existing webhook signed ingress, encryption, RLS, rate gates, consent, STOP, idempotency and separate owner pairing. Do not send personal photos or private reports into `@Andydotbot` alerts; the master can access them only via authorized CRM. No image-derived health, personality or psychological conclusions. Photo/drawing participation remains optional; missing does not imply illness.

### Acceptance checklist (not satisfied by code review alone)
- [ ] Exact-HEAD Core + CRM specialist + protected `hh-merge-check` pass
- [ ] Protected merge to `codex/public-book-library`, then scheduled hourly Vercel Production serves matching SHA
- [ ] Two real Telegram accounts, one for new RU client and one for new EN client, exercise consent + complete answers + skip + JPG and PNG uploads, invalid/oversized file and retries
- [ ] Verify client visible status matches private CRM receipt after actual remote provider acceptance
- [ ] Confirm user approval binds summary and photos; no premature private CRM attachment transfer
- [ ] Verify h2 form in mobile Safari, expired URL renewal, full answers persisted and receipt visible via `/status` for same user
- [ ] Verify 6-stage neutral owner notices are accepted by real opted-in `@Andydotbot` and reference matches CRM; test suppression/STOP and duplicate retries
- [ ] Separately verify physical personal Telegram Business `@holistichouse` `can_reply` before enabling its unrelated automatic replies; this feature itself uses the bot `@holistichouse_bot`
- [ ] No new paid Vercel builds; use the normal protected publisher only

**Honest status:** source implementation + local tests are not a physical end-to-end proof. Do not announce live without checks above.
