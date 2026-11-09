# Agent Commander — linked CI / Repair report sync V1

Date: 2026-11-09
Scope: existing owner-authenticated private task chats and the existing signed GitHub report feeds.

## Behaviour
- When an owner opens a chat with linked PR numbers, Commander requests the existing trusted report feed (/api/pm-agent-chat?action=reports).
- It keeps only reports signed by the already allowlisted GitHub Actions / ChatGPT connector sources and whose text or canonical pull URL explicitly references one of that chat's PR numbers.
- The newest six matching reports are shown in the existing CI / Repair panel.
- Reports are attached to the selected private chat using the existing owner-authenticated Supabase store action. Event IDs are deterministic per chat and report, so repeat refreshes are idempotent.
- The active chat refreshes every two minutes only while the page is visible. Closing the chat clears the timer.
- GitHub Repair Gateway and Worker receipts from issue #3890 can now be attached through the same strict repository + issue-comment provenance check. No arbitrary URL or repository is accepted.

## Evidence and execution boundaries
- A trusted GitHub comment establishes the report's provenance, not that its claims prove a source commit, exact-HEAD CI, merge or LIVE.
- The UI preserves the REPORT_ONLY_NOT_COMMIT proof level and shows the source URL.
- Actual CI failure -> Repair Worker dispatch remains owned by the existing signed GitHub workflow_run + exact-HEAD/lease guarded worker. This change does not launch a second repair worker or bypass its lease.
- No new scheduler, runner, API key, paid model, token, workflow or database migration is added.
- Custom Cron automations remain blocked without an approved AI execution adapter. Agent-role selection remains metadata; it is not represented as execution.

## Refresh cadence
Initial fetch on chat open; refresh every 120 seconds while the active chat page is visible; stop when the chat is closed. GitHub report API retains its existing two-minute read cache.
