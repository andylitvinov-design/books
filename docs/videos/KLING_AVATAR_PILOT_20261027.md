# Holistic House — Kling Avatar owner-voice pilot (2026-10-27)

## Reason
Reuse the existing authenticated `/admin/videos` rather than creating a second media/publishing pipeline. The existing Kling 3.0 Scene Studio (#2258) is for public atmospheric B-roll; it is **not** a Digital Twin clone and does not accept the owner's authentic speech. This addition is a **separate, bounded Kling Avatar proof of concept** using *the owner's own single-person portrait and an authentic audio excerpt*.

## Current code path
`/admin/videos#kling-avatar-studio` (EN/RU/ES) -> owner selects JPG/PNG and original WAV/MP3/M4A/AAC voice -> browser locally downsizes portrait to JPG and uses Web Audio OfflineAudioContext to convert 2–20 seconds into mono PCM WAV 16 kHz -> POST to same-origin `/api/admin/kling-avatar` -> server checks admin session, Origin, three explicit consent flags, `KLING_API_KEY` and **BOTH** feature switches -> strict binary signature/real WAV duration verification -> one POST to official `https://api-singapore.klingai.com/v1/videos/avatar/image2video` -> owner receives task ID -> manual authenticated GET status -> private provider preview. **No automatic second charge, retry, Drive/YouTube upload, publication or client action.**

The endpoint restricts the test to **Avatar Standard 720p**, a single 2–20s excerpt, actual owner voice and a portrait of one consenting adult. It never accepts a URL, client report, private cabinet asset, Telegram bot attachment or CRM data. Browser-selected bytes transit the server once and go directly to Kling. They are neither stored in the app database nor logged. The frontend's conversion to WAV is local; full raw originals are not uploaded. The server accepts only JPEG/PNG magic bytes, verifies dimensions at least 300px, valid mono/stereo PCM WAV 16/24 bit 8–48 kHz with valid RIFF/data byte rate and 2–20s real duration, and enforces 950 KB portrait, 2.1 MB WAV and 3.5 MB total request-media limits.

Privacy: this is **explicit opt-in for owner-identified likeness and original voice**; users must not upload anyone else's face, patient photo, therapeutic speech or sensitive personal health material. Original source YouTube videos are not automatically deemed training-grade — verify continuous owner-only footage and no third-party faces/voices.

## Environment — fail closed
- `KLING_API_KEY` — server-only Kling official bearer token.
- `HH_KLING_PAID_GENERATION_ENABLED` — existing general public Kling scene-render switch.
- `HH_KLING_AVATAR_PAID_ENABLED` — **NEW**, must explicitly equal `true`, defaults OFF even when scenes are enabled. Avoid setting until the provider's actual balance, package, commercial license and spend cap are approved.
- Each click additionally requires three checked confirmations: identity rights, transmission to Kling, and **ONE charge**. A server-side max 20s Standard 720p reduces individual exposure; this does **not** enforce a total spend quota, so the environment switch must remain off until verified.
- Browser manual-only path: https://kling.ai/feature/avatars (no site API fee).

**API cost is not verified or capped by this code.** Provider points/units and reseller USD equivalents are not interchangeable, and may change. The user must independently verify their account's live per-second credits, commercial usage conditions, remaining balance and spending ceiling at https://kling.ai/dev/pricing before enabling either paid flag. A 20-second length cap reduces exposure but is **not a billing maximum**. The official API response can be delayed after a paid task was accepted; **do not retry a timed-out POST without checking provider history**. Task ID/external ID must be retained by the owner.

## Google connection is a separate owner authorization
Product uploader is already at https://holistichouse.vercel.app/admin/youtube-upload and supports a public Google Web Client ID set privately in the admin UI, browser OAuth and independently verified RU/EN channel pairing. Unattended Telegram video upload is another flow and requires a dedicated confidential Web OAuth client with JS origin:
`https://holistichouse.vercel.app`
and callback:
`https://holistichouse.vercel.app/api/admin/telegram-video/youtube/callback`.
Use the existing Google Cloud project https://console.cloud.google.com/apis/credentials?project=first-cascade-510215-n2 and never modify the Supabase Login Web OAuth client or use the unrelated Desktop publisher for a server callback.
The actual Google login/consent must be completed by the owner; credentials and YouTube refresh token must remain server-only. No YouTube video upload without independent real status/owner-channel/Unlisted verification. See books #623 and #2160.

## Owner-only no-charge provider verification

A **Check Kling API / Проверить Kling API** control now reads the server-only
`KLING_API_KEY` with `GET /account/costs` (Kling's free resource-usage API).
It uses the already-protected admin GET `/api/admin/kling-avatar?mode=connection`.
This performs **zero video-generation POSTs** and returns only a sanitized
connection result and whether any active video resource package is reported.
Provider amounts, secrets, provider account identity and raw provider failures
never go to the browser. The package statistics may lag up to 12 hours; a valid
key or active package is **not** a billing authorization, commercial-rights
approval or guarantee of sufficient balance. The two paid-generation switches
remain **false** by default, and an Avatar generation additionally requires
three per-render approvals plus the owner's selected media files.

## ChatGPT / operator workflow

This page is ready for authenticated computer-use/Work workflows: open the
existing `/admin/videos#kling-avatar-studio`, run the read-only connection
check, prepare already owner-approved photo and original voice, and only after
cost/identity approval submit one render and inspect its job ID.
The current ChatGPT conversation does **not** itself possess the owner website
session or a direct Kling plugin/tool. A deployed HTTP route is not an agent
connector or autonomous approval for credit spending; **do not** claim the
chat can submit billable Kling jobs automatically. Do not create a public
API endpoint, disclose API tokens or bypass admin auth to fake connectivity.

## QA / acceptance
1. Focused unit/security contract tests, scoped ESLint, TypeScript and Next build; inspect current PR head and full diff.
2. Verify Kling API key validity through the real admin interface; flag OFF means **no paid request** (do not equate presence of an env-variable record with verified API balance).
3. Verify actual billing package and consent, enable the two flags only with approved limit, make one original 2–20s owner-only trial; check task receipt, media/voice output, lip-sync, real credits readback and storage; never infer this from mocked success.
4. Archive approved output to existing Google Drive master per ai-projects-brain #219; separately approve any YouTube/site publication; no new published video without QA.
5. Before claiming full Google E2E, confirm Web Client + owner Google consent, correct RU/EN channel identification, one real Unlisted video and anonymous playback on device.
6. Preserve all existing HeyGen digital twin/voice, 43 library outputs and working video embeds.

This feature is a *private pilot*, not a one-click replacement for 11 confirmed HeyGen public videos. It does not republish or rewrite any existing script and does not use medical/private client records.

## Direct Kling control by an AI assistant (different from the site API)

The official Kling remote MCP server is **https://kling.ai/mcp**. It exposes
`who_am_i`, `text_to_video`, `image_to_video`, `query_tasks`, credits and
asset upload. This is the recommended **natural-language assistant path**
if the user's ChatGPT workspace permits full write-capable custom MCP. The
owner must explicitly add/authorize Kling via **ChatGPT web → Plugins → + →
Add custom MCP server**, then select the resulting plugin in a chat. A saved
`KLING_API_KEY` in Vercel **does not** authorize that separate personal MCP
OAuth session and cannot be silently reused. At the time of this work, no
connected Kling MCP tool is exposed to this ChatGPT conversation. On plans
without full write-capable custom MCP, use ChatGPT Work's authenticated
browser to operate the site admin or Kling web app instead; do not invent a
plugin connection or bypass user OAuth.

Important official distinction: Kling MCP/CLI **uses Personal paid credits**;
bonus/free credits and off-peak free generation are **not available through
assistant MCP**. Before the first paid task, explicitly review the correct
provider workspace and unit cost; keep the site paid flags OFF until separately
approved. `who_am_i` / credit readback is the no-render first check. A task
accepted by Kling cannot be canceled and direct-MCP asset links may expire
within **24 hours**; export QA-approved masters to the existing Google Drive
folder promptly, but never auto-publish them.

Official: https://kling.ai/app/mcp/guide
OpenAI custom MCP permissions: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
