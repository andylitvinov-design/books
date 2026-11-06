# Holistic House — Live Audio, техническое задание v1.0 (28.10.2026)

**Track:** #2419. **Status:** implementation in progress; no verified live media. GitHub `andylitvinov-design/books`, production branch `codex/public-book-library`, deployment project `super10/codex-public-book-library`, canonical domain `https://holistichouse.vercel.app`. The default branch is NOT production.

## Goal and product experience

Audio-only broadcasts from an iPhone/computer, without video, available at `/{en,ru,es}/live`. Users press a real **Listen** button; no autoplay, no registration for the first public/free pilot. Host opens `/{en,ru,es}/live/host` from the existing practitioner workspace, signs in, grants microphone permission, goes live, mutes/unmutes, ends the room. Listener sees real connection state, participant count and retry actions. Warm Holistic House styling, compact screens at 320–430px, keyboard and screen-reader accessibility, EN/RU/ES.

## Technical architecture and why

Pilot uses pin-version **LiveKit JS Client + Server SDK** with a managed LiveKit Cloud Free (or compatible self-hosted instance). LiveKit owns actual WebRTC media and temporary room presence. Vercel serves Next.js UI and same-origin token/status/end endpoints; audio NEVER streams through Next.js Functions, SQL, Supabase Realtime or CRM. We reuse existing Supabase Google authentication and owner authorization; no duplicated account/chat/order/CRM subsystem. Cloudflare Realtime SFU remains a separate, later cost optimization: its signaling API is not compatible with LiveKit SDK.

This first increment is a **single public, owner-only pilot room** with a verified owner host and subscribe-only anonymous listeners. No persistent scheduling, multi-master management, paid entitlements, client medical content, recording, or transcription. Room ID and participant identities must not contain PII.

## API contracts

- `GET /api/live-audio/status`: noncacheable `{enabled,live,listeners}`. When feature flag is off report disabled, not fake live. Status must be based on actual provider host presence, not UI clicks.
- `POST /api/live-audio/token`: limited JSON `{role:'host'|'listener'}`. Host requires verified current Supabase session + existing owner allowlist and optional account-switch header match. Listener requires a provider-confirmed live host and a free capacity slot. Same-origin request guard, existing rate limiter, no-store.
- `POST /api/live-audio/end`: owner-only verified, same-origin; server-side room delete to eject participants, idempotent when already ended.
- Server issues signed LiveKit JWTs with room-specific grants and 180s TTL. Host publish sources restricted to **microphone only**, no data publish, no room-admin token. Listener subscribe-only; no publication, chat, camera, metadata updates, recordings or access to client identities.
- Configuration: `HH_LIVE_AUDIO_ENABLED` OFF by default; `LIVEKIT_URL=wss://…`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` private server environment only. Missing/invalid credentials fail closed; never add to `NEXT_PUBLIC_`.
- Split prod/preview/local room IDs. CSP `connect-src` allows configured provider only for live pages; microphone Permissions-Policy allows self only on host page. Public pages, private reports and other cab pages retain existing policies.

## Phase plan

**P0 (this PR):** public listener and owner host, auth and server token, status/end, i18n, scoped CSP, existing cabinet entry, unit tests; disabled by default. No SQL migration needed because the single ephemeral public room is owned by the audio service. Strict capacity and long-lived tokens need real provider acceptance.

**P1:** multiple verified practitioners, events/calendar/room ownership and schedule; introduce `app_private.live_audio_rooms` with explicit encrypted/opaque ownership, FORCE RLS and minimal backend privileges; no clinician/private client mixing.

**P2:** protected course or invited-member rooms, server-verified entitlements, invite expiry/revocation, opt-in generic notifications. Public link never grants closed access.

**P3:** moderated two-way talk/raise hand, explicit host approval of publish permission, abuse and identity/permission tests; reuse existing Messenger if persistent chat is needed.

**P4:** paid access only after verified provider payment receipt (existing business service/order path), no PayPal/Stripe Business assumed, do not enable expenses without owner approval. Click/request/booking are not evidence of money received.

**P5:** optional recording and editable transcripts with separate per-participant consent, retention/deletion and vetted processing. Never place private media on YouTube/GA4/Meta or send health/test details in notifications.

## Acceptance / release gates

- [ ] Source branch and current production SHA confirmed; no conflicting unfinished PR overwritten.
- [ ] 3 locales; iPhone 320/390/430, Android, keyboard and screen readers; no autoplay; explicit microphone permission/error.
- [ ] Server role/mic-only/subscribe-only grants, account switch, CSRF origin, no-store, rate limit, invalid env, offline host and capacity tests.
- [ ] Scoped CSP and microphone header; no access for unauthenticated host; no anonymous ability to publish.
- [ ] CI targeted tests, lint, TypeScript and complete Next build; diff review; clean PR/merge then Vercel READY exact SHA+canonical alias.
- [ ] Separate approval/owner action: configure no-cost LiveKit account credentials in Vercel, two physical devices test real WebRTC microphone audio, mute, deny permission, Safari replay, reconnection, end/kick, no recording. **Do not activate the flag until this passes.**
- [ ] iOS background/call interruption and real payment must not be called supported based on browser mocks.
- [ ] Before private P1, review Supabase advisory about 12 `app_private` tables without RLS. Existing direct anon/auth table privileges were independently checked as absent, but review RLS/grants before new private tables.

Rollback: `HH_LIVE_AUDIO_ENABLED=false` immediately hides join capability; no paid/recorded data to migrate. A green build, 200 response or a UI badge is NOT evidence of a working broadcast.
