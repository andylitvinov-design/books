# Holistic House — YouTube upload from My Practice (two channels)

Status: **implementation awaiting CI, production and real Google acceptance**. Reuse existing admin-only uploader at /admin/youtube-upload and its Google OAuth Web Client ID. Do not describe upload as confirmed live before real provider readback.

## User experience and scope

- EN/RU My Practice → Materials → YouTube; ES text mirror is prepared.
- Each signed-in **activated practitioner** can connect up to **two personally authorized YouTube channels**. The selected slot 1 or 2 is independent of Google email or the language of the interface. A Google account with multiple Brand channels must select the actual channel through Google's consent screen; verify its immutable UC channel ID, not a guessed handle.
- Google Identity Services token client requests scopes youtube.upload and youtube.readonly; this is **additional explicit YouTube consent**, not a replacement for the site's existing Google/Supabase sign-in.
- Users upload their own real MP4/MOV directly from their browser to Google with 8 MiB resumable chunks, optional description, title, AI/synthetic disclosure and child-directed flag. No video payload is proxied through Vercel or uploaded to the Holistic House server.
- Default and only selectable YouTube visibility is Unlisted. After a Google video ID is created, retries recheck/resume the same session or verify the same ID. No second video is intentionally created. Show link and copy it even while verification is pending. Only confirmed right-channel Unlisted videos are archived as successful.
- Server independently verifies OAuth channels.list mine=true and videos.list snippet.channelId, status.privacyStatus on save, not just React state or a success HTTP status. Wrong channel, Private/Public or unknown privacy yields hard hold.
- History shows only the logged-in practitioner's verified videos after reload. This does not publish to the public master profile, site video feed or course until a separate moderation/approval flow. Disconnecting a channel does not erase historical video links.

## Security and architecture

- Endpoint: GET/POST /api/app/practice/youtube; authenticated Supabase actor verified on the server and existing requireActivated practitioner check. Mutations enforce same-origin.
- Separate per-actor UUID Redis namespace holistic-house:youtube:practitioner:v1, **not** the existing global admin RU/EN uploader history. Pair channels with atomic HSETNX, disconnect with HDEL, idempotent history save with HSETNX by immutable YouTube video ID. Strict two channel slots. Private no-store/noindex headers; fail closed on Redis outage.
- Reuse the existing admin-approved public Google Web OAuth Client ID and Redis command transport. The site receives a short-lived OAuth access token transiently in authenticated JSON pair/save calls to independently verify identity and privacy, then discards it. It NEVER stores OAuth tokens, refresh tokens or passwords in the database, cookies, logs or analytics. The UI keeps token and resumable session in memory only. A browser reload therefore requires Google consent again.
- Scope Google OAuth CSP to /admin/youtube-upload and exact /en/app/practice, /ru/app/practice paths; do not allow Google API contact from client reports or unrelated cabinet routes. Emergency HH_YOUTUBE_PHONE_UPLOAD_ENABLED=false disables both.
- Google Cloud project, YouTube API permissions, OAuth consent, account/channel selection and real upload are owner-controlled steps. Do not create a duplicate Google Cloud project or enable paid Google billing without explicit permission.
- Never upload private client recordings or medical data to Unlisted YouTube; use the existing authenticated private client material system.

## Acceptance contract

1. Test tenant isolation, slot collision, idempotency, invalid input, Public/Private readback holds, backend authorization/same-origin, expiry, Redis outage and interrupted transfer. Run existing YouTube tests, TypeScript, lint, Next build, relevant cabinet/mobile regressions.
2. GitHub PR review and Vercel preview READY on the exact commit, verify responsive layouts 320–430 px, EN/RU (and ES translation when enabled), keyboard and screen reader labels.
3. With a genuine activated practitioner, sign in and connect a first and a second real channel; wrong-account choice must fail closed. Pair/disconnect/reconnect and reload should not cross tenant boundaries.
4. Upload only a new small **non-sensitive** test video via the website; assert real YouTube API channel ID and Unlisted, YouTube Studio processing and anonymous playback, persistence and Copy link. On upload interruption, confirm resumable bytes and no duplicate YouTube ID. Check no MP4/authorization persisted by the site.
5. Separately verify Vercel production READY, immutable deployed SHA, https://holistichouse.vercel.app alias and real owner device upload. Build, HTTP 200, mock, or merge is never sufficient proof of Google delivery. Keep owner acceptance issue books #623 open until E2E verified.

Existing admin uploader: https://holistichouse.vercel.app/admin/youtube-upload
Google Cloud Credentials: https://console.cloud.google.com/apis/credentials
YouTube API v3: https://console.cloud.google.com/apis/library/youtube.googleapis.com
Existing OAuth acceptance issue: https://github.com/andylitvinov-design/books/issues/623

2026-10-21 V4 integration: preserved the approved five-format material hub; video uploader opens inside Video as a compact expander rather than introducing a sixth tab. CSP navigation boundary and middleware now agree on a distinct practitioner-youtube CSP class so Google authorization works when entering My Practice from another private cabinet page; leaving returns to the restrictive private CSP. In-flight uploads protect tab switching and beforeunload until archived, avoiding accidental loss/re-upload after incomplete transfer. Server requires explicit confirmed=true for first channel pairing.

2026-10-21 backend repair: restored missing createPractitionerRepository.requireActivated(actor), already referenced by the existing private practice routes. It verifies a live Supabase user session through the existing transaction, active account, owned and active practitioner record and the canonical hasActivatedPractice(profile, first submitted service) contract. Legacy approved master access is retained; draft, suspended, missing or unrelated practices fail closed. No new data tables or privileged database roles were introduced.

Real camera footage: AI/synthetic-media disclosure checkbox defaults **off**; the practitioner must explicitly check it for realistic synthetic avatar/voice. Made-for-kids defaults off until selected. Status errors for wrong channel, non-Unlisted privacy, expired OAuth and pause are localized EN/RU/ES.

## 2026-10-21 phone-first video workflow

- One compact accessible dialog appears immediately from the Video section's Add action. The first row explicitly chooses Website or YouTube, without leaving My Practice.
- Website supports **link** (per-item public video material, profile moderation) and **local MP4/MOV** (the existing single profile video-presentation slot, capped at 25 MiB with the established signed upload + ready-state verification, then committed as a draft). It does **not** invent additional public file-gallery storage or promise unapproved website publication. When replacing a prior presentation the UI requests confirmation.
- YouTube opens Google login **within the same dialog**, selects up to two account-owned channels, and uploads directly from the browser using the existing resumable 8 MiB protocol. Only confirmed actual Unlisted in the correct channel enters the private per-practitioner history; publication on Holistic House is separate.
- Optional description/AI/kids controls are collapsed by default, keeping channel, Google connection, file, title, primary action above the bottom app nav. The dialog is constrained by the phone's viewport with an accessible scroll fallback for keyboards and shorter screens; a keyboard can necessarily reduce visible space. On iPhone 320–430 px retain >=44 px tap targets for main navigation, focus lock in the modal and safe-area space above the bottom bar.
- Existing site link saves must complete server-side before showing success. Uploaded video bytes do not transit Vercel; private client videos must never be sent to YouTube or the public marketing bucket.
- Exact Google OAuth user consent, YouTube processing/anonymous playback and physical-device usability remain E2E acceptance gates, not proven by source checks.
