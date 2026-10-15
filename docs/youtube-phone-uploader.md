# Mobile video uploader for the Holistic House practitioner

**Status:** staged application code only. No YouTube account connected and no real media upload performed by this change. Route: `/admin/youtube-upload`. The route requires the existing practitioner session, remains `noindex`, and fails closed until configured.

## Product scope

- iPhone/Safari mobile-first, optional install to home screen with dedicated web manifest; desktop also works.
- Select up to 10 videos, edit individual titles, shared description, choose Unlisted (default) / Private / Public.
- Explicit confirmation for Public; mark realistic synthetic media if applicable and choose made-for-kids status.
- Google account authorization using Google Identity Services and ONLY the `youtube.upload` and `youtube.readonly` OAuth scopes.
- Verify the actual OAuth-selected YouTube channel against a server-configured expected ID. Block wrong or ambiguous Brand Accounts.
- Media streams directly from the browser to Google's official resumable video upload API, **not through Vercel Functions, Next.js, GitHub or Supabase**.
- 8 MiB chunks; progress indicator; after a connection failure, probe the *existing* resumable upload session before sending any bytes again. The tab must remain open and retain the File objects; this is not a background uploader.
- Verify the post-upload video visibility via YouTube Data API when available. If unknown or unexpectedly Private, manually inspect in YouTube Studio.
- New YouTube URL is displayed after upload. Attach to a public Holistic House page separately through `/admin/videos` after review. Do not automatically publish to any website or client cabinet.

## Required Google Cloud setup (admin only)

1. Use a Google Cloud project controlled by the channel owner. Enable **YouTube Data API v3**.
2. Configure OAuth consent screen and a **Web application** OAuth client. Add `https://holistichouse.vercel.app` as an authorized JavaScript origin (plus staging origins intentionally used); add channel-owner Google account as test user if Google requires it. Configure the YouTube scope permissions and complete any required Google/YouTube verification or audit.
3. In the production Vercel environment, set:
   - `HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID` — public Google OAuth web client ID; **not a client secret**.
   - `HH_YOUTUBE_UPLOAD_EXPECTED_CHANNEL_ID` — exact channel ID documented in the current dated #219 SOP comment; never use a default guessed channel.
   - `HH_YOUTUBE_PHONE_UPLOAD_ENABLED=true` — enable only after OAuth origin/scope and channel match are confirmed.
4. Redeploy after environment changes. Sign in to `/admin/login`, open `/admin/youtube-upload` on an iPhone in Safari, authorize Google, verify the channel title, and upload one small non-sensitive test video as Unlisted. Check its processing status, actual visibility, playback, disclosure and network resume behavior on device.
5. Review YouTube API quota and audit policy. Unverified uploader apps may be subject to visibility limitations; do not assume selecting Unlisted/Public guarantees that YouTube grants it. Always verify in Studio.

## Privacy and security

The OAuth token lives only in the current page's memory. It is never sent to the Holistic House backend, browser storage, logs, or analytics. Upload session URLs are kept in memory only. There are no YouTube secrets in the frontend and no storage or proxy of uploaded files on Holistic House. The uploader uses the existing admin session gate and page-specific CSP allowances for Google Identity Services and Google upload APIs.

**Do not use this tool for personal client/health videos**. Unlisted YouTube is not secure private storage. The client session workflow must continue using the existing gated, authenticated private media system described in #218/#219 and `docs/client-session-shared-homeopathy-video.md`.

## Known limitations / rollback

- Browser can suspend uploads when iPhone is locked, Safari is closed or mobile network changes. Keep phone awake and this tab open.
- Files and resumable-session references are not persisted across a page reload. On a reload, verify existing uploads in YouTube Studio before re-uploading to prevent duplicates.
- OAuth consent may require Google verification and publication permissions on the chosen project. Neither account connectivity nor end-to-end YouTube upload is established by code merge alone.
- Roll back by setting `HH_YOUTUBE_PHONE_UPLOAD_ENABLED=false` or removing the configured client ID/channel. The route will remain admin-gated but inert.

Tests: `node --test tests/youtube-phone-upload.test.mjs`. Full Next.js build and real Safari OAuth/upload smoke tests are required before live acceptance.
