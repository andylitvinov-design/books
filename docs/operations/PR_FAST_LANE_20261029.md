# Holistic House — PR Fast Lane (2026-10-29)

**Canonical release branch:** `codex/public-book-library` (not default `codex/bootstrap-books`). Verify active Vercel source, SHA and alias at release time. This document is the source of truth for Work, Chat and DOT cooperation.

## Observed blockers and correction

- 95 GitHub Actions workflow files as of 29 October (18 on 15 October); some heavy suites fire for every PR, even when unrelated. All **seven** previously unscoped PR workflows are now **path-scoped conservatively**: App R1, App Browser, Billing Isolated, Interpretation Database, OPORA, IA v2 and Public Services. Their jobs and assertions remain intact on relevant changes. `tests/pr-fast-lane.test.mjs` guards these triggers and the fail-closed core workflow contract.
- Add `.github/workflows/hh-pr-core-release.yml`, which runs on **every** production-targeted PR: explicit one-status `release-ready`, narrow documentation-only shortcut, otherwise changed-file ESLint, whole-project TypeScript and full production build (including prebuild tests).
- Scope job fails closed on unexpected inputs; merge_group and workflow_dispatch always run code checks. No skip for SQL, workflow, auth or application changes.
- This core gate is **necessary but not sufficient**: applicable specialist workflow jobs, security/privacy/auth/RLS/payment checks, unresolved reviews and actual E2E requirements still apply. Never consider a red, queued, canceled, unknown, or mismatched-head specialist result green.
- GitHub Actions concurrency should be by PR number/ref (cancel superseded commits only). Do not rerun unchanged failing jobs, edit tests just to turn status green, or push empty commits to restart queues.

## Critical administrator setup (requires GitHub repository administration)

The connected GitHub MCP exposes PR/file actions but **not** repository settings/branch-rule writes. These steps must be done in GitHub Settings by a repository administrator, **after confirming this new core gate is successful and stable**.

1. Settings → General → Pull Requests: enable **Allow auto-merge** and keep **Allow squash merging**. Do not enable merge without checks.
2. Settings → Rules → Rulesets → New branch ruleset (or Branch protection) → target `codex/public-book-library` **only**. Require pull request, require approvals for risky changes, dismiss stale reviews, require resolved conversations, disallow force-push and deletion; do not add unrestricted bypass.
3. Require the **stable** check `release-ready` from `HH PR core release gate` (confirm exact status/check name from successful live run). For security or code-specific cases, explicitly require corresponding applicable specialist checks or an equivalent protected aggregate gate; never silently ignore failing relevant workflows. Do not require path-filtered optional workflows globally (skips may remain pending).
4. Test ruleset using a safe temporary PR; confirm queue/approval and requested protections work before activating automatic merging for ordinary low-risk PRs.
5. Review GitHub General default branch; do **not** change it to production without checking integrations that depend on bootstrap. Any default-branch alignment is a separate planned migration.

## One-cycle operating contract

All agents operate on **existing** PRs; coordinate with a single owner for each `repo#PR`. If another agent owns it, pick a different PR; avoid simultaneous commits to the same branch. Track in PR comments or a compact shared ledger: `owner`, `run_id`, `head_sha`, `last_action`, `next_action`, `lease_expires`. Leases must be refreshed from GitHub; never rely solely on a stale summary.

1. **Work Repair (08:30–18:30):** choose up to two high-value unowned open PRs; inspect last exact-head failed/queued jobs; implement the smallest verified fix **in the same branch**; run focused local tests; commit once or as needed; hand off to release lane. Spend first 70–80% of cycle on code, not a 300-PR inventory.
2. **Work Merge Delivery (09:00–19:00):** inspect last ready candidate and check exact head/base, non-draft, mergeability, approvals, relevant specialist statuses and privacy/security. Squash-merge only truly green safe PRs; otherwise fix a concrete blocker or select another ready PR. If GitHub Auto-merge is enabled **and** all rules are enforced, enable it for approved low-risk PRs; otherwise do not bypass.
3. **Chat CI triage (24/7 hourly):** no duplicate full-portfolio inventory or second PR repair owner. Select up to three ready/blocked candidates, parse failed job **logs**, classify `CODE_FAIL`, `TEST_STALE`, `CI_INFRA`, `CROSS_SCOPE`, `REVIEW`, `QUEUE`; perform a focused repair only on unowned PRs, otherwise hand off one precise command/log reference.
4. **DOT (coordination/acceptance):** compare GH merged events to Work/Chat run receipts; verify Vercel READY/deployed SHA/domain and post-release smoke tests. DOT must not claim that someone else's merge is its own. DOT may fix distinct unowned PRs but must follow the same gate.
5. **Every report:** `run_id / PR numbers inspected / distinct PRs repaired / own commits / own merges with merge SHA / other merges observed / live verified / blocker class / next owner`. Merges count only on actual GitHub `merged_at`, not comments or declarations. For throughput analysis dedupe by `repo#PR`, attribute actor using audit trail, never infer actor from timestamp alone.

## Performance experiment and rollback

Track median time-to-first-fix, median green-to-merge minutes, scoped CI runs/PR, exact-head failures/PR, distinct merged PRs/hour, and live-verified PRs/day over **7 days**. No success targets should override security or functional acceptance. Watch for missing needed specialist checks, unsafe skipped tests, regressions, false-green merges or increased Vercel deploy failures. Roll back path filters in a new PR and restore broader coverage immediately if affected functionality is no longer exercised.


## Policy-only PR scoping and baseline failures — 29 Oct 2026

The seven heavy specialist suites are required for their **matching product/source/tests/harness paths**, not simply because the owner changed `AGENTS.md` or edited a workflow YAML file. The original fast-lane PR contains only workflows, `AGENTS.md`, operations docs, and the CI policy test. GitHub previously launched all seven full product suites on that CI-only diff, reproducing independent pre-existing failures (App R1 unit 22 names, IA 486, OPORA 5), creating a circular dependency for shipping scoped CI itself. This is not evidence that changed application code was safe.

The relevant validation for **CI-only** edits is the dedicated always-triggered `HH workflow syntax — actionlint` (all YAML syntax/expression validation plus strict changed-file shellcheck) and unconditional `HH PR core release gate` (exact-head `tests/pr-fast-lane.test.mjs`, targeted ESLint, full TypeScript, Next production build, and fail-closed `release-ready`). The narrow regression above checks that removing `AGENTS.md` and each workflow's own YAML from heavy `pull_request.paths` does not remove any other product, middleware, dependency, migration or security-sensitive path. For any change to actual app/API/DB/security/payment/test harness paths, all relevant specialist jobs still trigger and their failures remain blocking. No test commands, steps, service isolation, RLS, browser matrices or privacy assertions were deleted.

Important: **skipped workflow is never considered green**; GitHub branch protection must not require an optional path-filtered job globally, because filtered jobs can remain Pending. Before enabling native auto-merge, a protected unconditional aggregator must enforce successful *applicable* specialist checks, reviews and safety gates, and a read-back must confirm protected production branch. CI-only changes need review of the full YAML diff and green actionlint/core; changed production behavior requires green corresponding specialist suites. If this scoping proves unsafe, restore previous filters and quarantine auto-merge.


## Full exact-head applicable specialist gate — rollout 29 October 2026

The core release-ready job now checks ALL applicable pull_request GitHub Actions
workflows discovered from the repository, instead of a partial hardcoded map.
The dependency-free Node 22 reader compares the exact production base SHA
workflow catalog with the candidate merge checkout catalog. Deleting or
weakening an existing workflow in a PR cannot silently remove its obligation.
It uses the complete paginated changed-file list and GitHub branch/path filters,
with ordered exclusions, and verifies the linked PR, exact head and exact base.

A required workflow must have a successful current-HEAD pull_request run with
real successfully completed jobs. Missing, waiting, failed, skipped, cancelled,
wrong-HEAD, and jobs=0 workflows block release-ready. Exact-head feature push
validation failures also block (including unregistered YAML jobs=0 failures).
The check re-reads the PR identity before reporting success.

The gate is read-only (contents, actions, pull-requests read permissions),
does not rerun checks or call paid services. It waits at most 12 minutes after
the core build; if a valid browser check is longer, rerun ONLY the failed
release-ready job after specialist completion. Do not disable real tests.

For workflow_dispatch and merge_group the original full core checks still run;
full specialist aggregation applies to pull_request only. Do not use GitHub
Merge Queue until its separate specialist evidence is explicitly verified.
External booking, payments, provider message delivery and production E2E are
separate gates that this GitHub CI reader does not claim to prove.

ADMINISTRATIVE HOLD: repository-native Auto-merge remains disabled until
the exact-head aggregated release-ready passes positive and negative integration
scenarios, a branch ruleset protecting ONLY codex/public-book-library is enabled
with required review, resolved conversations, no force push/delete and required
release-ready from GitHub Actions, and settings are verified by readback.
GitHub default codex/bootstrap-books is not production. The currently connected
GitHub tool has no repository ruleset/auto-merge settings write operation.

Additional source-integrity rule: fork-head PRs fail closed before receiving the gate's read token. The first bootstrap rollout uses the new same-repository candidate script only because the exact baseline does not yet include an aggregator and Native Auto-merge is OFF. On every subsequent PR, release-ready extracts and executes both validator modules strictly from the verified base SHA using git show, and inspects candidate workflow definitions only as data. Missing base module fails closed. The required workflow itself still needs branch-rule protection and review for changes to its source.

## Measured CI-volume audit — 29 October 2026 (production branch only)

Production `codex/public-book-library`: 18 workflow YAML files at
`cce88922a5d6d1f3800980f732a438c6272f057a` (15 October) versus 95 at
`06c46a716c3f70ead09a8dd7af4b81ca5b0c3c03` (29 October): +77.
Created PRs targeting production: 513 during 2–15 October versus 1,837 during
16–29 October. Daily Actions runs: 10,249 versus **at least 33,978**; the API
caps numerous recent daily totals at 2,500, so the second is a lower bound.

On production-targeted PRs, the always-running `HH PR core release gate`
already owns global changed-source ESLint, whole-project TypeScript and the
Next.js production build. App R1 now skips duplicate global lint, TS and build
steps in unit-build; IA v2 skips only duplicate global lint and TS. App R1
retains app/auth/privacy/RLS, course, DB and browser tests. IA retains unit
tests, remedy validators, native/PWA checks, the Next build needed by browser
acceptance, and encrypted-store/browser tests. On feature pushes or manual IA
runs the original global checks still run. Workflow triggers and specialist
exact-head fail-closed aggregation are unchanged.

Readback: `allow_auto_merge=true`, but production `protected=false` with no
repository rulesets. Do not merge solely on a core check without review and
relevant specialist evidence; configure protection before enabling PR-level
automatic merging. Next improvements: group related scoped specialist workflows,
share expensive builds where browser tests allow it, and reduce agent-created
duplicate PRs. Never drop privacy/auth/RLS/payment/E2E gates.

## Workflow consolidation wave 1: reviewed migration before deleting jobs (30 October 2026)

Two strictly reviewed one-to-one replacements are staged in existing domain workflows:

- `hh-crm-event-channels.yml` → `hh-event-referral-contract.yml`: union of PR/push paths; preserves event-source, CRM marketing, organic referral, GBP and TypeScript contracts, with one Node 24 install/typecheck and PR-number concurrency. Original still runs until later removal PR.
- `psychometric-research-catalogue.yml` → `hh-assessment-quality.yml`: union of paths; preserves research catalogue's four tests and two reference-count thresholds, in addition to all author-quality/evidence/privacy checks and report artifact. The replacement supports original PR branch scope, production push and manual dispatch. Original still runs until later removal PR.

The `specialist-aggregate.mjs` base-trusted allowlist *only* accepts deletion of the two explicitly named workflows when their already present replacement is byte-identical to the BASE version, the replacement is actually scoped to the changed PR files, and its exact-head associated run has completed successfully with real jobs. Unmapped YAML deletion, weakening of a replacement in the same PR, jobless/skipped/failed/queued/mismatched-head run, or unrelated failed current-HEAD workflow remains blocking. Core `hh-pr-core-release.yml` continues extracting its verifier from immutable BASE SHA. The `hh-actionlint.yml` deletion-only branch checks statuses, validates all remaining YAMLs and still relies on the exact-head specialist gate to allow any removal.

**Two-PR protocol:** first merge this additive / trusted-allowlist PR with exact-head actionlint, sweep-guard and both specialist jobs green, then create a separate *deletion-only* PR. Do not remove legacy workflows before approved replacements and policy are in BASE. Do not treat lower YAML count as evidence of cost or E2E gains; compare runner-minutes and actual status parity. GitHub branch ruleset for production remains a separate owner-admin step.

## Wave 1 obsolete workflow removal (30 October 2026)

After additive #2617 passed actionlint, all original/combined specialist checks, PR Sweep Guard, TypeScript and Next production build, the separately audited deletion PR removes exactly `hh-crm-event-channels.yml` and `psychometric-research-catalogue.yml`, retaining their complete tests in unchanged `hh-event-referral-contract.yml` and `hh-assessment-quality.yml`. The BASE-trusted aggregate requires both replacement workflows to succeed for this exact PR HEAD; an absent job, changed replacement or unmapped deletion fails closed. Workflow count goes 95 -> 93, enforced by an explicit reviewable `<=93` regression budget (while preserving >=90 sanity floor). Do not treat reduced YAML count as measured runner-minute savings; check CI run counts and green-to-merge latency separately.

## Wave 2: three domain-suite consolidations — staged review

The BASE-reviewed allowlist extends the same exact-head and byte-identical successor rule to three narrowly mapped workflows (do not delete old YAMLs in this additive PR):

- `hh-benchmark-free-test-pilot.yml` → `hh-benchmark-program.yml`: original guest-first EN/RU/ES and free-review tests, exact PR/push paths, existing matrix and offline plan; new PR-number supersession cancellation but no production cancellation.
- `hh-portrait-sectors.yml` → `hh-profile-axis-matching.yml`: all original sector/responsive/gauge tests plus existing axis relevance/privacy tests; a separate Next build is already guaranteed by unconditional `release-ready` on production PRs; the target's existing build/typecheck remain for nonproduction runs.
- `cabinet-today-ci.yml` → `hh-cabinet-journey.yml`: role/locale/access test, scoped lint, original journey and progress regressions; Next production build remains in core gate; isolated old workflow stays until later verified removal.

Use the same two-PR staged protocol as wave 1: additive trusted replacement PR, all applicable checks green, squash merge to production, then deletion-only PR with exact-head successor proof and updated workflow budget. Do not weaken App R1, billing, private data, RLS or browser checks, and do not assume YAML count equals runtime savings.

## Wave 2 retired legacy YAMLs (30 October 2026)

When reviewed additive #2620 is merged in production, remove exactly `hh-benchmark-free-test-pilot.yml`, `hh-portrait-sectors.yml`, `cabinet-today-ci.yml`. Their original guest-first test, profile score/responsiveness tests and Cabinet Today role/locale contracts execute in unchanged, trusted successors: `hh-benchmark-program.yml`, `hh-profile-axis-matching.yml`, and `hh-cabinet-journey.yml`. The BASE-trusted exact-head reader demands all three replacement runs with real successful jobs. Original production builds for portrait and Cabinet Today are not lost: the unconditional core release build/typecheck covers every production PR. Change workflow count budget 93 -> 90, replace artificial >=90 floor with a >=25 nonempty safeguard plus an explicit must-retain list for auth, RLS, billing, CI guard and native checks. Further changes to the protected list require explicit review and exact-head verification. No product runtime changes; validate Vercel READY SHA and alias separately.

## Source-only global build de-duplication — confirmed subset (30 October 2026)

The unconditional `HH PR core release gate` already runs changed-source ESLint, whole-repository TypeScript and Next production build on each non-doc production-targeted PR. Exactly two specialist suites skip duplicate global checks **only when targeting production**:

- `hh-public-test-collections.yml`: skips final Next build but retains original taxonomy, psychometric, source/link audit, EN/RU/ES and scoped lint assertions.
- `hh-kling-video.yml`: skips duplicate TS and final Next build on production PR, retains local-only provider-free unit tests and scoped lint. Nonproduction PRs and production pushes keep full validation. PR-only superseded-run cancellation added.

Original pilot [Growth run 41001095946](https://github.com/andylitvinov-design/books/actions/runs/41001095946) failed three business/public-route tests and [Course Presets run 41001095988](https://github.com/andylitvinov-design/books/actions/runs/41001095988) failed one private course-navigation test. Both workflows are restored byte-identical from BASE and remain blocking on their applicable changes. Do not hide source failures through CI skip. Regression `tests/pr-fast-lane.test.mjs` asserts both retained modules, exact event conditions, original test commands and protected core build. Measure actual runner-minutes after release.

## Exact CI-policy-only fast lane (staged, 30 October 2026)

For production-targeted PRs changing **only** an explicit, short allowlist of GitHub workflow YAML, CI validator code/tests or the PR fast-lane operations doc, the core `scope` step classifies `ci_only=true`. Its `core-lint-types-build` job still executes `npm ci`, `tests/pr-fast-lane.test.mjs` and changed-source ESLint; `hh-actionlint` validates all YAML and strict modified workflow shell; `HH PR Sweep Guard` validates base-trusted specialist policy; unconditional `release-ready` still verifies the complete set of applicable exact-HEAD domain workflows, including real executed jobs. Only the **redundant whole-application TypeScript and Next build steps** are omitted for this strictly non-runtime diff. Vercel still builds the actual production code after merging; do not call CI-only skip a product runtime test.

The allowlist intentionally excludes `AGENTS.md`, dependencies/lockfiles, SQL and RLS migrations, all app/components/lib runtime code, scripts that build site content, auth, providers, billing, health/private content and security configuration. Mixed PRs fail closed to the full TS/Next build. Manual/merge queue events also use full global checks. Synthetic git regression tests cover workflow edit, removal, CI source edit, mixed YAML+runtime, renames, migrations, auth and dependencies. If a CI test path changes without a specialist trigger, add its exact path to the relevant specialist workflow, not the allowlist alone.

**Release condition:** this policy needs its own positive/negative GitHub exact-head CI, read-only base-trusted aggregator and manual merge after review, followed by production Vercel READY SHA/aliases. Separate owner GitHub branch ruleset remains mandatory for native auto-merge; no relaxed approvals or test waivers.

## Fail-closed protection against unmapped workflow deletion (30 October 2026)

The immutable BASE-SHA `release-ready` specialist verifier must reject deletion of **any** `.github/workflows/*.yml|*.yaml` file lacking an explicit approved successor, including push-only, workflow-dispatch-only and PR workflows that intentionally do not include their own YAML path in the PR trigger. The old verifier only iterated `expectedWorkflows` (the PR-triggered subset); this allowed an unrelated CI-only deletion to evade review. The new resolver enumerates the complete BASE-vs-current removed workflow set. For every approved retirement it additionally proves the successor exists **unchanged in BASE**, matches current PR path scope and has an exact-HEAD completed-success run with real successful jobs. Missing/altered replacement, unmapped deletion or cancelled/pending/skipped/empty-job successor remains blocking. No workflow is removed by this safety PR; existing approved mappings and all domain tests remain intact.


## Draft-heavy App / OPORA / public services staging (30 October 2026)

Four previously ungated expensive acceptance workflows now stage their **jobs**
for non-mergeable Draft PRs: `hh-app-r1.yml`, `hh-app-browser.yml`,
`opora-module-ci.yml`, and `hh-public-services-production.yml`.
Their full original unit/database/Chromium/WebKit/production-browser jobs execute
on `ready_for_review` and each subsequent `synchronize` of a non-Draft PR;
`converted_to_draft` cancels superseded running checks. Existing App/OPORA
feature-branch `push` audits still run. `browser-journey-complete` retains
`always()` fail-closed status aggregation on Ready, not on Draft.

**Draft-skipped is NOT CI-success or merge eligibility.** Work Repair may use
focused local tests while iterating a Draft, but must explicitly mark the PR
Ready to obtain current-head specialist acceptance. Work Merge continues to
require the unconditional exact-head `release-ready`, all applicable actual
executed specialist jobs, reviews, and live delivery checks. Dedicated
`tests/ci-heavy-draft-policy.test.mjs`, PR Sweep Guard and actionlint verify
the event transitions, job guards and preserved push safety on any workflow
change. No check, RLS, consent, payment or E2E assertions were removed.


## Next optimization programme and daily waiting-time forecast — 30 October 2026

**Decision:** optimize duplicate work and shared failure causes first. Do not relax
the immutable-base `release-ready` aggregator, owner/consent/RLS/payment
checks or true provider E2E. GitHub production is
`codex/public-book-library`, not repository default `codex/bootstrap-books`.

### Evidence and units (snapshot at approximately 11:50 UTC)

- 391 open PRs: 268 Draft and 123 non-Draft; 352 target production directly
  and 39 are stacked on intermediate feature branches. These are *queue
  inventory*, not daily PR arrival rates.
- 90 workflow YAML files in production, after staged reviewed consolidation.
- A recent **400-run sample** (30 Oct 07:17:55–11:49:59 UTC) spans **81 head
  SHAs** and has **84 cancelled runs (21%)**; median 5 workflow runs per SHA,
  up to 15. Do not treat every cancellation as wasted billable compute.
- Observed median workflow elapsed times *among completed sample runs*:
  core gate ~5.5 min; public services ~7.4; App R1 browser ~8.5;
  axis-to-offer ~4.8; Ideas & Coaching ~7.4. These are not per-job billable
  minutes. Run-start delay was near zero in this sample: repeated execution
  and failed cross-domain acceptance dominate measured latency.
- GitHub daily Actions query reached its 2,500-result count cap; treat this
  as a **lower-bound/censored figure**, not an exact daily cost.
- Core-success-to-merge in six checked PRs: five ~0.4–10 min; one stalled
  ~435 min. This measures the *core* gate, not all specialist completions.
  Thus native Auto-merge helps outliers more than typical already-fast merges.

**Definitions:** `PR-wait min/day` is **the sum of waiting time across
affected PRs**, not elapsed hours on the wall clock or a promise to a
single customer. `CI-job min/day` is a **rough range of avoidable runner-job
time**; exact metered/billable minutes are not yet exported. Forecasts
below use explicit daily change-volume scenarios, not the 268-Draft
stock count as 268 daily runs. The ranges overlap substantially and
**must not be added row by row**. "Done" is implementation status only:
measure savings against a seven-day baseline.

### Prioritized programme

| Tier | Recommendation / current implementation | Scenario used for forecast | PR-wait saved, min/day | CI-job time avoided, min/day | Next action / proof |
| --- | --- | --- | ---: | ---: | --- |
| P0 DONE / MEASURE | **Draft-heavy gating**: #2645 merged. Four App/OPORA/Public Services suites skip expensive Draft jobs; their full relevant original checks run again on `ready_for_review` and later non-Draft `synchronize`. | ~10–25 relevant Draft updates/day, ~5–10 costly minutes each | **0–40** indirect | **50–250** | Compare GitHub jobs before/after: Draft skipped, Ready not skipped, production push intact; no release-ready false green |
| P0 DONE / MEASURE | **Pure source-path scoping**: #2627 merged. Excludes only audited, pure Intelligence parser paths from unrelated public storefront acceptance. | ~6–18 otherwise irrelevant heavy triggers/day | **10–70** | **40–160** | Negative/positive path-matcher tests; must not exclude public routes, APIs, billing, auth or shared security files |
| P0 NEXT | **Repair baseline once, not in 10 PR branches**: group by `workflow/job/test signature + production SHA`; fix the root in one owned source PR; integrate/rebase its green result before rerunning downstream. Prioritize #2607/#2535 dependency and top repeated App/OPORA/DAO failures. | 4–8 blocked PR/day × 15–30 minutes of repeated diagnosis/CI | **60–240** | **20–100** | Work Repair: one exact-head test/commit and failed→green run, then Work Merge. Do not adjust assertions to mask real defects |
| P0 NEXT | **Batch agent commits and coalesce superseded checks**: repair one coherent root per PR per cycle, only push after focused local tests. Existing `cancel-in-progress`/trusted stale-run prune stay on; never cancel current HEAD or production runs. | ~10–25 avoidable superseded workflows/day × 3–8 minutes | **15–70** | **30–200** | Triage reports superseded *after started* vs queued; unique PR+SHA ownership and one active lease |
| P1 NEXT | **Narrow remaining oversized workflow path triggers with positive/negative coverage**. Especially source-only policy vs all-page public-service/browser matrices and unrelated code-owned domains. No broad exclusions for shared app/API/middleware/provider/DB files. | ~8–20 proven unrelated heavy runs/day × 6–10 minutes | **20–100** | **50–200** | CI owner selects first 2 workflows by wasted started-run minutes; actionlint + scope-regression tests + exact-HEAD specialist aggregate |
| P1 BLOCKED / #2630 | **Reuse Core build/TypeScript only where truly duplicate**: existing Draft #2630 covers Growth Journey and My Courses; solve its exact-head domain failures first, then Ready review. Preserve domain tests, scoped ESLint, manual/push independent builds. | ~8–20 repeated build/TS jobs/day × 4–8 minutes | **10–70** | **30–160** | No unconditional skipping of `npm run build`; trusted core compile must actually run and pass on production-targeted PRs |
| P1 NEXT | **Unstack dependency chains, oldest-ready fairness**: map all 39 non-production-base PRs; merge reviewed parent into production first, retarget child only after conflict/authorization review and fresh CI. Reserve one aged eligible PR per 4–5 regular deliveries. | ~2–6 blocked stacked PR/day × 20–50 minutes avoided | **40–300** | **10–80** | Delivery agent reports parent/child SHAs; no direct merge of child feature branch counted as live |
| P1 PILOT | **Reproducible npm/Next/Playwright caching**: share lockfile-keyed download caches and isolated browser binaries; validate cache hit/miss and exclude private DB/session artifacts. Do not reuse compiled outputs across unverified branches. | ~10–25 applicable jobs/day × 2–4 minutes | **10–50** | **20–100** | Pilot in one slow non-sensitive workflow; compare cold vs warm, disable cache on stale artifacts |
| P2 OWNER HOLD | **Native Auto-merge after real protected production ruleset**. Only with required exact-head core + applicable specialist checks, review and resolved threads; never bypass. Repository `allow_auto_merge` alone is insufficient. | ~3–8 already-green eligible PR/day, typical core→merge gap 0.4–10 min (occasional multi-hour outlier) | **5–60 typical**; greater only for rare outliers | **0** | Owner rules: https://github.com/andylitvinov-design/books/settings/rules; validate positive/negative scenarios and `protected=true` readback before opt-in |
| P2 DESIGN | **Reduce specialist-aggregate polling without false green**: optional trusted completion-driven status/check instead of idle 35-minute wait, only if it watches complete applicable *exact-head* jobs and fails closed on absent/cancelled/skipped/changed-base results. | 4–10 genuine slow-ready checks/day × 5–10 minutes | **20–100** | **30–150** | Prototype isolated integration tests before any change to production gate; rollback if missing jobs could pass |
| P2 STAGED | **Retire only proven duplicated YAML workflows**, never weaken workflow inventory simply to lower the YAML count. Existing successor jobs and BASE-trusted deletion proof must remain green. | ~4–12 redundant executed jobs/day × 3–8 minutes | **10–40** | **20–100** | Two-PR additive→verified retirement protocol, with exact matching successor and rollback guard |

### Execution schedule for active agents

1. **Now / next 24 hours (P0):** freeze repeated baseline diagnosis by
   `signature + prod-SHA`; Work Repair fixes one unowned reproducible source
   defect per cycle, tests locally, pushes once and hands off exact HEAD.
   Chat/Triage prioritizes the largest actual *started-and-cancelled*
   and *irrelevant-heavy* workflow signatures; no empty re-runs.
2. **Next 48 hours (P1):** move already tested scoped changes from Draft to
   Ready only when their actual relevant source defects are repaired; focus
   #2630 and stacked parent chains. CI optimization itself is a normal PR
   requiring actionlint, Sweep Guard, trusted release-ready, reviews.
3. **Next 3–7 days:** run one cache pilot, one remaining high-fan-out path-scope
   pilot, and the protected Auto-merge owner review independently. Avoid
   adding new unmeasured background workflows or parallel merger agents.

### Seven-day measurement, stop-loss and expected combined outcome

Every daily GH ledger entry records: UTC time, production HEAD, open PR
count by Draft/Ready/stacked, new PRs, newly merged PRs, exact-head
`ready->green`, `green->merge`, `merge->READY alias`,
completed/cancelled/queued workflow runs, *started* cancelled job-minutes,
distinct failed signature count and CI job minutes by workflow. Compute
median and P90, not only averages. Reconcile owner-reported commits against
GitHub actual commit and merged_at.

**Conservative planning envelope for further NOT-YET-SHIPPED work** (after
deduplicating overlapping rows and excluding already-merged #2627/#2645):
**120–360 aggregate PR-wait minutes/day (2–6 PR-hours)** and
**240–720 CI-job minutes/day (4–12 CI-job-hours)** under comparable daily
change volume. These are hypotheses, not measured savings or additive
predictions; after seven comparable days replace them with observed values
and confidence bounds. A single PR cannot save more wall time than its
critical path.

**Immediate rollback:** any Ready PR skips an applicable test, one
auth/RLS/consent/payment/clinical privacy regression escapes, an
exact-head specialist result is stale or absent but treated green,
production push checks disappear, or `release-ready` accepts a cancelled/
skipped/error/empty-job result. Restore the broader workflow in a
reviewed PR and re-verify release behavior. **Merge != live**: require
Vercel READY exact deployment SHA, correct alias and real smoke/E2E proof.
