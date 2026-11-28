# PR automation trace v1

Each of the ten scheduled automations uses its own stable public label: mycoach-00, mycoach-10, mycoach-20, mycoach-30, mycoach-40, mycoach-50, live-05, triage-15, merge-35, repair-45.

A newly created PR body and each actual source commit message carry two standalone lines:

    HH-Automation: mycoach-20
    HH-Run: mycoach-20-20261128T120000Z

The run ID belongs to the execution, not the PR. Preserve the original PR author, do not rewrite historical commits. No attribution or credit from branch names alone.

When an automation makes a meaningful stage transition or observes a new blocker, append a compact one-line JSON object immediately after a standalone HTML marker `<!-- HH_PR_TRACE_V1 -->` in a permitted PR comment or permitted existing receipt. Required fields: schema (HH_PR_TRACE_V1), automation_id, run_id, pr, event, stage, at (UTC), head_sha, base_sha, outcome. For WAIT/HOLD/FAILED include a specific reason_code and next_action. Include evidence_key when available, and actual commit_sha, merge_sha, served_sha and evidence_url for the respective actions; do not claim a DONE action until independent evidence is available. Evidence URLs should be GitHub PR, commit or Actions run/job URLs for this repo. Observing another actor's work is OBSERVED, never DONE.

Stages: PR, DIAGNOSIS, ASSIGNMENT, REPAIR, HEAD, CI, MERGE, RELEASE, LIVE. Events: PR_CREATED, COMMIT_WRITTEN, ERROR_DETECTED, REPAIR_ASSIGNED, REPAIR_BLOCKED, CI_RESTORED, MERGE_ARMED, MERGED, DEPLOYED, LIVE_VERIFIED, STAGE_BLOCKED, STAGE_OBSERVED.

The Commander route uses only already-read GitHub data, no new API requests, service, workflow, permission or secret. Current blockage requires matching HEAD and base; after merge use matching merge SHA and release/live stage, and suppress obsolete blocker on verified production. Historical receipts remain separate. The reported waiting age is since the recorded event, not a full stage-duration measurement. Partial pagination remains partial. GitHub login and agent-declared label are separate; labels are not cryptographically authenticated identities. Never use attribution to authorize actions, waive checks or claim LIVE. Historical unlabeled work remains UNKNOWN. Keep existing 90-minute batch publishing and 01–07 Toronto freeze. No new CI, manual deployment, paid provider call or extra spend.

This source change is authored in the interactive chat, not credited to an automation. Follow-up: after protected merge and ordinary site publication, verify the owner-authenticated Commander view using a real labeled PR and a stale receipt fixture. Separate PR Monitor deployment/aggregate scoring is not modified by this change.
