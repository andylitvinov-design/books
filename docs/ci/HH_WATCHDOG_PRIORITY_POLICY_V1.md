# PR Priority Scheduler — Holistic House

This version prioritizes which PR is examined or claimed; it never waives required checks, changes production protection, overwrites a source branch, performs an unsafe merge, or pays for external APIs.

## Tiers
P0 — broken production experience, blocked iPhone Create, critical CI/Watchdog/AutoMerge and security incidents; manual label hh:priority:p0.
P1 — new video/voice/audio/messaging/hypnocorrection/payment functionality; hh:priority:p1.
P2 — normal product development; hh:priority:p2.
P3 — cosmetic/test-only/documentation/experiments; hh:priority:p3.

Only one priority label can be present: ambiguous multiple owner labels exclude the PR from automatic priority selection until corrected. If no priority label exists, the code infers P0/P1/P2/P3 conservatively from title and security labels.

Score bands: P0 400, P1 300, P2 200, P3 100; age 0–30, known worker-readiness 0–12. Bonuses do not cross levels.

## Rotation
Watchdog uses four fast-ranked slots and twelve rotating slots every ten minutes. Exact Core completion wakes its own PR immediately. Source Repair preserves one manual-conflict slot and ranks actionable source repairs within their own queue; one rotated slot prevents starvation. Legacy CI Worker selects three top-priority PRs and two rotated; it can create at most one genuine CI bootstrap per cycle.

## How to operate
On the GitHub PR use Labels → apply exactly one hh:priority:p0/p1/p2/p3. The priority labels are created idempotently by the trusted default-branch Watchdog workflow when its configuration is merged. Use Draft for PRs that must not progress. No changes to release gates.

Review Actions summary from HH PR 10-minute watchdog: priorityTop shows PR number, tier, score and reason; priorityAmbiguous reports label conflicts. Confirm actual first default-branch scheduled run and targeted PR before claiming the scheduler is live.

## Priority backlog fairness (follow-up)
The highest-impact PR remains anchored. When the top priority tier has more items than the four fast slots, unused fast slots rotate among its other PRs each ten-minute cycle. The independent 12-slot round-robin still covers the complete eligible inventory, so an influx of urgent P0 work cannot indefinitely hide ordinary tasks. A Core completion wake is inspected first, without ejecting the highest-impact PR.

## CI incidents versus historical coverage
A generic `fix(ci)` is not automatically P0. Delivery-control incidents involving Watchdog, AutoMerge, Core CI, protected release or blocked CI slots are P0; other confirmed pipeline failures default to P1; routine regression-coverage updates default to P2. Apply a manual `hh:priority:p0` for a proven production blocker. This avoids old test-only changes monopolizing the urgent queue.
