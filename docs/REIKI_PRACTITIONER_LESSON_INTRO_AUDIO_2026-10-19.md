# Reiki Practitioner — lesson introduction audio (19 October 2026)

## Scope
Existing five-lesson interactive course: \`/{en|ru}/academy/principles-of-energywork/learn\`.

The four *existing* pre-meditation introduction slides (\`flight-01\`, \`tan-01\`, \`kun-01\`, \`ygg-01\`) have three concise EN/RU objectives and an optional audio player. There are still 69 stable slides; no encrypted learner answer IDs, progress positions or initiation gates change.

## For Andrey
1. Sign in to the protected practitioner cabinet.
2. Go to **Reiki · Intro audio** (\`/admin/reiki-audio\`) from either cabinet or the header.
3. Choose Russian or English and select Flight to the Sun / Tantra Reiki / Kundalini Reiki / Reiki Yggdrasil.
4. Select your own MP3, M4A or WAV recording (≤20,000,000 bytes). Preview it locally with the audio controls.
5. Click **Upload audio**. The upload uses a one-time signed URL direct to Supabase Storage. It is **not published** by uploading.
6. Click **Publish to learners**. The server verifies stored object MIME/size and updates a public-only manifest; a readback confirms the change. Learners see the audio on the intro slide after CDN/API caching (normally within one minute).
7. Click **Unpublish** to hide the audio from the course without losing the original source.

Two languages are independent and optional. Until an audio recording is published, learners see the short educational text. No autoplay, microphone permission, AI voice synthesis, HeyGen credits or YouTube uploads are used.

## Storage and security
- Existing Holistic House Supabase project, Canada Central.
- Bucket: \`hh-reiki-course-audio\` (public educational audio only).
- Maximum file size: 20MB; MIME allowlist: audio/mpeg, audio/mp4, audio/x-m4a, audio/wav, audio/x-wav; plus application/json for manifest.
- Immutable random paths: \`reiki-practitioner/intros/<lesson>/<locale>/<UUID32>.<extension>\`.
- Explicit published listing only: \`reiki-practitioner/intro-manifest-v1.json\`. No learner names, private messages, or client details.
- Anonymous clients cannot upload: existing \`storage.objects\` RLS has no policy for this bucket; only server-side secret-key authorization signs an individual upload path after owner authentication and same-origin POST verification.
- Do **not** use this public bucket for client recordings, private lessons, personal consultations, or customer data. Public storage makes the recording accessible to anyone with its link, even before it is featured in a lesson.
- Backend: \`/admin/reiki-audio/data\` (owner-only); \`/api/reiki-intro-audio?lesson=tantra&locale=en\` (public sanitized response).
- CSP allows Supabase only for the exact Reiki learner route and owner audio manager route. No extra audio URLs on other pages.
- Cost: files consume the *existing* Supabase project quota only; no separate paid provider or runtime audio generation.

## Verification and acceptance
1. \`node --test tests/reiki-lesson-intro-audio.test.mjs\`.
2. \`npm run build\`; verify Next.js TS and ESLint; run existing 69-slide browser/intro tests.
3. Confirm project bucket exists, is public, restricted to the listed MIME types and 20MB, and storage.objects RLS remains enabled.
4. Owner authenticated test: upload a *non-sensitive owned sample* to one language, preview, publish, verify API + course native playback on iPhone/desktop; then unpublish and verify API hides it.
5. Confirm English/Russian independent; invalid type/size/action rejected; guest cannot create upload or publish; no client data leaks.
6. Vercel production SHA and \`holistichouse.vercel.app\` alias must match before marking live.

No actual Andrey recording was provided at implementation time. Do not claim it was uploaded/published or that a real-media upload was verified until owner supplies it and verifies playback.

## Rollback
Unpublish the affected lesson audio in the protected manager. If code rollback is needed, revert this feature PR. Do not delete existing private storage/media. The isolated public bucket and uploaded originals can remain unused for later restoration.
