# Phone audio → Materials, client reports, and courses

Implementation source: branch `codex/phone-audio-materials-reports-courses`.
Do not call the change production-ready until the exact deployment and real owner
phone/browser/provider playback checks pass.

## User flows

1. **My Practice → Materials → Audio → General audio library** opens the
   existing admin library with an owner-only session. Choose **Audio**, title,
   and MP3/M4A/WAV/WebM/OGG (including .opus)/FLAC/AAC file(s) from iOS Files
   or Android Files. Import from iPhone Voice Memos using Share → Save to Files.
   General education only; no personal client material.
2. Up to 10 files per batch, each 128 bytes to **20 MB**. Common empty or
   `application/octet-stream` file-picker MIME values are normalized from
   whitelisted extensions; conflicting declared MIME is not relabelled.
   Small audio (<=3 MB) uses same-origin, admin-authorized binary upload to
   avoid iOS Safari's signed cross-origin PUT failures; larger files use the
   existing direct short-lived private signed upload (no big Vercel body).
3. After verified upload, the audio appears in the existing protected owner
   catalog with a native non-autoplay preview. No automatic public release.
4. **Client report editor → Select from library**: check an audio material with
   photos/videos. Its ID is resolved server-side to a bounded snapshot. The
   client sees a player only in a separately published, authorized session.
   Material streaming rechecks guest/cabinet authorization and bytes/Range.
   Personal consultation recordings remain in the separate client-session
   upload path; scope=practitioner stays hidden.
5. **My Practice → Courses → editor → Audio slide**: upload directly from phone
   with the same format allowlist, or, as verified owner/admin, select an
   existing general library audio and use it on the current slide. The import
   copies the validated educational original between two PRIVATE buckets,
   creates a course-owned media ID, is quota-bound and checks both owner
   identities. Course publishing remains an independent explicit decision.
6. **Reiki Practitioner intro audio** is unchanged: its private owner drafts,
   lesson/language folders and explicit approval for educational public copies
   remain separate. Never route client recordings into its public bucket.

## Storage and protection

- Reuses existing `app_private.practitioner_materials` and
  `hh-client-private-media`; only adds `audio` kind and MIME allowlist.
- Course audio uses existing `app.practitioner_course_assets` and
  `hh-practitioner-course-media`. Private bucket status and RLS are unchanged.
  No file moves from client sessions, no public Storage policy, no automatic
  transcription, no notification payload with private data.
- Migration: `supabase/migrations/20261022141000_hh_private_phone_audio_materials.sql`.
  Widening CHECKs are backwards compatible; file-size limits and existing
  MIME types remain; the old public YouTube-only publication constraint stays.
- Server verifies status, ownership, exact file length, MIME, and magic bytes.
  That check does *not* guarantee that every codec can play in every browser:
  WebM/OGG/FLAC/AAC support varies. MP3 and M4A are preferred for cross-device
  playback. Preserve the original if a conversion is later needed.
- Same-origin binary endpoints must reject cross-site requests, over-limit
  streaming bodies, wrong expected size or MIME, and duplicate overwrites.

## QA and acceptance

Run: `node --test tests/mobile-audio-library.test.mjs
tests/practitioner-material-library.test.mjs
tests/practitioner-course-builder.test.mjs
tests/client-session-owner-audio-upload.test.mjs
tests/material-library-byte-stream.test.mjs
tests/practice-private-report-materials.test.mjs`.
Run `npm run lint`, `npm run typecheck` if available and `npm run build`.
Inspect RLS, private buckets and migration status in connected Supabase.
Verify GitHub PR/CI, source production branch, Vercel READY exact SHA and
the real `holistichouse.vercel.app` alias.

**Real phone acceptance still required:** authorized iPhone Safari and Android
Chrome choose a real non-sensitive MP3, M4A and WAV recording; upload <=3MB
and >3MB; listen to server preview; select material for a synthetic unpublished
client report; publish and confirm playback only through that client's grant;
check cross-client denied, detached/expired/revoked links and 206 seek; reuse in
course audio slide; publish an *educational* course and play as learner. Test
unsupported codec playback gracefully. Keep genuine client data out of tests.

**Existing client-session delivery feature flag** `HH_CLIENT_DELIVERY_ENABLED`
may remain OFF pending previously documented private-key and E2E release gates.
Do not enable it merely to land these reusable-material improvements.
