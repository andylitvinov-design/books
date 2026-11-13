# PR Monitor Standalone — isolated Vercel project

## Why
This site is intentionally independent of Agent Director. The owner requested that recurrent Vercel route overrides, partial uploads and UI regressions on the shared Commander/monitor origin never again disrupt both interfaces at once.

- **Source:** an archived working November 11 PR Monitor assembled without its asynchronous document.write loading stub, preserving both original graph engines, the full Created → Core CI → Repair → Merge → LIVE timing, error funnel, stage dashboard, recommendations, and the archive of individual PRs.
- **Site:** one original static HTML entry with one bundled CSS and **29 original local client scripts**, plus supporting static data. No Agent Commander UI scripts, private cookies, duplicated owner store, or private write endpoints deployed.
- **Navigation:** static top links to the independently deployed https://holistic-house-agents-director.vercel.app. PR Monitor is independent of the Commander page loading.
- **Data bridge:** only 26 explicit existing **read-oriented** API endpoints are proxied to the currently working original full backend https://holistic-house-pr-monitor.vercel.app. The backend is not duplicated; the URL and data origin are explicit until approved native migration. Do not proxy /api/commander-*, /api/google-owner-auth, /api/seo-auth or any write-capable owner endpoint.
- **Publishing:** two separately configured Vercel projects with different root directories; do not publish each project's whole bundle on the other's domain. One atomic source commit/PR and independently verified exact production deployment per project.
- **Safety:** no new paid service, API key, background loop, cron or database. Neither PR monitor nor public read-only project may authorize agent/CI/GitHub writes. Authorization remains on existing protected endpoints.

## Release acceptance
Check root and /pr-monitor.html contain real full monitor HTML (not meta refresh, not the 2-graph lite summary); verify all referenced local JS/CSS return 200 with correct MIME; verify at least /api/pr-three-kpis, /api/pr-stage-overview, /api/pr-stage-timeline?hours=6 return a schema-correct read-only JSON payload; verify visible links to Agent Director and both original graph sources. A real browser visual/performance acceptance is still mandatory before claiming that iPhone Safari is fixed. Keep old combined site as rollback until proven.
