# Production CI / domain ownership: CRM and Telegram (2026-11-17)

## Baseline and goal

PR #4918 (Ali free diagnosis/CRM, shared Telegram transport, coaching form) spawned **11 separate workflow runs per HEAD**, across 9 successive HEADs (99 total runs). The main source of fanout was the shared `app/api/app/crm/messenger/webhook/[provider]/route.js` and `lib/app/client-telegram-transport.js` matching app/IA, Dot media/FFmpeg, owner AI and analytics suites.

## Narrow change, no new workflows

Exclude just those two shared paths from **five unrelated specialist triggers** (IA v2, App R1 isolated, owner Telegram video/FFmpeg, owner AI Telegram, practice Telegram Digest). Exclusions are final in the `pull_request.paths` sequence. Every workflow keeps its own changed source and private/auth owner coverage, even in mixed PRs. In particular, private direct messages still require IA, App R1, CRM and Core.

Retain these **six** actually relevant source checks for the representative same three-file PR:
- Required HH PR core release gate with exact-HEAD check and BASE-trusted specialist aggregate
- HH App R1 browser and database journey (separate browser/security path still triggered for webhook)
- HH CRM source checks, including signed ingress and all CRM/private-media contracts
- Holistic House messenger notification build as canonical client Telegram transport owner
- HH Ideas & Coaching public release for coaching intake
- HH Free Review live mobile browser QA for client intake

To preserve original coverage, move the existing `tests/owner-telegram-crm-ffmpeg-trace.test.mjs` into CRM, and the existing owner AI/digest tests into messenger notification (retaining the original known-stale test skip pattern). Actual Dot video/service files still start the full owner-video FFmpeg suite, which now additionally supports manual `workflow_dispatch`.

## Quantified result and limitations

**11 → 6 independent workflow runs (45.5% fewer) per equivalent shared Telegram/CRM PR HEAD**, if GitHub applies the path filters as verified by the new regression test. The number of active runners also falls because unrelated App R1/IA/FFmpeg workflows will not be triggered by those shared paths. This is a measurable step, **not** an achieved 10× overall reduction. Do not substitute shorter checks for the protected `hh-merge-check` or claim LIVE until independently proven.

No branch ruleset change, security or payment bypass, cron, new paid provider, Vercel preview or new deployment. Require the exact current HEAD CI, required Core and all BASE-trusted applicable specialists on this CI-policy PR before protected merge.
