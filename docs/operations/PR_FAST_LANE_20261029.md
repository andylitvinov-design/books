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
