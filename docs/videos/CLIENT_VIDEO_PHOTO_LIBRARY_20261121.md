# Holistic House · private client photos in Video Studio
Date: 21 Nov 2026. Canonical existing editor: /{en,ru,es}/holistic-support/mandala.
Related: PR #5335 (gift), PR #5337 (HeyGen Live Photos), issue #4041 (licensed editorial photos, **not** customer photos).

## Product goal and acceptance
A signed-in client can add up to 8 private photos (JPG, PNG, WebP, browser-supported HEIC) in addition to the existing single account portrait, in batches of up to 3 for mobile stability, store them once privately, reopen on another device, choose one as the current portrait, and select different private photos as an individual storyboard's still-image beat. Reuse the existing local browser renderer, music and text; no paid provider, re-render, new editor, bucket, subscription, public CDN or publication.

Guests continue to pick images locally and export as before. Private cloud storage is opt-in and never required to make a video.

### Mobile UI
- Collapsed «My photos» drawer under existing portrait and each storyboard photo fallback. Does not increase first-screen height appreciably.
- EN/RU/ES parity; touch targets at least 32 px; 98 px grid adapts 320–430 px.
- Native multi-file chooser, local previews before save, rights and image-subject declarations; checkbox permission for other adults, parent/guardian for children.
- Save, reopen, use for video, delete with confirmation, errors/quotas/expired signed link and sign-in path. User's current creation stays local; no automatic import of CRM/client therapy data.

### Reused infrastructure
- Supabase existing private bucket `hh-client-private-media` (no new bucket), scoped path `client-video-photos/{account_id}/{sha256}.jpg`.
- Existing session and account-active gate, same-origin anti-CSRF for writes, restricted backend DB role, existing consumeRate limiter, privileged server-only storage client.
- Browser normalizes JPEG up to 1.35 MB and strips EXIF/GPS; server revalidates/rotates/resizes/compresses using Sharp, input max 1.5 MB, output max 1.45 MB. Byte-hash dedupes repeat uploads. Never save original filename, EXIF, prompt or user diagnosis.
- GET /api/app/video-photos lists max 8 scoped assets with 120-second signed thumbnails; GET ?id=... renews one signed URL for client to fetch as an ordinary File before browser compositing; POST multipart with explicit rights + private-storage consent (no external AI consent); DELETE ?id=... removes only owner's file. No public links, long-term signed URLs or service keys in clients.
- PostgreSQL transaction-local per-account advisory lock serializes storage quotas and mutations, max eight files and 11.6 MB per account; upsert false, 12 writes/hour. Private media RLS and authorization are unchanged.
- Stored photos do not automatically go to HeyGen. A future HeyGen living-photo animation requires a separate, explicit consent and approved API spend; never infer from cloud storage consent.

### Media flow
iPhone / browser file picker → browser normalization → optional authenticated private save → private signed URL (short-lived) → fetch real JPEG Blob → existing onPhotoFileSelected(File) for portrait OR existing setStoryboardPhoto(shotId,File) → same renderer → preview → MP4 → optional existing My Videos save. Deletion only removes library source; already rendered videos are separate user-owned files.

### Release gates
1. Node contract tests, existing image upload/security tests, TypeScript, ESLint, protected Core/Specialist/hh-merge-check and build.
2. Signed-in owner A create/list/reopen/render/delete; owner B GET cannot access A's hash; reject forged ID, origin, MIME, oversized, no consent, children without guardian, concurrent requests over quota, signed URL expiration.
3. Physical iPhone Safari HEIC/multiple picker, WebKit 320–430 px and Chrome desktop: screenshot/click, same private image accurately appears in output portrait and selected Story still beat; H.264/AAC MP4 verified.
4. Merge via protected native GitHub checks; deployment only via existing hourly production publisher. Verify Vercel READY, served canonical alias SHA, and real authenticated storage/media E2E; green source CI alone is NOT LIVE acceptance.

## Follow-on after PR #5335 merges
Use this shared library picker also in the Personal Video Gift photo step (that file is currently being introduced by #5335); do not copy the upload implementation or blindly overwrite its PR. Exact workflow reuses onPhotoFileSelected(File) and keeps gift's local-only default.
