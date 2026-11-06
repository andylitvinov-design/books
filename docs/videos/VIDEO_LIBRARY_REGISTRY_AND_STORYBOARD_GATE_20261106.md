# Video Library: verified registry counts and story review gate (2026-11-06)

This increment follows merged PR #3710 and the Video Library Roadmap/TZ v2.0. It improves existing code without new cloud providers, schemas, payment services, scheduled jobs or publication of footage.

## Implementation

1. Existing private owner coverage page and owner API add a live read-only count of eligible rows in Supabase app.video_vault_assets_v1. The query uses the existing backend role and forced RLS; it cannot see unapproved statuses. Browser-usable portrait and landscape candidates are counted separately. A DB outage produces null / unknown, not a fabricated zero.
2. Cloudflare physical objects are NOT independently checked by the dashboard. R2 HEAD/full GET, visual review, and final exported MP4 proof remain separate; the UI clearly discloses that limitation.
3. The reviewed four-shot ledger is source-controlled, versioned and intentionally empty until individual human frame approvals exist. A valid plan requires canonical category/topic/scenario, exactly four timecoded reviewed shots, four different filmed master IDs and hashes, approved binding rights, safe browser delivery, correct aspect and matching RLS-eligible asset metadata.
4. The existing director bridge exposes an optional reviewed-story selector using ONLY that trusted local ledger. Client-provided review booleans cannot approve a story. Passing this gate merely means the existing authenticated Vault resolve can attempt fresh R2 HEAD; it does not mean the video has been exported.
5. The coverage snapshot separately reports frame-reviewed plan count; animation and editorial tag matches never promote stories to READY.

## Verification

- node --test tests/video-library-registry-live.test.mjs
- node --test tests/video-library-reviewed-storyboard.test.mjs
- node --test tests/video-library-site-coverage.test.mjs
- node scripts/audit-video-site-coverage.mjs --strict
- Existing Core, Specialist, Mandala, security and browser tests remain unchanged.

## Remaining gates

The Vault database was last independently observed at zero records; Cloudflare account-wide spend/free-tier headroom and object inventory have not been verified. COST_GATE=HOLD. Draft source screens in PR #3575 and #3685, plus source provenance PR #3713, are not approved media. No bulk third-party download, ingestion or claims of 20/100/250/500 new filmed originals. Real Safari four-shot preview/audio/MP4 export needs its own acceptance evidence and recorded owner source approvals.

GLOBAL_PR_ONE_PUBLISH_V1: stage one coherent source tree, publish once, no new paid services, freeze HEAD while CI runs, protected merge and independent Vercel source-SHA proof.
