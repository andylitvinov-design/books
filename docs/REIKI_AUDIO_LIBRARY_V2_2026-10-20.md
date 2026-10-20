# Holistic House — Reiki audio library v2
**Technical specification and implementation log · 2026-10-20**
Tracking issue: [#1309](https://github.com/andylitvinov-design/books/issues/1309)
Related initial UI: #1289, #1293

## 1. Scope and architecture
The owner-only cabinet lives at
\`/admin/materials/audio/reiki-practitioner\`. Five lesson IDs:
\`flight\`, \`tantra\`, \`kundalini\`, \`yggdrasil\`, \`initiation\`;
each has independent \`ru\` and \`en\` assets.

One audio player per lesson/language may be selected for public playback. The
existing 69 slide IDs, private course-progress encryption and all client
media are unchanged. No autoplay, AI synthesis or HeyGen credit usage.

## 2. Storage architecture — split draft vs release

### Private original (new)
\`hh-reiki-audio-drafts\` (**public=false**, ca-central-1, max 20MB).
Allowed MIME: audio/mpeg, audio/mp4, audio/x-m4a, audio/wav, audio/x-wav.

New upload path:
\`reiki-practitioner/intros/<lesson>/<locale>/<32-hex-uuid>.<ext>\`.

The owner asks the same-origin private API for an upload intent, which creates
a short-lived signed URL scoped to **one** path. The file uploads directly
from the browser to Supabase (no large audio through the Next.js runtime).

Only an authenticated owner can list draft files; owner-only
\`POST /admin/reiki-audio/data\` with \`action:"preview"\` creates
a temporary 300-second signed preview URL after a path and file check.
No private keys, draft objects, or preview URLs appear in the public API.

### Public approved release (existing)
\`hh-reiki-course-audio\` (**public=true**, max 20MB) stores **only**
approved copies and the existing
\`reiki-practitioner/intro-manifest-v1.json\`.

Publishing a private draft:
1. Owner chooses lesson/language and plays back the file.
2. Owner explicitly confirms public release.
3. Server validates path, MIME and exact size.
4. Server copies the object from private bucket into the approved public
   bucket using Supabase \`copy(...,{destinationBucket})\`.
   The release key is deterministic for a given private source path, so retries
   don't multiply public copies.
5. Server verifies public copy \`info\` matches source MIME + bytes.
6. **Only then** server writes/reads back \`intro-manifest-v1.json\`.
   Previous published entries in other language/lesson slots remain intact.
7. The public learner route returns only the entry for the chosen language
   and lesson. Failed publishing must not report success.

Unpublish removes a manifest entry without removing originals. A previously
published public object remains accessible to holders of its direct URL;
fully revoking existing public URLs requires an explicit future deletion and
CDN-cache invalidation policy. Avoid misrepresenting unpublish as a guarantee
that a previously shared link stops working.

### Legacy compatibility
Existing files in \`hh-reiki-course-audio\` can still be listed by the owner,
previewed and selected again. No migration or deletion of older public audio
is performed. The published manifest contract stays at v1, and existing URLs
remain valid.

## 3. Auth, validation, and API
- Both folder pages and the admin upload/preview/publish/unpublish API require
  the existing owner-admin session. The POST method requires same-origin
  request verification; body size is capped and field sets allowlisted.
- The preview action issues a 5-minute signed URL for private objects only.
- The upload returns a draft bucket ID and scoped signed upload credentials
  for direct browser upload. A production secret key never enters browser JS.
- Exact lesson/locale/path, 20MB size and supported MIME are validated.
- No authenticated client gets Storage SELECT / INSERT policies for this
  private bucket. The service role accesses it only on the server.
- The public \`GET /api/reiki-intro-audio?lesson=...&locale=...\` must
  not depend on private object storage or send a private signed URL.

## 4. Implementation checkpoints
- [x] Audited source branch and existing UI from PR #1293.
- [x] Created GitHub issue #1309.
- [x] Added and applied a migration for the private draft bucket.
- [x] Verified private bucket configuration and separate public release bucket.
- [x] Switched new uploads into protected draft storage.
- [x] Added owner-scoped signed preview for previously uploaded files.
- [x] Added server-side copy+readback with idempotent release path.
- [x] Preserved the existing public release manifest, 69 slides and legacy URLs.
- [x] Updated RU/EN UI warnings: private original vs publicly released copy.
- [ ] Run current branch tests (unit, lint, tsc, production build, 69-slide browsers).
- [ ] Verify PR merge and the exact production SHA on Vercel.
- [ ] Real owner-account upload, draft preview, publish and learner playback
      on Safari/Chromium with the owner's approved audio.

## 5. Operator acceptance checklist
1. Sign into the owner cabinet at
   https://holistichouse.vercel.app/admin/materials/audio/reiki-practitioner
2. Select Lesson 1 RU and upload a non-sensitive test MP3 (512B–20MB).
3. Confirm original appears as **Private original**. It must NOT appear in
   the public learner slide or at a guessed public-bucket URL.
4. Refresh the folder, select original, and verify the signed preview plays.
5. Click **Use on learner slide** and confirm; verify a public copy appears,
   one approved manifest entry exists and the RU learner playback works.
6. Verify English and other lessons remain untouched and no autoplay occurs.
7. Re-select and publish the same original; verify no second public copy.
8. Unpublish and confirm the learner manifest no longer returns the audio;
   original remains in the protected folder.
9. Repeat from iPhone Safari (file picker, scrolling, audio).
10. Reject unsupported formats/oversize, unauthenticated admin requests and
    cross-folder keys. Confirm no client/private file exposure.

## 6. Remaining roadmap, not represented as complete
Friendly editable titles, notes, bulk/resumable uploads, optional deletion
and CDN revocation workflow, real audio header sniffing, quota dashboards,
Drive master archiving, and reusable modules for other courses. Only add these
after security and real owner e2e acceptance. No user-uploaded audio or
YouTube/Drive publication was automatically initiated by this PR.
