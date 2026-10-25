# Egyptian & Greek Goal Planning — Author-sourced coaching course packs

**State:** reviewed course scripts, catalog seed PR; **UNPUBLISHED until private player E2E.** Related #1708; depends on #1703 / PR #1707 catalog and #1701 / PR #1706 private player.

## Source provenance
Four documents provided by Andrey Litvinov on 2026-10-23. Full-resolution originals stay in the user's private Google Drive. The exercise sequences are the author's modern symbolic models inspired by Egyptian/Greek terminology, not an academically standardized ancient coaching or psychometric method. No health or guaranteed performance claims.

## Course A: Egyptian Goal Planning
ID `hh-egyptian-goal-planning-v1`. Core model `egyptian_goal_planning_v1`, scheme `egyptian_goal_planning_reflective_v1`.
Original level order: **Ka → Ba → Ib → Sah → Khaibit → Hu → Ren → Sekhem**. Haibit carries *two* separate one-question screens (experience and first action), preserving both author cells. **11 screens**: one goal-intro screen, 9 core questions, one optional action within 24 hours. Opening and final screens are UX additions, not reattributed to Egyptian source. Output: private personal goal map with choices/optional clarification and one small step.

## Course B: Greek Goal Planning
ID `hh-greek-goal-planning-v1`. Core model `greek_goal_planning_v1`, scheme `greek_goal_planning_reflective_v1`.
Original level order: **Epithymia → Thymos → Logos → Nous → Eidos → Idea → Daimon → Telos**. **10 screens**: goal intro, 8 core questions, final 24-hour action (explicit in Greek worksheet). Sōma and Psychē from the background essay are not part of the planning worksheet, so they are optional reading only. Output: a personal progression from desire toward a full-form vision and a chosen action.

## UX + privacy acceptance
One screen with one plain question and 5 choice chips, optional editable typed or spoken answer, optional read-aloud on tap, Save ACK before Continue, Back, Pause, delete/export if supported, signed-in resume, EN/RU/ES. No automatic CRMs or third-party messages, no transcript in telemetry, no audio recording. STT only after notice and consent, fallback to native dictation. The **existing 90-day business course and GROW session remain separate**.

## Catalog implementation
Migration `20261023185000_hh_coaching_tradition_models_seed.sql` inserts 2 models, 2 intentionally **published=false** schemes, 16 steps, 17 questions and 17 five-choice sets; all are private reference records with RLS from PR #1707. Intro/final screens are player-owned endcaps; the DB scheme supports up to eight original levels. Never silently mark published until the account-scoped encrypted session player can pin independent templates.

## Remaining work
1. Merge and verify dependencies PRs #1706 and #1707, including applied migrations, signed-in GROW save/reload and iPhone QA.
2. Generalize Personal Coaching Session to persist **separate** version-pinned Egyptian/Greek sessions without replacing GROW, with stable choice IDs and private endcap data.
3. Keep Egyptian/Greek methods selectable only inside Coaching, without duplicate Academy or My Courses promotional cards; preserve version-pinned private player and history. Auth/RLS and 320–430px signed-in E2E remain.
4. Change schemes to `published=true` only after editor/QA gate and verify exact Vercel SHA + READY alias; update #1708.

## Catalog / photograph clarification · 2026-10-25
- Personal Coaching Session is a standalone photograph-led spotlight in Academy, outside Free Courses and the course count. It opens the existing public Coaching Lounge.
- Egyptian (11 screens) and Greek (10 screens) Goal Planning remain distinct coaching methods **only in Coaching**. Remove duplicated Academy and My Courses cards while retaining stable template IDs, protected encrypted answers, API, RLS and detail bookmarks. No database deletion.
- Replace unrelated Reiki covers with matching licensed photographs: Egyptian papyrus ([public domain](https://commons.wikimedia.org/wiki/File:Egypt_bookofthedead.jpg)) and Greek Athena in Louvre ([CC0](https://commons.wikimedia.org/wiki/File:Marble_statue_of_Athena,_Louvre.jpg)). They illustrate cultural motifs, not historical validation of these modern coaching approaches.
- Reuse PR #1896. No paid API, CRM, messaging or migrations. A real authenticated iPhone Save → reload → resume → PDF remains separate E2E work.
