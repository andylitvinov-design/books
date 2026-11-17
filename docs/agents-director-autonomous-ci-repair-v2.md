# Agents Director · Autonomous CI Repair v2 — acceptance & implementation
Date: 2026-11-17. Scope: existing GitHub `codex/bootstrap-books` control plane; no new runner, paid model or Vercel deployment.

## Root causes established from real CI
- #4856, #4750, #4866: green source Core + red embedded `hh-merge-check` `BASE_ADVANCED`; not a source-writing event.
- #4835: failed `.github/workflows/hh-public-services-production.yml` inside the modern gate; diagnose Specialist without a blind code-worker dispatch.
- Watchdog did not consume causal gate logs and classified the modern three-job Core as unverified; UI counted UNKNOWN and owner_review as successfully routed.

## This PR: priority-0 executable slice
- Normalize modern red-gate root separately from red source Core.
- Reuse existing *authenticated, bounded* GitHub job-log parser; only allow typed BASE_ADVANCED or named Specialist failure evidence, never raw logs or candidate PR text.
- Keep code-repair safety gates and protected base reconciliation; no signed Specialist/BASE proof means CI routing triage, not source writes.
- Make public dashboard distinguish UNKNOWN and owner_review from successful classification and actual AI Worker choice.
- Add regression tests for actual #4856/#4750/#4866/#4835 diagnostic signatures, modern three-job topology and public funnel semantics.

## Remaining programme (tracked as explicit release acceptance, not claimed done here)
P0-B: reconcile past terminal handoffs and proven no-claim receipts, safely requeue eligible exact-HEAD work without bypassing owner leases; verify dispatch → CLAIMED → model called → diff → published SHA. Fix specialist-task handoff only with independently established source defect and execution authorization.
P1-C: expand signed monitoring coverage without GitHub API overload, show per-PR next check and blocker, derive stage latencies from exact events, improve UI of blocked queue.
Acceptance: new source SHA, mandatory CI, protected Merge and LIVE served SHA must be individually proven; no claims from a diagnostic-only task. Preserve GitHub quota and Vercel baseline cost guard.
