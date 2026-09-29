# English YouTube private uploader

This worker is the temporary no-Metricool route for the English channel **AATA - Temple Arts Academy / @aatapro**.

## Pipeline

HeyGen completed MP4 -> Google Drive master archive -> YouTube @aatapro as Private.

The Drive archive is fail-closed: if archiving fails, the YouTube upload does not start.

## Safety rules

- It only accepts job target `youtube-en-private`.
- It only downloads source media from HTTPS `*.heygen.ai` URLs.
- A valid Drive archive folder ID is required in every job.
- Upload visibility is hard-coded to **Private**. A job cannot request Unlisted or Public.
- It verifies the authenticated YouTube channel handle is **@aatapro** before archive/publish.
- It marks the upload as not made for kids and declares synthetic/AI media.
- The Russian Metricool brand/channel is not used by this workflow.

## One-time Google setup

1. In Google Cloud, create/select a project.
2. Enable **YouTube Data API v3** and **Google Drive API**.
3. Create OAuth credentials for a **Desktop app**.
4. In a local terminal from this repository, set:
   - `GOOGLE_YOUTUBE_CLIENT_ID`
   - `GOOGLE_YOUTUBE_CLIENT_SECRET`
5. Run:
   `node scripts/video-publish/google-youtube-oauth.mjs`
6. Choose the Google identity that owns **@aatapro** and has access to the Holistic House Drive archive, then approve access.
7. The helper verifies `@aatapro` and prints a refresh token.
8. Add these repository Actions secrets:
   - `GOOGLE_YOUTUBE_CLIENT_ID`
   - `GOOGLE_YOUTUBE_CLIENT_SECRET`
   - `GOOGLE_YOUTUBE_REFRESH_TOKEN`

The OAuth helper requests YouTube upload/read-only plus Drive access because the master MP4 must be archived before publication.

## Publishing from ChatGPT

After the three secrets exist, a new JSON file under `.video-jobs/` triggers the worker. The assistant should only create such a job after:

1. the requested HeyGen render is complete;
2. QA is approved;
3. the current Drive destination folder ID has been verified from #219 / Google Drive;
4. the user explicitly asks to publish/upload;
5. the source is an English public/site video intended for the English channel.

The resulting YouTube video is **Private**. For a public website embed, Andy manually changes it in YouTube Studio from Private to **Unlisted** after review.

To retry a failed job, create a new job JSON with a new filename. Do not edit/reuse an old job file; this avoids accidental duplicate publication.

## Google API project limitation

For unverified API projects created after July 28, 2020, YouTube restricts API uploads to Private. That limitation is intentional for this temporary workflow.
