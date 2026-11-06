# Holistic House — Community Video Publishing V2 (local implementation package)

Status: **feature flags OFF by default. Never treat PR, migration, or CI as proof of LIVE.**

Built against protected production `codex/public-book-library` (2026-11-06). Issue: https://github.com/andylitvinov-design/books/issues/3742. Required release rules: GLOBAL_PR_ONE_PUBLISH_V1, AGENTS.md, CI_RELEASE_POLICY.md.

## Contents
- `lib/app/community-video-model.mjs`: consent/metadata/identity, channel, resumable verification.
- `lib/app/community-video-publishing.js`: signed-in request, private source verification, owner moderation, public projection.
- `lib/app/community-youtube-provider.js`: dedicated OAuth grant, initiation fence, one upload session, 308 continuation, verified readback.
- `app/api/...`: signed-in video API, owner-only review/preview/OAuth API.
- `components/...`: opt-in publication, owner queue, public creator cards.
- `app/[locale]/creators/[opaque]/page.tsx`: consent-gated public profile.
- `supabase/migrations/...sql`: new private FORCE-RLS registry.
- `source-patches.json`: precise integration edits for six existing repository files.
- `tests/*.test.mjs`: eight local pure/source checks.

## Safe release and enablement

1. Recheck the latest production SHA and all overlapping PRs; do not apply blindly to a changed HEAD.
2. Inspect the single atomic PR diff and verify it does not overwrite unrelated work.
3. Re-run pure tests, SQL migration and owner isolation in disposable PostgreSQL.
4. Keep all four new flags off for merge; if any required CI fails, fix without bypass.
5. Run `node --test tests/community-video-*.test.mjs`, TypeScript, ESLint, Next build, existing App R1 / Guard / browser suites. Verify isolated PostgreSQL migration and RLS with two accounts before enabling.
6. Review source final-MP4 provenance and branding, and perform real mobile Safari tests. Existing watermark is a browser-rendered stamp; admin attestation is a manual safeguard, not cryptographic provenance.
7. Prepare **one complete atomic remote Git-tree publish** and **one Ready PR** after cost, branch and ownership gates; do not push per-file commits.
8. Only after protected merge, approved production migration, new channel and separate OAuth confirmation, consider turning flags on one by one.

## Feature flags (all OFF unless deliberately enabled)
- `HH_COMMUNITY_YOUTUBE_SCHEMA_READY=true` only after the migration is applied and RLS tested.
- `HH_COMMUNITY_YOUTUBE_REQUESTS_ENABLED=true` only after request/privacy checks.
- `HH_COMMUNITY_YOUTUBE_CHANNEL_ID=UC...` only the newly created dedicated community channel, never an existing master channel.
- `HH_COMMUNITY_YOUTUBE_UPLOADS_ENABLED=true` only after owner OAuth and final MP4 watermark/source rights verification.

## Critical external blockers
- New dedicated community YouTube channel has not been verified or connected.
- No authorized real test video or owner consent was provided.
- Production migration is not applied.
- Full repository dependency install, TypeScript/ESLint/Next build, browser E2E, real Google upload and protected merge have **not** been executed in this package.
- Telegram member-origin adaptation is not present: the existing owner-only bot cannot be treated as verified participant identity.

## Local checks
Local candidate tests: `node --test tests/community-video-*.test.mjs`. `node --check` for JS/MJS service and route files => passed. These are not integration, SQL RLS, CI or LIVE evidence.

## Safe Google cost/quota preflight
No background upload, retry cron, paid storage, subscription or new CI workflow exists.
The isolated Google OAuth client reuses the existing owner Google OAuth application but
uses a new callback URL and encrypted refresh token context. Only a newly created
channel whose Google `snippet.publishedAt` is on or after November 6, 2026 and whose
name contains Holistic House is eligible. Channel ID is pinned to immutable `UC...`;
existing @shamanic_academy and master channels must never be used.

The owner must check the YouTube Data API's project quota and billing constraints
before setting `HH_COMMUNITY_YOUTUBE_UPLOADS_ENABLED=true`; there is a server-side
limit of five first attempts/day, one persistent attempt per source, plus a
non-replayable initiation fence before any Google POST. If outcome is uncertain
without a known resumable URI, a human must reconcile in Google Studio; never
replay `videos.insert` to guess. If a URI is saved, only that same session may
receive HTTP 308 status probes and resumptions. A `videos.list` readback is
required before `provider_state=processed`.

`HH_COMMUNITY_YOUTUBE_SCHEMA_READY=true` is independent of intake: it stays on
when owner disables new submissions, so users can still see existing states and
withdraw consent. Removing the website card must never falsely represent a
Google deletion; a separate pending/confirmed state remains.

## Current known limitations
- Site server receives only the final private MP4, verified from private storage.
- Admin must manually review actual MP4 and SHA before marking `free_watermarked`;
  a client-side branding label is NOT a trustworthy server entitlement.
- `pro_clear` requires the existing real server pilot capability; no honor-system unlock.
- Ordinary Telegram inbound creator video needs an authenticated account binding;
  this adapter is not delivered until independently verified, so owner-only bot
  messages cannot create community publications.
- No automatic video upload is triggered by My House or Telegram delivery.
- Manual Google takedown verification currently recognizes explicit Private status.
  A missing or opaque Google video response is NOT proof of deletion.
