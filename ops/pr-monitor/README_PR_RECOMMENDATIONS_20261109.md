# PR Monitor — 3 technical prompts from current automation evidence (HH_PR_RECOMMENDATIONS_V2)

Updated: 2026-11-11 (Toronto). The existing five-card module is REUSED, not duplicated.

## What the operator sees

- Three ranked technical recommendations in a single mobile column below the two top charts; always visible even with the compact numeric view enabled.
- Each card has observed reason/counters, confidence, current automation workflow link, expandable executable /goal prompt, Copy, and owner-gated 'В задачу' handoff.
- 'В задачу' transports text using the existing 10-minute hh.commander.handoff.v2 envelope; it never submits or runs a worker without the owner checking and saving it.

## Evidence and safeguards

- One GET to the existing public /api/control-tower-stats per page open; explicit Refresh only. This API is backed by the existing Control Tower #3128 Watchdog/Dispatcher snapshot and its job/run link.
- Dynamic causal ranking: blocked dispatcher/inventory; exact-head Core; verified merge-tree conflicts; Specialist; signed wake; fallback only to labeled verification tasks.
- Contradictory/population-incomplete counters are not added together. HTTP accepted, signed RUNNER_STARTED, GitHub source SHA, merged and Vercel LIVE are separate verified states.
- Sample checked_at is used for freshness. FRESH <=15m, DELAYED 15–75m, STALE >75m; stale prompt requires fresh per-PR/HEAD/lease/job evidence.
- Individual failed job stack traces and private :20 Docs are not exposed to the public page. Prompts explicitly require reading the linked GitHub Actions run and protected receipts before making changes.
- Never assume that conflict label means a real dirty merge, or that worker response means a commit. Never bypass Core/Specialist/Guard and security/privacy/consent/payment checks.
- No new backend, tokens, AI model request, Actions/cron, polling, GitHub scan, CI runs, paid service or automatic source write.

## Release

Source files: pr-recommendations.js/css, pr-dense-view.css and this README + focused tests. Monitor uses a manually deployed full manifest. After a protected merge, update only the three existing immutable-source Vercel Project Routes to point to the merged commit; do not redeploy a partial site. Verify alias/HTTP MIME/route version and a real mobile end-to-end smoke before marking LIVE.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=verified; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
