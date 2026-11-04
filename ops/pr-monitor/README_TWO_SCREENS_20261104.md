# PR Monitor — two-screen mobile layout (2026-11-04)

This is an additive presentation patch for the **independent** Vercel project `holistic-house-pr-monitor`, not a Next.js route in the main website.

## Screen 1 (one mobile viewport)

1. **CI in progress** = existing `workflows_running` signal; **CI waiting** = existing `workflows_queued` signal. Job counts appear as context. Values are mirrored from the existing queue widget; no new client GitHub calls or background polling.
2. Move, don't duplicate, existing chart `#hh-pr-trends` so its real data/period selectors and event handlers survive.
3. Verified created-to-merged average/median from existing live cohort widget; separate **PR → verified LIVE** metric only when an independently verified receipt exists. Missing LIVE evidence remains `—`; never equate merge with LIVE.

## Screen 2 (one mobile viewport)

Six compact expandable rows: preparation (Ready/Triage/source), runner queue, Core/Specialist CI, gate, merge wait, verified Merge→LIVE. Current event-sourced stage means from existing `/api/pr-stage-overview?hours=24&scope=production` are loaded once on entering screen 2 (or by explicit button); the endpoint already has server-side rate limit/cache safeguards. No new timers or scheduled work.

The original `pr-three-cohorts-snapshot.json` has complete created/merged-at times for historical Toronto 24h cohorts, **not** comparable stage-level event receipts. Therefore stage-level "two weeks ago" cells explicitly show `—`, rather than inventing a measurement. Only the overall Created→Merged historical comparison uses real historical values. Expand "Every PR" for created/merged timestamps, total duration, and GitHub link.

The untouched original monitor remains accessible from the full-section toggle and from `/legacy.html`.

## Deploy safely

1. Obtain the complete **current production** monitor source tree from the existing Vercel deployment (92 files at inspection on November 4). Do not deploy only this partial GitHub archive.
2. Preserve every existing API and client asset as-is by reusing their original Vercel source file digests. Move the original `index.html` unmodified to `legacy.html`. Supply a minimal new `index.html` that loads `pr-two-screen-boot.js`.
3. Copy `pr-two-screen.js`, `pr-two-screen.css`, `pr-two-screen-boot.js` and `pr-two-screen-pre.js` to the project root. These are external files because the current CSP allows `script-src 'self'`, not unsafe inline scripts.
4. Deploy to preview, verify READY, source preservation, frontend no-errors and iPhone layout, then release to production and confirm canonical alias. If anything fails, redeploy the exact previously known READY production deployment or restore the legacy index.
5. Run `node --test tests/pr-monitor-two-screen.test.cjs` against this repository's branch and `node --check` on the three JS files.

**Financial controls:** no new cron, runner, API provider, background GitHub poll, workflow rerun, token or subscription. A single Vercel preview/production build and user-driven deep stage audit still consume normal plan quotas. No guarantee of zero billable usage is implied.

**Data integrity:** the two-week stage gaps require authentic historic stage receipts. Without these, the UI must show unknown, not values inferred from total PR duration.