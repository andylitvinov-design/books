# Client Live Photos — HeyGen → private My Materials

**Implementation status:** source PR only. No client image has been sent to HeyGen, no API key supplied, no paid job initiated. Production remains gated OFF until the owner independently approves an API pilot and an actual end-to-end trial succeeds.

## Workflow
1. Signed-in Google client opens My Page → My Materials → Live Photos (also accessible from My Videos).
2. Select one JPEG/PNG/WebP/HEIC photo (up to 3 MB), movement, and portrait/landscape. Explicitly confirm rights and subject permission for external AI processing.
3. Client chooses **Animate with HeyGen**. Never upload or bill before this action.
4. Backend verifies Supabase session, same origin, account state, rate limit, daily site cap, and per-user capacity, then normalizes the photo to a fixed 9:16 or 16:9 JPG and stores it in existing **private** bucket.
5. Backend uploads that JPG to HeyGen assets, creates one 5-second 768p HeyGen Video 1 image-to-video job with the durable application job UUID as the idempotency key, and stores the provider video ID. Unknown submit result **must never** be auto-resubmitted.
6. HeyGen sends its per-job callback to /api/integrations/heygen/live-photo; the callback is treated as an untrusted hint. Server uses callback ID to locate its own existing job, independently verifies completed status by HeyGen API GET, validates HTTPS CDN hostname, checks MP4 header, content type and 12 MB limit, copies the clip into the existing private Supabase bucket. Polling the per-client authenticated status route also finalizes it if callback is missed.
7. Once stored, the asset is marked ready and appears as a reusable, 5s MP4 in the client's **private** My Materials. Preview uses owner-only signed URLs with 120-second expiry; deleting it also removes both source and generated media. The media never appears in GitHub/public/.
8. Reuse: a saved MP4 is available for viewing/downloading in My Materials and My Videos. An automatic timeline asset picker for Video Studio is a separate follow-up; do not falsely claim that this PR adds it to the existing large editor timeline.

## Data and API
- New private table: app_private.client_live_photos_v1 with owner RLS, dedicated restricted worker policy, unique (account_id,client_request_id), external provider ID, status and explicit consent fields.
- Existing private storage: hh-client-private-media/live-photos/<accountUuid>/<assetUuid>/source.jpg and clip.mp4.
- POST/GET /api/app/live-photos; GET/DELETE /api/app/live-photos/<id>; POST /api/integrations/heygen/live-photo.
- Statuses: pending, submitting, submitted, finalizing, ready, failed, unknown, deleted.
- Rate and cost: default 5 newly reserved AI jobs per rolling 24h across the site (server override HH_LIVE_PHOTOS_MAX_DAILY_JOBS capped at 20), 3 non-failed active assets per account, 5 seconds at 768p only. No automated rerender or second provider.
- Consent must be captured explicitly for self OR other (actual subject authorization required); do not use for synthetic speech/voice cloning.

## Launch checklist — exact actions and independent evidence
1. Add/apply the repo's new additive SQL migration to the existing **holistichouse** Supabase database. Verify table, policies and private bucket.
2. Generate a purpose-scoped REST API key in HeyGen developer portal using the workspace/project with **separately approved metered API budget**. ChatGPT HeyGen OAuth and Creator web credits do **not** automatically configure that key or authorize spending. Never send the API key in chat or put in GitHub.
3. Vercel → team super10 → codex-public-book-library → Settings → Environment Variables: create **Sensitive / Production** HH_LIVE_PHOTO_HEYGEN_API_KEY. Initially leave HH_LIVE_PHOTOS_ENABLED and HH_LIVE_PHOTOS_SPEND_APPROVED absent/false. Note that setting a variable alone does not update a running deployment.
4. Run a consented small prepaid API pilot with real product budget approval; then set HH_LIVE_PHOTOS_ENABLED=true and HH_LIVE_PHOTOS_SPEND_APPROVED=true only after support/usage/limits confirmed. The separate spend switch must not be inferred from this PR.
5. Merge protected PR after exact-HEAD CI including security/privacy/auth/consent and browser checks. Release ONLY via existing hourly production workflow, no manual Vercel redeploy. Confirm serving alias SHA.
6. Authenticated real iPhone Safari E2E: upload with consent → provider asset/video IDs → completed MP4 in private bucket → My Page displays video after refresh/new session → another account cannot read/delete → no public share → repeat view/download without new HeyGen charge → delete removes both source and clip. Test an invalid image, upload failure, provider outage, callback duplicate and deletion race. Verify no raw media, tokens or signed URLs in logs.
7. If the provider asset-upload contract differs from /v3/assets multipart, update it based on a real response, not guessed success. This API step cannot be validated without the site-level REST key.

**No new storage buckets, cron jobs, video renderers, public grants, emergency deployments, or automatic charges.**
