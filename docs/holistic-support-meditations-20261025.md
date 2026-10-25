# Holistic Support — Meditation practice (audio & video) · 2026-10-25

## Scope / UX
One new photo-led **Meditation · Audio & Video** offer in `/{en,ru,es}/holistic-support`, opening `#meditation-practices` on the **same** page. No duplicate Academy course/enrollment, no extra account or paid service.

The separate area contains:
1. A genuine, local, native HTML audio player for the already authored **96-second soft-melody/ocean soundscape** (`scripts/generate-soft-ocean-melody.mjs` -> `public/audio/*.wav`). Clearly marked as *instrumental*, not an original PsiMaster voiced pump-up.
2. A free step-by-step **video** playlist using the existing poster-first `AcademyCourseVideoPlaylist` and existing PsiMaster source inventory. Curated order: Sun meditation 1/2/3; Life Force; Circle of Fire; two original Energy Pump-Ups video archive links. No duplicated YouTube ID, no new upload or video generation. Original archive language is Russian, clearly disclosed in EN/ES.
3. A notice that **separate MP3/M4A originals are still missing**. The videos have sound, but we do **not** extract or fabricate standalone guided audio. When owner-approved original audio is available, it should be published through a verified, separately approved public-audio workflow; not by exposing private My Materials or borrowing Reiki Practitioner recordings.

The source manifest `data/academy/psimaster-media.generated.json` and `data/academy/holistic-support-meditations.ts` are authoritative for video IDs. Historical source and authorship/playback claims need independent platform verification. No medical promises and no claims of guaranteed energetic results.

## Release gates
- [ ] Focused test `node --test tests/holistic-support-meditations.test.mjs tests/temple-support-hub.test.mjs tests/holistic-support-first-screen.test.mjs`
- [ ] Targeted lint and `tsc --noEmit`
- [ ] Build and production deploy after PR review to **codex/public-book-library** only
- [ ] Vercel READY with SHA/alias exact match on `holistichouse.vercel.app`
- [ ] Real video clicks and 320/390/430px WebKit/Chromium checks; original standalone MP3 playback remains blocked until sources exist.
