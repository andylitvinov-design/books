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
27 isolated assertions executed against exact committed source for catalogue, tags, locales, invalid inputs, saved-note filtering, duplicates, owner guard, metadata preservation, reuse of verified saver and no commerce/local storage. Native regression file tests/discover-practice.test.mjs added. Protected CI, browser readback, two-account isolation, pagination/duplicate case, accessibility and physical iPhone required before LIVE. No automatic release activation.

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
