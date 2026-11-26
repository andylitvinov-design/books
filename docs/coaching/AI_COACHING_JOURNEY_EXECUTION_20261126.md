# AI Coaching Journey — R0/R2 execution handoff (2026-11-26)

Specification: https://docs.google.com/document/d/1PTCAJ0x69f8rQsw5ulgzqoLKdzm6PWexbXBvnMisdd8/edit
Concept: https://docs.google.com/document/d/1zuxsuvvQn2x0e7CM3vVClIR9oLiSoS1UtZdggI5i5Zw/edit

## Evidence snapshot (not LIVE acceptance)
- Protected source inspected: f9dd500b4a9d813c3ec2e63ffaa81ecdda5dba8a.
- Vercel alias holistichouse.vercel.app resolved to READY deployment dpl_CbLsLdtEhjBuK9E8K4Et4zbLEzRB at fbdb3e82daa1ee7a42ac8e62d4131466765a108c. Real signed-in user journey not tested.
- #5685 MERGED, exact merge/release and actual account readback remain to be checked. #5643 OPEN, #5686 stacked DRAFT, #5673 OPEN (consolidates #5568), #5687 DRAFT. Do not duplicate these paths or force flags.
- Mac device offline. No native Next build, authenticated DB, physical iPhone or voice acceptance claimed here.

## Source map
- lib/coaching/coach-course-journey.mjs + coach-program-topics.mjs: existing distinct eight-session navigation and thematic group IDs. A selection is not enrollment, consent or completion.
- lib/app/clarity-program.mjs: four existing Clarity rows; free reflection tag clarity-week-1. That saved note is not proof of an AI call or billing entitlement.
- components/app/clarity-program.jsx: protected Clarity journal UI and paid-week lock. In-flight #5673 touches this file; this change leaves it alone.
- app/[locale]/app/daybook/page.jsx + components/app/daybook-journal.jsx: existing localized account-protected route and verified journal collection. Existing DaybookToday/DaybookWeekly components reused by general journal.
- lib/app/daybook-journal-contract.mjs + daybook-journal-save.mjs: existing note schema, operation ID, revision and verified readback; no new schema.
- lib/app/business-daybook.mjs: existing legacy four-session syllabus in inspected source. #5673 updates to eight sessions/24 practices; preserve legacy archive. A separate strategic four-session AI course requires explicit product identity.
- lib/personal-coaching/protocol-capture.mjs, protocol-draft.mjs, session-protocol.mjs, components/my-coach-live-dialogue.jsx: existing memory/protocol dependencies. #5685/#5643/#5686 own in-flight changes.

## Delivered source slice
HH-CJ-06/08 partial: seven localized voluntary Discover practices inside existing signed-in Clarity Daybook, with ordinary private journal notes and stable day tags. Note counts are separate from session completion. No new AI calls, entitlement, billing, migration, data store, or external provider. Existing paid locks remain. Wait for full pagination before editing; do not silently overwrite duplicate same-day notes; preserve original note metadata. Notes can be edited/deleted through existing general journal. Account guard and verified existing saver prevent unconfirmed writes from displaying as saved. Concurrent creation on different devices may produce two notes (both preserved, review in journal); this is not a uniqueness/entitlement mechanism.

## Test evidence and remaining gates
27 isolated assertions executed against exact committed source for catalogue, tags, locales, invalid inputs, saved-note filtering, duplicates, owner guard, metadata preservation, reuse of verified saver and no commerce/local storage. Native regression file tests/daybook-discover-practice.test.mjs added. Protected CI, browser readback, two-account isolation, pagination/duplicate case, accessibility and physical iPhone required before LIVE. No automatic release activation.

## Backlog by task
- CJ-00 PARTIAL source/PR audit: confirm current protected SHA, database/entitlements, served SHA, full E2E and exact active catalog.
- CJ-01 existing #5685 MERGED_NOT_LIVE until verified; coordinate #5643.
- CJ-02 #5686 waits on #5643; complete server-issued evidence ledger and text/voice parity.
- CJ-03 #5687 draft media/voice; actual phone/voice tests remain.
- CJ-04 existing privacy gates; do not open new access; account isolation tests outstanding.
- CJ-05 canonical enrollment, version, entitlement contract unresolved; avoid new runner or shadow model.
- CJ-06 this PR self-guided practice only; actual free C1 linked to authoritative session and purchase requires existing enrollment/entitlement audit.
- CJ-07 persistent choice of pace in existing enrollment, 28/49 schedules and timezone tests remain; no client-side pretend progress.
- CJ-08 this PR notes only; accepted action mapping and consented context remain; coordinate #5673.
- CJ-09 report pipeline #5673/#5686, final report and before/after remain.
- CJ-10 localizations for Discover added; mobile acceptance and complete course cards remain.
- CJ-11 payment flags and new pricing remain OFF/unapproved; verify actual checkout, usage cost, receipt/entitlement and caps.
- CJ-12 metrics/pilot after safe R1/R2/R3 and commercial decision.
- CJ-13/14 themes/roleplay/human handoff after pilot; reuse existing systems.

## Release
Use existing protected checks, normal publisher only. No paid runners, new provider, Vercel Sandbox or manual deployment. Do not claim LIVE from merge or HTTP 200. No new tariff activation.


## R2/R3 follow-up — 26 November
- Goal planning preferences: `lib/app/goal-journey-schedule.mjs`, `components/app/goal-journey-planner.jsx` and the existing account-gated Daybook route. Exactly the original eight fixed coaching topics; civil-date arithmetic, 28-day schedule on days 1/4/8/11/15/18/22/25 with integration through day 28, 49-day schedule on days 1/8/15/22/29/36/43/49. No calendar time zone conversion or artificial date lock. The existing verified private journal saver persists the chosen start date and pace; no new storage or duplicate enrollment. The note is a user planning preference only, not course enrollment, progress proof, purchase, or provider access.
- The planner links to the existing Today/weekly review, private journal, goals and actions, My Coach and saved report archive. Discover links to existing coach selection. No automatic model requests, notifications or changes to the protected payment locks.
- Schedule note validation, full pagination before editing, ambiguous same-tag records shown for review rather than overwritten, preservation of metadata, account-scoped saver lifecycle. Existing records and historical session completion are not changed.
- 56 isolated source assertions executed against the actual committed schedule module and all three original catalogue dependencies; 27 earlier Discover assertions. Regression tests added. These are not full native CI or authenticated E2E. Mac remains offline.
- #5685 merged to protected f9dd500b, but production alias still points to READY fbdb3e82 at inspection. #5643 exact HEAD 21d73c53: nine successful workflow runs; actual profile activation/functional acceptance gate remains. #5686 still stacked draft; #5673 and #5687 checks in progress at inspection. Do not duplicate or bypass them.
- HH-CJ-07 partial: working saved calendar preference; canonical enrollment-bound pace and verified per-session future-only rescheduling remain after enrollment audit. HH-CJ-08/10 partial: route integration; no separate progress model. HH-CJ-05/09/11/12/13/14 not completed. Specifically: actual C1 quota and linking to a verified session; course enrollment/receipt/entitlement; final course-specific report based on exact protocol and goal IDs; production audio, privacy and mobile acceptance; measured economics and pilot; thematic extensions and booking. Do not claim full implementation.

## R3 follow-up — course review from real owner archive
- Protected base inspected: 3fddbb9359eb8cc81b46293abb4eac9f5f638ded. #5685, #5643, #5686 and #5687 merged into protected source. Actual profile flags, full voice question evidence, Caesar audio assets and authorized physical-device acceptance remain gated. #5690/5691/5692 are in-flight follow-ups; #5673 remains the separate consolidated Business release. #5694 implements text rehearsal; do not duplicate it.
- New course-archive-review domain and UI reuse the existing owner-scoped My Coaching Plan archive and canonical exact course IDs. The fixed eight-topic journey and thematic Goal track are deliberately separate. User explicitly chooses one saved report per exact topic; no automatic selection, no inference of enrollment/completion, no mixing unknown or duplicate IDs. Earlier archive pages remain available via existing controls. Deleted/malformed/unreviewed records are not selected.
- Review shows selected client-authored focus/takeaway/next step, missing values explicitly marked, and a voluntary 30-day plan. Existing local PDF renderer exports the reviewed overview without raw turns. User may explicitly save/update a private Daybook note containing only source references and their new plan, optionally linked to an existing goal; existing journal saver verifies write/readback. Source reports remain in their original private archive; no duplicated transcript or derived scores. Saved notes can be edited in the ordinary journal; no separate report store.
- 65 isolated assertions passed against exact committed feature source and original catalogue/archive dependencies, plus source wiring. Added regression tests; three Journey test files run unchanged via the existing BASE-owned App R1 tests/daybook-*.test.mjs suite; package.json stays unchanged. Native CI remains to be run.
- CJ-09 partial implementation: personal archive overview, PDF and saved review reference/plan. Not a server-authoritative course completion report or measurement of change. CJ-05/06/07 still require actual entitlement/enrollment/verified C1 and per-enrollment progression. CJ-11/12 remain gated by billing approval, measured cost and authenticated acceptance; CJ-13/14 depend on existing rehearsal and verified booking. No paid activation or provider calls.
