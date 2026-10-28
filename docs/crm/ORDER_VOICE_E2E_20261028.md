# Holistic House · аудиосообщения по заказу · 28.10.2026

Scope: existing [`/{en|ru|es}/app/messages`](https://holistichouse.vercel.app/ru/app/messages), `PracticeRequestConversation` (used for the customer **My orders** and the practitioner **Clients**). Task [#985](https://github.com/andylitvinov-design/books/issues/985), initial [#2412](https://github.com/andylitvinov-design/books/pull/2412).

## User experience

- Open one existing order; text and audio are **in one request-bound encrypted conversation**, not in a separate general chat with the same master.
- Tap microphone (requires Safari microphone consent), record for at most 120 seconds, stop, preview, delete or explicitly send; alternatively choose an existing audio file. No auto-send or public reuse.
- The sender sees the new audio bubble with playback after the server confirms the single message record; the recipient sees the same audio in that order. Multiple orders with the same practitioner never share message history.
- An existing closed/completed order keeps history but cannot accept new messages/media; no claim about booked/paid state. EN/RU/ES, iPhone 320–430px and safe-area keyboard layout follow existing request chat.
- Files are stored in existing private Supabase bucket `hh-member-direct-media` under isolated `orders/<account>/<asset>.<ext>`. Message text and attached asset ID remain sealed in the request message. An audio file is **never** automatically copied to CRM Contacts or clinical profiles.

## Security and backend

- Additive migration `20261028162155_hh_request_bound_voice_media_20261028.sql`: new `app.practitioner_request_media` table, FORCE RLS, only `hh_app_backend` column-limited grants; no browser SQL access.
- Participant check reused from existing `lib/practitioners/client-messages.js`: owner of the actual consultation request or its verified active assigned practitioner only. Outsiders receive 404; client cannot view private master notes.
- Two-stage upload: `POST /api/app/practitioner-client-messages/media` intent → ≤3MB same-origin bounded PUT for iPhone, or existing signed private Storage upload for larger files → server checks actual stored size, MIME and byte signature → complete → message send attaches the same asset once, atomically.
- Auth cookies, account-ID binding, same-origin enforcement, rate limit, no upsert, 3 pending intents max, capped file size and 120-second mic recorder. Message operation ID survives a lost response; a conflicting asset cannot be attached twice.
- `GET /api/app/practitioner-client-messages/media/[assetId]` repeats participant + exact order/message ownership checks, then proxies short-lived private audio through the site origin (Safari Range supported). No public signed Storage URL or external messenger transport.
- Neutral existing push/Telegram alerts remain notification-only; no health/test text or audio forwarded to those channels.

## Release and E2E acceptance

1. Migration applied to **holistichouse** project `shervdixkaxurnaecioe`; verify FORCE RLS, actual policies and app backend grants.
2. Source tests, existing request message integration, lint/typecheck, Next build, PR diff + hosted CI, merged into actual `codex/public-book-library`.
3. Confirm Vercel production **READY**, exact release SHA and `holistichouse.vercel.app` alias. Anonymous messages page HTML GET 200; private order media upload and playback return 401 without auth.
4. **Real two-account verification (not replaced by mocks)**: consenting client A creates one order with master B, records 10–15s on physical iPhone, explicitly sends, B opens the **same** order and plays; B replies voice; A plays; create another order and verify isolation. Signed-out and third-account C cannot read either audio (401/404). Refresh and Safari background/foreground do not duplicate upload. Native iOS/Android additionally only if actually installed/tested.
5. Check actual recipient push receipt separately; do not count stored message as external delivery or a paid booking. Do not create real client interactions for QA without opt-in.

**Status:** code/test evidence and deployment must be updated after live check; before physical two-account test claim `source live` only, not end-to-end audio delivery.
