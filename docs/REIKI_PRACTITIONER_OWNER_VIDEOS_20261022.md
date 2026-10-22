# Reiki Practitioner: four owner-supplied YouTube video lessons (22 October 2026)

The teacher supplied four public YouTube /live/ URLs and requested them inside
the existing Reiki Practitioner course. We retain the original English guided
meditations as an optional second video source on the same video slide.

| Lesson | Stable slide | Owner video ID | Original guided video ID |
| --- | --- | --- | --- |
| 1 — Flight to the Sun | flight-02 | lOo93GuzeJ0 | HqfixazXqRY |
| 2 — Tantra Reiki | tan-02 | yH_M6If8VLk | w2BN-HYmHUk |
| 3 — Kundalini Reiki | kun-02 | KK1IgvDTrhU | _IOX0E8N-To |
| 4 — Reiki Yggdrasil | ygg-02 | y3MDcqwlC-w | 80xZ7jN6o2Y |

**Source of truth:** data/academy/reiki-practitioner-lesson-videos.ts. The old
English recording registry remains data/academy/english-guided-meditations.ts.

**Player:** Existing AcademyVideoPlayer displays a lazy YouTube poster, activates
a privacy-enhanced iframe on Play, and offers a direct YouTube link. The
EN/RU language interface has a compact Lesson video / Meditation (EN)
selector. Switching sources unmounts the previous iframe to stop old playback.

**Compatibility:** No new slides, no database migration, and no changes to 63
stable slide IDs, learner responses/progress, teacher audio intros, reviews or
lesson 5 personal initiation. No new video generation or rehosting. Public
video embeds are not private material.

**Verification:** run the source, lesson-progress and intro-audio node tests,
targeted ESLint, TypeScript and Next build via HH Energywork AI Course CI.
Before marking live, verify Vercel READY and exact production SHA, then open
the course from a real phone and click all four videos in EN and RU at 320–430px.
The owner URLs are trusted as supplied; video titles, language, availability,
and YouTube embed permissions have not been independently verified yet.