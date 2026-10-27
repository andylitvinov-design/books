# Telegram photos + audio → Russian YouTube (26 October 2026)

## Owner-only workflow

Use only the existing signed @holistichouse_bot CRM webhook at /api/app/crm/messenger/webhook/telegram. The separately verified personal owner numeric Telegram chat ID is required. Clients and CRM pilot guests never gain video creation/publishing privileges. The unrelated @Andydotbot audio bot and its webhook are unchanged; no duplicate bots or webhooks.

In the active owner-private chat: /video → send 1–6 photos and 1–4 voice/audio attachments → /video_done or Assemble button → review the returned private 16:9 MP4 → explicitly press Upload to Russian YouTube. /video_cancel cancels a collecting/preview job.

**Ordered mixed-media montage:** send photos and audio in the intended sequence (e.g. photo A → audio 1 → photo B → audio 2 → photo C). All audio is concatenated in Telegram message order. The slideshow anchors each photograph at the cumulative duration of preceding audio (approximate timing comes from Telegram duration metadata, not speech recognition). Multiple consecutive photos divide the following audio stretch; trailing photos after all audio get a short outro inside the final audio segment. If the first photo is sent after some audio, it also covers that earlier audio rather than leaving a black screen. No per-item upload confirmations or extra rendering-progress messages: ordinarily the owner sees the initial video-mode instructions and then the rendered private MP4. Validation errors and explicit YouTube actions can create additional alerts. Do not assume the original individual files are separate client-cabinet materials.

Photo types: JPEG, PNG, WebP. Voice/audio: OGG, MP3, M4A, WAV with Telegram duration metadata. Total input max 20MB and soundtrack max 120s; session expires in 30 minutes. Generic audio documents without duration may be rejected; send them as a Telegram Audio attachment.

## Privacy and durability

- Owner only, exact private chat ID, signed Telegram webhook. Customer requests/CRM never trigger this action. No private client recording or healthcare-related material belongs on Unlisted YouTube.
- Metadata and state in app_private.telegram_owner_video_jobs, row locks and Telegram update deduplication; draft MP4 only in private hh-owner-video-drafts bucket, no public URL.
- FFmpeg locally converts media with H.264/AAC 1080p, no HeyGen credits or paid rendering API. Temporary input files deleted. Received bytes/magic verified; no arbitrary paths or subprocess shell.
- Video is never published by merely forwarding audio/photo. Owner must inspect the preview and press Upload.
- YouTube channel fixed to owner-confirmed UCjWq6NHZTQkUr3bC3WbXXcw (@shamanic_academy). Before uploading, query Google channels.list mine=true; after upload, verify Google videos.list channel and privacyStatus=unlisted. Wrong channel and privacy mismatch fail closed.
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

Owner `/admin/materials` → Telegram videos → Watch streams using authenticated same-origin `/api/admin/telegram-video/drafts/{id}/file` (GET/HEAD/Range), including iPhone Safari byte probes. Each request rechecks a persisted admin session and private RLS. No public or signed Supabase URLs, no user/client access. Apply migration `20261027020000_hh_owner_video_final_only_cabinet.sql` before shipping; verify forced RLS and `anon`/`authenticated` have no SELECT; confirm unauthenticated 404 and authenticated 206, no source files in My Materials. Feature remains OFF until a real owner Telegram MP4 receipt test.
