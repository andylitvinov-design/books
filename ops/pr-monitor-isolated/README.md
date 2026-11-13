# Independent PR Monitor · production isolation

**Owner goal:** Never let the agent management interface, AI chat, new PRs, or unreviewed Vercel route rewrites break PR/CI monitoring again.

## Architecture
- **Independent Vercel project:** `holistic-house-pr-dashboard` → `https://holistic-house-pr-dashboard.vercel.app`
- **Independent Agents Director:** `holistic-house-agents-director` → `https://holistic-house-agents-director.vercel.app`
- **Read-only legacy metric source** `holistic-house-pr-monitor.vercel.app` is kept as a backend API source only until its existing server-side API code is migrated; this is not the end-user PR dashboard. Do not add any secrets, owner auth endpoints or broad /api wildcard to this proxy.
- New isolated dashboard is a single static HTML + CSS + JS with six *exact* same-origin Vercel rewrites to existing read-only evidence-backed metric endpoints. Data refreshes only on explicit button click; no polling, mutation observers, external libraries, or direct browser GitHub API calls.
- All data access is best-effort, independently timeout-bounded. Every section's DOM exists in initial HTML and never gets hidden if APIs fail. Unknown CI/repair data shows '—' not zero; merge is NOT equivalent to LIVE.
- Sections: two original-purpose graphs; 24h KPIs; complete Created→CI→Gate→Merge→LIVE* stage table with P50/P90/size/waiting; sub-stages; CI jobs and error reasons; watchdog/worker dispatch and queue; individual GitHub PR records; Repair and Green→Merge samples; actionable verified issues with GitHub links.
- Don't infer real GitHub merge/CI/live status from a mere PR metadata snapshot. Owner commands and authenticated chat remain in separate Director.

## Deployment policy
Build/publish this standalone frontend only in the **new Vercel project**, never the Director project or the old combined monitor. New project must not be Git-linked to the enormous books repo; it has no automatic source deploys on unrelated PR merges. Source is versioned in `ops/pr-monitor-isolated` with a single atomic protected PR. To release, verify six proxy routes and all three client assets, then one production deployment, then read back the alias and schemas. Preserve the source-SHA deployment ID for rollback.

## Limits
No user credentials or data export. No new paid plan, recurring agent tasks, third-party calls or background auto-deploy. HTTP/API checks are separate from a real iPhone Safari render/interaction test; do not claim real-browser proof unless it has actually been performed.
