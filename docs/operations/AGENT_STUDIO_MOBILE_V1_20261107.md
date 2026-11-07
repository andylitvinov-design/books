# Holistic House Agent Studio · Mobile integration v1 (2026-11-07)

This is the **single approved** owner-only mobile Command Center at `/admin/command-center`, **not** a parallel Antigravity clone or second PWA. The original PR #3800's alternative `/admin/command-center/mobile` UI was superseded by the separately merged owner-approved dark mobile Command Center; the repaired PR replaces that duplicate with an additive integration into the current canonical component.

## Features integrated
- Four existing screens and the owner-approved five-destination navigation are preserved, with the separate installable `/command-center.webmanifest`.
- Agent tab now shows latest recorded real runs, whitelisted GitHub source evidence and scheduler slot outcomes, with explicit LIVE-unknown semantics.
- User can request a single immediate **read-only** GitHub audit from the existing protected `run_now` API when safely enabled.
- Task totals read global DB `brief.total` instead of treating the 50-row UI limit as complete. No fabricated activity, agents or timings.
- All controls respect current owner auth, private database, RLS, enable flag and bounded request limits; no new model API, worker, cron or runner.

## Not yet available
- Automated code editing, headless Codex/Hermes/OpenClaw, isolated worktrees, independent Vercel LIVE verifier, Playwright private authenticated E2E, or Safari voice capture. These require real connection and acceptance evidence. The existing iPhone keyboard provides OS dictation without an unreviewed voice service.
- Browser pixel parity cannot be claimed from source tests; verify real 320/354/390/430 Safari with owner auth.

## Release evidence needed
Protected exact-head Core + Specialist + `hh-merge-check` -> native protected merge -> Vercel production READY/SHA readback -> canonical `/admin/command-center` login, task create, results render and safe audit -> private iPhone QA. Do not infer production from CI or PR merge. Policy: GLOBAL_PR_ONE_PUBLISH_V1.
