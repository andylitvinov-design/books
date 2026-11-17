# Holistic House PR CI reduction — verified scope (2026-11-17)

## Goal

Reduce legacy, redundant GitHub Actions checks and CI wave delays, targeting 10x only where source coverage remains independently enforced. No claim of an overall 10x reduction is made without measured before/after data.

## Baseline

Among the last 100 repository push Actions sampled on 17 November: 12 report-development, 5 site-video, 4 home-locale, 1 home-conversation, 1 Practice browser, and 1 benchmark run (24 total). Detailed test contracts prove that report-development and Practice need their post-merge checks: these 13 runs remain valid and are NOT included as removable duplication.

At least 11/100 push runs matched four now-retired duplicate push owners: site-video (5), home-locale (4), home-conversation (1), benchmark (1). Assessment-quality also had a redundant production push trigger, though none appeared in that sample. These are historical snapshot counts, not future guaranteed savings.

## Changes

Remove production push triggers (but keep matching PR checks and add/retain manual recovery) for the following five specialists:
- site-video-browser.yml
- home-locale-switch.yml
- hh-home-conversation.yml
- hh-benchmark-program.yml
- hh-assessment-quality.yml

Scope hh-public-performance-audit.yml, home-locale and assessment PR checks to codex/public-book-library only; do not duplicate their checks on unrelated PR branches.

Preserve post-merge push acceptance for hh-reports-development-program.yml (report progress assertions) and practice-visual-browser.yml (real Chromium/WebKit visual results) as required by existing source contracts. Keep private audio, messenger, progress, sensitive auth, payments and customer-data checks.

## Acceptance

- tests/pr-fast-lane.test.mjs, tests/ci-pr-selective-workflows.test.mjs, actionlint and Sweep Guard all pass on the exact PR HEAD; Core hh-merge-check verifies required specialists independently before any protected merge.
- No newly introduced paid service, Vercel preview, schedule, branch bypass or unchecked continue-on-error.
- Monitor push/PR workflow counts on the next 100 runs and report true before/after, including queue time and source-to-merged/merged-to-LIVE separately.
- PR is not LIVE merely by merging. Existing hourly/capped production release and independent served-SHA verification decide LIVE.

## Follow-up

Control-plane Watchdog and the read-only queue dispatcher have separate push-trigger fan-out on codex/bootstrap-books. Audit and reduce those on their own protected control-branch PR; do not disable scheduled PR repair or the only source-to-LIVE pipeline to hit a numeric quota.
