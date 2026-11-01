# Holistic House CI / PR / LIVE release policy

This is the authoritative current policy for CI and production delivery. GitHub ruleset 26269892 is the authoritative configuration; verify its current readback before delivery and do not modify it as part of routine releases.

## Production and merge gates

- Production branch: `codex/public-book-library`. Status migration is staged: `release-ready` remains mandatory wherever the live GitHub protections still require it. The replacement checks are `hh-core-verified` (Core) and `hh-specialist` (BASE-trusted applicable specialists), both on the exact proposed PR HEAD. Both must be SUCCESS on the exact PR HEAD before merge. They become the ONLY required statuses after the protected ruleset and classic branch protection have both been updated and independently read back. Never remove the legacy requirement before this readback. Applicable specialist CI workflows must execute and succeed on that HEAD for FULL/STRICT risk; missing, pending, cancelled, skipped, failed, zero-job or stale results are not success. FAST presentation-only changes include only explicitly allowed CSS and public raster images, excluding sensitive paths, and take the short path only when no specialist is applicable. Mixed, unknown, security, payment and policy changes are STRICT. GitHub uses loose required-status checks: a production advance alone does not require updating the PR branch; conflicts and required checks still block merge. Never bypass protection.
- The PR must be Ready, mergeable, and all review discussions resolved. Human approvals: 0 required. CODEOWNERS approval and independent mandatory AI Review are not required. Use native GitHub Auto-merge with the allowed squash method after the required checks succeed. Force-push and deletion of the protected branch are prohibited.
- Preserve applicable browser, authentication, privacy, RLS, consent and payment checks and actual provider/E2E requirements. Draft-skipped tests are not passing evidence; Ready transitions must run applicable tests. Workflow migrations must preserve coverage and follow BASE-trusted successor and exact-HEAD evidence; never delete or weaken security or browser tests to pass CI.

## Ownership and efficient repair

- One responsible agent per PR. Acquire and re-read a GitHub comment lease before branch changes; respect an active foreign lease, heartbeat and release at handoff. Technical commands and fingerprint semantics are in [PR Sweep Guard](PR_SWEEP_GUARD_20261029.md).
- Inspect exact-head logs and shared evidence. Fix one confirmed root cause with one coherent correction; do not repeatedly rerun unchanged failures or push empty commits. Batch related commits, run focused checks locally before a meaningful push, and allow applicable current checks to finish. Minimize duplicate checks without reducing coverage.

## LIVE acceptance

After merge, record GitHub merge SHA and verify the correct Vercel project has a READY production deployment built from that exact SHA and serving the public domain. Open the public domain and perform the relevant LIVE smoke; report CI, merge, deployment and real user/provider E2E evidence separately. A merge, READY status or HTTP response alone does not establish the intended outcome.

## Four-level Core route (base-trusted rollout)

Core's `classify-change` job computes the changed file set from the exact tested
PR merge checkout (HEAD^1 BASE, HEAD^2 PR HEAD). Route execution uses the
`scripts/ci-quick-route.mjs` script from that immutable BASE, **never** the
candidate's copy. A missing or incompatible trusted router defaults to CORE.

- **ASSETS:** only added/modified, non-sensitive `public/**` PNG/JPEG/WebP/GIF/AVIF/ICO files accepted by the BASE risk classifier. The trusted router verifies every Git blob SHA, file mode, binary container, image dimensions, and relevant structural checks. Core npm install, lint and Next build are skipped. Invalid or corrupt assets FAIL rather than being counted as clean.
- **TEXT:** only modified, allowlisted public `app/[locale]/**` JSX/TSX pages, with no other changes, **after** PR #2777's AST-based `classifyStaticUiText` and the pinned parser are deployed on BASE. The proof compares complete BASE/HEAD sources and may only accept static public wording; unavailable parser, unexpected source or missing proven classifier falls back to CORE. CSS, new pages, mixed files and executable changes do not use this Core bypass.
- **CORE:** normal application code, changed CSS, unknown files, and unproven presentations. One Core install/lint/build job; applicable specialists remain required by immutable-base and candidate workflow triggers. Specialist-level duplicate builds are separately retired by their named owner PRs.
- **FULL:** any security-critical path (auth, payment, billing, privacy, consent, client/private data, database/migrations, provider APIs, CI policy, dependencies). Always runs the complete Core build, applicable specialist/security/browser suites, and release-ready.

The lightweight route never waives `release-ready`, exact HEAD/base rechecks,
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

## Temporary queue-unblocking mode — 31 October 2026

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


## Guarded status migration — 1 November 2026

- The real Core job is `hh-core-verified`; the independent real specialist validator is `hh-specialist`. The original `release-ready` job remains a fail-closed compatibility alias until GitHub administration confirms the switch; the prior `hh-specialists-verified` alias remains nonrequired.
- The production-only, one-time workflow `.github/workflows/hh-loose-release-ready-once.yml` requires one real SUCCESS production PR Core run with BOTH new jobs, then reads the hosted ruleset AND classic required checks with an admin-scoped existing `HH_AUTOMERGE_TOKEN`. It aborts before changes on missing evidence, missing permissions, unknown rules or protections.
- First it requires both new checks in hosted ruleset #26269892, preserving deletion, non-fast-forward and review-thread protection. Then it PATCHes only classic required status checks to the same two names. After both readbacks, `release-ready` is no longer required. If the second update fails, the old classic requirement is left in place; never bypass it.
- Loose base synchronization is intentionally retained for throughput, with sensitive/CI-policy changes still BASE-fresh through the trusted specialist classifier. Actionlint and relevant specialist, auth, RLS, privacy, payments and real browser E2E remain binding.
- This document is a protocol, NOT proof that administration has completed: inspect https://github.com/andylitvinov-design/books/rules/26269892 , https://github.com/andylitvinov-design/books/settings/branches and the one-time Actions run before marking the migration LIVE. If admin permission is missing, an owner must update these two GitHub controls or grant scoped Administration:write to an existing authorized automation token.
- Once the new effective protections have been observed on a fresh PR (including an intentional failing specialist case remaining blocked), remove the compatibility aliases in a separate tested PR. Never replace a red check with a synthetic green status.

## Vercel CI-only build guard — 1 November 2026

Production `vercel.json` runs `node scripts/vercel-ignore-build.mjs` before the costly Next build. Vercel's `VERCEL_GIT_PREVIOUS_SHA` is the last **successful** deployment SHA on the branch, not necessarily the previous commit. Compare exactly that SHA to `VERCEL_GIT_COMMIT_SHA`: if site changes have not yet been deployed, they must still trigger a production build, even when the latest PR is CI-only.

The local `git diff` path is optional because Vercel uses a shallow checkout and `.vercelignore` excludes Git metadata. The public GitHub Compare REST response contains `base_commit` and a `commits` array, **not** `head_commit`. The hardened fallback requests up to 100 commits, verifies `base_commit.sha`, `status=ahead`, `behind_by=0`, complete commit count, and `commits.at(-1).sha` against the exact target SHA. It rejects ambiguous renames, 300+ files, excessive/paginated commit ranges, unknown file categories, and all API/metadata errors.

Only verified non-runtime CI files, the dedicated CI policy document, specified documentation and README changes may return exit 0 (Vercel **IGNORED/CANCELED**, not a LIVE release). Changes to site code/assets/config, manifests, migrations or the guard implementation return exit 1 and build normally. An ignored deployment does **not** promote a new commit to the production alias; the previously READY deployment remains live. GitHub release-ready, Core, Specialist and branch protection are entirely independent and remain mandatory. Logs disclose only comparison-source, SHA validity (not SHA values), file count and decision. Vercel still counts ignored jobs against deployment/slot quotas; it saves the heavy installation/build portion, not the initial scheduling event.
