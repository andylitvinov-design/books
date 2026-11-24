# Daybook weekly coaching guide

## Product scope

The canonical private route is `/{locale}/app/daybook` (EN/RU/ES). The guide is
the default view. Today, Journal, Goals and Growth remain available through the
existing workspace navigation. This extends the seven-page workbook in PR
#5518 and reconciles its route conflicts with the production stage-zero goal
flow; it does not create another diary or an alternate application.

The main panel follows the Video Studio Warm Peach family: warm canvas,
near-white work area, emerald controls, a small sunrise header and readable
forms. Seven coaching weeks occupy one horizontally scrollable row. Four
levels occupy the next row. Level one exposes seven steps for the selected
week, with one active task rather than the whole questionnaire at once.

The existing stage-zero direction chooser stays at `?start=vector`, outside
the seven-week row. Its real saved goals are selectable in the guide. The
separate final reflection is `?stage=8`; it does not replace week seven.

| Week | Canonical topic | Main self-guided work |
| --- | --- | --- |
| 1 | discover | Current situation, life area, meaning axis, wish, direction, small experiment and reflection |
| 2 | vision | Desired day, meaning, feelings, boundaries, evidence, a first experience and reflection |
| 3 | plan | 90/30/7/1 roadmap, minimum/regular/stretch plan, fallback and a dated first step |
| 4 | resources | Available energy, successful experience, strengths, support, drains, needed resource and practice |
| 5 | obstacles | WOOP wish/outcome/obstacle, facts, if-then plan, experiment and reflection |
| 6 | options | Problem, simplify/share/test alternatives, comparison, experiment and reflection |
| 7 | progress | Actions, evidence, learning, changed circumstances, adjustments, focus and next review |

There are 49 self-guided tasks. All 39 questions from the previous workbook and
the genuine resource rating remain available. These are reflection prompts,
not new standardized assessments. Links lead to the existing tests, vectors,
goals, plans, courses and private video library. Video resources are limited
to weeks 4, 5 and 7, consistent with the approved support/correction role.

## Four levels

1. **Self-guided:** free questions, written exercises and small actions.
2. **AI coach:** a week-specific discussion request and the existing coach
   chooser. A saved preparation can use the existing consented Daybook handoff.
3. **Deeper work:** a week-specific request for personal material or a practice,
   with links to available resources.
4. **Personal session:** preparation for a 60-minute session with Andy, with the
   existing sessions entry point (1000 XP / EUR 100).

The 100/250 XP prices for levels two/three are labelled as guide prices, with
terms checked before ordering. This change does not implement a coaching
checkout, charge a wallet, book a session, generate media or send messages.
Twenty-one preparation tasks are specific to the selected week and level.
Saving a preparation does not mark a paid service as delivered and does not
affect the seven-step self-guided progress.

## Persistence and navigation

The guide reuses the canonical owner-scoped encrypted journal API and
`createJournalSaver`. Each saved task is an ordinary private note with format
`hh-guide-v1` and a stable task tag. The logical key is
`account + goalId + week + level + step`. Explicit `goalId: null` remains an
unlinked draft; it is never silently assigned to a goal.

- Draft save and explicit task completion are different states. Required
  answers must be present for completion; the counter changes only after a
  successful write and independent readback.
- Unknown write outcomes keep the original operation identity and disable
  editing, guide/workspace controls and same-window link navigation until
  retry or deliberate reload. No duplicate task is created just because the
  first response was lost.
- All journal pages must be loaded before writing a task, preventing accidental
  duplicates when an older task lies beyond the initial page.
- Unsaved task drafts remain in account-scoped component memory while the
  client switches weeks, levels, steps, goals or workspace tabs. They are not
  written to browser storage. Sign-out/account loss clears that memory.
- URL state contains only navigation positions and an opaque goal UUID.
  Private answers are never added to URLs. Live query synchronization restores
  coordinates from same-route journal links, including repeated links.
- Journal entries render as readable questions/answers, with a link to their
  exact goal/week/level/step. Existing entry deletion, export and voluntary
  coach sharing remain available.
- Legacy `hh-stage-v1` entries remain readable in Journal and in each week's
  earlier-records panel. They do not fabricate completion for seven new tasks.

The schema limits each answer to 1200 characters and each note to under 20000
characters; generated tags fit the existing 40-character journal tag limit.
Malformed task coordinates, unknown answer fields and invalid ratings are
rejected. No schema migration or additional provider is needed.

## Verification and release

The unit tests cover all task round trips, localized original-question
preservation, required-answer completion, explicit zero ratings, malformed
payloads, goal isolation, latest-revision progress and legacy compatibility.
The browser harness `tests/daybook-guide.browser.mjs` exercises the real
Next/React page with an explicitly synthetic private API. It covers save and
readback, lost-response retry, goal separation, in-memory drafts, journal
deep links, account invalidation and responsive EN/RU/ES layouts.

Local acceptance on 23 November 2026 (America/Toronto): 203 Daybook/design
tests passed, TypeScript completed without errors, and ESLint reported no
errors or warnings for the changed source (including JSX). Chromium
138.0.7204.0 with Playwright 1.62.1 passed EN/RU/ES at 320, 390, 430 and 1024
CSS pixels. The rails remained in one row, the document did not overflow,
rail targets were at least 44 by 44 pixels, and form text was at least 16
pixels. Screenshots were reviewed for legibility and active states.

The interaction checks also confirmed repeated identical Journal deep
links, blocked navigation during an unknown write outcome, a single
confirmation when discarding an unsaved draft, and intentional clearing of
a previously completed answer. Saving that cleared answer persists an empty
draft, withdraws the completion and remains empty after reload. Browser
runtime errors were absent. The fixture makes no external provider calls.

Browser fixture acceptance is not proof of real OAuth or hosted-database
writes. The server API and encryption are unchanged and retain the existing
Daybook API/database test gates. Chromium emulation is not a physical iPhone
or Safari test; installed-engine availability is recorded with the result.
The unsaved-draft guard covers links and document unload. Browser Back/Forward
to a different route through SPA history is outside the custom guard and was
not verified; save a draft before leaving by that path.

Publication reuses PR #5518 with one coherent repair HEAD after local checks.
The existing required Core/App/Specialist/`hh-merge-check` gates remain intact.
Production publication uses the sole existing hourly publisher. A protected
merge is not evidence of LIVE until the canonical alias and served revision
are independently verified. No preview deployment or extra publisher is added.

`GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=verified;
post_open_head_updates=one_coherent_conflict_and_owner_extension;
extra_waves=verified_route_conflict; cost_new_spend=NO_NEW_SERVICES`
