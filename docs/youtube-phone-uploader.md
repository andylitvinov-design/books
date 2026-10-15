# Holistic House — iPhone → YouTube (EN/RU) direct uploader

**Release status:** implementation is gated by Google OAuth configuration and the owner's real iPhone acceptance test. No upload or channel authorization is inferred from passing CI. Administrative route: `/admin/youtube-upload` with existing practitioner authorization.

## User flow

1. Open the protected route on iPhone/Safari (or add its installable shortcut to the home screen).
2. Explicitly choose **Russian YouTube** or **English YouTube**, independent of interface language or whichever Google account is currently active in Safari.
3. Click **Choose Google / YouTube account**. The Google Identity Services account chooser appears. The uploader checks the authorized actual YouTube channel's immutable `UC...` ID against the selected destination. A mismatch blocks uploading.
   - Russian target is locked to the verified `@shamanic_academy` ID documented in `ai-projects-brain#219`.
   - English target must first be *explicitly paired* by signing in to the user's intended English channel and confirming its displayed channel title/handle/ID. Pairing is persisted server-side with `HSETNX`; once locked, an unrelated channel cannot silently replace it.
   - If the owner wants both language choices to use the existing `@shamanic_academy` channel (as in the 2026-10-02 publication SOP), this is allowed only by explicitly approving the same channel for English. Do not silently map languages to different channels or assume `@aatapro` without identity confirmation.
4. Select up to 10 local videos. Titles can be edited before upload. Default realistic-AI disclosure is ON, made-for-kids is OFF until explicitly selected.
5. **Upload visibility is fixed to Unlisted**. There is no Public button, Private button, auto-scheduling or website publishing in this app. YouTube may still return Private depending on its current API rules or account settings; read back the actual visibility and surface a warning.
6. Transfer files directly from the browser to Google's official `videos.insert` resumable upload endpoint. The site backend never receives the MP4. The 8 MiB chunking process can query the existing upload session after an interruption (while the same tab stays open), without blindly starting a duplicate upload.
7. On success, display a YouTube URL and **Copy link**. Save metadata through authenticated server actions into the existing durable Redis/KV store, dedicated namespace `holistic-house:youtube:phone-history:v1`, with title, language target, exact channel ID, video ID, URL, UTC time, requested Unlisted and actual returned privacy.
8. Show a **permanent upload history** on the same page, with All / Russian / English filters, sorting newest-first, direct YouTube link and **Copy link** action. Reloading the site or switching devices retains this server history.
9. A storage outage must disable starting new uploads rather than silently storing video links in browser-only memory. If YouTube succeeds but saving its record fails, keep the link displayed, show a prominent warning and a retry-save button. The link record is idempotent by YouTube video ID and cannot be forged for another target channel.

Previously uploaded media from YouTube Studio or Metricool does not automatically enter the *app upload history*. Existing site-managed videos and the previously approved six Unlisted originals must never be re-uploaded to populate the history.

## One-time Google Cloud activation

The authenticated Vercel project is `codex-public-book-library`, production `holistichouse.vercel.app`. Current production inspection on 2026-10-15 found none of the uploader-specific Google OAuth variables.

1. Find/reuse an owner-approved Google Cloud project; do not silently create duplicate credentials or enable billing. Enable **YouTube Data API v3**.
2. Create or reuse a **Web application** OAuth 2.0 client configured with Authorized JavaScript origin `https://holistichouse.vercel.app`. Configure the OAuth consent screen and authorize the channel owner's Google account if the app is in Testing. Include `youtube.upload` and `youtube.readonly` permissions.
3. Add to the correct Vercel project as production environment variables:
   - `HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID` — **public Web OAuth Client ID**, never a client secret.
   - `HH_YOUTUBE_PHONE_UPLOAD_ENABLED=true` — turn on **only after OAuth configuration and admin/secure-storage checks**.
   - The Russian destination is code-pinned to the last verified SOP ID. The English destination is stored using one-time user confirmation; no English channel ID or refresh token is guessed or stored in frontend code.
4. Redeploy the verified build. Sign into the existing practitioner cabinet. In Safari, choose Russian or English, authorize that channel and check the displayed verified title/handle. After English pairing, switch between both using the selector. Authorization for each account may be required at least once per browser session. Already authorized channels are reused automatically **in active page memory only**. Different Google accounts **cannot be switched without owner consent**.
5. Upload one *small, non-sensitive, new* sample from the phone as Unlisted. Verify the exact channel, actual status in YouTube Studio, anonymous playability, copy-link, server history after reload and the failure/reconnect behavior. Check YouTube Data API project verification and quota requirements. Do not claim Unlisted is externally accessible merely because it was requested in the API.
6. Run `node --test tests/youtube-phone-upload.test.mjs tests/youtube-upload-history.test.mjs`, `npm run build`, and review the dedicated CI workflow. Full-device / account-dependent testing still requires real owner Google authorization.

## Scope and safety

- Credentials (short-lived access tokens and upload session URIs) remain only in in-memory browser refs. **No tokens, refresh tokens or raw MP4 are sent to the website backend or persisted**. No Google password is collected.
- History consists only of non-sensitive YouTube metadata stored in dedicated Redis keys on the server behind `requireAdminRequest`. It is not exposed to public pages, sitemaps or client cabinets.
- Google tokens are scoped to upload/read-only and are kept separate for RU/EN while the app is open. If the identity is wrong or expired, re-authorize through Google. Do not silently upload to whichever Google account happens to be active.
- This is an **owner-only public-content tool**, never client-specific distribution. Private personal/medical videos belong in the existing authenticated Supabase client media system, not Unlisted YouTube.
- The original source video should remain on the phone (or be archived separately in Google Drive under the #219 master archive SOP). Uploading to YouTube alone does **not** constitute Google Drive archiving.

## Limitations / rollback

- iOS browsers may suspend large uploads when switching apps or locking the screen. Keep the site foregrounded, the screen awake and the network stable. The selected files, OAuth access tokens and resumable session are deliberately **not preserved across reload** to avoid durable sensitive token storage; confirm YouTube Studio status before re-uploading after restart.
- The YouTube Data API may enforce visibility restrictions independently of the requested Unlisted flag. Final readback is authoritative; report private/public/unknown status, never claim success if not verified.
- A channel mapping cannot silently be switched after pairing. Changing a channel later requires an explicitly designed owner-controlled re-pairing process (not implemented).
- Rollback by disabling `HH_YOUTUBE_PHONE_UPLOAD_ENABLED` in Vercel and redeploying. The UI remains safely unavailable; durable historical links remain intact.
