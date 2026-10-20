# Holistic House — Vercel cost controls, verified October 17, 2026

## Goal / constraints
Keep `holistichouse.vercel.app` reachable, preserve the existing verified English/Russian/Spanish UI, owner-authenticated cabinet, client media and published videos, and keep automatic Production Deployments from `codex/public-book-library`. **Never pause production, change plans, or silently spend money.**

## What is already in production
- Next Image Optimization restricted to WebP and `q=75` with a 31-day cache and a bounded width catalog.
- Verified Andy portrait and select smaller image/poster assets bypass request-time Vercel transformations.
- Automatic Vercel Git builds only for the production branch, with Preview disabled by `git.deploymentEnabled` and build guard. At readback: 0 Preview deployments since October 17, 18:26 UTC.
- Published-video storage-off cache errors were corrected without exposing unpublished videos.
- Regular Github test/build/CI exists.

## What this patch changes
Image processing moves from **visitor request time** to **build time** for only the 23 published book catalogue cover images and 31 owned public card pictures. All original bytes are verified against their tracked Git blob SHA and byte length before generation. `prebuild` and `predev` run `scripts/build-public-card-artwork.mjs`, generating:

- 23 versioned WebP 720px catalogue cover files in `public/images/holistic-house/static-card-media/`.
- 31 x 256px thumbnails and 31 x 960px source-proportional public card images, without enlargement.
- The three additional pinned Library and service image sources (books-library WebP, incense WebP, a public Arnica JPG) are covered by those 31 cards. The previously published full source book/image routes remain unchanged. No full-resolution unoptimized book JPEG is loaded by the catalogue cards.
- CDN gets immutable caching on this **content-addressed folder only**; protected/private content remains dynamic and uncacheable.
- Non-registered images still use normal Next optimization: explicit safe fallback, no global bypass.

Changing an approved image source requires re-reviewing and updating its recorded Git SHA and byte length; this prevents stale content from silently being published under an immutable URL. Changes to encoding options must also change the output filename scheme.

**No media generation, YouTube publishing, client data access, billing mutation, marketplace creation, paid server storage or domain change.**

## Financial evidence and limitations
- Team `super10` remains Pro. Last verified invoice warning says $15 of $20 included credits used (October 17, 14:03 UTC); Vercel's connected Billing Charges and Observability APIs return 404. **The bill cannot be assigned to images or builds.**
- Prior Hobby incident: 106% of 5,000 Image Transformations; that monthly counter is not retroactively reduced by this patch. Requests for new variants after rollout are what this fix targets.
- Before the preview-deploy guard: 92 historical Preview deployments (54 branches) since Oct 16; more than 100 Production Deployments in ~one day. Standard 4-core/8-GB build machine observed. Do not claim standard builds incur per-minute cost: verify Enhanced/Turbo/On-Demand Concurrent Builds first.
- Historical deployments and unrelated team projects remain retained; no automated bulk deletions.

## Production verification
1. From exact merged commit, verify Vercel Production READY, canonical alias and 200 on Home EN/RU, Academy EN/RU/ES, Books EN/RU and Client Tests.
2. Check returned HTML: `/en/academy` and `/en/books` should now use `/images/holistic-house/static-card-media/*.webp` and avoid their previous `/_next/image` source requests. Assert all image responses HTTP 200, `image/webp`, and readable on mobile.
3. `/books/alchemy-homeopathy-foundations` and another Maya/Dao reader still use the original approved media; exercise video playback and links.
4. Check real image-transformations count in **Vercel Team Usage**, not by counting HTML `srcset` candidates.
5. Verify no crash/leak in client/login/PDF test suite.

## Manual Vercel owner-only protection (current connected API does not expose safe writes)
- `super10 → Usage`: switch to current billing cycle, break down **by product and by project**. Sort by actual USD spend: Active CPU, Provisioned Memory, Fast Data Transfer/CDN, Image Transformation, Edge Requests, Function Storage, Deployment Storage, enhanced builds, paid Marketplace and Observability. Export screenshots/CSV.
- `super10 → Settings → Billing → Spend Management`: configure low spend **notifications** and alerts. Do not enable **Pause Production Deployments** as it can stop every site with 503, contrary to the owner's always-live requirement. An always-online Pro site cannot be given a guaranteed $0-overage cap by this setting alone.
- Review `Project Settings → Security → Deployment Retention` and the team retention settings. Prefer shortest retention for cancelled/errored and obsolete Preview deployments, but **preserve canonical Production plus verified rollback points**. Changing retention has no supported connected write route; never bulk-delete 130 projects by name.
- In team Build settings verify **Basic/Standard only**, no Enhanced/Turbo/paid concurrent builds, Observability Plus paid features or unexpected paid integrations. Don't change defaults without readback.
- Merge logically related changes in fewer release batches while preserving the production auto-deploy rule. Do not skip or coalesce actual runtime updates silently.

## Rollback
Revert only this PR to restore the original `next/image` catalogue/card sources and `build` script. Existing reader paths, private content and metadata remain unchanged. Do not delete original images or existing deployments as part of rollback.

## October 20 production build incident and corrected manifest

Deployment from source commit `903b235042fa` failed during `scripts/build-public-card-artwork.mjs` with Sharp's `webp: unable to parse image`. The source file `public/images/holistic-house/distance-homeopathy.webp` has a Git-pinned **7,509-byte** body while the RIFF WebP header declares **60,086 bytes**. This is an incomplete/corrupt original, not a valid asset for static prebuilding. The file and user-facing original path were not edited or re-encoded.

Exclude that one source from both build and browser URL registries pending a genuinely verified replacement. Preserve all remaining 54 pinned public originals (23 covers + 31 cards), **85** build-time outputs, dynamic/private paths and privacy restrictions. A synthetic source-header test now rejects declared RIFF lengths that do not equal the real source length, preventing this specific build failure from recurring when new artwork is registered. Verify the next exact production deployment is READY before claiming the repaired build is live.
