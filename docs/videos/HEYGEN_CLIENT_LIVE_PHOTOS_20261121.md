# Client Live Photos — HeyGen → private My Materials

**Implementation status:** source PR only. No client image was submitted and no paid provider render was initiated by this PR. A HeyGen REST key *name* is configured as Sensitive on the correct Vercel Production project (read-only metadata verified 22 Nov); its real scopes, access and metered API entitlement remain untested. Production paid generation gates remain OFF until the owner independently approves a capped, consented API pilot and E2E.

## Natural portrait prompts (owner decision · 21 Nov 2026)

Reusable server-only presets live in `lib/app/live-photo-heygen.mjs`. The approach matches the quality of the first-party coach takes described in `docs/coaching/MY_COACH_NATURAL_MP4_20261118.md`: a five-second silent natural gesture, camera fixed, consistent face and background, no artificial face deformation or speech. AI identity fidelity and hands still require human preview QA.

Three primary buttons are exposed in EN/RU/ES: **Smile** (gradual warm smile and natural blink), **Greeting** (warm eye contact, one slight friendly nod and a smile, no talking), **Wave** (one gentle hand wave, only if hand and forearm already appear in the photograph). Wave warns about unsuitable crops and instructs the generator not to hallucinate arms; **Blink** and **Turn** remain compatible secondary options.

The previously applied Supabase motion CHECK is updated by the new **forward-only** migration `20261121230421_hh_client_live_photo_greeting_v1.sql`. The original applied migration and account RLS are untouched. HeyGen **REST API** billing, opt-in, idempotency, current 5s/768p limit, storage privacy and feature flags remain unchanged. No new render is authorized; the Creator app subscription and website API charges are separate. Insertion into the Studio timeline remains dependent on a later protected integration.

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

## Unified three-tab My Materials library · owner decision, issue #5350

The authenticated /{en,ru,es}/app/videos page is a **single My Materials cabinet** with three true views:
1. `?tab=avatars` — **My AI Avatars**: real generated five-second photo-motion MP4s from this existing consent-gated MyLivePhotos archive. These are NOT prebuilt coach Digital Twins or finished personalized videos. Provider and XP billing gates remain OFF.
2. `?tab=videos` (also default legacy `/app/videos`) — **My Videos**: existing completed H.264 MP4s with private save/replay/download/delete and messenger sharing. Gift entries join after separate PR #5335.
3. `?tab=photos` — **My Photos**: the existing private personal portrait, plus the reusable eight-photo gallery after independent PR #5339 merges. No photo in this tab automatically transfers to HeyGen or a public library.

My Page links into `/app/videos?tab=avatars` instead of mounting a duplicate live-photo generator. Each view mounts its existing component only when selected, keeping storage/auth/RLS/consent/account isolation independent. Query parameters are bookmarkable and the interface supports keyboard arrows/Home/End, EN/RU/ES, and mobile 320–430px.

**Source-only ≠ LIVE:** protect exact-HEAD Core/Specialist/`hh-merge-check`, merge safely, publish only through existing hourly GitHub workflow, verify canonical production SHA and signed-in iPhone E2E separately. XP charges and HeyGen Direct API credentials require independent authorization and completion of #5345/#5348; these tabs do not activate AI spending or an avatar timeline compositor.

## Reuse the existing private My Photos as an Avatar source
The My AI Avatars wizard includes an opt-in **Choose from My Photos** drawer. It reads the existing owner-scoped `/api/app/video-photos` gallery (PR #5339) and renews a 120-second signed link for an individual item only when selected. The browser rebuilds a local JPEG File and fills the EXISTING HeyGen photo input, resetting consent, request UUID and previous photo notices. Selection alone does not upload any bytes to HeyGen or authorize a billed render. The backend still requires the original signed-in request, explicit third-party likeness consent and both owner cost gates. This bridge activates once #5339 is protected-merged; until then the drawer fails safely as unavailable rather than inventing an album. No duplicate bucket or photo copy is created by browsing.

## 500 XP server-side Live Gift settlement (forward-only, 22 Nov 2026)

This uses the existing XP v2 wallet #5348 — **no separate wallet or EUR first-free scheme**.
The client must explicitly approve 500 XP in addition to likeness/third-party consent.
The server validates that checkbox; only a verified v2 wallet and independent owner
`HH_LIVE_PHOTOS_XP_BRIDGE_ENABLED=true` gate allow the feature to be advertised.

The Live Photo job and 500 XP `live_gift` hold are inserted in one owner-locked
database transaction; a new private `xp_operation_id` FK binds the same account
to its one existing `video_credit_charges` row. On a verified pre-provider or
provider-terminal failure, release that exact hold. On verified successful MP4
archive, capture exactly once in the SAME database transaction as `ready`.
No automatic paid retry on unknown provider responses, and in-flight jobs cannot
be deleted to evade an outstanding hold. Existing signed media remains reusable
without new XP or HeyGen generation. All new source requires exact-HEAD CI.

**Do not enable metered service yet.** Additive SQL must be applied and verified,
#5348 must be protected-merged, explicit API budget and a dedicated site Direct
API credential are necessary, and a real consented E2E MP4 delivery on iPhone
must pass. This code does not prove that an external HeyGen render has occurred.

## Long-running/uncertain provider reservations
The existing XP ledger may auto-release ordinary timed-out Basic exports, but not unresolved `live_gift` holds. Live Gift availability accounting includes outstanding 500 XP even when the 30-day nominal expiry has passed. The server-only verified-provider settlement completes or refunds the hold; an ambiguous job remains held for explicit reconciliation, never implicitly retried, credited, or silently completed. Related wallet fix: PR #5348. Disabled production flags remain unchanged.

## P0 privacy: erase provider source as well as private media (source repair · 22 Nov 2026)

A local Supabase bucket deletion alone is **not** proof the photo was erased from HeyGen. The existing owner-only job has a private `provider_asset_id`. After an independently verified terminal HeyGen failure or **after the completed MP4 was archived privately and XP captured**, server attempts `DELETE /v3/assets/{asset_id}` using the **existing server-only REST key**, even when new metered generation has been disabled.

- Successful deletion or provider 404 is idempotent erasure confirmation. Only then is the private provider asset ID cleared in the database.
- 401/403, 429, timeout, provider outage or DB write failure is **not** reported as erasure. The asset ID remains private for retry. An owner GET on a ready/failed live photo tries again; DELETE erases the local private source/video and retains a `provider_cleanup_pending` record with a visible **Retry HeyGen erasure** action. A repeated DELETE for that exact owned ID is allowed; a completed delete with no outstanding provider ID returns normal not-found.
- To prevent creation of an untraceable provider portrait, an in-progress `pending/submitting/submitted/finalizing/unknown` job may **not** be deleted until provider state/XP can be reconciled. The old pending-delete shortcut was unsafe during an in-flight HeyGen upload.
- This source-only repair uses the EXISTING nullable `provider_asset_id` and exact-tenant worker transaction; **no new database table, public bucket, secret, paid provider generation or cron**. Retain owner-only account checks and private media signed URLs.
- Ambiguous provider asset-upload responses where the provider never returned a valid asset ID still require provider-side reconciliation and cannot be called automatically erased. Provider deletion has to be tested with the actual REST key and an explicitly approved pilot before turning production gates ON.
- QA: request with new paid flags OFF but key present; valid DELETE, repeat 404, outage 429 retains marker, unauthorized owner B cannot select another's job; reset pending rows and source cleanup on failed/ready/owner delete; physical iPhone and real API receipt. Browser mocks/CI are not proof of provider erasure.

**Private Supabase deletion receipt**: the server also must not claim that `hh-client-private-media` deletion succeeded if Storage `remove()` throws **or resolves with an `error` value**. Before attempting removal, soft-delete retains `failure_code='LOCAL_MEDIA_DELETE_PENDING'` as a durable marker. When storage confirms remove and DB readback is committed, clear marker; otherwise owner-facing `local_cleanup_pending` remains accessible through the same owner-only listing and repeat DELETE, even after provider erasure completed. Provider and local cleanup are independent; neither masks the other's failure. No extra bucket/row/worker, no fabricated erasure proof.

The source repair must pass exact-HEAD Core, App R1, database, IA v2, WebKit, protected `hh-merge-check`, merge only under existing policy and reach hourly Vercel READY/SHA before being called live.

## Pre-provider private upload rejection (2026-11-22)
If the private Supabase source upload reports `{error}` **or throws/rejects** due to transport failure, do not leave a `pending` job with the 500 XP reserved. No paid HeyGen model call has occurred: enter the existing `failBeforeProvider` path, release the account-scoped hold transactionally and mark the private job `failed`. A possible orphaned private source from a lost upload response remains owner-deletable through the failed job; nothing is sent to the external provider automatically. This source contract is tested; real authenticated Supabase/HeyGen E2E is separate and must not be claimed from CI alone.


### Recorded migration order (production-source reconciliation)
The database already recorded four **different original version timestamps**;
this source tree uses the exact applied statements and filenames so a clean
PostgreSQL replay reproduces the verified ordering, without re-running them
against the production project: `20261121202614` creates the private photo
schema; `20261121211404` adds the one-free lifetime entitlement, paid orders
and account-owned billing fields; `20261121230421` adds the approved greeting
motion; `20261122011210` adds the account-bound XP bridge. This change does
not activate HeyGen, charge clients, or write to the production database.
