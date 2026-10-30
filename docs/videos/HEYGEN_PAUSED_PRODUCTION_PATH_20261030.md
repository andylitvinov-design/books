# Holistic House — Paused HeyGen Video 1 production pipeline

**Date:** 30 October 2026  
**Production branch:** `codex/public-book-library` (NOT GitHub default)
**Canonical client entry:** `/{ru,en,es}/holistic-support/mandala`
**Private result:** `/{ru,en,es}/app/videos`
**Owner administration:** `/admin/videos`

## Product/UX
1. Basic $0: browser-local procedural artwork (mandala, luminous light, lotus);
   four distinct timecoded animated stages, fades, real MediaRecorder export,
   existing 6 controls for music/photo/captions, no AI provider costs.
2. Smart $2 (proposed): 8 seconds of new 768p HeyGen Video 1 material.
   Pro $9.90 (proposed): 15 seconds of new 768p HeyGen Video 1 material.
   The 30-second **finished hybrid movie** still requires local/offline
   assembly around these short clips; DO NOT claim that it automatically
   becomes a completed 30-second cinema film yet.
3. Select Smart/Pro → the site compiles an editable English cinematic brief
   from explicitly chosen VISUAL motifs, palette, camera motion, and, when
   intentionally entered, visual description. Psychological goals, tests,
   assessment reports and private session data are never combined or
   auto-submitted to a provider.
4. The user can compile, edit, preview and **copy** the prompt while the
   paid function is paused. No submit buttons charge anything when disabled.
5. Once enabled and tested, a verified account can enter ONE unique gift/paid
   code; the server atomically claims it, issues a single HeyGen job,
   checks progress, plays the resulting MP4 and, after separate storage
   consent, saves it to the private `My AI Videos` page.
6. Public pages: an owner MUST explicitly approve a particular client-safe
   film and use the existing editorial video CMS with an approved public
   share/embed link or a rights-cleared owner-hosted public clip. Do not
   publish private result URLs or provider-signed CDN links on public pages.

## Official HeyGen contract (verified 30 October)
Model: **HeyGen Video 1**, NOT video-agent/avatar.
- POST `https://api.heygen.com/v3/models/videos`
  `x-api-key: <server secret>`, `Idempotency-Key: <durable job uuid>`
  body: `{model:"heygen-video-1",mode:"text_to_video",prompt,duration:8|15,
           resolution:"768p",aspect_ratio:"9:16"|"16:9"|"1:1"}`
- GET `https://api.heygen.com/v3/models/videos/{video_id}`
  using the same private API key, until `completed` or a terminal failure.
  A completed response contains a short-lived `video_url` at the provider
  CDN; validate the HTTPS hostname, content type and bounded MP4 bytes before
  storing or proxying. No arbitrary provider-supplied URL is fetched.
- References: https://www.heygen.com/ai-video-api and
  https://www.heygen.com/blog/heygen-api-guide
- HeyGen Creator WEB credits are not assumed to pay for REST API usage.
  Use separate developer API key and prepaid API budget. Standard 768p
  text-to-video $0.03/sec (not October discount); an 8s single pass is
  about $0.24 and 15s about $0.45, before rerenders and other costs.

## Paused by default: no paid renders from code changes alone
Both release switches MUST be explicitly `true` on the server:
`HH_VIDEO_PAID_ENABLED`, `HH_VIDEO_HEYGEN_RELEASE_APPROVED`.
Also requires `HH_VIDEO_HEYGEN_API_KEY` (new purpose-scoped API key)
and `HH_VIDEO_CODE_HMAC_KEY` (32+ bytes of separate secret entropy).
No key is returned to a client or checked into Git. On production neither
release switch is being enabled by this PR. Do not use the
`HH_COUNCIL_OPENROUTER_API_KEY` or other chatbot API credentials.

Private archival has a third separate switch
`HH_VIDEO_PRIVATE_ARCHIVE_ENABLED=true`, AND the existing
`HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED=true`. Both OFF by default.

## Payment/redeem safety
- Codes are cryptographically random and HMAC-SHA256 hashed at rest.
- An admin must verify an actual Square/PayPal/Wise payment receipt manually
  (or issue a user-bound first-Smart gift) before minting a code.
  **Not** a payment automation. A browser checkbox is NOT a PSP receipt.
- Gift code unique per recipient account, Smart only; paid reference unique
  per provider. Duplicate redemption returns the identical original job for
  the same user and exact visual-prompt fingerprint, never a second render.
- One transaction with Postgres row lock + RLS claims a code and reserves
  its job BEFORE any HeyGen API call.
- Unique outbound Idempotency-Key: persistent job UUID. Ambiguous network
  results are marked `unknown`, NOT automatically submitted again.
- Separate server-side account authentication, allowed-origin checks,
  rate limits, fixed model/duration/resolution, validated visual prompt and
  explicit permission to transfer visual text externally.
- Strict 8s/15s per-code cap; no user-supplied paid model, API key, wallet,
  duration, retries or per-request billing override.

## Receipt → video → private placement
- `POST /api/admin/videos/codes`: requires verified admin, the code is
  returned ONCE. Admin sends it privately after checking proof of payment.
- `POST /api/app/videos/generate`: signed-in account, one-time code and
  explicit provider consent. Provider POST only when both release flags on.
- `GET /api/app/videos/generate?id=...`: owner-only poll (GET never pays).
- `GET /api/app/videos/generate/content?id=...`: owner-only video response,
  provider URL is never exposed directly, archived clips are served by
  short-lived private signed storage access.
- `POST /api/app/videos/generate/archive`: separate owner consent and
  archive release flags. Fetch real completed MP4 with bounded 12MB maximum,
  validate format, SHA-256, upload without overwrite to private
  `hh-client-private-media`, record object key scoped to account and job.
- `/{locale}/app/videos`: play and download authenticated results on site.
  Existing site video editor `/admin/videos` requires explicit public
  editorial review; no automatic publication of private content.

## Data
Applied and versioned migrations:
`20261030042841_hh_video_one_time_codes_ai_jobs.sql`
`20261030050853_hh_heygen_direct_video_private_archive_v1.sql`.
Private tables have forced RLS, scoped backend role access, unique receipt,
unique code, unique external job and unique storage path. No additional
storage upload is performed merely by opening the editor.

## Release verification / remaining gates
- PASS: unit tests with synthetic HeyGen create/status/content responses,
  HMAC and duplicate-code contracts, prompt compilation and opt-in archive.
- REQUIRED before merge: CI lint, TS, Next production build, Chromium/WebKit
  free-video filmed frames and paused Smart/Pro browser check at exact HEAD.
- REQUIRED before actually enabling: purpose-scoped REST key + capped API
  prepaid balance, one manually authorized deidentified low-cost render,
  actual response readback, MP4 media QA, iPhone Safari playback, archived
  object readback in My House, sandbox or manually verified payment receipt,
  owner QA/publication rule, privacy/security and lifecycle budget review.
- Never enable paid or archival switches solely because CI/mock tests pass.
- Long 30-second Premium finished product needs an actual audio/video
  assembly worker, licensed footage sourcing, retries policy and QA before
  it is marketed as an automated one-click render.
