# PR Monitor: 1 CI wave, repeated waves, Created → Merge P50/P90
**Date:** 2026-11-06. **Root:** HH_PR_WAVE_EFFECTIVENESS_20261106.
**Target:** https://holistic-house-pr-monitor.vercel.app (standalone PR Monitor, Vercel project prj_qD9cWLfw4sVE0Da9nqDyZxHkqI3L). **Control branch:** codex/bootstrap-books; site production branch codex/public-book-library is deliberately unchanged.

## Owner outcome — three effectiveness KPIs
The existing "Error → Repair / CI First Pass / Green → Merge" panel stays intact. A compact **additional** panel displays two adjacent, fixed 24-hour cohorts of production-base PRs grouped by created_at. Both cohorts use the same inclusion rules and expose n/N rather than silently shrinking the denominator.

| Indicator | Formula / target | Coverage rule |
|---|---|---|
| "One CI wave / PR" | PRs with exactly one **observed** first-attempt Core workflow ID / PRs with at least one observed Core run. **Target: 1 initial Core wave per PR.** | A single archived run is NOT proof of the genuine first-ever wave. Unknown history is not zero. |
| "Extra CI waves" | Sum of max(0, distinct first-attempt Core workflow IDs − 1) per PR. Split into consecutive same-SHA and new-HEAD waves. Retry attempts are counted separately. | All numbers are lower bounds from saved authenticated CI shards. A new HEAD proves source SHA changed, not that a change was needless or a Repair action. 3+ waves flag review, not a merge block. |
| "PR Created → Merge" | (merged_at − created_at) in minutes for **already merged** PRs from the same creation cohort, with P50 and P90, n and total cohort N. | Unmerged PRs are right-censored, never assigned 0. A small n or partial 48h list cannot prove causal speedup. |

The existing authenticated GitHub Actions Core shard archive [issue #3419](https://github.com/andylitvinov-design/books/issues/3419) is joined to a bounded **read-only** GitHub PR creation listing on the verified production base. The Core archive is reused in-memory by the existing /api/pr-three-kpis request. The extra listing runs **only when efficiency=1**, with at most 4 GitHub pages (100 items each), a 10-minute server cache and rate-limit reserve. A failed optional read never hides the previous three KPIs; it shows unknown/error.

## HEAD and GPT-agent coordination
Use [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md) and [local canonical controller](../../docs/operations/PR_AUTOMATION_CANONICAL_V1.md) as the enforcement authority. One verified root → one PR, one leased HEAD writer, one atomic source publication **before** opening a PR, then frozen HEAD while exact-HEAD checks run; only a confirmed failing check or urgent correctness/security bug authorizes a batched repair commit.

- Same-source-SHA duplicate workflow wave (including metadata-triggered events) is distinguishable from genuine changed-HEAD waves.
- A head update **before previous Core completed** and a new HEAD **following RED** are diagnostic evidence, not a command to cancel valid checks.
- Agent count in the top row continues to describe **observed scheduled automations only**, not all concurrently open ChatGPT conversations/Work tasks.
- Hourly :20 optimizer uses existing GitHub receipts to correlate repeated waves with the owning lease/agent and root. :35/:40/:45 must hand off collisions rather than race to republish.
- Optimize expensive Core CI duration only **after** the rate of unnecessary waves/new HEADs is measured; preserve mandatory exact-HEAD security, auth, consent/payment, browser/Specialist checks.

## Implementation and acceptance
- New pure read-only source: ops/pr-monitor/pr-wave-effectiveness-model.cjs; focused regression tests: tests/pr-monitor-wave-effectiveness.test.cjs.
- Existing ops/pr-monitor/api/pr-three-kpis.js appends release_efficiency in an optional same-origin response.
- Existing pr-three-kpi-ui.js and .css show three cards in the established dashboard, responsive 320/390/430 px, preserving prior KPI panels, examples and coverage.
- Cache-bust only two changed KPI assets in pr-two-screen-boot.js and update the existing corresponding unit test.
- Test focused Node suites, source syntax, browser Chromium/WebKit at 320/390/430 and real API sample/error conditions; distinguish tests from actual iOS Safari acceptance.
- Before merge: verify exact HEAD, one owner, CI status, branch protection; a merge into control codex/bootstrap-books **is not standalone Vercel LIVE**.
- Before independent Vercel deployment: obtain the complete current deployment source bundle (100+ existing files), preserve legacy.html, all APIs/assets and CSP; verify billing envelope before ONE release. Confirm production READY, alias, version and live 24/48-hour metrics. No new paid services, CI dispatch, crons, runners, tokens or background polling. If preview/billing costs cannot be bounded, **HOLD_COST_UNVERIFIED**.

## Interpretation of 24–48-hour comparison
A lower extra-wave count or median after a release is association, not proof that the change saved 94% or reduced causal waiting time. Always show: cohort N, Core-covered n, observed wave IDs, same/new HEAD split, reruns, merge n/N, median/P90, PR and CI evidence links. Later match PR complexity, Draft/Ready mix, business hours and check scope. Missing history remains unknown, not zero.
