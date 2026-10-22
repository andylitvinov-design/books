# Reiki Practitioner Audio Library v3 — implementation and QA
**2026-10-20 · Holistic House** · Tracking: https://github.com/andylitvinov-design/books/issues/1309

## Current owner workflow
1. Open https://holistichouse.vercel.app/admin/materials/audio/reiki-practitioner
2. Choose one of five lesson folders; independently choose RU or EN.
3. Upload 1–5 MP3/M4A/WAV files (each <=20MB) directly to private Supabase bucket. Audio bytes never pass through Vercel server.
4. After each uploaded file, the owner API verifies its actual existence and registers a readable title (from its filename) in protected \`app_private.reiki_intro_audio_metadata\`. Failure to record a title must not erase a successfully uploaded original.
5. The file list displays private/published origin, display title, optional notes, date, size and the active learner recording.
6. Preview a private original using a short owner-only signed URL; choose **Use on learner slide** to create and validate the separately approved public copy. Never auto-publish.
7. Use **Title and notes** to update the display title/description, archive an unused file and later restore it. Archiving is UI-only, not a deletion.
8. Permanent deletion of private originals is available **only after archiving**, explicit confirmation and a server-side check that the original is not the source of the currently active public track. No public release or client-media deletion.
9. Status shows the count and size of the files *returned by the current selected folder*, with a warning that results may be truncated at 100.
10. Bulk upload can stop after its current file without discarding already uploaded recordings; errors do not claim automatic publish.

## Schema and security
Migration: \`supabase/migrations/20261020145000_reiki_intro_audio_metadata.sql\`.

Table: \`app_private.reiki_intro_audio_metadata\` with primary key \`(storage_scope,object_path)\`, validated lesson, locale, constrained title <=120, notes <=360, archival flag and timestamps. All public/anon/authenticated grants revoked. Backend role \`hh_app_backend\` has only SELECT/INSERT/UPDATE/DELETE and an additional RLS policy requiring transaction-local \`hh.reiki_audio_owner='1'\`. That flag is set solely inside the owner-authorized metadata repository. The admin endpoints still validate the owner cookie, same-origin POST, whitelist keys, bounded body, storage path and actual existence. No student or public route accesses the table.

Uploads use the existing private \`hh-reiki-audio-drafts\` bucket. Only owner-approved separate copies use the public \`hh-reiki-course-audio\` and v1 manifest. No changes to 70 existing course screens or encrypted learner progress.

## Verification checklist
- Run \`node --test tests/reiki-lesson-intro-audio.test.mjs tests/reiki-audio-library-v3.test.mjs\` and dedicated HH Energywork AI workflow.
- Run targeted ESLint, TypeScript and Next.js optimized build, then the 69-slide Chromium and WebKit mobile QA.
- Verify Supabase \`relrowsecurity=true\`, no \`anon\`/\`authenticated\` SELECT, backend role RLS requires correct transaction-local flag.
- Verify deployed SHA lineage and \`holistichouse.vercel.app\` canonical alias READY.
- Guest inventory API must return 404; public API must return only explicitly published audio or \`{"audio":null}\`.
- Real owner-authorized MP3/M4A upload → private-preview → rename → archive → restore → explicit publish → student playback → unpublish still requires original audio and access to the owner's session; do not claim physical Safari acceptance without those observations.

## Deferred with rationale
- Unlimited file uploads/resumable large audio: not needed for a <=20MB/course-introduction workflow and introduces expensive quota risk. Current batch is capped at five.
- Automatic cleanup of public release URLs: "Unpublish" removes from the manifest only; historic public CDN URLs may remain live. Avoid bulk deletion of material previously shared with students without a specific revocation policy.
- True audio header sniffing, normalization/gain analysis, waveform preview: requires tested container compatibility on actual owner recordings; do not reject a legitimate format prematurely.
- Drive master archiving and HeyGen generation: separate explicit action and consent, no auto-upload/publish.


## Follow-up production hardening · 2026-10-20

- The canonical Reiki Practitioner lesson sequence currently contains **70** distinct slides, including the new separate lesson 5 introduction. This corrects obsolete 69-slide test fixtures; all slide IDs and saved learner answers remain intact.
- An old open admin tab cannot publish an **archived** recording. The server checks the private owner-only metadata flag before copying a draft or editing the public release manifest, and responds with a conflict if archived.
- The teacher's private display title is copied as owner metadata to the public *approved release* after manifest write-back. No filename/description is exposed in the student API.
- Storage deletion must be confirmed by a Storage object-info **404**, not just an accepted removal request. A 5xx/network/readback ambiguity is reported as failure.
- If the name/archive database fails, admin GET reports \`metadataAvailable=false\`. Files remain listed; archive, delete, edit, and publish controls are disabled with a visible owner warning. The private original file remains intact.
- The archive checkbox consistently describes the desired **stored state**, not an inverted action. Saving an archive selection clears a staged preview of the affected recording.
- Regression contracts cover archive-before-publish, 404-verified delete, outage feedback, propagated public release titles, and the 70-slide sequence.

**Still not owner-accepted:** an approved real audio file and an authenticated owner browser session are not connected to this workflow; no test media has been published, and no iPhone Safari physical playback can be claimed. Production bucket and metadata access can be inspected without uploading any synthetic public content.
