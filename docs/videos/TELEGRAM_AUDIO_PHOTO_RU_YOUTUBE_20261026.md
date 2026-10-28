# Telegram photos + audio → Russian YouTube (26 October 2026)

## Owner-only workflow

Use only the existing signed `@Andydotbot` practice webhook at `/api/app/notification-channels/telegram/webhook`. The separately verified personal owner numeric Telegram chat ID is required. Clients and CRM pilot guests never gain video creation/publishing privileges. The CRM `@holistichouse_bot` only redirects owner video commands to Dot; no duplicate bot or cross-bot media collection is allowed.

In the active owner-private Dot chat: `/audio` → **Аудио и видео** → **Создать видео** (or `/video`) → send 1–15 photos and 1–15 voice/audio attachments → `/video_done` or Assemble button → verify the **exact 3 photo / 11 audio (or other actual) manifest and total soundtrack** → press **Собрать весь проверенный набор** → review the returned private 16:9 MP4 → explicitly press Upload to Russian YouTube. `/video_cancel` cancels a collecting/preview job.

**Ordered mixed-media montage:** send photos and audio in the intended sequence (e.g. photo A → audio 1 → photo B → audio 2 → photo C). All audio is concatenated in Telegram message order. The slideshow anchors each photograph at the cumulative duration of preceding audio (approximate timing comes from Telegram duration metadata, not speech recognition). Multiple consecutive photos divide the following audio stretch; trailing photos after earlier photographs get a short outro inside the final audio segment; if every photograph is sent after all audio, distribute those images evenly over the **entire** soundtrack. If the first photo is sent after some audio, it also covers that earlier audio rather than leaving a black screen. No per-item upload confirmations. Pressing «Собрать видео» or sending `/video_done` **does not render yet**: the bot shows the accepted counts, bytes, exact total soundtrack and a confirmation button. This prevents a partial Telegram upload batch from being silently rendered. Additional arriving files invalidate any earlier confirmation token. Only pressing «Собрать весь проверенный набор» starts asynchronous MP4 rendering and Telegram's `sendVideo` message ID must be acknowledged before delivery is considered confirmed. A private draft is not evidence of Telegram delivery. Validation errors and explicit YouTube actions can create additional alerts. Do not assume the original individual files are separate client-cabinet materials.

If Telegram delivery is not confirmed, the private draft is still available in `/admin/materials`; send `/video_status` to see the saved/processing/failed state, then `/video_retry` or tap «Повторить доставку MP4» to resend only that MP4, with no re-render or YouTube upload. The private database records `VIDEO_TELEGRAM_PREVIEW_UNCONFIRMED` when the send fails, without storing recipient, source file IDs or tokens in logs. The owner-only cabinet requires authentication.

Photo types: JPEG, PNG, WebP. Voice/audio: OGG, MP3, M4A, WAV with Telegram duration metadata. Input caps are **15 photos, 15 audios, 90MB combined sources and 30 minutes combined soundtrack**. A 16th item of either kind, files >5MB per photo or >15MB per audio, or sources exceeding the other caps are rejected with a specific once-per-reason message. If any audio is rejected, inspect `/video_status` and **do not confirm** a partial set. Collection session expires 30 minutes after inactivity; rendering uses a bounded serverless worker. Output MP4 stays limited to 50MB, so a high-resolution/very-long sequence could still fail safely and needs a future asynchronous worker; this is not unlimited rendering. Generic audio documents without duration may be rejected; send them as a Telegram Audio attachment.

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

The existing verified `@Andydotbot` owner menu retains its `/audio` command but changes the description to **🎙 Аудио и видео**. In that submenu, tap **🎬 Создать видео из фото и аудио** or send `/video` in the same Dot chat. Send 1–15 photos and 1–15 audio clips (chronological order), tap **Собрать видео**, check the displayed exact photo/audio counts and length, then **Собрать весь проверенный набор** to receive private MP4 in Dot, and find only the completed MP4 in owner `/admin/materials`. YouTube requires a separate review click and offline Google OAuth for the exact RU channel.

The existing signed Dot webhook routes owner-only video BEFORE ordinary audio imports. When video collection is inactive, all existing `/audio`, `/combine`, `/done`, AI Council and customer messaging remain untouched. Starting video while a Dot audio batch is still collecting/building returns a neutral warning without disturbing its inputs. `/audio` refreshes the owner-chat Bot API menu when either the command list OR its descriptions differ; global/client bot scopes are never modified. Official Telegram setMyCommands is provider-owned and client UI may cache it.

Provider acceptance is still required: genuine owner `/audio`, Bot API getMyCommands for owner chat, one real photo+audio → confirmed Dot MP4, owner cabinet iPhone playback; then separately authorized RU YouTube `videos.insert`, `videos.list`, and anonymous Unlisted playback. A green Node/FFmpeg build alone is not proof.

### Canonical bot isolation (2026-10-27)

**Only Dot now creates a video.** The previous owner commands in the signed `@holistichouse_bot` CRM webhook answer with a direct Dot link instead of starting/finishing/publishing shared jobs; photos and audio that arrive in the CRM bot are not enrolled in Dot video. This prevents cross-bot media mixing while preserving CRM enquiries. The entire `/audio`→video→MP4→explicit YouTube approval path is within the original `@Andydotbot` private owner chat. No client content or source media enters YouTube automatically.

## 2026-10-27 · partial-video incident and recovery gate

Owner sent 11 audio attachments and 3 photos, received repeated 'limit' warnings and a short draft. Prior source limits (20MB / 120s) and single-tap render silently omitted media; the count 15/15 was unrelated to the hidden aggregate limits. The *existing* finished MP4 retains no source Telegram file IDs: after successful private saving, those IDs are deliberately purged, so the existing short draft cannot be reconstructed or silently re-uploaded. The owner must forward any missing media into a **new** video session once deployed, then verify the `11 аудио / 3 фото` manifest, total sound duration, and only then confirm. This does not grant YouTube publishing permissions. Use the 11-audio/3-photo >120-second FFmpeg smoke in CI; confirm the exact production SHA, signed bot receipt, all-file sound playback and privately delivered MP4 before reporting complete.

## 2026-10-27 · Фото без сжатия и привязка к предыдущему аудио

Новая последовательность: если фото пришло **после** аудио в private Dot, оно показывается **с начала предшествующего аудиофрагмента**, а не на пустом хвосте MP4. Серия фотографий после аудиофрагментов сопоставляется с предшествующими фрагментами в исходном порядке (последняя фотография — к последнему аудио). Когда фото было отправлено после всех 11 аудио, три фото прикрепляются к последним трём аудио, а первое доступное изображение покрывает предыдущий звук. Каждый кадр выводится без изменения пропорций, с square-pixel scaling и фиксированным DAR 16:9; для Telegram sendVideo передаются реальные размеры 1920×1080. Черный фон по бокам при вертикальном оригинале допускается: растягивание ради заполнения экрана запрещено.

Нужна реальная проверка новым owner-батчем: сравнить исходный рисунок с кадрами приватного MP4, убедиться в 11/3 и полном звуке, проверить отображение в Telegram iPhone. Старый черновик не изменяется, его исходные file IDs уже очищены. YouTube НЕ публиковать автоматически.

## Reviewed trim before YouTube · 28 October 2026 (pending provider E2E)

When Dot sends the full private MP4, inspect it and press **✂️ Обрезать начало**. Send `/video_cut 75` or `/video_cut 01:15` in the same owner-only chat to remove the first 75 seconds. Dot builds a **new private preview** from the immutable full MP4, then sends a separate version-specific button to publish only that cut. `/video_cut 0` restores the original, and `/video_retry` resends the currently selected version. Do **not** publish from an older Telegram preview after changing the cut: the server compares the button's seconds with the selected job version and rejects stale clicks. A new owner /video session clears the previous cut.

Originals stay in the owner-only drafts table and `/admin/materials`; trimmed variants are in the same private Supabase bucket, referenced only from the active owner-only job. No public object, no client media, no paid generation or unapproved upload. FFmpeg re-encodes H.264/AAC from the requested exact second (rather than copying at the nearest keyframe); it validates input/output MP4, 50 MB, and limited runtime, and never mutates the original. Owner must listen to/inspect the **trimmed preview** before explicit YouTube confirmation. YouTube privacy remains `Unlisted`. The user must complete legitimate Google channel OAuth; build success alone is not proof of publication.

Migration `20261028003500_hh_owner_video_trim_before_youtube.sql` must be applied to production before deployment. It adds `source_seconds`, `trim_start_seconds`, private `trimming` state, and safe cut path variants to the *existing* FORCE-RLS owner job; no new grants, table, auth or storage bucket. Existing older previews backfill duration from the already saved server title. Validate actual owner Dot → original MP4 → cut preview → consented channel → processed YouTube video with provider readback before marking provider E2E ready.

When a previous owner click selected **Не публиковать**, the original private MP4 is not deleted. A new explicit `/video_cut 0` reopens the stored draft; `/video_cut N` creates a new reviewed cut from the same original. It never silently reuploads canceled content.

## Free owner iPhone handoff while Google OAuth is unverified (28 Oct 2026)

Google's unverified OAuth warning cannot be bypassed by a server, and existing Vercel keys do not grant channel consent. Do not create duplicate OAuth apps or new paid providers. Metricool already shows the correct Russian channel, but its external API needs a paid plan and publicly accessible media. Never expose client MP4 through a permanent public URL.

Free fallback: in normal Safari, the verified owner opens https://holistichouse.vercel.app/admin/materials. The **current trimmed MP4** appears with a private player and **Download MP4** button, distinct from the preserved original file. The server validates that the immutable selected cut UUID belongs to the current preview job and rechecks the owner session on GET, HEAD and Range. A later changed selection invalidates the earlier link. It never exposes public or signed Storage URLs.

Review the complete sound and photos, download the selected MP4 locally, then open YouTube Studio and manually upload it to the actual Russian channel as **Unlisted**. Verify real provider processing and playback. This does not publish automatically or write a fake uploaded state. Never send clients' private materials or health information to YouTube. Native automatic Dot upload still requires the owner's one-time genuine Google channel consent.
