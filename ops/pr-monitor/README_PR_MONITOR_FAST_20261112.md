# PR Monitor Fast — iPhone first-paint performance recovery (2026-11-12)

Incident: standalone public PR Monitor has 54+ JS/CSS requests on first view, many proxied through immutable GitHub Raw via Vercel Project Routes; multiple automatic GitHub client requests, DOM movers and MutationObserver loops. HTTP 200 / Vercel READY was not proof of usable loading performance.

The fast first-paint entry uses ONE HTML, ONE CSS, ONE JS, NO external JS libraries and TWO existing same-origin read-only API calls. It makes no direct browser requests to GitHub, has no background polling or worker, and does not request another credential:
- Graph 1: six real hourly bins with Created / Merge / CI workflow-run counts from /api/ci-runner-trends. Verify schema HH_CI_RUNNER_BINS_V2. Only draw CI counts when coverage.counts_complete=true. A workflow is not a CI job.
- Graph 2: six validated buckets of Merge throughput and P50 Created→Merged from /api/pr-stage-timeline?hours=6. Verify HH_PR_STAGE_TIMELINE_V2. Button-chosen periods 1/6/24/72 hours refetch on demand only.
- At first paint, both SVG chart containers and a concise status are part of the HTML. 9-second per-request timeout leaves the page visible and actionable when APIs are slow.
- Lifecycle stages load /api/pr-stage-overview?hours=24 only when user opens the details; missing LIVE receipt must remain unknown, never zero.
- Extended 54-resource dashboard, full repair and recommendations retained at /pr-monitor-full.html, available on explicit click only.

Publishing after protected control-plane PR merge: stage Vercel Project Routes for /, /index.html, /pr-monitor.html to immutable merged fast HTML; /pr-monitor-fast.js and /pr-monitor-fast.css to merged first-party sources; /pr-monitor-full.html to a verified immutable existing full dashboard HTML. Do not deploy a partial Vercel archive. Check staging first, then promote routes and verify all three entry URLs, both static assets and the two API schemas live. Keep existing owner auth/API and autoAssignCustomDomains=false.

This is a performance-fail-open public monitoring surface; it does not change protected backend APIs, GitHub CI, branch gates or LIVE proof semantics. Do not introduce a paid runner, cron, webhook or new service. Physical iPhone Safari timing remains to be independently accepted.
