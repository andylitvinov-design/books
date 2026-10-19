# Reusable practitioner videos — owner-only private Supabase pilot

**Release:** 2026-10-18. Approved request: allow previously attached educational videos to be reused in other Holistic House client reports without publishing or copying a client's report.

## Scope
- Owner-authenticated `/api/admin/materials` only. An old `/admin` login can safely upgrade to the already implemented `/api/admin` session via `/admin/api/recorder-auth`; the bridge does not log in guests.
- General education only. Before moving existing client-session footage or uploading a phone file, the practitioner explicitly confirms it has **no client-specific content**.
- YouTube links are normalized/deduplicated, including legacy links and top/bottom resources.
- Existing session videos are linked to the **same private storage object**, only when ready, owner-authenticated, and `additional`/`meditation` scoped. No personal/hidden/instruction recordings. No file copying, no secret URL or client metadata in shared catalog.
- Save is separate from attaching or publishing a report. The viewer retains per-session authorization for private media.

## Capacity & privacy
- Provider: existing Supabase project `holistichouse`, **ca-central-1**, existing bucket `hh-client-private-media` (`public=false`).
- Owner-only flag: `HH_MATERIAL_VIDEO_SUPABASE_UPLOADS_ALLOWED=true` for production. **Does not** change `HH_CLIENT_VIDEO_SUPABASE_UPLOADS_ALLOWED` and does not open personal client video uploads.
- Server-side caps: **40,000,000 bytes per MP4/MOV**; **160,000,000 bytes** in total for owner-uploaded Supabase video library. Pending upload bytes are reserved under a transaction advisory lock. Private bucket retains its existing 50,000,000 byte max.
- Private storage MIME list was expanded only to add `video/quicktime`. MOV/HEVC is not transcoded automatically; Windows/Android cross-browser playback still needs testing, and H.264/AAC MP4 remains the recommended format.
- This pilot uses the existing provider, no R2/S3 vendor, new public CDN, or automatic YouTube publication. Monitor free quota and disable the flag before an unsustainable workload.

## QA and blockers
- Functional test should include iPhone Safari selection of ≤40 MB MP4/MOV, signed upload, finalization, library readback, selecting in another client's draft, explicit publication, the invite guest and saved cabinet, Range seeking, and no cross-client data leakage.
- Importing from a client's existing report requires a discoverable YouTube link or a ready private video asset. If the actual clip lives only in HeyGen and no MP4 has been uploaded to site storage, **it cannot be silently registered** as playable. Download or upload the existing finished MP4 once; do not regenerate, invent its URL, or treat expiring HeyGen URL as production CDN.
- Rollback: set `HH_MATERIAL_VIDEO_SUPABASE_UPLOADS_ALLOWED=false` and redeploy. Already saved private media remains readable by existing authorized report readers; no automatic deletion.
