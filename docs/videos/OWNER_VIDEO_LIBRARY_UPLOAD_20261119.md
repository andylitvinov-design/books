# Owner Video Library: playable existing clips + private upload (19 Nov 2026)

This incremental feature extends **the existing** `/admin/video-library` and uses the already-present, **private** Supabase `hh-owner-video-drafts` bucket. It does **not** create a bucket, API provider, cron, deployment, billing product, raw video mirror, or public upload API.

## User path

- `/admin/video-library`: owner-only playable previews of the 56 existing first-party licensed-composition MP4 rows from `data/video-catalog/scene-taxonomy.json`. Filter by four themes and *actual* approved aspect metadata; native `<video controls>` loads only on tap. Existing Montage and generator remain the only editors; `Open Montage` navigates there.
- `Add your MP4 footage`: select a local MP4 (browser verifies playable metadata and 2–180 s duration before any network upload), theme and up to eight safe tags, then upload via admin-authenticated, same-origin API-issued short-lived Supabase signed upload into the `video-library/` prefix. The file goes directly browser→Supabase, not through a Vercel Function. Upload status becomes `ready` only after exact byte count, MIME, MP4 header and complete server-side SHA256 readback match. Duplicate physical files are not silently accepted.
- `Preview` signs a 180-second owner-only URL. `Review` records explicit source type, commercial rights and people/property releases, quality score 4–5. It remains owner-private and **never** becomes generator-eligible or publicly distributed by this upload alone. `Delete` removes the exact video-library-prefix object and record and frees quota; never touches Telegram draft videos.

## Cost and privacy controls

- Maximum **8 MB/file**, **12 files**, **64 MB entire video upload catalogue**, max **two concurrent pending signed intents**. These are strictly below the existing 50 MB bucket-per-file limit; they minimize but do not guarantee zero metered consumption. The bucket is private; no anon or authenticated database grants. Backend-only `app_private.owner_video_library_v1` RLS policy uses `hh_app_backend`; both owner cookie and same-origin POST are required, response `no-store`.
- No direct browsing of `hh-owner-video-drafts/telegram-slides`, CRM, client media or other prefixes. No hardcoded API keys, no public raw-object URL, no new storage bucket. Existing licensed public MP4 assets remain unaffected. Do not let owner-uploaded client recordings or unlicensed stock through the review path.
- The 60 dual-aspect private Dareful QA sources and 104 further stock-page candidates tracked in Video Vault issue #3586 are **not imported** by this PR: no video object is created or counted until uploaded and verified. All source rights/quality/owner approvals remain independently required.

## Release and functional acceptance

1. Apply `supabase/migrations/20261119163000_hh_owner_video_library_private.sql` to existing Supabase `holistichouse`. Confirm table has forced RLS, `anon`/`authenticated` lack access, `hh_app_backend` is only granted back-end role, no new bucket.
2. Run `node --test tests/owner-video-library-contract.test.mjs` and existing Video Library tests, lint, TS and protected Core/Specialist/Guard against the final PR head.
3. Verify `GET/POST /api/admin/video-library/clips` rejects non-owner and cross-origin callers. Confirm existing published film previews render, and an owner can upload a small ORIGINAL MP4, reload the page and play it from a short-lived private signed URL. Confirm duplicate/rejected/big/invalid MP4 fails and explicit removal deletes only its exact object, without touching Telegram footage.
4. Owner can mark an uploaded file reviewed **privately**. Publishing as public stock requires separate explicit source approval, master/frame/rights evidence, product renderer integration and applicable 4-shot/16:9/9:16 tests. Never label uploading alone as site-wide generator footage.
5. Native protected merge; only the existing hourly Vercel production workflow may publish. Verify served SHA, owner page on iPhone Safari and Chrome. Until then report `PR` / `MERGED_AWAITING_HOURLY`, not LIVE.
