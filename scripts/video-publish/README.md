# English YouTube private uploader

This worker is the temporary no-Metricool route for the English channel **AATA - Temple Arts Academy / @aatapro**.

## Safety rules

- It only accepts job target `youtube-en-private`.
- It only downloads source media from HTTPS `*.heygen.ai` URLs.
- Upload visibility is hard-coded to **Private**. A job cannot request Unlisted or Public.
- It verifies the authenticated YouTube channel handle is **@aatapro** before upload.
- It marks the upload as not made for kids and declares synthetic/AI media.
- The Russian Metricool brand/channel is not used by this workflow.

## One-time Google setup

1. In Google Cloud, create/select a project and enable **YouTube Data API v3**.
2. Create OAuth credentials for a **Desktop app**.
3. In a local terminal from this repository, set:
   - `GOOGLE_YOUTUBE_CLIENT_ID`
   - `GOOGLE_YOUTUBE_CLIENT_SECRET`
4. Run:
   `node scripts/video-publish/google-youtube-oauth.mjs`
5. Choose the Google/YouTube identity that owns **@aatapro** and approve access.
6. The helper verifies `@aatapro` and prints a refresh token.
7. Add these repository Actions secrets:
   - `GOOGLE_YOUTUBE_CLIENT_ID`
   - `GOOGLE_YOUTUBE_CLIENT_SECRET`
   - `GOOGLE_YOUTUBE_REFRESH_TOKEN`

The OAuth helper requests only the YouTube upload and read-only scopes needed to upload and verify the selected channel.

## Publishing from ChatGPT

After the three secrets exist, a new JSON file under `.video-jobs/` triggers the worker. The assistant should only create such a job after:

1. the requested HeyGen render is complete;
2. QA is approved;
3. the user explicitly asks to publish/upload;
4. the source is an English public/site video intended for the English channel.

The resulting YouTube video is **Private**. For a public website embed, Andy manually changes it in YouTube Studio from Private to **Unlisted** after review.

## Google API project limitation

For unverified API projects created after July 28, 2020, YouTube restricts API uploads to Private. That limitation is intentional for this temporary workflow.
