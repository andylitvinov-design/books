# Holistic House · PR Automation — ЕДИНЫЙ ДЕЙСТВУЮЩИЙ РЕГЛАМЕНТ

**Contract:** HH_PR_AUTOMATION_CANONICAL_V1 · **adopted:** 2026-11-04 · **status:** CURRENT.
**Scope:** ChatGPT PR Sweep / PR Optimizer roles and the single PR backlog notifier for `andylitvinov-design/books`. This file is the one durable operating instruction for those roles. Historical role prompts live under [archive/PR_AUTOMATIONS_2026-11-04](archive/PR_AUTOMATIONS_2026-11-04/README.md); they are **NOT EXECUTABLE POLICY**.

## 1. Order of authority — never replay an old snapshot as today's instruction

1. Owner's latest express safety, privacy and **zero additional cost** boundaries, plus current GitHub branch protection, current PR HEAD and applicable CI checks. Never override these.
2. This **current** GitHub document, with only the minimal agent-specific job declaration in each ChatGPT automation.
3. Live, SHA-scoped records (GitHub PR, jobs/check-runs, authenticated worker receipts and existing inventories). Cached issue and Google Doc snapshots are hints until verified on the exact revision.
4. Historical docs, old prompts, old incident notes, stale PR status/SHA/time and estimates: **ARCHIVE / NON-AUTHORITATIVE**. A later conflicting legacy clause must not resurrect an obsolete rule.

Do not mistake labels, a completed scheduler, a dispatched job, passing checks on a previous HEAD, Vercel `READY`, a generic HTTP 200, or a merged control-plane PR for a real product fix in production.

## 2. Existing sources only (reuse before re-querying)

| Existing source | Purpose / owner | How to interpret |
| --- | --- | --- |
| [Control Tower #3128](https://github.com/andylitvinov-design/books/issues/3128) + existing Watchdog receipts | Current full-open inventory and bounded deep-inspection snapshot; Watchdog publishes | Snapshot timestamp and coverage mandatory. `queued`, `running`, blocker hints, deep-sample and exact-HEAD active roots are *different* populations. Never add overlapping categories. |
| [Root/incident registry #1419](https://github.com/andylitvinov-design/books/issues/1419) + existing Google Sheet | Source diagnosis and idempotent root×PR ownership; **:10** owns Chat writing | No second writer and no duplicate issue or spreadsheet; use existing authenticated receipts. |
| [Three cohort #3394](https://github.com/andylitvinov-design/books/issues/3394) | Historical matched comparisons | Frozen cohort windows and coverage; never compare unrelated populations or invent unobserved timestamps. |
| [Monitor bridge #2876](https://github.com/andylitvinov-design/books/issues/2876) | Existing 6-window bottleneck and LIVE bridge | Read its existing record before proposing telemetry or new polling. |
| Existing **PR Merge Blockers** Google Doc, `HH_CURRENT_BEGIN..HH_CURRENT_END` and append-only `HH-OBS-...` | Current analysis; **:20** is the only Chat writer | Latest dated snapshot, one observation paragraph per hourly execution, preserve all history and counters. |
| Current GitHub PR HEAD, check-runs, workflow/job timestamps, leases and reviews | Final authority to edit, repair or arm merge | Use *only when* the current snapshot does not settle a narrowly scoped decision. No exhaustive duplicate re-scan. |
| Current production alias/deployment + ancestry + specific functional smoke receipts | **:00** LIVE acceptance | Actual user-flow evidence required. A control-plane merge has no Vercel LIVE obligation. |

The reusable architecture already exists: [.github workflows](../../.github/workflows) (relative reference: repository root `.github/workflows`), [Control Tower V2](../ci/HH_PR_CONTROL_TOWER_V2.md), [PR timestamp coverage](PR_TIMESTAMP_COVERAGE_20261104.md), and [branch contract](BRANCH_DELIVERY_POLICY.md). **No new job, workflow, cron, agent, provider, API polling loop or monitor** is authorized by this document.

## 3. Fixed branch and direction rules

- `codex/bootstrap-books`: trusted default **control plane** (dispatcher, Watchdog, worker and analysis policy). Control-plane merge requires current protected checks and verification of its runtime/automation use, **not** a website deployment.
- `codex/public-book-library`: website **production plane**. Site-visible changes must reach this branch through required GitHub gates, and then be proven LIVE on the actually served Vercel alias. Never merge or push directly to bypass protection.
- `.github/hh-pr-directions.json` is the live direction-level authority: **P1–P5** via `hh:priority:1..5` and `hh:direction:*`. Old manual `hh:priority:p0..p3` and older P0–P3 scoring in `HH_WATCHDOG_PRIORITY_POLICY_V1` are superseded. A real P0 *incident* can still be escalated urgently, but is not a reason to recreate retired labels or waive a gate.
- `Draft`, `hold`, external owner, unknown lease, unreviewed conflicts, exhausted free quota, missing consent and unverified cost are **STOP** conditions. Never change a clean PR HEAD while its required current-head jobs are queued/running merely to "refresh" it.
- Stacked PRs merge into their parent only as an intermediate step; they are not production LIVE until the protected destination's merge and feature acceptance.

## 4. One owner for each lane — no role overlap

| Toronto cadence (already scheduled; unchanged) | Exclusive responsibility | Allowed effects |
| --- | --- | --- |
| **:00 — Production LIVE Acceptance** | New production merges → exact served deployment SHA/ancestry → scoped functional smoke; cost-aware, bounded evidence | Publish PR-scoped LIVE / AWAITING_SMOKE receipt, hand to :10 to reconcile ledger. No source edits, new deployment, new API workload or synthetic success. |
| **:10 — Triage Router** | Existing snapshots, actionable root×PR, owner lease, cost and direction; single writer to existing root registry/Sheet | Classify, route, perform one verified safe Overflow fix only if no other owner is working; do not create duplicate repair/CI waves. |
| **:20 — Optimizer Analysis → Docs** | Hourly comparable stage KPIs, TOP-3 causal bottlenecks, stable action queue; **only** Doc writer | Read receipts, update `HH_CURRENT` once and append **one** keyed observation per run, including "no change" if true. Does not edit source or schedule CI. |
| **:30 — Native Auto-merge** | Recheck current exact HEAD + required checks + reviews + mergeable/stack/lease; arm authorised native auto-merge | No bypass, force, source rewriting or unsafe direct GitHub merge; report ARM separately from MERGED. |
| **:35 — Repair Product** | Product source fixes with verified ownership / `HH_PR_TASK_V1` lease | Reuse an existing PR when overlapping, one validated coherent change, no churn on running green checks. |
| **:40 — Optimizer Fixes → PR** | Consume only `HH_OPT_ACTION` with `state=READY`, `cost=FREE_CONFIRMED`, `owner=OPT_FIXER` | Fresh exact-head check, claim lease, implement safe fix using existing code/tests and create/update max one thematic PR; report IN_PR, not LIVE. If :35/:45 owns it, HANDOFF rather than collide. |
| **:45 — Conflict Repair** | Verified `dirty` / merge-tree conflict and owner lease | Preserve real source semantics; one actual repair on current HEAD; no automatic no-op rebase, branch update storm, or force push. |
| **≤10 PR notifier — existing cadence** | Read existing complete snapshot only; once-per-threshold notification | No new scans, extra CI, or repeated alerts for the same crossing. |

The old `:05 Shared Roots` task was **disabled** on this date; do not restart or silently multiply its responsibilities. Existing GitHub-native dispatcher/Watchdog/Repair/CI jobs remain the *primary* event-driven pipeline; Chat agents are secondary diagnostics/repair, never a competing dispatch engine.

## 5. Measurements, truthfulness and root-cause decisions

For each comparable PR cohort calculate where source events actually exist:

`created → first CI queued → first CI started → first causal failure → repair_started → final mandatory PASS (current HEAD) → protected MERGED → served deployment → HH_FUNCTIONAL_SMOKE_V1`.

Report **n, coverage, mean, p50, p95, sample interval, source URLs, UTC timestamps** for each stage (24h and 14d only where cohort evidence exists). Track independently:
- **Error → Repair:** first confirmed causal error → actual repair start, not triage/dispatch.
- **CI First Pass:** PRs passing their *first complete required-check wave on the same head* / eligible PRs, with both counts.
- **Green → Merge:** final applicable exact-head mandatory PASS → actual `merged_at`; check review and lease.
- **Merge → functional LIVE:** linked merge SHA → actual first observed feature smoke after deployment, with ancestry and alias. Report upper-bound observation intervals honestly.

Use `PENDING` for active jobs, `FAILED` only for terminal causal errors, `CANCELLED` for superseded/terminated jobs, `UNKNOWN` for missing history, `N/A` where a stage is not applicable. Historical HEAD success or failure = `STALE`. Do not treat a 0-size verified sample as "0 minutes". Runner-minutes != workflow wall time; queue delay != execution time. Failed Specialist dependency handling must distinguish pending/running/failed/cancelled without blind retries.

Each `HH_OPT_ACTION` uses a stable root ID, priority, exact current evidence/HEAD, acceptance test and owner, with `READY/IN_PR/VERIFY/HOLD/DONE` state. :20 issues **at most three** next actions, ranked by measured recoverable latency and number of actually affected PRs. Repair workers verify before executing.

## 6. Permanent zero-additional-spend guard

**OWNER POLICY: no additional charges.** No premium runners, paid TTS/video/AI fallbacks, extra identities/tokens, API upgrades, new Vercel preview/deploy builds, new Vercel cron, GitHub Actions scheduled jobs, parallel pollers or duplicate CI. Reuse existing quota-bounded GitHub records and already scheduled jobs; do not "test" a paid-capable path. Current Vercel team uses a pre-existing Pro plan: **zero *additional* billing is NOT verified** merely because a feature is already on the plan. Unknown quotas/overages ⇒ `HOLD_COST_UNVERIFIED`. Document-only changes must not trigger a deliberate Vercel production deployment.

If a real free provider (e.g., TTS) reaches 429/exhausted, **HOLD**: wait for documented free-quota reset or owner-approved safe means; do not retry blindly, switch to a paid key or create more accounts. Prior PR numbers and exact SHAs in historical automation messages are examples, **not current facts**.

## 7. Completion, rollback and change control

- **Created PR** ⇒ `IN_PR`; **applicable PASS** ⇒ `GREEN`; **GitHub merge** ⇒ `MERGED`; **served production ancestry plus user-flow smoke** ⇒ `LIVE_VERIFIED`. Source-only policy merged into control plane ⇒ `CONTROL_MERGED` until a scheduled agent actually reads this version.
- Verify current branch and SHA before every mutation and use a lease/compare-and-swap; do not disable/fake required CI, weaken WebKit/privacy/consent/security/payment protection, or mislabel a draft as ready.
- A change to policy is **one normal protected PR** modifying this file; add a dated archive note if changing semantics. Change role prompts only to point to current contract and their exclusive responsibility, not by stacking 20 new instruction appendices.
- All historical rules in the snapshot archive are retained for traceability; **none** may be executed merely because they appear in the archive. If GitHub access or canonical document read fails, run read-only with explicit `POLICY_UNAVAILABLE`; do not guess the missing control.
- Roll back an unsafe agent-prompt update to its archived source only after reviewing latest owner safety policy; keep existing native CI and merge protection intact. Do not revive stale PR SHAs.

**Acceptance for this simplification:** archive the replaced prompts; one canonical policy reachable from the trusted branch; concise role prompts successfully read it; all existing schedules, writer ownership and real CI protection unchanged; no new workflow/crons/providers/reruns; one successful fresh observation or task readback. A docs-only PR merge is **not** Vercel website LIVE and must not be presented as such.
