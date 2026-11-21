# Video Studio · XP wallet v2 — implementation/release

Source of truth: GitHub issue #5345. Approved SKU prices: Basic 250 XP, Live Gift (one image-to-video animation) 500 XP, Cinematic 750 XP, Cinematic Premium 1000 XP. Welcome is 1900 XP once per *new active app account*. Reference 100 XP = US$1 is pricing copy, not redeemable currency.

## Existing infrastructure
- Reuse lib/video-credits/model.mjs, service.js, app/api/app/video-credits/[action]/route.js and the private Supabase video_credit_* tables, do NOT create a second wallet.
- Existing historic ledger: 1300 starter, 300/month for prior cohort, video charge 10 XP; preserve all grants, completed charges and released holds.
- The additive migration 20261121231000 allows immutable legacy rows while admitting exact v2 SKU/price pairs and a new 1900 starter. Old production code continues to work during rollout.
- A server version flag HH_VIDEO_XP_V2_ENABLED, schema approval HH_VIDEO_XP_V2_SCHEMA_APPROVED, old ledger flags HH_VIDEO_CREDITS_ENABLED/HH_VIDEO_CREDITS_SCHEMA_APPROVED, and an explicit UTC cutover HH_VIDEO_XP_V2_CUTOVER_UTC are all required. Missing any => no v2 charging or 1900 issuance.
- Welcome eligibility is determined by verified app.accounts.created_at >= owner-approved cutover, serialized via app.accounts FOR UPDATE and the existing unique starter grant_key. Previous accounts never receive an automatic second welcome grant.
- Legacy cohort retains the old 300 monthly grant. New 1900 cohort does not accrue 300 automatically, pending separate owner decision.

## What this PR actually enables
- One reusable centralized pricebook and a versioned catalog visible in RU/EN/ES cabinet.
- Real signed-in browser basic MP4 export reserves 250 XP and settles after verified playback readiness, using the old exact operation ID and immutable server-side Postgres hold/capture/release path. User-submitted prices and non-Basic SKUs are ignored/rejected.
- New user 1900 welcome after cutover, legacy balances immutable.
- Guest browser preview can remain free, but guest first full export is disabled in v2; sign-in and XP are required.
- Unready AI/cinematic SKUs show the fixed tariff but are explicitly unavailable until their provider/render E2E and budget gates exist. No advertised fake completion or unverified payment.

## Required follow-up to fully achieve issue #5345
1. Resolve overlap of open gift PRs #5334 and #5335; preserve one Video Studio route and verified MP4 exporter.
2. Merge private HeyGen Live Photos PR #5337 after genuine CI and Vercel gate. Code separate XP external-job hold, settlement and one new 5s HeyGen call per VIDEO_LIVE_GIFT SKU in the *same* transaction as the private client job; remove/neutralize the old first-free+EUR model from closed #5342. The DB migration from that PR was already applied and must be reconciled forward-only.
3. Cinematic/Cinematic Premium: implement real 750/1000 XP-backed end-to-end render jobs, server source locking, a bounded one-AI-clip cap and no hidden paid model fallback.
4. XP top-ups: add one-time purchases with verified merchant capture and Stripe/PayPal webhook reconciliation, or carefully reviewed manual receipts. Current subscription or enquiry payment backend does not prove a working XP checkout.
5. Verify real HeyGen *Direct API* key and prepaid API balance. ChatGPT HeyGen/Creator subscription is not site REST credit access. New spend must have explicit separately approved cap.
6. E2E: new-vs-old account, tamper/idempotency, two-tab overbooking, failed exports, iPhone Safari playable H.264/AAC, bilingual/Spanish UI, My Materials/reuse, RLS/consents, provider callbacks and signed/private media, payment replay/refunds.

## Release control
- Production branch codex/public-book-library, Vercel codex-public-book-library team super10; protected hh-merge-check enforces Core + Specialist. Do not alter required checks.
- All code staged and validated before one atomic branch publish and one Ready PR. No extra CI wave unless a *verified* failing check needs correction.
- Supabase migration is forward-only/additive, already independently applied and read back: all 51 legacy charge records preserved; forced RLS and no authenticated SELECT retained.
- Configure new Vercel schema approval in Production but leave paid activation switches OFF until all code is merged, schema verified and next hourly deployment can actually serve the new code. Avoid accidentally turning on the old 10-XP product in a preceding build.
- Routine Vercel production release may only use existing top-of-hour workflow; no direct deploy/promote, even at user request 'LIVE'. Independently verify canonical domain SHA and signed-in real E2E.

Status categories: SCHEMA_APPLIED != CODE_MERGED != VERCEL_READY != REAL_PROVIDER_E2E. Never claim finished where any stage is missing.