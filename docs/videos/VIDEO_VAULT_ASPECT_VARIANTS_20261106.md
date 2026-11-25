# HH Video Vault — physical master vs aspect variants (6 Nov 2026)

## Proven original problem
Existing `app.video_vault_assets_v1` has unique `filmed_master_id` and `raw_sha256`; do NOT upload landscape and portrait crops of the same original as two master rows or rename their identity to bypass the constraint. The owner's current **private** registry contains 195 publisher source/video IDs and 410 SHA-distinct MP4 edits (202 landscape + 208 portrait), with some 4 edits per source (two takes × two aspect crops). Every source is `rightsAndArtApproved=false`, `clientRawDeliveryVerified=false`, `generatorEligible=false`, and 0 parent R2/DB rows were independently read back. These source IDs are not independently counted continuous camera takes.

## This isolated milestone
- **Existing parent master table remains authoritative for the 500 total.**
- New private `app.video_vault_variants_v1` stores subordinate physical clips. A variant references one approved parent; same source cannot count twice, including alternate aspect or take 2. No public/anon/authenticated access; insert is backend operator-only and RLS requires parent approval. Unknown cost/license/people/raw delivery still blocks both parent and variant.
- `lib/video-vault/physical-variants.mjs` audits private registry metadata only; it never retrieves/downloads files or asserts SHA frame verification. A separate logical selector supports aspect-ready child rows but only if parent and child pass all generator and browser/raw-delivery proof. No new renderer/client route is turned on by this PR.
- The migration is intentionally **NOT automatically applied**, and no draft/owner-private MP4 was uploaded. Apply only after exact-head CI, security/RLS review, an authorized operator, verified budget and real approved original master ingest. There is no new subscription, bucket, cron, model API, worker or alternate client export.
- Physical `variant` R2 identity keys must be distinct under `masters/<variant-id>/<sha>.mp4` and `posters/<variant-id>/<sha>.jpg` already permitted by existing R2 client. Per-variant SHA/HEAD/full-GET, origin take mapping, cropped/upsampled notices and true video/audio E2E remain mandatory before enabling selectable clip rows. Existing GET/search and POST/resolve are unchanged; versioned variant routing and write path remain explicitly gated follow-up work rather than pretending 410 LIVE assets.

## Preflight
```sh
node scripts/audit-video-vault-variants.mjs --input=/private/HH_VideoVault_195_DISTINCT_SOURCES_410_MP4_Registry_20261106.json
node --test tests/video-vault-physical-variants.test.mjs
```
The CLI prints only aggregate counters, no private video/member URLs, and never changes source permissions. Review all flagged errors before future owner-mediated R2 pilot.

## Release
GLOBAL_PR_ONE_PUBLISH_V1: atomic one-publish branch+PR only after local logic checks; protected Core/Mandala/Specialist/hh-merge-check; Vercel READY/serving SHA independent of production browser MP4. No 500-ready or original-shot claims.
