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
5. **Upload visibility is fixed to Unlisted**. There is no Public button, Private button, auto-scheduling or website publishing in this app. The actual YouTube readback is authoritative. A Private, Public or unknown result stops the remaining queue; never treat the requested visibility as proof of success.
6. Transfer files directly from the browser to Google's official `videos.insert` resumable upload endpoint. The site backend never receives the MP4. The 8 MiB chunking process can query the existing upload session after an interruption (while the same tab stays open), without blindly starting a duplicate upload. Once YouTube returns a video ID, preserve it before verification. **Retry YouTube verification** reads that same video ID before allowing the queue to continue; it does not create a second upload of that file.
7. Display a YouTube URL and **Copy link** as soon as a video ID is returned. Mark the upload complete and save its metadata only after independent readback confirms the exact expected channel ID and actual **Unlisted** visibility. Use authenticated server actions and the existing durable Redis/KV store, dedicated namespace `holistic-house:youtube:phone-history:v1`, with title, language target, read-back channel ID, video ID, URL, UTC time, requested Unlisted and actual returned privacy. If readback fails or the channel/visibility is wrong, retain the copyable link in the open queue and show a verification hold; never substitute the expected channel for an unknown result.
8. Show a **permanent upload history** on the same page, with All / Russian / English filters, sorting newest-first, direct YouTube link and **Copy link** action. Reloading the site or switching devices retains this server history.
9. A storage outage must disable starting new uploads rather than silently storing video links in browser-only memory. If YouTube succeeds but saving its record fails, keep the link displayed, show a prominent warning and a retry-save button. Refreshing history does not clear an unsaved link or verification hold. File selection, removal and destination switching cannot discard a returned video ID awaiting recovery. Save or verify the existing result before continuing. The link record is idempotent by YouTube video ID and cannot be forged for another target channel. Existing historical records retain their originally recorded actual visibility.

Previously uploaded media from YouTube Studio or Metricool does not automatically enter the *app upload history*. Existing site-managed videos and the previously approved six Unlisted originals must never be re-uploaded to populate the history.

History refreshes are ordered: a snapshot started before a successful link save cannot replace that newly saved result, and an older request cannot overwrite a newer refresh. The next fresh server snapshot remains authoritative; removed records are not retained indefinitely in browser state.

## One-time Google Cloud activation (admin self-service)

The authenticated Vercel production project is `codex-public-book-library`, domain `https://holistichouse.vercel.app`. There is **no Google Cloud account provisioning capability** in this repository or Vercel; the owner must create or reuse the real Google OAuth project and approve account/channel scopes.

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials) under an owner-controlled Google account. Reuse the correct existing Cloud project if available; don't create duplicate projects or enable billing without owner review.
2. Enable [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com). Configure the OAuth consent screen and permitted testers if in Testing mode.
3. Create/reuse an OAuth 2.0 **Web application** client, with Authorized JavaScript Origin exactly `https://holistichouse.vercel.app`. Request `youtube.upload` and `youtube.readonly`. **Copy only the public Client ID** ending in `.apps.googleusercontent.com`; **never paste a Client Secret, refresh token, API key or password**.
4. Open `https://holistichouse.vercel.app/admin/youtube-upload` after logging into the practitioner cabinet. **If the already configured owner-video server Web OAuth Client ID is valid, it is reused automatically** and no Client ID entry is required. Otherwise, the admin-only setup card allows you to paste and confirm a **public Web Client ID** once. An explicitly entered ID is validated and saved to `holistic-house:youtube:phone-oauth:v1` in authenticated Redis; no client secret or browser token is persisted.
5. If the OAuth client is wrong or its authorized origins later change, choose **Configure / change Google OAuth** from the uploader and replace the client ID. This does **not** store any tokens and does not connect a Google account without a user consent popup.
6. On iPhone Safari, select RU or EN and click **Choose Google / YouTube account**. Verify the exact channel shown. English channel must be explicitly paired once; switching later can reuse each channel's access token **only while the page session remains open**. Browser/account consent cannot be bypassed.
7. Upload one short **new, non-sensitive** test video. Check the exact channel ID and real visibility in YouTube Studio, successful processing and anonymous playback, the Copy link button, saved history after reload and resume on simulated network interruption. The app checks the actual uploaded video's `snippet.channelId` and `status.privacyStatus`; unknown or mismatched channel results and any non-Unlisted result stop the queue. Retry verification uses the existing video ID. The code-level channel/visibility gate does not establish successful YouTube processing or anonymous playback; those remain real acceptance checks.
8. Run `node --test tests/youtube-phone-upload.test.mjs tests/youtube-upload-history.test.mjs tests/youtube-upload-readback.test.mjs` and `npm run build` as well as real-device/Google OAuth acceptance. A successful Vercel build alone does not establish a working YouTube connection.

**Optional Vercel controls:** An existing `HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID` in production overrides the admin-saved ID if configured. Set `HH_YOUTUBE_PHONE_UPLOAD_ENABLED=false` (string) in Vercel and redeploy as an emergency global kill switch regardless of Redis settings; otherwise a valid admin-confirmed ID plus healthy server-side history storage enables the UI. No secrets are ever accepted by the in-app form.

**Google caveat:** Google API documentation currently differs between endpoints about Private restrictions on unverified upload projects. The app always requests Unlisted, but treats the actual `videos.list` readback and an anonymous playback check as authoritative; it never silently claims Unlisted success from the request alone.

## Scope and safety

- Credentials (short-lived access tokens and upload session URIs) remain only in in-memory browser refs. **No tokens, refresh tokens or raw MP4 are sent to the website backend or persisted**. No Google password is collected.
- History consists only of non-sensitive YouTube metadata stored in dedicated Redis keys on the server behind `requireAdminRequest`. It is not exposed to public pages, sitemaps or client cabinets.
- Google tokens are scoped to upload/read-only and are kept separate for RU/EN while the app is open. If the identity is wrong or expired, re-authorize through Google. Do not silently upload to whichever Google account happens to be active.
- This is an **owner-only public-content tool**, never client-specific distribution. Private personal/medical videos belong in the existing authenticated Supabase client media system, not Unlisted YouTube.
- The original source video should remain on the phone (or be archived separately in Google Drive under the #219 master archive SOP). Uploading to YouTube alone does **not** constitute Google Drive archiving.

## Limitations / rollback

- iOS browsers may suspend large uploads when switching apps or locking the screen. Keep the site foregrounded, the screen awake and the network stable. The selected files, OAuth access tokens and resumable session are deliberately **not preserved across reload** to avoid durable sensitive token storage; confirm YouTube Studio status before re-uploading after restart.
- An unverified or unarchived result is recoverable only while its page session remains open. Copy its displayed link before leaving the page. A readback retry or history refresh must never be mistaken for a fresh upload; the completed video ID is reused.
- The YouTube Data API may enforce visibility restrictions independently of the requested Unlisted flag. Final readback is authoritative; report private/public/unknown status, never claim success if not verified.
- A channel mapping cannot silently be switched after pairing. Changing a channel later requires an explicitly designed owner-controlled re-pairing process (not implemented).
- Rollback by disabling `HH_YOUTUBE_PHONE_UPLOAD_ENABLED` in Vercel and redeploying. The UI remains safely unavailable; durable historical links remain intact.


## Existing Telegram-video Web OAuth reused by iPhone (27 October 2026)

On an authenticated admin page, the iPhone uploader uses the existing validated **public** Google Web Client ID from Telegram video when no dedicated `HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID` or previously saved phone ID is available. Priority: dedicated phone variable → phone Redis configuration → valid server `HH_OWNER_VIDEO_GOOGLE_CLIENT_ID` with the matching server-side secret configured. This eliminates repeated ID entry and the first-time setup checkbox. The private Client Secret never reaches the browser.

This only configures Google's public OAuth client, **not** the user's YouTube channel authorization. Google still requires the owner to choose the correct account and grant YouTube scopes. The channel is independently matched against Russian `UCjWq6NHZTQkUr3bC3WbXXcw`; incorrect or missing consent blocks uploading. The existing browser uploader never silently reuses a confidential server refresh token or Metricool connection.

For embedded Telegram iOS webviews, the Google chooser may require opening the same page in Safari. The owner must still authorize the channel through Google's UI. No new Google client, secret, Redis key, upload, external API subscription or public post is created by this fix. The emergency `HH_YOUTUBE_PHONE_UPLOAD_ENABLED=false` flag still stops the uploader. Real iPhone upload, YouTube channel+Unlisted readback and anonymous playback remain separate acceptance gates.
