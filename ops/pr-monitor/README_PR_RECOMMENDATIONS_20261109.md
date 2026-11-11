# PR Monitor — top 5 actionable recommendations (HH_PR_RECOMMENDATIONS_V1)

Date: 9 November 2026

## Placement and interaction

The recommendations block is mounted immediately after the existing PR stage/timing section (#hh2-stages). On the page this puts the five technical actions directly below the PR timing table, after the first operational graph/overview, instead of at the bottom of the long dashboard.

The block is compact and mobile-first. Every recommendation contains priority, evidence confidence, observed signal, existing role owner, one precondition/blocker, technical steps, focused tests, measurable acceptance and an evidence link. Expandable details keep the default screen short.

## Source, refresh and freshness

The block reads the existing same-origin /api/control-tower-stats endpoint, backed by the current public Control Tower issue #3128. It performs one read on page open and a second read only when the owner taps «Обновить». No timer, background polling, new GitHub scan, new provider, CI dispatch, task execution or write credential is added.

Freshness is calculated from the exact bounded Watchdog sample's checked_at timestamp, not from page load time or the containing API response:
- FRESH: up to 15 minutes
- DELAYED: 15–75 minutes
- STALE: over 75 minutes

If data is stale, the warning is prominent and the text requires revalidation of current PR HEAD, lease and CI before any source action. Missing values stay unknown, never zero.

## Current technical recommendation categories

1. Semantic merge-conflict resolution by one verified owner.
2. Exact-HEAD Core CI failure repair with a focused source regression test.
3. Specialist failures versus policy holds, preserving privacy, consent, payment and Guard restrictions.
4. Dispatch acceptance → trusted RUNNER_STARTED → terminal source receipt reconciliation.
5. Freshness and snapshot provenance, preventing stale recommendations from being actioned.

The public Control Tower feed supplies only bounded aggregate counts, not the full affected-PR list, individual HEADs or private journal text. The page explicitly says the sample is bounded, never invents PR numbers and requires current PR/HEAD/lease revalidation before implementation. The :20 automation prompt now emits a versioned five-task block with those details into its existing private Google Doc; this public UI does not expose that private document or claim it is already synchronized. A future secure sanitized handoff can replace these public sample-derived cards when the existing writer publishes one.

## Verification

- node --check ops/pr-monitor/pr-recommendations.js
- node --check ops/pr-monitor/pr-two-screen-boot.js
- node --test ops/pr-monitor/tests/pr-recommendations.test.cjs

No existing chart, PR stage source, CI endpoint, authentication or owner-only Command Center route is changed.
