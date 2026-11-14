# Holistic House CI / PR / LIVE release policy

This is the authoritative current policy for CI and production delivery. GitHub ruleset 26269892 is the authoritative configuration; verify its current readback before delivery and do not modify it as part of routine releases.

## Immediate PR and GitHub CI Fast Lane (owner decision, 3 November 2026)

This is the default, event-driven path and overrides older text below that suggests Triage, Watchdog, scheduled sweeps, priority labels or Repair are mandatory before a routine PR can start CI or merge.

1. **First meaningful source change → Ready PR immediately.** For an authorized implementation task, create a task branch from the current protected production base, apply and locally validate the smallest coherent actual fix, publish that source and open a non-Draft PR promptly. Do **not** wait for an hourly Chat sweep, Direction Watcher, Triage classification, Watchdog scan, Repair claim, priority rank or other queue. Do not open empty/no-op PRs or fabricate a CI wake with a dummy commit; unimplemented or unsafe work remains Draft.
2. **Native GitHub checks start on `pull_request.opened`.** The existing `HH PR core release gate` launches a genuine PR-scoped Core run on the first source HEAD without prior Triage. GitHub's event-driven `HH native auto-merge` arms protected squash merge after successful exact-HEAD Core, BASE-trusted applicable Specialist, `hh-merge-check` and normal branch/review protections. A Watchdog run, Triage label, receipt, task claim or scheduled :10/:30 automation is **not** a required gate for a healthy PR. Never treat `workflow_dispatch` as substitute PR proof.
3. **Exception path only.** On independently verified RED, missing real Core registration, merge conflict or stale/outdated check, route that single PR:HEAD to the corresponding CI, source-Repair or conflict owner with the first failing run/job and current SHA. No global queue and no speculative rerun for passing, queued or running jobs. One owner, one meaningful repair batch and one guarded exact-HEAD verification; retain all real security/privacy/consent/payment and browser/WebKit gates.
4. **Measure the real first delay.** Keep distinct `request_received → first meaningful source published → PR.created_at → first actual pull_request Core run.created_at → first Core job.started_at` where trustworthy timestamps exist. Source editing and subsequent HEAD/CI cycles belong to separate metrics; comparing original Triage time with the *last* HEAD's CI queue is not an initial delay. Missing evidence must remain unknown, not zero. For a selected 1/6/12/24/48-hour cohort count all PRs **created in that period**, and show the measured subset next to every average/median/P90.
5. **Zero added spend.** Reuse existing GitHub Actions, caching and native auto-merge. No new paid runner, parallel CI blast, external backstop, service or frequency increase. A production-only CI/documentation change must not demand a new functional site release; verify Vercel production SHA/alias separately from the protected GitHub merge.

## Metadata-only edits: stop duplicate Core waves (owner decision, 13 November 2026)

- The existing production Core release workflow does **not** subscribe to `pull_request.edited`. Changing a PR title/body without changing its source HEAD must not launch a fresh Core/Specialist wave. PR comments are the normal progress channel.
- A real `synchronize` (new source HEAD), `opened`, `reopened` or `ready_for_review` event still launches the existing protected exact-HEAD Core and applicable Specialist validation. Converting to Draft remains fail-closed.
- Genuine missing-Core recovery is preserved by the trusted control-plane `scripts/ci-pr-core-metadata-wake.cjs`: after a signed, leased, exact-head reservation, the owner PAT uses a verified Draft → Ready transition. PR body edits are **not** its current wake mechanism. The worker does not fabricate statuses or source commits.
- When changing a Ready PR's target base, an `edited` event alone no longer starts Core. Require a genuine Ready transition or source synchronization, or use the existing verified missing-CI recovery if applicable, before attempting protected merge. Missing, failed, stale or skipped checks still block.
- No new job, status, workflow, polling, expensive build, Vercel preview or branch-protection exemption is introduced. `hh-merge-check` still requires real Core and Specialist from the current source HEAD, with sensitive base freshness and external reviews/leases intact.

## Safe protected-base advances (13 November 2026)

The old `BASE_ADVANCED: PRODUCTION_BASE_CHANGED` signal is not a source regression by itself. Preserve the current immutable exact-HEAD Core, Specialist, Guard, review and conflict gate. When a protected production commit advances during sensitive Specialist execution, successful already-running checks may be reused only with complete trusted ancestry/commit/file evidence, a live mergeable PR, and a disjoint public raster-only production delta (PNG, JPEG, WebP, AVIF or GIF under `public/images`, `public/photos`, or `public/assets`). SVG, executable application code, CSS, CI/policy, security, privacy, billing, dependencies, renames/deletions, incomplete results and unknown mergeability do not qualify. The control-plane auto-merge verifier must apply the same compatibility boundary; the policy does not waive a required check or create a new workflow/CI wave. This is narrower than treating lack of a Git conflict as complete logical compatibility.

## Production and merge gates

**Verified readback, 2 November 2026:** Classic Branch Protection and active ruleset #26269892 both require **only `hh-merge-check`** from GitHub Actions App 15368. The legacy `release-ready` and `hh-core-verified` wrappers are retired **after** that independently verified migration. This is the single required status, but it still fails closed unless real Core and BASE-trusted Specialist succeed for the exact PR HEAD. Deletion, non-fast-forward and review-thread protections remain enforced. Never remove `hh-specialist` or skip auth, payment, privacy, consent, RLS or applicable browser tests.

- Production branch: `codex/public-book-library`. `hh-merge-check` is the single required status, backed by independently completed `scope`, real `code` (unless BASE-certified ASSETS/TEXT/docs-only), and `hh-specialist`. Required Core and security/consent/payment/browser checks remain enforced by exact-head specialist routing. Missing/pending/red or stale results are not success. Both protection sources have loose base-status synchronization, but sensitive and CI-policy changes still need BASE freshness from the trusted classifier. Re-read hosted and classic controls before any future change; never bypass them.
- Both the real Core and BASE-trusted Specialist must be **SUCCESS on the exact PR HEAD** before `hh-merge-check` can authorize release. Applicable specialist CI workflows must execute and succeed where their BASE-owned scope applies; a skipped, missing, cancelled or failing security/consent/payment/browser job never constitutes success.
- Conditional rule: when strict required checks are enabled, a production advance requires updating the PR branch and revalidating the exact HEAD. Today's readback shows loose status freshness in both protection controls; critical/sensitive/CI-policy paths still demand a current production base via the trusted specialist gate.
- **Bounded one-wave exception (4 November 2026):** A newer protected production BASE does not automatically invalidate the same exact-HEAD Core/Specialist evidence when a *complete ancestor-proven GitHub Compare* shows only disjoint allowlisted CI telemetry/test files or a provably exact one-line deletion of the retired optional-owner migration trigger. The trusted Specialist verifies original PR HEAD, immutable checked merge, relevant domain jobs, source/BASE ancestry, every changed path, 100-file pagination bound and absence of overlap both before and after aggregation. Core/Guard/actionlint/Specialist YAML edits, runtime, dependencies, auth, privacy, payment, consent, RLS, renamed/deleted/unknown files or incomplete/dirty comparisons still block. No new workflow, scheduled job, runner, paid service, no synthetic green, and no CI retry wave for this proven harmless target advance.
- FAST presentation-only changes are limited to BASE-verified public images and static content without auth, consent, payment, privacy, RLS or provider code. Such routes do not waive required security or applicable browser/specialist validation.
- The PR must be Ready, mergeable, and all review discussions resolved. Human approvals: 0 required. CODEOWNERS approval and independent mandatory AI Review are not required. Use native GitHub Auto-merge with the allowed squash method after the required checks succeed. Force-push and deletion of the protected branch are prohibited.
- Preserve applicable browser, authentication, privacy, RLS, consent and payment checks and actual provider/E2E requirements. Draft-skipped tests are not passing evidence; Ready transitions must run applicable tests. Workflow migrations must preserve coverage and follow BASE-trusted successor and exact-HEAD evidence; never delete or weaken security or browser tests to pass CI.

## Ownership and efficient repair

- One responsible agent per PR. Acquire and re-read a GitHub comment lease before branch changes; respect an active foreign lease, heartbeat and release at handoff. Technical commands and fingerprint semantics are in [PR Sweep Guard](PR_SWEEP_GUARD_20261029.md).
- Inspect exact-head logs and shared evidence. Fix one confirmed root cause with one coherent correction; do not repeatedly rerun unchanged failures or push empty commits. Batch related commits, run focused checks locally before a meaningful push, and allow applicable current checks to finish. Minimize duplicate checks without reducing coverage.
- **One repair episode = one meaningful push per PR.** Accumulate related fixes within the existing single-writer PR lease, run local targeted tests and inspect the full diff, then publish one atomic commit/ref update. No no-op commits, repeated micro-pushes, needless branch updates or parallel repair writers. A newly proven current-HEAD failure or critical security fix may start the next episode without delaying required security checks.
- **Event-driven stale HEAD cancellation.** First-attempt PR checks can displace older first attempts; old manual reruns are isolated by immutable run ID and cannot evict current PR checks. Protected production owns the pull_request_target synchronize handler. Only ancestor-proven superseded queued or running PR checks can be cancelled after live PR/run rereads. No current HEAD, rewritten/unproven history, unrelated/fork PR, production push or merge_group is cancelled. Keep all applicable Core/Specialist release checks green before protected merge. The privileged handler reuses the **isolated `prune-head` job** in existing trusted `hh-native-auto-merge.yml`; its AutoMerge `enable` job is explicitly skipped on synchronize until Core completes. The separate PR policy in `hh-ci-stale-run-prune.yml` stays two-job to satisfy the BASE-owned specialist. This preserves the 95-workflow budget. CI-only prune script/test changes still undergo the real required Core source-policy tests while skipping unrelated TypeScript/Next builds.

## LIVE acceptance

After merge, record GitHub merge SHA and verify the correct Vercel project has a READY production deployment serving the canonical public alias. The independently validated serving deployment SHA must equal or descend from the merged PR commit; newer GitHub HEADs can legitimately be ahead of the served release. Open the public domain and perform the relevant LIVE smoke; report CI, merge, deployment and real user/provider E2E evidence separately. A merge, READY status or HTTP response alone does not establish the intended outcome.

## Four-level Core route (base-trusted rollout)

Core's `classify-change` job computes the changed file set from the exact tested
PR merge checkout (HEAD^1 BASE, HEAD^2 PR HEAD). Route execution uses the
`scripts/ci-quick-route.mjs` script from that immutable BASE, **never** the
candidate's copy. A missing or incompatible trusted router defaults to CORE.

- **ASSETS:** only added/modified, non-sensitive `public/**` PNG/JPEG/WebP/GIF/AVIF/ICO files accepted by the BASE risk classifier. The trusted router verifies every Git blob SHA, file mode, binary container, image dimensions, and relevant structural checks. Core npm install, lint and Next build are skipped. Invalid or corrupt assets FAIL rather than being counted as clean.
- **TEXT:** only modified, allowlisted public `app/[locale]/**` JSX/TSX pages, with no other changes, **after** PR #2777's AST-based `classifyStaticUiText` and the pinned parser are deployed on BASE. The proof compares complete BASE/HEAD sources and may only accept static public wording; unavailable parser, unexpected source or missing proven classifier falls back to CORE. CSS, new pages, mixed files and executable changes do not use this Core bypass.
- **CORE:** normal application code, changed CSS, unknown files, and unproven presentations. One Core install/lint/build job; applicable specialists remain required by immutable-base and candidate workflow triggers. Specialist-level duplicate builds are separately retired by their named owner PRs.
- **FULL:** any security-critical path (auth, payment, billing, privacy, consent, client/private data, database/migrations, provider APIs, CI policy, dependencies). Always runs the complete Core build, applicable specialist/security/browser suites, and hh-merge-check.

The lightweight route never waives `hh-merge-check`, exact HEAD/base rechecks,
GitHub protection, unresolved discussions or security checks. Specialist
aggregation still runs on all routes using BASE-trusted logic. No reduced
workflow is allowed to treat a missing/pending/failed mandatory security check
as success. Before #2777 merges, safe-looking UI text still follows CORE.

## SAFE public-text and scoped-CSS release routing

The immutable production BASE may classify literal public JSX/TSX text,
noninteractive static content and self-contained local UI toggles through the
pinned TypeScript AST parser. Only verified safe public CSS modules may treat
specific unchanged browser diagnostics as advisory. The parser's own failure,
untrusted source or unknown/mixed/sensitive paths revert to STRICT. Payment,
authentication, privacy, consent and other security coverage remains mandatory.

## Historical temporary queue-unblocking mode — 31 October 2026 (superseded)

While the production PR queue has more than 10 open PRs, `release-ready` requires successful scope classification and Core lint/Next.js build (except existing proven ASSETS/TEXT shortcuts). It no longer waits for unrelated specialist workflows on ordinary public CORE changes. Those specialist workflows still run independently and show failures as advisory; do not report them as passing. The fast routing classifier is loaded from immutable production BASE, never from the candidate PR.

Security, authorization, payments, RLS, client/private data, messaging, credentials, dependencies, workflow/policy changes, unknown paths and protected UI take FULL routing and the existing BASE-trusted specialist aggregate. Draft PRs, failed Core and merge conflicts still block. Deletions also take FULL. The `release-ready` status remains mandatory; do not force-merge or misrepresent checks.

**Live GitHub ruleset readback, 31 October 2026:** ruleset #26269892 requires `release-ready` but has `strict_required_status_checks_policy: true`. The guarded `hh-loose-release-ready-once.yml` will automatically attempt to set only this boolean to false after this CI change merges, using `HH_AUTOMERGE_TOKEN`. Verify the ruleset readback before claiming that change succeeded. If the token lacks administration scope, switch to loose in GitHub's ruleset UI, keeping required `release-ready` and all other protections.

After the queue reaches 10 or fewer open production PRs, reassess the temporary ordinary-CORE advisory exception and restore appropriate specialist blocking. The existing hourly reminder monitors this threshold. A merged PR still needs Vercel LIVE confirmation before it is reported as deployed.

## CI incident classification and shared-root repair (1 November 2026)

- `PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:<reason>` now distinguishes `PR_HEAD_CHANGED`, `PRODUCTION_BASE_CHANGED` (only when freshness is required for sensitive/policy changes), `MERGE_CONFLICT`, `PR_DRAFT`, and target/repository mismatches. A production advance alone must not be called an application test failure.
- `SPECIALIST_MISSING_OR_PENDING` distinguishes `NOT_TRIGGERED` (dispatch/filters), `NOT_STARTED` (runner queue) and `RUNNING_TIMEOUT` (actual execution). `SPECIALIST_FAILED` means check evidence failed and requires exact-HEAD logs; `ZERO_JOB_WORKFLOW` means no test jobs executed. None of these is a passing status.
- Failed aggregator output includes a concise category, next action and **shared symptom keys** such as `failed/.github/workflows/ia-v2.yml`. Symptom keys identify possible cross-PR duplicates, **not proven root causes**. An observer must inspect logs before grouping a fix. Record per shared root (a) affected PR count, (b) confirmed repaired root×PR blocks, and (c) the latest verified evidence.
- The native auto-merge workflow's `pull_request_target` recovery remains restricted to a missing required check on a clean behind PR with a verified ruleset and no active repair lease. A separate `workflow_run` hook may retry only a **first-attempt, exact-HEAD, same-repository, completed interrupted/jobless core workflow** (no completed failing code jobs), at most once per run. A new `release-ready: SUCCESS` is still required; re-runs neither approve nor merge PRs.
- GitHub `workflow_run` listeners require their trusted workflow YAML on the **repository default branch** (`codex/bootstrap-books`), even though the release target is `codex/public-book-library`. Roll the identical reviewed workflow to default through a separate protected delivery after this production PR merges; do not claim the new listener active before confirming default-branch parity.
- Any actual failed code/security/consent/payment check, draft PR, merge conflict, changed HEAD, uncertain job association, repeated interruption, or ambiguous historical run must stay red. Do not auto-retry a deterministic failing test or create an empty commit to cause a recheck.

## Component-owned specialist dispatch (1 November 2026)

The BASE-trusted `lib/ci/specialist-aggregate.mjs` must continue deriving exact-HEAD
specialist requirements from the verified PR merge diff and the immutable
BASE/HEAD workflow manifests. Do not add a second independent classifier.

Specialist `pull_request.paths` and production `push.paths` must track the
module they actually test. A shared catch-all such as `app/api/app/**`, the
Next app API dispatcher, or `components/app/app-workspace.jsx` may not launch
unrelated Course Presets, Practice Visual, Personal Coaching, Site Video,
Public Services, Profile, Cabinet, or Interpretation suites merely because
Messenger changed. Owned course/editor/report/service/API paths remain live;
manual dispatch is retained for full diagnostics. The **exact shared**
Next.js API dispatcher `app/api/app/[...path]/route.js` is a distinct
high-risk cross-domain dependency: its actual modification still dispatches
Course, Cabinet, Practice Visual, Public Services, Site Video, Coaching and
Interpretation owner checks. Direct isolated Messenger API paths do not.
GitHub's escaped literal Next.js router glob is retained. Because Node's
BASE-trusted `path.matchesGlob` differs in its bracket escaping, the router
also uses the supported one-level `app/api/app/*/route.js` glob with ordered
negative globs for direct messages, practitioner-client messages and
notification-channel routes. These exclusions keep Messenger isolated while
changes to the central dispatcher still invoke all relevant specialists.

**Coverage that cannot be removed:** unconditional Core classification/lint
(and TypeScript/Next build for application changes; CI-policy-only changes retain
Core/actionlint and workflow-ownership contract tests),
security and authentication (IA/App), payment/billing/RLS/database checks, and
Messenger's consent/privacy plus necessary Chromium/WebKit browser journeys.
A migration, dependency or unknown sensitive shared change still requires the
protected broad suites. The existing BASE-vs-HEAD manifest union prevents a
candidate PR from deleting a required check by narrowing its own trigger.

`tests/ci-specialist-aggregate.test.mjs` now exercises Messenger-only and
sensitive changed-file scenarios through the real `expectedWorkflows` API.
Retiring a whole YAML workflow still requires a separately approved,
BASE-pinned replacement; this routing change deletes none of the protected
workflow definitions. Review workflow runtime and Actions run counts after
merge before authorizing any second-phase deletion.

## Source Preflight (1 November 2026)

Before a batched code push, install dependencies and run `node scripts/ci-source-preflight.mjs --base origin/codex/public-book-library --full-types` locally. It checks changed `.mjs`/`.cjs` with native Node syntax verification and changed `.js`/`.jsx` with a syntax-only TypeScript compiler pass (including React JSX in `.js` and invalid TS-only grammar in JS). It then runs `next typegen` followed by `tsc --noEmit --incremental false --pretty false`, failing closed on actual source errors. JavaScript parsing does not run a second full typecheck or require additional packages. Source checks do not replace production build, specialist E2E, security or consent checks. In Core CI the same check runs before the expensive Next production build; a CI-policy-only diff runs syntax checks but not unrelated product typechecking. The report (`hh.source-preflight.v1`) uses stable root fingerprints across changed line numbers; duplicate workflow failures must be counted once by root and separately from release-ready base churn, browser timeouts and CI infrastructure problems. Only failed preflight reports are uploaded as a short-lived artifact; no external service or token is required.


## Historical status migration — completed 2 November 2026 (archived)

The migration from legacy required contexts to the unified merge gate is complete. This section is retained only as historical context. Do not rerun the one-time migrator, restore legacy aliases, or repeat the branch-protection transition.

Effective configuration, verified 2 November 2026: classic Branch Protection and active hosted ruleset #26269892 require exactly one status: `hh-merge-check`, from GitHub Actions App 15368. The retired `release-ready`, `hh-core-verified`, and `hh-specialists-verified` wrappers are not required statuses.

The migration preserved deletion, non-fast-forward and review-thread protections. Any future change to required contexts needs a new owner-approved change, a tested replacement, and readback of both classic and hosted protection. Never use the archived migration workflow as a routine release step.

## Vercel CI-only build guard — 1 November 2026

Production `vercel.json` runs `node scripts/vercel-ignore-build.mjs` before the costly Next build. Vercel's `VERCEL_GIT_PREVIOUS_SHA` is the last **successful** deployment SHA on the branch, not necessarily the previous commit. Compare exactly that SHA to `VERCEL_GIT_COMMIT_SHA`: if site changes have not yet been deployed, they must still trigger a production build, even when the latest PR is CI-only.

The local `git diff` path is optional because Vercel uses a shallow checkout and `.vercelignore` excludes Git metadata. The public GitHub Compare REST response contains `base_commit` and a `commits` array, **not** `head_commit`. The hardened fallback requests up to 100 commits, verifies `base_commit.sha`, `status=ahead`, `behind_by=0`, complete commit count, and `commits.at(-1).sha` against the exact target SHA. It rejects ambiguous renames, 300+ files, excessive/paginated commit ranges, unknown file categories, and all API/metadata errors.

Only verified non-runtime CI files, the dedicated CI policy document, specified documentation and README changes may return exit 0 (Vercel **IGNORED/CANCELED**, not a LIVE release). Changes to site code/assets/config, manifests, migrations or the guard implementation return exit 1 and build normally. An ignored deployment does **not** promote a new commit to the production alias; the previously READY deployment remains live. GitHub's required `hh-merge-check` and the underlying Core/Specialist evidence are separate layers and remain mandatory for protected merge. Logs disclose only comparison-source, SHA validity (not SHA values), file count and decision. Vercel still counts ignored jobs against deployment/slot quotas; it saves the heavy installation/build portion, not the initial scheduling event.


## Unified single merge status — effective 2 November 2026

**Effective production policy:** the only required GitHub status is `hh-merge-check` in both classic Branch Protection and hosted ruleset #26269892. The earlier staged-transition procedure is superseded and is not an outstanding task.

The gate must fail closed unless the current workflow's real Core job and the BASE-trusted applicable Specialist validator succeed for the exact PR HEAD. Draft PRs, failed or skipped required work, stale HEAD evidence, merge conflicts and unresolved required review threads remain blocking.

- Core work is executed once by `core-lint-types-build` (job key `scope`); BASE-trusted impact routing determines which independent Specialist workflows apply.
- `hh-specialist` validates the exact HEAD against immutable tested-BASE policy.
- `hh-merge-check` is the single required status and verifies successful Core plus Specialist results from that workflow.
- `hh-eslint-repair` remains optional and cannot authorize a merge.
- Do not restore or require legacy `release-ready`, `hh-core-verified`, or `hh-specialists-verified` aliases. Do not remove independent auth, privacy, consent, RLS, payment, database, Chromium or WebKit acceptance where applicable.

For any future protection change, obtain owner approval, validate a replacement on both PASS and FAIL cases, then read back classic Branch Protection and hosted ruleset before declaring completion. No force merge, synthetic green status, skipped security gate or protection bypass is permitted.

## Superseded Core cancellation

The existing production-push cleanup first requests normal cancellation for a proven stale PR run. After one bounded batch wait, it may force-cancel only the known Core workflow when the run remains queued, the complete job list contains only known Core jobs and none is running, the run workflow is byte-identical to trusted production BASE, and fresh run/PR/ancestry readbacks still prove that the run is stale. Unknown jobs, incomplete evidence, current heads and running workflows remain untouched. Report force requests separately from confirmed cancellations.

## CI latency v2 — evidence-first specification (5 November 2026)

**Target:** Reduce avoidable time between PR source publication, first required Core check, verified source repair, protected merge and functional production LIVE. Scope is `andylitvinov-design/books`: GitHub production `codex/public-book-library`, control branch `codex/bootstrap-books`. No new runner, cron, workflow, chargeable Vercel deployment, model, provider, retry flood or permission. Keep all exact-HEAD Core/Specialist/auth/security/payment/WebKit checks, source leases and real LIVE acceptance.

**P0 · First actual Core CI:** The existing Ready PR `pull_request.opened` starts Core directly. No waiting for Triage/Watchdog/hourly agent for healthy PRs. Capture independent timestamps of PR creation/Ready, first Core workflow creation, Core job runner start and completion; distinguish unknown from zero. The historical 9.4-minute figure on the dashboard is not proof of today's delay until the same cohort and exact first (not last) Core SHA are verified.

**P0 · Core work:** For a representative recent production PR, `npm ci` took roughly 9–11 seconds; changing package installation has low expected impact. Full Core took approximately 4–4.5 minutes, with `npm run build` roughly 3 minutes, including immutable prebuild tests, Next compilation, full TypeScript and static page generation. Existing source preflight is required before expensive production build, including the explicit `--full-types` path for production PRs. Preserve both until a separately demonstrated equivalence test can justify an optimization. Never turn on `ignoreBuildErrors`, remove a security suite, reuse an unverified compiler artifact or treat a successful preview as production testing. Potential later experiments include benchmarked TypeScript incremental caching and build output reuse, subject to same-HEAD full-build verification, fail-closed cache-miss and cost review.

**P0 · Between waves:** Report separately (a) same-HEAD repeated Core workflow, (b) new-HEAD Core workflow, (c) previous terminal Core → next Core calendar gap, (d) Core run creation → actual runner, (e) completed Core job work. Use independently verified GitHub run/job timestamps and PR linkage; overlapping runs and incomplete historical pages must be unknown, not zero. A GitHub `edited` or `committed` event between waves is a chronology hint, not proven cause. Do not disable `pull_request.edited`: existing authorized missing-CI wake depends on it. Freeze source HEAD under `GLOBAL_PR_ONE_PUBLISH_V1`; allow one meaningful repaired commit only after verified exact-HEAD RED and lease.

**P1 · Repair and routing:** Reuse the current event-driven failure handler, authenticated Watchdog and production stale-run cleanup. `PREPARED_NO_SOURCE` from legacy Repair is diagnostic evidence, not an implemented correction or permission to merge. Do not add another scheduler or replace an active Core wave. Reconcile outdated PR bases and semantic conflicts with a verified writer separately; never force-push, treat arbitrary red checks as advisory, or claim GREEN without required checks.

**P1 · Measurement and release:** Reuse the existing production-push `scripts/ci-pr-loss-report.mjs` reporter and bounded GitHub reads; no new workflow. Record observed population, N and measured n, mean/p50/p95 over matched 24-hour and 14-day PR-created cohorts. Its default six-newest-PR report is a *sample*, not a whole-repository census. Target one first-pass Core wave for clean PRs and near-zero redundant same-HEAD waves, conditional on unchanged checks and security outcomes. After protected merge, independently confirm Vercel deployed SHA/alias and relevant functional smoke. A CI-only change with ignored Vercel build has no new site-runtime functionality to smoke.

**P1 · Change-aware duplicate typecheck (5 November 2026):** After #3599 fixed CI-only dependency installation and verified the production build remained mandatory, the next isolated Core speed improvement makes *early* Source Preflight TypeScript conditional on real type-affecting paths. `scripts/ci-source-preflight.mjs` already enforces `typechecked=fullTypes||impactsTypes(paths)` and syntax validation; JS/JSX/TS/TSX, `tsconfig` and dependency manifests continue to trigger early `next typegen` + `tsc --noEmit`. For CSS-only or static data-only **PR** changes, the early duplicate scan is skipped, while the full `npm run build` independently checks the entire TypeScript project and still generates production output. For manually dispatched/non-PR checks and the `DOCK` route (which skips Next build), explicit `--full-types` is retained. Exact mandatory Core, BASE Specialist, security/auth/payment/WebKit and `hh-merge-check` are unchanged. The expected savings are bounded to previously measured ~30 seconds of early preflight per qualifying no-type-impact PR; measure actual post-merge runtime before reporting improvement.

**P1 · Root-cause fix for false first-Core delay (5 November 2026):** PR #3623 was opened 19:02:21 UTC; GitHub created its first actual Core CI at 19:02:26 UTC. However, later edits to the same PR caused GitHub's old workflow-run PR association to point at the latest HEAD. The previous reporter dropped both older original SHAs and incorrectly reported the 19:49:06 UTC second Core as the first (artificial +46m40s). Restore old `run.head_sha` only when the same PR number, base ref, head ref, head repository and PR lifetime match and an **independent complete timeline** lists that exact SHA in a `committed` event. After merging, preserve the existing zero-linked-run proof with the same safeguards. No relinking on missing/truncated timeline, wrong PR, external repo, wrong branch or out-of-window run. `analyzePrLoss`, lifecycle and Core wave-gaps must use this identical proof; report `historical_core_runs_relinked` explicitly. This corrects measurement and repair prioritization; it does not claim to shorten any real runner or Core execution. Use the existing bounded production-push reporter; no added CI, cron, provider, polling, subscription or bypassed merge/security checks.
