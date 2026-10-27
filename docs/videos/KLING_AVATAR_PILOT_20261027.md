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

API costs change. A provider-derived September 2026 reference quotes **0.4 units / $0.056 per second** for 720p standard, so a 20s test estimates ~$1.12, not a guaranteed maximum provider invoice. Verify current pricing in https://kling.ai/dev/pricing before enabling. The official API response can be delayed after a paid task was accepted; **do not retry a timed-out POST without checking provider history**. Task ID/external ID must be retained by the owner.

## Google connection is a separate owner authorization
Product uploader is already at https://holistichouse.vercel.app/admin/youtube-upload and supports a public Google Web Client ID set privately in the admin UI, browser OAuth and independently verified RU/EN channel pairing. Unattended Telegram video upload is another flow and requires a dedicated confidential Web OAuth client with JS origin:
`https://holistichouse.vercel.app`
and callback:
`https://holistichouse.vercel.app/api/admin/telegram-video/youtube/callback`.
Use the existing Google Cloud project https://console.cloud.google.com/apis/credentials?project=first-cascade-510215-n2 and never modify the Supabase Login Web OAuth client or use the unrelated Desktop publisher for a server callback.
The actual Google login/consent must be completed by the owner; credentials and YouTube refresh token must remain server-only. No YouTube video upload without independent real status/owner-channel/Unlisted verification. See books #623 and #2160.

## QA / acceptance
1. Focused unit/security contract tests, scoped ESLint, TypeScript and Next build; inspect current PR head and full diff.
2. Verify Kling API key validity through the real admin interface; flag OFF means **no paid request** (do not equate presence of an env-variable record with verified API balance).
3. Verify actual billing package and consent, enable the two flags only with approved limit, make one original 2–20s owner-only trial; check task receipt, media/voice output, lip-sync, real credits readback and storage; never infer this from mocked success.
4. Archive approved output to existing Google Drive master per ai-projects-brain #219; separately approve any YouTube/site publication; no new published video without QA.
5. Before claiming full Google E2E, confirm Web Client + owner Google consent, correct RU/EN channel identification, one real Unlisted video and anonymous playback on device.
6. Preserve all existing HeyGen digital twin/voice, 43 library outputs and working video embeds.

This feature is a *private pilot*, not a one-click replacement for 11 confirmed HeyGen public videos. It does not republish or rewrite any existing script and does not use medical/private client records.
