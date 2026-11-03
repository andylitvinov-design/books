# Reiki Practitioner — separate teacher introductions from original guided meditations (2026-10-23)

## Owner correction

The 22 October course edit accidentally made new teacher recordings the *default* source on each meditation slide, hiding the original guided meditations behind a small selector. Short mobile phones also constrained the poster/player to **216px**. This was not the requested learning flow.

## Accepted UX contract

- One purpose = one slide. **Never** swap a teacher introduction for its guided meditation.
- The owner-supplied first recording is the **first screen before the whole course** (`welcome-video`). Then the two original onboarding screens, and the unchanged Lesson 1 intro (`flight-01`) followed by the original guided Sun Flight meditation (`flight-02`).
- Lessons 2–4: keep the original overview/audio introduction (`tan-01`, `kun-01`, `ygg-01`), add a dedicated video introduction immediately before each established meditation slide (`tan-02`, `kun-02`, `ygg-02`).
- Lesson 5: the existing teacher video remains on its opening `paths-01` slide; no additional duplicate is created.
- Video keeps a **full-width 16:9 poster/player** on short and tall iPhones. The 216px limit and two-way in-slide source switch are gone. Tap-to-play, privacy-enhanced YouTube embed, manual pause, and direct source link are unchanged. No generated/rendered or uploaded video.

| Course part | Teacher introduction on its own slide | Original guided meditation on its own slide |
| --- | --- | --- |
| Before course / Lesson 1 Sun Flight | `welcome-video` · `lOo93GuzeJ0` | `flight-02` · `HqfixazXqRY` |
| Lesson 2 Tantra Reiki | `tan-intro-video` · `yH_M6If8VLk` | `tan-02` · `w2BN-HYmHUk` |
| Lesson 3 Kundalini Reiki | `kun-intro-video` · `KK1IgvDTrhU` | `kun-02` · `_IOX0E8N-To` |
| Lesson 4 Reiki Yggdrasil | `ygg-intro-video` · `y3MDcqwlC-w` | `ygg-02` · `80xZ7jN6o2Y` |
| Lesson 5 Initiation options | `paths-01` · `FKa-wHl8aQI` | No separate meditation on this lesson |

The original four media IDs are taken from the existing `english-guided-meditations.ts` registry, not newly assumed or generated. These meditations are English-language recordings. Video IDs and language/provider playback have to be confirmed on a real device before reporting full end-to-end playback.

## Progress and security compatibility

- **64 screens = opening video + two welcome screens + 8/15/17/15/6 lesson screens**, versus 60 before this correction.
- The four original meditation IDs remain unchanged; all answer IDs, mandatory reflections, five lesson reports, initiation request, lesson closure and first-lesson Google/consent save gate remain intact.
- Course version remains `2026-10-20.p10`, compatible with the live Supabase course-version constraint. This is an additive media-only edit: no DB migration, answer deletion, lead creation, new payment or messaging system.
- Returning users resume by their stored slide ID; new introductions are never substituted for an existing meditation ID. Restarted or new users see the added intros.
- Guest progress remains an unsaved preview unless the account is authenticated and consent has been confirmed.

## Verification gates

1. Source assertions for all four original guided meditation IDs and exact order of distinct introduction slides, including the first-ever course screen and unchanged fifth video.
2. All Energywork source/private save/sequence tests, targeted lint, TypeScript and production build in GitHub Actions.
3. Browser tour including **all 64 screens**, first-lesson Google handoff, optional Back/Continue, iPhone widths 320/375/390/430, RU/EN and portrait heights at or under 700px.
4. Vercel **READY + matching production commit SHA + `holistichouse.vercel.app` alias**.
5. Physical iPhone Safari actual play for all four original meditations and four intro recordings, and authenticated cross-reload resume. These are not proven by build, unit tests or synthetic browser mocks.

Related: books #840, #253, PR #1565, lesson-five cleanup #1569.
