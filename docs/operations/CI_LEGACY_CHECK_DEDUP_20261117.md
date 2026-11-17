# PR CI: retire duplicate post-merge audits (2026-11-17)

## Objective

Reduce old GitHub Actions fan-out so production PRs reach protected merge and the existing hourly LIVE release faster. This change is a first measurable cohort of the requested **10×** legacy-check reduction, **not** a claim that all PR checks are already 10× faster.

## Observed baseline

A snapshot of the latest 100 `push` workflow runs (captured 2026-11-17) showed:
- Reports development programme: 12
- Website video browser: 5
- Home language switch: 4
- Home conversation, practice screenshots, benchmark: 1 each

Thus **24 of the sampled 100 push runs** belonged to six suites that had already been scheduled for relevant source PRs. The assessment suite was also double-triggered but absent in this sample.

## Change

Seven duplicate production-push suites now run on matching **production pull requests** only, with `workflow_dispatch` preserved for explicit diagnostic reruns:

`site-video-browser`, `home-locale-switch`, `hh-reports-development-program`, `hh-home-conversation`, `practice-visual-browser`, `hh-benchmark-program`, `hh-assessment-quality`.

`hh-public-performance-audit` (and locale/assessment) is now scoped to production PRs, avoiding unrelated base-branch tests.

No app runtime code or Vercel configuration changes. No new cron, dispatcher, branch bypass, secret, paid preview or CI wave.

## Retained non-negotiable quality gates

- The single Core `hh-merge-check`, BASE-trusted specialist evidence and exact PR HEAD binding.
- Independent PR suites for all matching specialist source paths, including risky media/auth/consent files.
- Production-push private-audio, user-progress and Messenger acceptance.
- Native protected merge and independent LIVE SHA verification after the already-capped Vercel hourly release.
- Manual `workflow_dispatch` of every retired duplicate for incident recovery.

## Verification

The `ci-pr-selective-workflows` test proves PR owner triggers, manual recovery, preserved sensitive postmerge cases, production-only branch filters and Core gate. `HH workflow syntax — actionlint` and `HH PR Sweep Guard` validate the routing change on its actual PR HEAD.

## Acceptance criteria / next measurement

1. Compare the next 100 production `push` runs against the above baseline, separating active PR checks, postmerge checks, and control-plane jobs.
2. Confirm no removed duplicate appears on production push, and each still fires on a matching source PR.
3. Confirm one safe PR merges under `hh-merge-check` and independently reaches LIVE.
4. **Do not report a 10× overall reduction until measured.** Other protected domain suites and old queued-run cleanup require separate evidence; never waive mandatory source coverage merely to reach a numeric quota.
