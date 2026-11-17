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

## Signed evidence coverage and safe backlog behavior · November 17, 2026

The public funnel historically inspected only 8 out of 61 candidate PRs and
incorrectly suggested there were no real workers. GitHub PR #4869 records
confirmed Dispatch, CLAIMED, runner and a verified zero-cost OpenRouter model
response, followed by `SUPERSEDED_NO_SOURCE` because an independent source
owner advanced the HEAD. This is **not** an AI-generated fix or LIVE proof.

Implementations in this release:
- Preserve the original ten signed stages; add model request/response, validated
  patch, exact-new-SHA Core, Merge, and LIVE as distinct optional proof stages.
- Navigate the incomplete Core archive in small eight-incident pages; a
  numbered PR shows previous HEADs so superseded attempts remain inspectable.
- An owner/diagnostic assignment never counts as a started AI Worker.
- Show the exact signed reason for a worker stop and the last recorded next
  action, without guessing a future checkpoint time.
- A signed BASE_ADVANCED cause overrules historic Specialist-root grouping; keep
  true product Specialist failures in their own route.
- No new cron, runner, paid provider or Vercel deployment is introduced.

Outstanding acceptance requires a full source-edit commit → CI → Merge → LIVE
with exact GitHub/Vercel receipts on a real safe PR. The GitHub Actions queue
and existing manual/lease holds are not bypassed. The Dashboard source will not
be considered production-published until the running Vercel artifact is checked.
