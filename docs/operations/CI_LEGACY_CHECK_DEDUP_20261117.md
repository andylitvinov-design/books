# Holistic House PR CI: verified legacy trigger audit (2026-11-17)

## Purpose
Target a 10x reduction in *unnecessary* old checks, not mandatory release evidence. Do not claim a completed 10x reduction until measured in comparable PR cohorts.

## Findings from latest 100 push runs
- Reports Development Programme: 12
- Site-video browser: 5
- Home locale browser: 4
- Home conversation: 1
- Practice visual browser: 1
- Benchmark programme: 1
- Assessment-quality: none in sample

These suites looked redundant but existing trusted tests show that Reports, Assessment, and Benchmark are successors to deleted separate workflows with required postmerge coverage. Practice, Site Video, Home and Locale retain unique postmerge browser acceptance. Removing their triggers without a replacement would reduce quality evidence, not obsolete work.

## Safe change in this PR
- Scope the public-performance/TTFB specialist to production PRs only (not unrelated branches).
- Scope the assessment PR event to canonical production branch while preserving its matching source and original postmerge successor.
- Preserve production pushes for Reports, Benchmark and Assessment, and retain all relevant on-PR specialists and manual acceptance.
- Add guard regressions against deleting required successor postmerge owners.

## Control-plane work
Separate control branch PR #4899 removes the obsolete read-only dispatcher push observer, while narrowing diagnostic Watchdog pushes. It retains scheduled and event-driven PR repair, signed manual actions, and protected merge. PR #4898 already merged, removing the one-time administrative migration workflow and staggering coordinator/Watchdog scheduling.

## Acceptance
- Exact HEAD Actionlint, Sweep Guard, and Core hh-merge-check all green.
- No bypass to base protection or disabled failed checks.
- Measure before/after CI run count and queue minutes separately for open-source PR, control-plane, postmerge and LIVE. No new paid Vercel previews or agents.
