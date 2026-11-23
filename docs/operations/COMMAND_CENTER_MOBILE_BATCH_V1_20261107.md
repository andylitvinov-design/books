# Command Center mobile batch execution v1 — 2026-11-07

## Delivered
- Owner can check 1–3 tasks at once in existing /admin/command-center Tasks tab.
- Choose **GitHub Reader** (real read-only GitHub PR/Issue metadata audit) or **ChatGPT Work manual handoff**. Disconnected Codex CLI, Hermes and OpenClaw stay disabled.
- The owner-selected GitHub Reader path uses the EXISTING same-origin, owner-authenticated POST /api/admin/command-center, action run_selected_safe, the existing PostgreSQL cc_tasks/cc_runs/cc_evidence, strict UUID and GitHub URL validation, a single owner settings lock, per-day run budget, retry delay and optimistic generation/lease checks. No arbitrary JS or model execution.
- Only ready/retry_wait repo_pr_audit and repo_issue_audit tasks qualify, subject to 2-attempt limit and unmet dependencies. Others return no_eligible_task. Concurrent 10-minute ticks and manual dispatch share the same row claims and cannot mark a task twice.
- At most 3 metadata reads are done in one explicitly user-invoked POST; no new cron, workflow, paid service, secret or persistent table.
- ChatGPT Work selection creates a deterministic copied instruction covering approved repo and protected CI/merge policies. **No background agent was launched**, no status is written, and this is not a commit or LIVE receipt.

## Acceptance
- Focused tests: node --test tests/command-center-batch.test.mjs tests/command-center-core.test.mjs tests/command-center-mobile.test.mjs
- Protected Core, Specialist, hh-merge-check, Vercel READY serving SHA, same-origin guest denial, real owner authenticated iPhone UX.
- 320/390/430 widths, one bottom dock, selection max 3, disabled agent and selection states, loading, actual run receipts, failed GitHub and budget exhausted.
- Production uses existing enabled HH_CC_TICK_ENABLED and owner cc_settings; no billing configuration required.

## Still blocked for Antigravity-class automatic coding
- The only verified unattended executor today is github-public-reader. Existing Project Management Auto Free Repair dispatch is gated by an actual pre-existing failed CI check, a repository-owned eligible PR, trusted label and server-side owner-authorized GitHub Actions write token and feature switch.
- Codex CLI/Hermes/OpenClaw need a real isolated permitted host and credentials. The currently offline owner desktop cannot be counted as a running agent. Do not claim code/commit/merge until independent real receipts exist.
- Manual ChatGPT Work handoff and a read-only GitHub audit are not code-writing AI.
