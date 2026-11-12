# PR Monitor · release gate after 2026-11-12 READY/404 incident

**Root:** https://github.com/andylitvinov-design/books/issues/4398  
**Target:** Vercel project `holistic-house-pr-monitor` (`prj_qD9cWLfw4sVE0Da9nqDyZxHkqI3L`), independent from the main Holistic House site.

## Why this exists
A production deployment reported READY even though `/pr-monitor.html`, `/legacy.html` and `/monitor-core.js` were not present, causing 404. Some earlier builds had the monitor HTML but omitted JS/CSS or returned 5xx from APIs. READY, one HTTP 200, a GitHub merge, and the landing page alone are **not** LIVE acceptance.

Emergency recovery pinned the complete 7 November deployment `dpl_3aiyhwb7JQfV5pshLZ3Er89U3YuM` and added immutable-source routes for four missing assets. On November 12 the project's **autoAssignCustomDomains was set to false** to prevent a later incomplete build from replacing the public alias. Do not re-enable automatic promotion until a protected, reproducible release pipeline exists.

## Two fail-closed checks — before ANY production promotion

1. Assemble the **complete standalone source bundle** from a verified manifest, including all previously deployed files, API helpers, original `legacy.html` and `monitor-core.js`. The partial GitHub `ops/pr-monitor` archive is NOT itself a complete production bundle. Run:
   ```sh
   node ops/pr-monitor/scripts/verify-release-candidate.cjs --bundle /path/to/assembled-full-source
   ```
   This runs the existing required-module/cohort/config gate and newly checks all JS/CSS references in the legacy HTML and boot scripts. Any missing asset fails.
2. Create a **staged production build without alias assignment**; inspect its exact immutable deployment URL. Run:
   ```sh
   node ops/pr-monitor/scripts/verify-release-candidate.cjs https://EXACT-DEPLOYMENT.vercel.app
   ```
   This GETs the monitor entry, original fallback, first and second chart scripts, compact widgets, related assets and five real read-only PR/CI APIs. Require expected content types, nonempty valid HTML/JS/CSS, correct JSON schemas, and zero 404/500. It discovers and checks extra assets referenced from the actual HTML and boot JS. Save JSON with candidate URL, checked count, errors and SHA-256 static asset digests.

## Publish / rollback
Only after both gates return `ok:true` and a **real 320/390/430px mobile check** confirms **both graphs at the top, compact metrics and full Created→CI→Merge→LIVE path**, manually promote that exact tested production deployment (no preview rebuild or alias-from-uncertified branch). Repeat HTTP checks on `https://holistic-house-pr-monitor.vercel.app`; if any check fails, restore the last known-good full deployment. Keep owner-authenticated APIs, session isolation and CSP intact; do not invent LIVE receipts or substitute merge for LIVE.

The release verifier is intentionally **read-only**. It does not deploy, create a webhook/cron, poll, disable CI, spend on new services, or override Vercel or GitHub protection. Integrate these checks into the existing publisher before re-enabling unattended releases. No new parallel publisher or paid workflow.

GLOBAL_PR_ONE_PUBLISH_V1: stage source+tests+docs before first remote branch update; publish one commit; enforce current exact-HEAD protected checks and independently verify LIVE.
