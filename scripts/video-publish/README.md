# Video distribution — current bilingual route

Owner decision on 2026-10-02: **both EN and RU go to @shamanic_academy** (Академия Древних Культур), channel `UCjWq6NHZTQkUr3bC3WbXXcw`, connected Metricool brand `7153286`. This supersedes the former EN→@aatapro split for public distribution. Do not change the live website's approved HeyGen embeds as part of YouTube distribution.

`bilingual-publication.mjs` is the reusable planning/request schema for the connected Metricool tool. It accepts both languages, checks the exact approved master and connected channel, excludes private/client content, and distinguishes `scheduled`, `published` and playback-`verified`. `reviewed-masters.mjs` holds the original six immutable archive references. Add future masters only after explicit approval; do not regenerate a missing locale automatically.

Publication procedure:

1. Resolve approved master + locale; read the connected brand/channel afresh. Call `planPublication` with the durable checkpoint, if any.
2. Read existing Drive metadata without copying it. Fetch the existing HeyGen original and stream-hash it against the archived SHA-256. A matching original may be passed directly to Metricool; its temporary delivery copy is not another Drive master. No renders, Drive uploads, sharing changes, or MP4s in Git.
3. Under a single-publisher lock, persist a `submission-intent` record keyed by channel + master + locale BEFORE calling the connected `createScheduledPost` tool with `buildMetricoolRequest` output. Never log or commit its temporary signed URL. Preserve the exact provider ID and UUID on response. This module is a tool-assisted operator adapter, **not an installed unattended site-publish hook**.
4. Keep current settings: Unlisted, not made for kids, AI-generated content disclosed, subscriber notifications off. Persist the requested Toronto slot; never silently switch channels or language after a failure.
5. On any ambiguous result, reconcile the existing Metricool UUID/post and channel before further action. `submission-intent`, `uncertain` and `failed` never authorize a repeat upload. Scheduled means wait; published means verify playback; verified means reuse. Do not delete a checkpoint to force a retry.
6. Read back the YouTube ID/title/channel and verify anonymous decoded frames, advancing time and natural completion. Save sanitized evidence. Provider `PUBLISHED` alone is not completed delivery.

Run `node --test tests/bilingual-publication.test.mjs tests/youtube-private-upload.test.mjs tests/video-pipeline-safety.test.mjs`.

The dated bilingual release ledger in `docs/` records the six dispatched jobs. Future publications must consult it to avoid duplicates. Review/checkpoint state must live durably outside an ephemeral agent session.

## Legacy English private worker — retained, not the default distribution route

This is the English @aatapro distribution worker, not a new video generator and not a replacement for the live Holistic House video editor. Generation remains approval-gated via the verified private Andrey HeyGen Digital Twin. Read ai-projects-brain #218/#219 for current voice, Look, archive IDs and publication approvals. The live website runs from `codex/public-book-library`; this worker runs from `codex/bootstrap-books`. Do not merge these branches wholesale.

## Readiness is not publication

The workflow checks OAuth and the exact English channel BEFORE downloading media. It writes a sanitized `preflight.json` even when credentials are missing. Dispatching the workflow without a new job is read-only. A red connection check is not an application build failure and must not be described as active publishing.

OAuth activation requires YouTube Data API v3, Drive API and an owner-authorized Desktop OAuth client. Run `node scripts/video-publish/google-youtube-oauth.mjs --github` locally with the client ID/secret and an already authenticated owner `gh` CLI. The helper uses PKCE/state, verifies @aatapro and pipes secrets directly into GitHub encrypted storage. Without `--github`, credentials are saved with mode 0600 outside the repository. Tokens are never printed in the browser or terminal. Never paste passwords, refresh tokens or client secrets into chat.

The three secret names are `GOOGLE_YOUTUBE_CLIENT_ID`, `GOOGLE_YOUTUBE_CLIENT_SECRET`, `GOOGLE_YOUTUBE_REFRESH_TOKEN`. Optional repository variable `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID` enables the additional read-only folder preflight; every upload always verifies its job's folder. No Russian Metricool/channel configuration is used.

## Google gates: do not conflate them

1. OAuth authorizes the account. External OAuth apps left in Testing can issue refresh tokens expiring after seven days. Verify consent publishing status as part of production setup.
2. YouTube's API compliance audit is separate. New unaudited API projects can have uploads locked to Private. A manual Private-to-Unlisted toggle is **not a guaranteed workaround**. Use an audited integration or complete the required audit; do not bypass the restriction.
3. Only an actual `videos.list` readback showing the expected channel, processed status, Unlisted/Public privacy and `embeddable=true` qualifies a YouTube record for site handoff. Then verify anonymous playback before switching the site.

Official references (checked 2026-09-30):
- https://developers.google.com/youtube/v3/docs/videos/insert
- https://developers.google.com/identity/protocols/oauth2#expiration
- https://developers.google.com/youtube/v3/docs/videos/list

## Reuse the canonical archive

For an already archived video, use `driveFileId`, `driveFolderId` and expected `sha256`; omit `sourceUrl`. The worker checks folder membership, MIME type, trash state, size and downloaded SHA-256, and never creates another Drive copy. This is the correct retry path for the existing About Final v3. Use its current IDs/hash from #219; never run the old expired signed-URL job blindly.

For a newly approved HeyGen source, a source URL is allowed only from HTTPS HeyGen media hosts, with no embedded credentials, ports or redirects. The exact filename/folder is checked for an identical existing archive before creating a new file. Filename collisions or multiple matches stop for reconciliation. Google resumable-upload URLs are validated before sending any token.

## Durable upload checkpoints

After archive verification, the worker saves the archive ID/hash to its result file. Before YouTube upload, it persists an intent marker on that Drive file, scoped to the English channel. A completed YouTube ID is persisted and verified. A retry reuses an existing ID. An ambiguous timeout/unfinished checkpoint stops rather than creating a duplicate video. Reconcile such a job with the owner; do not clear a checkpoint or create another upload blindly.

The existing worker remains intentionally Private-only. `websiteReady=false` is expected for a new Private upload. The worker does not claim a site update. The already approved HeyGen embed remains live until the YouTube gate is genuinely passed. The full path is NOT complete until the external authorization/distribution gate and the final live-site handoff have been verified. Private/client content remains excluded.

## Commands and checks

- `node --test tests/youtube-private-upload.test.mjs tests/video-pipeline-safety.test.mjs`
- `node scripts/video-publish/preflight-pipeline.mjs` — read-only.
- `node scripts/video-publish/upload-youtube-private.mjs <approved-job.json>` — writes only for an explicit new approved upload job.

No example executable legacy job is included. Adding a `.video-jobs/*.json` file to the worker branch is an explicit legacy private-upload command, not the bilingual route. Do not create it merely to test missing credentials. The legacy worker does not render, deploy websites, or configure Metricool.
