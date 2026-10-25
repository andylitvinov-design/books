# Holistic House · Coaching author audio folders · 2026-10-24

## Purpose and source of truth

**Feature branch:** `codex/coaching-owner-audio-folders-20261024`. Existing production app (no second CMS or client-audio storage). Original task: owner creates **My Materials → Coaching → Egyptian / Greek** and records on iPhone, adds to course slides.

### Owner navigation and recording
- [My Materials](https://holistichouse.vercel.app/admin/materials)
- [Coaching](https://holistichouse.vercel.app/admin/materials/coaching)
- [Egyptian / Египетский](https://holistichouse.vercel.app/admin/materials/coaching/egyptian)
- [Greek / Греческий](https://holistichouse.vercel.app/admin/materials/coaching/greek)

Every course has a separate folder per **canonical question ID** (Egyptian 11 screens, including 2 independent Khaibit steps; Greek 10) and per EN/RU/ES language. Stable question IDs from existing `hh-coaching-tradition_models_seed`; no duplicate course records. Choose **Question → Language**, tap **Record on this phone** in Safari and Stop, or export Voice Memos on iOS via **Share → Save to Files** and select M4A. Supports MP3/M4A/WAV **512 bytes–20 MB**. File stays on device until explicit **Save in My Materials**; direct signed upload to existing **private** `hh-practitioner-course-media` bucket (`coaching/<course>/<question>/<lang>/<random>.m4a`). No Vercel upload body or paid text-to-speech provider.

Owner can save several originals per slot, select previously saved recordings, listen via 5-minute private signed preview, and explicitly **Add this audio to the course** after confirmation. This records an active-slot JSON manifest at `coaching/active-narration-v1.json` in the **existing public JSON-capable bucket** `hh-reiki-course-audio` (JSON contains **only** a private randomized Storage path, validated MIME, byte count, publication timestamp; no audio bytes or personal learner data). Audio itself **never becomes public**. Unassign only changes that manifest, never deletes the original. A former time-limited playback URL may continue to work until expiry.

### Learner
`/en/app/coaching/egyptian`, `/ru/app/coaching/egyptian`, and Greek equivalents render audio on the **matching question screen**, before device TTS. EN/RU/ES are independent; ES may run at `/en/app/coaching/{slug}?lang=es`. Playback loads on mount with no autoplay and a **new 15-minute private signed URL** only from an authenticated `/api/app/tradition-coaching-audio` request with verified account ID. Missing/unassigned narration is simply omitted and the text question remains. Never send any goal, client answers, or narration into CRM/SMS/push/telemetry. CSP allows only this owner editor and private learner route to connect/play Supabase audio.

### Privacy and operating controls
- Admin editor/API need owner PIN session; all POST need correct same-origin and strict JSON schema.
- Learner API requires `auth.verified()` and matching `x-hh-account-id`; no anonymous media access.
- File path whitelisted to course + actual version-pinned question ID + locale; bounded bytes/MIME; draft bytes remain private.
- **Course audio must be non-confidential educational narration**. Client consultations, health and other personal answers must never be uploaded to this course library.
- An audio recording is not assigned automatically after upload. Owner confirms it deliberately.
- No bucket or migration changes, new AI spend, external ads or emails. Existing bucket size restrictions remain.

### Verification / release gate
- `node --test tests/coaching-author-audio.test.mjs`
- `npm run test:coaching:release`, scoped ESLint, `npx tsc --noEmit`, `npm run build`.
- Check owner private routing, guest 404, malformed question/locale rejection, verified app API path, Supabase signed URL and CSP.
- Verify Vercel production **READY**, SHA and `holistichouse.vercel.app` alias after merge.
- Still requires one **real owner iPhone recording + save + private preview + approved assign + authenticated student EN/RU playback + unassign**. A green build or mocking Storage alone does not count as that device E2E. No author audio samples have been uploaded in this code change.

### Reuse, rollout and rollback
Old Reiki recording folders, buckets, learner IDs and master-course media are unchanged. Rollback: remove coaching manifest entries (unassign), then revert feature commits; do not delete any course audio originals or touch client data.
