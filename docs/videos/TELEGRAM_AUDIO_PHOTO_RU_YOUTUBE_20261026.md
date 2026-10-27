# Telegram photos + audio → Russian YouTube (26 October 2026)

## 27 October 2026 — Dot video: choose RU / EN YouTube, receive a private preview and then link

In private `@Andydotbot`, send `/audio` and choose **🇷🇺 Видео → Русский YouTube** or **🇬🇧 Video → English YouTube**. This opens `/start video_ru` or `/start video_en`; `/video` also opens a channel chooser, and `/video_ru` / `/video_en` are typed fallbacks. Only the verified owner and signed Dot webhook may use these controls. The first **video** menu no longer shows private audio-storage folders; the distinct **Папки аудиотеки** button preserves existing folder import, /combine and /track.

The selected RU/EN destination is stored under forced RLS on the one owner job and cannot be changed after inputs arrive or rendering begins. User sends up to **15 photos + 15 audio/voice clips**, mixed chronologically; up to 20 MB input total, 120 seconds of audio and 50 MB final MP4. `/video_done` assembles 16:9 1080p H.264/AAC and sends a **private** MP4 for review. Only when the owner separately presses the preview button `▶️ Опубликовать: [chosen channel] · по ссылке` does the server initiate a YouTube upload. No auto-post merely on receiving media, no client/health videos, no stock avatars or paid API. Upload is Unlisted; successful `videos.list` channel/privacy/**processed** readback triggers a **YouTube watch link sent to the same Telegram chat**. `/video_status` re-sends an already verified watch URL or reconciles a known uncertain ID **read-only**, never issues a second upload.

YouTube authorization is **per language**, not a Vercel secret re-entry:
- RU: immutable channel `UCjWq6NHZTQkUr3bC3WbXXcw` (@shamanic_academy)
- EN: owner-known handle `@aatapro`, independently verified through YouTube Data API `channels.list(forHandle)` and authenticated `mine=true`; wrong/missing channel fails closed
- Admin OAuth start `/api/admin/telegram-video/youtube/start?target=ru` or `?target=en` reuses the existing confidential Google Web Client and owner-only PKCE challenge with target sealed in state, stores **separate per-target encrypted grants** in the existing protected table. No Google account consent can be fabricated from saved Client ID/Secret; browser/MetricooI connections cannot be silently reused as offline grants.
- RLS migration: `20261027195009_hh_owner_video_youtube_ru_en_destinations_20261027.sql`. Production database must be migrated and read back before deploying the new server.

Current acceptance remains **OPEN** until exact PR CI; Vercel production READY/source SHA/alias; real owner Telegram source→MP4; correct Google grant for chosen channel; YouTube `processed`/Unlisted/provider and returned Telegram watch-link evidence. Do not interpret successful tests or existing Metricool RU connection as video sent.

---

## Owner-only workflow

Use only the existing signed `@Andydotbot` practice webhook at `/api/app/notification-channels/telegram/webhook`. The separately verified personal owner numeric Telegram chat ID is required. Clients and CRM pilot guests never gain video creation/publishing privileges. The CRM `@holistichouse_bot` only redirects owner video commands to Dot; no duplicate bot or cross-bot media collection is allowed.

In the active owner-private Dot chat: `/audio` → **Аудио и видео** → **Создать видео** (or `/video`) → send 1–6 photos and 1–4 voice/audio attachments → `/video_done` or Assemble button → review the returned private 16:9 MP4 → explicitly press Upload to Russian YouTube. `/video_cancel` cancels a collecting/preview job.

**Ordered mixed-media montage:** send photos and audio in the intended sequence (e.g. photo A → audio 1 → photo B → audio 2 → photo C). All audio is concatenated in Telegram message order. The slideshow anchors each photograph at the cumulative duration of preceding audio (approximate timing comes from Telegram duration metadata, not speech recognition). Multiple consecutive photos divide the following audio stretch; trailing photos after all audio get a short outro inside the final audio segment. If the first photo is sent after some audio, it also covers that earlier audio rather than leaving a black screen. No per-item upload confirmations or extra rendering-progress messages: ordinarily the owner sees the initial video-mode instructions and then the rendered private MP4. Validation errors and explicit YouTube actions can create additional alerts. Do not assume the original individual files are separate client-cabinet materials.

Photo types: JPEG, PNG, WebP. Voice/audio: OGG, MP3, M4A, WAV with Telegram duration metadata. Total input max 20MB and soundtrack max 120s; session expires in 30 minutes. Generic audio documents without duration may be rejected; send them as a Telegram Audio attachment.

## Privacy and durability

- Owner only, exact private chat ID, signed Telegram webhook. Customer requests/CRM never trigger this action. No private client recording or healthcare-related material belongs on Unlisted YouTube.
- Metadata and state in app_private.telegram_owner_video_jobs, row locks and Telegram update deduplication; draft MP4 only in private hh-owner-video-drafts bucket, no public URL.
- FFmpeg locally converts media with H.264/AAC 1080p, no HeyGen credits or paid rendering API. Temporary input files deleted. Received bytes/magic verified; no arbitrary paths or subprocess shell.
- Video is never published by merely forwarding audio/photo. Owner must inspect the preview and press Upload.
- YouTube channel fixed to owner-confirmed UCjWq6NHZTQkUr3bC3WbXXcw (@shamanic_academy). Before uploading, query Google channels.list mine=true; after upload, verify Google videos.list channel, privacyStatus=unlisted and uploadStatus=processed. A wrong channel, privacy mismatch or merely `uploaded` (transcoding incomplete) fails closed and remains duplicate-safe for read-only reconciliation.
- Once a Google upload starts, ambiguous network failures are marked uncertain. Do not create a duplicate video; inspect YouTube Studio and check known video ID.
- Google offline refresh token stored AES-256-GCM sealed in app_private.telegram_owner_video_oauth, server-only role with forced RLS. No Google token or client media in browser, messages, logs or GitHub.

## One-time Google authorization

The existing /admin/youtube-upload iPhone uploader uses a browser access token; the Telegram bot cannot silently reuse it. Register a confidential Google OAuth Web Application in the approved Google Cloud project, with redirect:
https://holistichouse.vercel.app/api/admin/telegram-video/youtube/callback

Configure server-only encrypted production Vercel env values:
HH_OWNER_VIDEO_GOOGLE_CLIENT_ID (Web Client ID)
HH_OWNER_VIDEO_GOOGLE_CLIENT_SECRET (never share)
HH_OWNER_VIDEO_ENABLED=true ONLY after all privacy/provider acceptance tests.

The owner signs in at https://holistichouse.vercel.app/admin/youtube-upload and clicks the Telegram-video Russian YouTube connection. OAuth uses PKCE, CSRF nonce, offline consent, youtube.upload + youtube.readonly scopes; it verifies the exact Russian channel BEFORE storing the refresh token. No automatic public posting.

As of 27 October 2026, this server OAuth Web client still needs owner setup in the existing [Homeo Video Publisher Google Cloud project](https://console.cloud.google.com/apis/credentials?project=first-cascade-510215-n2). Do not modify the existing Supabase Login Web client or reuse the English YouTube Desktop client. The new confidential Web application needs origin `https://holistichouse.vercel.app` and the callback above. Set the client ID and secret in Vercel **Production-only** sensitive variables, redeploy, and complete owner consent. `HH_OWNER_VIDEO_ENABLED=true` alone is not authorization; no Google secret belongs in GitHub, chat or logs.

## Acceptance gate (NOT done merely by merge)

1. Run focused Node tests, TypeScript, lint, Next production build and Linux FFmpeg 16:9 H.264/AAC real render. Ensure compiled webhook stays within Vercel limits.
2. Safely apply supabase/migrations/20261026175000_hh_owner_telegram_photo_audio_video.sql. Verify forced RLS, denied anon/authenticated grants and private storage bucket by production SQL readback. Do not alter existing CRM/contacts.
3. Independently verify bot identity/webhook, correct admin Google OAuth refresh token and exact channel via Google API.
4. Send small synthetic photo + 2s audio from owner's private chat, receive private MP4, listen/view, confirm cancellation prevents upload.
5. Explicitly approve upload, verify Google videos.list Unlisted/readback, Studio processing and anonymous playback, durable RU YouTube history and Telegram link. Block duplicates on timeout.
6. Recheck ordinary Telegram audio combine, client messages, mobile 320/390/430 and existing iPhone uploader. Save public final master to Google Drive according to ai-projects-brain issue 219 publishing SOP before broader release.

## Rollback

Set HH_OWNER_VIDEO_ENABLED=false. Existing Telegram chatbot and client messaging continue unchanged. Google revocation occurs in owner Google Account. Private drafts remain protected pending retention cleanup.

Current release state must distinguish code landed, Vercel READY exact SHA, DB rollout, Google OAuth owner consent, actual media render, actual YouTube accepted processing and anonymous playback. None may be inferred from HTTP 200 or passing mocks.

## Final-only MP4 in owner cabinet (2026-10-27)

Completed video jobs create **one finished MP4** per batch in the private `hh-owner-video-drafts` bucket and owner-only `app_private.telegram_owner_video_drafts` table, not individual photos or audio. Input file identifiers are cleared from the working session after successful MP4 persistence; failed rendering can retry without losing sources. Multiple completed MP4s remain in the private owner history.

Owner `/admin/materials` → Telegram videos → Watch streams using authenticated same-origin `/api/admin/telegram-video/drafts/{id}/file` (GET/HEAD/Range), including iPhone Safari byte probes. Each request rechecks a persisted admin session and private RLS. No public or signed Supabase URLs, no user/client access. Apply migration `20261027020000_hh_owner_video_final_only_cabinet.sql` before shipping; verify forced RLS and `anon`/`authenticated` have no SELECT; confirm unauthenticated 404 and authenticated 206, no source files in My Materials. Production flag and deployed code do not establish provider acceptance: verify one real owner Telegram MP4 receipt, authorized iPhone playback, and separately approved Unlisted YouTube provider readback.

## Dot /audio → Audio and Video owner-only submenu (2026-10-27)

The existing verified `@Andydotbot` owner menu retains its `/audio` command but changes the description to **🎙 Аудио и видео**. In that submenu, tap **🎬 Создать видео из фото и аудио** or send `/video` in the same Dot chat. Send 1–6 photos and 1–4 audio clips (chronological order), tap **Собрать видео**, receive private MP4 in Dot, and find only the completed MP4 in owner `/admin/materials`. YouTube requires a separate review click and offline Google OAuth for the exact RU channel.

The existing signed Dot webhook routes owner-only video BEFORE ordinary audio imports. When video collection is inactive, all existing `/audio`, `/combine`, `/done`, AI Council and customer messaging remain untouched. Starting video while a Dot audio batch is still collecting/building returns a neutral warning without disturbing its inputs. `/audio` refreshes the owner-chat Bot API menu when either the command list OR its descriptions differ; global/client bot scopes are never modified. Official Telegram setMyCommands is provider-owned and client UI may cache it.

Provider acceptance is still required: genuine owner `/audio`, Bot API getMyCommands for owner chat, one real photo+audio → confirmed Dot MP4, owner cabinet iPhone playback; then separately authorized RU YouTube `videos.insert`, `videos.list`, and anonymous Unlisted playback. A green Node/FFmpeg build alone is not proof.

### Canonical bot isolation (2026-10-27)

**Only Dot now creates a video.** The previous owner commands in the signed `@holistichouse_bot` CRM webhook answer with a direct Dot link instead of starting/finishing/publishing shared jobs; photos and audio that arrive in the CRM bot are not enrolled in Dot video. This prevents cross-bot media mixing while preserving CRM enquiries. The entire `/audio`→video→MP4→explicit YouTube approval path is within the original `@Andydotbot` private owner chat. No client content or source media enters YouTube automatically.
