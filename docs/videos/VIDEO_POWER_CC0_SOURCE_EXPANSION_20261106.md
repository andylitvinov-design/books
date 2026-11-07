# Video Power — Safe source expansion implementation (6 November 2026)

## Changes
1. Add **Free Nature Stock** official single-video `/video/<slug>/` pages to the existing read-only sourcing queue and strict per-clip CC0 rights gate for the EXISTING private Video Vault importer. Do not bulk scrape, download or mirror the site. Current official website: https://freenaturestock.com/videos/ ; publisher CC0 license: https://freenaturestock.com/license/ ; terms: https://freenaturestock.com/terms/ .
2. Register **12 source-backed sunlight/nature research candidates** with source-specific page URL, webpage-listed duration/resolution and *unapproved* status. All require physical media, human beauty score, ownership/release check, signed-off editing/export permissions and private R2 readback.
3. Record **Coverr as research-only**. Its 2026-11-04 licence permits edited videos but forbids bulk downloading and requires creator/Coverr credit for Demo API; production API tier is paid. There is no automatic Coverr fetch or Coverr vault ingest. References: https://coverr.co/license and https://coverr.co/api/docs/start .
4. Add an honest read-only `published-provenance` audit to distinguish edited camera footage source pages, Supareels AI videos, historical unknown-origin clips, and procedural animations. Do not report source-page counts as independently frame-verified filmed masters.
5. Preserve existing NPS (54 candidate IDs, merged #3667), Dareful #3575 (still separate Draft, rights/physical/owner review), R2 500 fail-closed flags and all existing Video Studio clients.

## Commands (no network, no billing)
```sh
node scripts/plan-video-vault-sourcing.mjs --input=data/video-catalog/free-nature-stock-sunlight-research-12-20261106.json --json
node scripts/audit-video-source-provenance.mjs --strict
node --test tests/video-vault-sourcing-queue.test.mjs tests/video-vault-500.test.mjs
```

## Production truth and gates
- The existing *catalogue* had 48 approved/historical MP4 entries plus 684 physically encoded original procedural animations after #3576, not 732 film-camera originals. 20 `film-collection-v2` rows reference Supareels AI generated footage; 16 `film-collection-v3` rows cite Dareful filmed-source pages (12 two-shot edits, 4 single). 12 `money-films-v1` are legacy exported files lacking individual original-source attribution.
- 12 new Free Nature Stock records are research candidates ONLY: **0 new MP4 files, 0 R2 uploads, 0 published videos** in this PR.
- CC0 concerns copyright, NOT releases for recognisable people/brands/private property. Licence and right-to-publish require clip-specific proof. Site terms explicitly warn about third-party rights.
- `lib/mandala/free-stock-sources.mjs` treats only exact Free Nature Stock video pages as possible CC0. Source metadata does not flip approval flags or bypass the existing `validateVaultAsset` contract.
- Cloudflare R2 Standard (private) remains disabled until owner verifies account-wide billing, existing private bucket, scoped secrets, Supabase migration status, individual real originals, PUT/HEAD/GET/sha256 and real iPhone Safari end-to-end output. No manual per-source approval is assumed.
- A licensed clip with `scene_edit_only` delivery may not be selected in current browser Canvas; do not expose stock raw MP4 through a public mirror. Use existing legal/client-exposable qualified footage only.

## Next independently gated deliverables
1. Finish reviewed, approved original MP4s from Draft Dareful #3575, in THAT PR or approved successor, without guessing which sources should be released.
2. Local operator selects and acquires particular Free Nature Stock 12 candidates under terms; verifies all real moving frames, removes near duplicates, produces crop-aware contact sheets, individual attribution/evidence and stores private files. Do not count URL candidates.
3. Verify actual account-wide Cloudflare R2 costs/headroom and Supabase role/RLS/migration, then owner-authorized pilot 20 filmed masters across all 6 categories (including independently released/consented people footage). If unverified, HOLD.
4. Connect already-built private search/resolve to existing Video Director only after live R2 pilot, short-lived URLs, CORS/Range, audio MP4 export, iOS Safari proof and protected CI/Merge/production SHA.
5. Upgrade authoring workflows and source ingestion only when they DO NOT duplicate already shipped modules or violate the global one-publish contract.

## Delivery policy
`GLOBAL_PR_ONE_PUBLISH_V1`: stage all source+tests+docs into one atomic Git tree and publish one HEAD, use existing Core/Specialist/hh-merge-check, do not add cron, paid service or parallel CI workflow. Do not label a research commit 'all 500 videos LIVE'.
