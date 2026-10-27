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

## Locale discovery boundary · 2026-10-25 correction
The 2026-10-24 PsiMaster catalogue policy requires **RU-only original recordings to be omitted from EN/ES public discovery**. The first proposed variant incorrectly offered the Russian playlist on EN/ES (even though it labeled the original speech). Corrected this before accepting release:
- RU: original seven source-backed PsiMaster practices as a free curated playlist.
- EN/ES: **one separately confirmed original English practice** `Flight to the Sun`, whose ID is read from the existing `english-guided-meditations.ts` source, plus a clearly labeled link to the RU archive.
- No English or Spanish dub/translation of the Russian practice is claimed or generated. All locales retain a clearly separate instrumental-only WAV and truthful missing standalone MP3 disclosure.

This is a corrective follow-up to PR #2003 and must receive a separate READY + canonical live readback before calling the user request deployed.
\n## Build fix for Vercel `dpl_FPYpPCYU1XHbtfJthuP6zMR7WTqZ`\nThe first merge (#2003) failed on CSS Modules strict-scoping: `[data-holistic-meditations]{...}` was not a pure selector. Changed to `.section[data-holistic-meditations]{...}` (existing local class) and aligned the test. Do not call #2003 READY.\n
## Explicit Sun Flight video in RU · 2026-10-25

Owner follow-up requested the **specific** “Полёт к солнцу” video inside Holistic Support → Медитации, ready to open and watch. The earlier EN/ES selection already used the teacher-confirmed original English recording **HqfixazXqRY**, but RU showed only seven PsiMaster-era recordings.

- RU discovery now starts with “Полёт к солнцу · авторская видеомедитация (звук на английском)”, followed by the **same** seven original Russian PsiMaster videos, without duplicates or false dubbing claims.
- EN/ES still show just the original English Sun video. No new uploads, generated videos, translations, private sources or provider spending.
- Video playlist is above the ambient audio on all locales; users explicitly press **Смотреть / Play**, with a direct YouTube fallback in the existing `AcademyVideoPlayer`.
- Complete on actual Vercel READY + matching SHA/alias + real RU video-click/playback check. GitHub merge alone is insufficient for that last claim.
 

## Owner clarification: no English video in Russian discovery · 2026-10-25

This supersedes **“Explicit Sun Flight video in RU”** above and PR #2011's English-video-in-RU placement. The owner clarified the actual split:

- **EN:** the previously confirmed original English video *Flight to the Sun / Sun Flight Meditation. Step 1* from `data/academy/english-guided-meditations.ts`, YouTube ID `HqfixazXqRY`. This is not a separate “Play Sunshine” upload.
- **RU:** only the seven original Russian recordings linked by the verified historical PsiMaster manifest: three Sun lessons, Life Force, Circle Fire, and two Energy Pump-Ups. Do **not** insert the EN Sun Flight into this RU playlist.
- **ES:** keeps its already existing one original English video, prominently marked as English audio, with a link to the original Russian archive. No Spanish dub is represented or generated.
- Video-first user interface and no-autoplay poster + YouTube fallback remain. Existing local instrumental WAV remains explicitly identified as non-guided soundscape.
- An executable playlist selector regression test now checks the actual source model for EN/ES one English ID versus RU seven Russian IDs and no duplicate/wrong-language links.

The previous RU-English-video section is historical, not current behavior. Do not claim full E2E before Vercel exact SHA/alias READY and browser video playback verification.

## Scenic one-screen redesign · 25 October 2026

- Meditation is now **two separate equal viewport-size photographic cards**: a video stage and a native ambient audio stage, not one section with an unlimited seven-item vertical list.
- On 320–430px mobiles the existing PsiMaster playlist uses single-recording previous/next controls; on desktop compact numbered selectors, preserving no-autoplay lazy embed and direct YouTube fallback. The active iframe unmounts on change.
- One card has `height: calc(100svh - …)` accounting for header and bottom navigation. Oversized accessibility text scrolls **inside** the card; no controls or source disclosure is clipped. No horizontal overflow or silently hidden original material.
- Existing English one-video vs Russian seven-video separation and source-backed 96s instrumental audio are preserved. No private My Materials or fabricated soundtrack.
- Gates: focused meditation/first-screen/hub test; TypeScript lint/build; WebKit/Chromium 320/375/390/430 and real playable YouTube, Vercel READY SHA + canonical alias. Treat these as pending until evidence is collected.

## 27 October 2026 — thematic meditation library and mobile playback redesign

This update **supersedes the equal-height, two-viewport-card layout** documented above. Owner's 27 Oct iPhone screenshot shows the existing 16:9 video surrounded by an oversized screen and generic course controls. The goal is an actual meditation *library*, not a course with “Lesson 1 of 1”.

- Replace the generic video course playlist only on the public Holistic Support meditation section with `HolisticMeditationGallery`. Keep `AcademyCourseVideoPlaylist` unchanged for actual courses.
- Add accessible, non-persistent theme filters **All / Business / Love / Energy / Health**, EN/RU/ES. These themes are *navigation hints* for verified existing recordings, not specialist new productions or health claims. Business and Love intentionally reuse relevant Sun reflections; Energy and Health offer additional Russian archive practices.
- Source policy unchanged: **EN/ES** present the confirmed original English Sun video only, no dubbed audio; **RU** presents exactly seven unique original Russian recordings. No fabricated topic-specific video or YouTube ID, no extracting MP3 from videos.
- Select a recording from compact thumbnails with a lazy YouTube privacy-enhanced inline iframe only after a click. Changing video or theme unmounts the old iframe. Keep original YouTube link visible as a fallback.
- Remove viewport-height constraints, cropped content, “Lesson 1 of 1”, and Previous/Next buttons on the meditation section. A native 96-second WAV remains in a **compact audio strip** below the videos; missing standalone source recordings disclosed through accessible details.
- Preserve privacy: no tracking pixels, account requirements, paid API, outbound publishing or private user materials. All filter state local to the page.
- Release evidence: focused contract + selector tests, TypeScript/lint/build, responsive 320/375/390/430 checks, Vercel READY and SHA/production alias, real video-play on a browser if accessible. Without actual browser playback, report it as not verified rather than “done”.
