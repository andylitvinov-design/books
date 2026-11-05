# Reiki Practitioner — remove three lesson-five slides (22 October 2026)

## Owner screenshots / change

Remove exactly these three **display** screens from lesson five (EN/RU):

- `intention-01` — "What is intention?" / "Что такое намерение?"
- `intention-03` — "Write your own intention" / "Запишите своё намерение"
- `paths-04` — "Prepare your Reiki initiation request" / "Подготовьте заявку на Рейки-инициацию"

The historical encrypted `intention-03` answer type and private saved answers remain available; the retired slide is not rendered and not included in new lesson reports. No data deletion or database migration.

## Resulting five-lesson course

- There are **60 active slides** (previously 63), with lesson lengths `8 / 14 / 16 / 14 / 6`. Two welcome slides are separate.
- Lesson 5 starts at `paths-01` **with the owner video `FKa-wHl8aQI`**, then `paths-03` (initiation options), `init-02` (optional questions for the teacher), `end-01` (existing initiation format/request), `intention-04` (optional two-minute calming pause with its stable stored choice ID), and `end-02` (finish).
- The duplicated `paths-04` eligibility checklist is removed; existing readiness count, missing report/question links and consent-safe request states remain within the final `end-02` screen.
- The final-screen **Review missing requirements** action opens the first incomplete real report/question instead of navigating to a deleted slide. The per-report `Back to review` target is the final screen. No self-link to a missing page.
- Saved cursors on `intention-01`, `intention-03`, `paths-04` map forward to `paths-03`, `paths-03`, `intention-04` respectively; an older `intention-02` cursor also maps to `paths-03`. Encrypted answers are kept.
- Existing p10 course version is unchanged to respect the deployed version constraint. All other slide IDs, course access, personal initiation choices, video links, audio intros, permissions, RLS, billing and CRM logic stay in place.

## QA acceptance

1. Source/sequence tests: exact 60 slides, five lesson boundaries, three removed IDs absent, legacy cursor fallback forward, five video IDs and fifth intro, optional final practice preserved.
2. TypeScript, ESLint and Next.js build via the existing HH Energywork CI.
3. Isolated browser tour on iPhone-like 320–430px EN/RU in Chromium and WebKit, including the new final integrated readiness panel, first-lesson consent/save, and Back/Continue transitions.
4. Verify Vercel READY for **exact production SHA** and domain `holistichouse.vercel.app`. Real owner authentication and five YouTube playbacks require separate phone/provider QA; do not label verified before those checks.
