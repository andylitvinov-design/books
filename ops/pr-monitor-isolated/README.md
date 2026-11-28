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

### Deployment cost guard — verified identical upload protection

**P0 owner cost policy (16 November 2026):** The isolated PR Dashboard is deliberately an API-uploaded static/readonly-function project without Git auto-deploy. CI data, error funnels, timestamps, and weekly summaries update through its existing read-only API; *no Vercel deployment is needed for a changed PR result or a new Git commit outside this dashboard's source*. Do not refresh the page by uploading identical files.

**Verified duplication:** Vercel `dpl_H44bKgqFR2oemhghAe63oTe7q2p6` and `dpl_8gFEQYsF23d4VMb42NxnJU7vX6Lm`, created 16 Nov 2026, have the same seven uploaded source `path/uid` pairs (including both serverless API files). The account had 11 successful dashboard Production deployments in the preceding 24 hours. This is evidence of duplicated uploads, **not** evidence that every upload was redundant.

**Mandatory release preflight for all ChatGPT/Codex/agent publishers:**
- Confirm the latest protected change actually modified `ops/pr-monitor-isolated/`, not just the generic `books` HEAD or an unrelated Control Tower/CI source
- Prepare all seven or more intended files and the full source-file manifest; compare content hashes with the previous approved Vercel READY deployment manifest, using full verified bytes when identifier schemes differ
- If all proposed bytes, serverless API files, rewrites, and build/runtime settings are unchanged: return `AUX_DASHBOARD_UNCHANGED_SKIP`, **do not** invoke Vercel `create_deployment` or `redeploy`
- If a real, reviewed change exists: follow the existing single atomic protected-PR publication policy, verify corresponding routes, and issue only **one** authorized deployment; preserve the existing LIVE and rollback version
- Never replace this check with always-skip Vercel settings: real updates must still reach LIVE. No new cron, paid service, external model, credentials, automatic cleanup or PR-triggered redeploy

## Limits
No user credentials or data export. No new paid plan, recurring agent tasks, third-party calls or background auto-deploy. HTTP/API checks are separate from a real iPhone Safari render/interaction test; do not claim real-browser proof unless it has actually been performed.

## Weekly historic CI source (2026-11-16)
The isolated dashboard has a **single** zero-cron read-only local function `api/ci-stage-weekly.js` that reads verified public GitHub CI archive comments from issue #3419. It supplies the same `HH_CI_JOURNEY_PERIOD_COMPARISON_V1` schema for current and previous-week matching periods; the previously deployed legacy API ignored `compare=1`. No direct browser GitHub calls or private tokens. Strict 1/6/24-hour client windows; all historical CI measurements are marked as partial, not full Created→Merge/LIVE. Archive missing means `—`. This is an exception to static-only hosting for a source-compatible history fix. The route requires preview function HTTP 200 + comparison schema and n/N audit **before** promoting.

## Strict week-over-week Created → Merge comparison (2026-11-16)
- The selected 1/6/24-hour period and its **identical Toronto-local clock period 7 days earlier** are queried separately through GitHub's read-only PR search for `base:codex/public-book-library`. Source PRs must be **created and merged inside the same window** to enter the latency distribution. Missing and still-open PRs do not inflate the duration; the UI shows created and eligible merged counts for each period.
- `/api/ci-stage-weekly?hours=24&compare=1&strict_weekly=1` now returns `strict_weekly.schema=HH_PR_CREATED_MERGED_WEEKLY_V1` while keeping the existing diagnostic comparison envelope/schema. Search is bounded to four GitHub pages (400 PRs maximum) and aborts on partial or mismatched responses, invalid timestamps, or rate-limit exhaustion.
- Archived Core CI timestamps are matched by exact PR number and bounded inside `created_at..merged_at`. For each matching PR, eight **non-overlapping** categories span all minutes: pre-Core unknown; workflow; runner; observed checks; between-waves unknown; other CI unknown; post-Core unknown; or, when no reliable interval archive exists, entirely unknown. The sum of stage **mean contributions** equals Created → Merge mean within rounding tolerance. No ambiguous seconds are assigned to repairs/runners.
- Core, Specialist and Merge Gate `named_ci_jobs` show **P50 of the same strict PR cohort with n/N**, but these are independently measured non-additive job clocks and must never be added to CI stage totals. Preflight and Merge → LIVE remain unknown where audited evidence is unavailable.
- Historical CI diagnostics based on `LAST_OBSERVED_CORE_JOB_COMPLETED_IN_WINDOW` remain available in a **separate collapsed section**, not intermixed with the strict PR cohort.
- Missing source, unconfirmed archive or API failure yields explicit unknown/error, never fake 0. Historic GitHub search indexing and archived CI jobs can be incomplete, so report coverage and provenance; a production Merge is not proof of LIVE.
- This is isolated PR Monitor only. No changes to Holistic House site release channel, CI workflows, automated tasks or paid providers. Release through single verified Vercel deployment with canonical alias verification.

## CI error → worker → independently verified GitHub commit (2026-11-16)
The isolated dashboard restores the original PR Monitor's ten distinct states from PR #4250/#4252 in a visible `#error-funnel` section, following `#ci`. It keeps 24h/7d/14d independent selectors, signed evidence examples and median elapsed time from the confirmed Core failure. Sources: the already-validated read-only Core CI archive #3419 and exact PR/HEAD/Core-run-matched GitHub Actions bot receipts. The public function `api/ci-error-funnel.js` reads **at most 8** recent PRs, fetches their publicly signed comments only, and verifies any claimed source-published SHA against GitHub's actual Git commit parents before counting it as a commit. It does not proxy or expose the owner-only `ci_events` inbox, does not call AI or dispatch workflows, and does not consume paid services. Each value is a **lower bound** on verifiable public evidence within an explicitly partial archive; unsupported stages show `—`, not 0. The data source itself is a sampled audit, not a claim of total CI error population. Preserve exact-HEAD, same-task and signed-bot checks; do not equate dispatch with claim, runner with model response, or merge with LIVE.

Deployment source includes all existing static and serverless files, plus the new function; no partial archive or website overwrite. Test the new endpoint in Preview before production promotion.

### On-demand PR drilldown
Optional PR number search reads exact PR-specific signed GitHub receipts from the selected historical error period, with no private CI inbox proxy. It makes older error→worker stories inspectable even when the rolling dashboard samples only the newest 8 PRs. A signed CLAIMED still counts without an untrusted edited reservation; the missing dispatch/assigned stages stay unknown.

## Atomic V2 release verification (2026-11-17)
Run `node ops/pr-monitor-isolated/release-integrity.cjs` on the reviewed protected
source to get a deterministic eight-file hash manifest. One complete Vercel
deployment must include all manifest paths, including the serverless
`api/ci-funnel-extensions.cjs` module. Publishing only `monitor.js` while the
HTML and `/api/ci-error-funnel` remain old causes a split-version release.

After an **already authorized**, budget-checked, single production deployment,
run `node ops/pr-monitor-isolated/release-integrity.cjs --verify-live`.
Acceptance requires exact static content hashes and the extended six-stage API
shape. Do not mark Dashboard LIVE on GitHub merge, JS-only refresh, or a
Vercel READY status alone. The script has no deployment/rollback operations
or timers. A stale HTML must degrade gracefully and keep the ten original
signed stages usable; the newer AI panels remain unverified until atomic LIVE.

## Current overview (2026-11-25)
The three current counters and the existing six-hour activity graph precede historical period statistics. Open PRs (all branches including drafts) use `/api/pr-open-count`, a bounded server-side public GitHub aggregate with 20-second edge cache, no new credentials or polling. On failure, show the last known count with its timestamp and explicit non-LIVE label; never infer zero. Preserve all other routes and publish a single complete nine-file bundle after protected PR review. Verify count response and mobile layout separately.


## Agents 6+4 · isolated dashboard (2026-11-28)
The canonical old monitor `/`, `/index.html`, `/pr-monitor.html` redirect to this isolated project. Legacy #5877/#5878 are merged but its incomplete 162-file source bundle cannot safely be republished. Add the same validated HH_PR_TRACE_V1 declarations in a static, opt-in section of the current dashboard. Exact public same-origin GitHub proxy routes (fixed repository, no tokens, no wildcard) serve the existing registry #1419 and per-PR metadata/comments/commits/checks only on explicit clicks. A 24h registry page is a bounded declaration sample, not signed actor identity or independently verified global repair counts. Exact-head/base blockers and actual PR merge/commit/check readback are separate. No raw receipt prose, private data, paid provider, timer loop or new function/build. Preserve CSP and existing graphs, API and JS. Route-only release: stage exact `/` and `/index.html` to the new immutable HTML and `/agents-performance.js` to the new immutable JS; add only the four new public read routes, preserve existing verified-pr-meta and all other routes. Compare previous live index/css hashes, inspect staged route diff, verify staged HTML and JS and JSON schemas, then publish that route version only, without replacing existing deployment or old monitor. Full-bundle future releases include the new static JS and five explicit rewrites. Real browser interaction and full functional LIVE remain separate.
