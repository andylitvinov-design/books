# HH VIDEO VAULT 500 — operator guide (R2 private; zero-new-spend gating)
**Source of truth:** [HH VIDEO VAULT 500 v1.0](https://docs.google.com/document/d/1TwOGKqhkk-3dFOgShyXVPXXd2o4hJ06X4kaSwFn5JKk/edit), 4 November 2026. Production base `codex/public-book-library`.

## Implementation boundary and current VERIFIED status
The new importer is **DRY-RUN** by default and adds no billable infrastructure. It does not create an R2 bucket, provision a paid Cloudflare account, fetch remote source clips, expose the R2 registry, or enable the browsing UI. The existing approved local 44 MP4 masters and 684 original-motion/procedural assets are unaffected; **neither are credited as 500 independently filmed R2 originals**. Prior to owner/cloud billing gates, verified unique R2 footage = **not yet verifiable / no verified objects in this release**, generator LIVE = **not claimed**. No staged candidates/URL records can increment the counter.

This migration is **not applied automatically by opening a PR**; deploy after exact-head CI and authorized database rollout. R2 account costs, private bucket, scoped R2 read/write keys, billing/free headroom, browser CORS/Range/Canvas/Safari and actual ingestion are **owner/provider-dependent acceptance gates**. Soft usage limits in a CLI are **not** cloud billing hard limits, so fail closed when usage is absent.

## Allowed 500 footage
| Category | Unique filmed originals |
| --- | ---: |
| nature | 125 |
| water | 100 |
| people (rights/releases cleared) | 100 |
| heritage | 75 |
| work | 50 |
| relationships | 50 |

One master = one physically filmed independently identifiable source, **not** a colour treatment, clone/crop, synthesis, source-page URL, or two-source composite. Visual owner score at least 4/5. H.264 MP4 yuv420p faststart, 24fps, 5–15s, 1920×1080 or 1080×1920, ≤12MB, JPG poster <150KB, three decoded frames, source/master SHA256 and 64-bit frame difference hash. Do not upload anything with unknown commercial/edit/raw delivery rights, subject/model/property releases, watermark or unsafe context.

## Preflight (all required to remove HOLD)
1. Confirm official **Cloudflare R2 Standard** account billing, payment exposure, actual storage across **all** buckets and products, current billing-period GB-month, API Class A/B counts, free tier and account limits. This is a human/provider dashboard snapshot, not an extrapolation from a bucket count. Do not sign up for billable products. Hard operator stop at 7GB vault and soft stop at 8GB whole R2 account; Class A 100,000 & Class B 1,000,000 monthly operational caps, far below advertised free allowance. No promise of hard enforcement by Cloudflare. Reverify before every batch.
2. An existing private Standard bucket, minimum permissions, account ID, separate **read and write** R2 scoped S3 credentials, CORS restricted to approved Holistic House origin(s) for HEAD/GET + Range. **No r2.dev public domain or Worker.** S3 presigned GET uses Cloudflare account endpoint; it is bearer access, not DRM.
3. Apply/verify [private SQL migration](../../supabase/migrations/20261104235500_hh_video_vault_assets_v1.sql) under approved operator process and security advisor; do not change existing client/meditation tables. Keep app role and RLS.
4. Curator selects and reviews concrete licensed physical source files, verifies actual moving frames/rights and all people/property/logos releases and edit/credit obligations. Pexels/Pixabay bulk downloading prohibited without written provider authorization; this importer only accepts locally provided reviewed originals, no downloading. Mixkit Restricted rejected. Credit CC BY source and edited notice in final video. No image/audio/medical or personal media scraping.
5. Pilot 20 unique (≥2/category), then new total 100,250,500 **only after each milestone cost, original identity, owner, visual and real playback approvals**, with 2–3 max concurrent operator loads (this CLI processes sequentially). Do not enable another hourly automation. The existing Sheets `15_Stock_Clips` remains research queue only.

## Private environment (names only; never paste credentials here)
```text
HH_VIDEO_VAULT_R2_ENABLED=false
HH_VIDEO_VAULT_R2_DISABLED=true
HH_VIDEO_VAULT_R2_WRITE_ENABLED=false
HH_VIDEO_VAULT_SEARCH_ENABLED=false
HH_VIDEO_VAULT_APPLY_APPROVED=false
HH_VIDEO_VAULT_OWNER_UPLOAD_CONFIRMED=false
HH_VIDEO_VAULT_R2_ACCOUNT_ID=[existing account id; server only]
HH_VIDEO_VAULT_R2_BUCKET=[existing private Standard bucket; server only]
HH_VIDEO_VAULT_R2_READ_ACCESS_KEY_ID=[scoped private secret]
HH_VIDEO_VAULT_R2_READ_SECRET_ACCESS_KEY=[scoped private secret]
HH_VIDEO_VAULT_R2_WRITE_ACCESS_KEY_ID=[separately scoped private secret]
HH_VIDEO_VAULT_R2_WRITE_SECRET_ACCESS_KEY=[separately scoped private secret]
HH_APP_DATABASE_URL=[existing protected database role]
```
Never use `NEXT_PUBLIC_*` credentials, commit them, log the actual presigned URLs, or grant browser/client direct S3/list access. The search and resolve API routes are private, signed-in, same-origin on state-changing POST, rate-limited; only `raw_client_delivery_ok` selected footage is exposed. If the licence forbids this, keep the footage **server-only** and do not select it in Canvas.

## Offline manifest and cost evidence
```json
{
  "schemaVersion": "hh-video-vault-batch-v1",
  "batchId": "pilot-hh-2026-001",
  "milestone": 20,
  "assets": [
    {
      "type": "real_footage",
      "assetId": "morning-forest-camera-001",
      "sourceProvider": "first_party",
      "sourceAssetId": "owner-camera-001",
      "filmedMasterId": "owned-original-camera-00001",
      "originalSourcePage": "https://holistichouse.vercel.app/owner-provenance-001",
      "localFile": "owner-local-original.mp4",
      "title": "Forest morning",
      "creator": "Rights verified original owner",
      "licenseId": "owner_original",
      "ownershipEvidenceVerified": true,
      "licenseEvidence": "Original filmed footage; owner reviewed original rights and filming",
      "rightsCheckedOn": "2026-11-04",
      "commercialUseApproved": true, "editingApproved": true,
      "noRecognizablePeople": true, "noVisibleBrandLogos": true,
      "subjectReleaseStatus": "not_applicable",
      "visualApproved": true, "beautyRating": 5,
      "humanReviewer": "Curator (verified)", "ownerApproved": true,
      "manualFootageVerified": true,
      "deliveryPolicy": "client_raw_allowed",
      "rawClientDeliveryApproved": true,
      "category": "nature", "tags": ["forest", "sunrise"],
      "goals": ["calm"], "motifs": ["forest"],
      "aspect": "landscape", "pace": "slow",
      "expectedByteBudget": 8000000
    }
  ]
}
```
This is an **illustrative metadata example**, NOT verified footage, source page, rights or approval. Do not submit it as a real completed import.

```json
{
  "provider": "cloudflare_r2_standard",
  "checkedAt": "2026-11-04T12:00:00.000Z",
  "ownerConfirmedNoNewSpend": false,
  "billingAndPaymentMethodReviewed": false,
  "r2AlreadyEnabled": false,
  "accountUsageVerified": false,
  "remainingStandardGbMonthVerified": false,
  "otherCloudflareUsageChecked": false,
  "accountStorageBytes": 0,
  "vaultStorageBytes": 0,
  "monthlyClassA": 0,
  "monthlyClassB": 0
}
```
Illustrative **BLOCKED cost proof** only; never replace unknown usage with zeros and set flags to true merely to pass the CLI.

## Commands
```sh
# Reuse the existing importer; mode defaults to dry-run and local-file validation
node scripts/import-scenario-video-batch.mjs /private/pilot.json --target=r2 --dry-run

# Only after verified owner/legal/cost gate, scoped secrets, physical 20 files:
node scripts/import-scenario-video-batch.mjs /private/pilot.json --target=r2 --apply --usage=/private/r2-cost-snapshot.json

# Read-only exact HEAD + file size/checksum audit, costs verified:
node scripts/video-vault-ingest.mjs --r2-audit --usage=/private/r2-cost-snapshot.json
node scripts/video-vault-ingest.mjs --r2-audit --full-readback --usage=/private/r2-cost-snapshot.json
node scripts/video-vault-ingest.mjs --reconcile
node --test tests/video-vault-500.test.mjs
```
Private source files and signed/licence evidence belong on operator-only disk or protected internal store; upload only vetted canonical MP4/poster/evidence; never place source originals or credentials into GitHub, public/ or Vercel build.

## API and Auto Director
Enabled only after owner/proper proof:
- `GET /api/app/video-vault/search?goal=calm&motif=forest&aspect=portrait&limit=12` → authenticated, approved minimal metadata/poster link, never entire registry or secrets.
- `POST /api/app/video-vault/resolve` with `{"projectId":"user-project-id","assetIds":["...4 reviewed ids..."]}` → four exact approved objects with 20min presigned playback URLs. Unauthorized/missing/broken R2 HEAD blocks; client-local fallback must be visibly indicated, not silently treated as real footage.
- `suggestVerifiedVaultMontage(rows, criteria)` in `lib/video-vault/director-bridge.mjs`: optional bridge, semantic 4 independently filmed IDs, no arbitrary URLs. **This version does not replace the existing Canvas 4-shot renderer or claim iOS playback integration**; activation must follow actual R2 pilot/browser QA before enabling UI.

## Critical verification gates before claiming LIVE
- Per asset: owner licence+release proof; visual 4/5+; source SHA and distinct filmedMasterId; 3-frame decode; H.264/crop/length/poster; exact R2 size/MIME/metadata/GET SHA; DB RLS and audit row; no client raw access unless separately permitted.
- Browser: 4 distinct clips preview, 4-shot export with audio and correct duration, Canvas CORS Range/206, Safari 320/390/430 and Chromium, private source expiry/refetch, save iPhone Files, EN/RU/ES. Do not infer acceptance from GET 200 or CI.
- After PR: exact-head Core + Specialist + hh-merge-check; protected merge; record final merge SHA; Vercel READY production pointing at it, canonical `holistichouse.vercel.app` smoke; disabled flag rollback.
- Report `NEW_UPLOADED`, `READY_AFTER_QA`, `DEDUPED`, `HOLD_COST`, `HOLD_RIGHTS`, `R2_BYTES`, `COUNTABLE_N_OVER_500`; 20 independently used video exports required for final DoD. This PR's code or 500 Sheet rows **does not establish any real uploaded files**.
