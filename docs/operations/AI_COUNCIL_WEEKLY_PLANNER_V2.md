# AI Council 2.1 · Optional weekly, owner-controlled Council 4+1 proposals

## Reuse, not another independent agent

The existing Holistic House Council `runOwnerCouncilFive` remains authoritative for **strict-free** public strategy analysis. The single existing hourly :17 Vercel Cron conditionally invokes this unit only on Monday 07:17 UTC; there is no extra cron, persistent worker, new server, paid model or browser automation. `HH_AUTOMATION_COUNCIL_ENABLED` and owner-enabled `council-video-review-weekly` must BOTH be `true`. Default: disabled.

The executor explicitly overrides `HH_COUNCIL_ARGON_GATEWAY_ENABLED='false'`, so even account-level optional credit-gateway configuration cannot activate paid Argon synthesis on this unattended route. Each actual model/price check inside the existing Council remains fail-closed, under exact-model and zero-cost policy.

Only aggregate public Video Studio gap identifiers and counts plus previous proposal outcome states enter the Council question; no personal account, test result, health record, session, CRM, author/private media or secrets are sent. If two independent model responses or a verified free chair cannot be obtained, the run records an error, not an imaginary recommendation.

## Review boundary

The sole artifact is an append-only, private `app_private.ai_automation_proposals_v2` row, with immutable evidence of the source run, concise action/checks and `ownerApprovalRequired=true`. Creating a proposal does not authorize downloading, changing licensing, modifying Cron, claiming a ready MP4, changing any API keys, or publishing to Video Studio.

The owner reads the proposal under existing admin authorization. Accepting means `accepted_for_manual_planning` **only**; rejecting means `rejected`. Neither action triggers an executor. Requests carry unique operation IDs, same-origin checks, owner auth, rate limiting and a private immutable action record. FORCE RLS, limited column UPDATE grant and deny-public grants protect the DB.

## Release proof

1. Merge PR after actual Core, Specialist, hh-merge-check and applicable browser/security tests on current HEAD.
2. Apply additive private SQL migration, read back RLS and protected role grants, keep all tasks disabled.
3. Verify production Vercel SHA and owner UI/guest denial, then separately confirm actual free account/model quota before enabling the feature.
4. Check Monday 07:17 UTC with at most one idempotent run, genuine 4+1 result or explicit unavailable error, and a pending proposal. Approve/reject from owner page; verify zero impact on original task configuration and Video Vault.

This phase deliberately does NOT provision Hermes/OpenClaw servers, download/approve external footage or send new Telegram messages. Those require separate source rights/runtime approvals. The L0 Scout continues independently every hour without any Council or classifier API use.
