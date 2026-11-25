# Holistic House Agent Studio — PR Workbench Artifacts v1 · 2026-11-07

## Scope
One additive, bounded enhancement to canonical protected /admin/command-center mobile PWA. No second UI, new service, cron, model provider, agent launcher or independent PR writer.

The existing owner-only inspect_delivery action now includes a **read-only source artifact list** (GitHub PR changed-file metadata, never code body, patch, diff or user instruction). One public GH API page is capped at 100 files and 290 KB. If GitHub is unavailable, changed_files is invalid, or the inventory is incomplete, display unknown or partial; never a fabricated complete list.

The mobile task proof panel renders:
- Exact-current-head CI outcome, and GitHub PR merge state.
- Production code ancestry verified from responding Vercel server production commit SHA (not browser-local data).
- Deterministic evidence-based next step: fix failed CI / wait for CI / protected merge review / verify deploy / browser functional acceptance.
- A collapsed list of up to 12 modified-file paths with statuses and +/- counts and an official GitHub PR Files link.
- A disclaimer that code deployed does not prove functional LIVE user journey.

All of this is inspection; it does NOT execute or edit code, approve or merge PR, persist files in customer data, upload audio, change subscription/billing, or mark completed_live. No external Antigravity API or new paid service.

## Security and cost
- Owner session, private DB task lookup, strict repo/PR allowlist, same-origin mutation and existing limits remain.
- GitHub file paths are treated as untrusted display-only text, validated, bounded and rendered through React escaping. No shell or prompt execution.
- At most one extra public GitHub GET per explicit inspection. No scheduled monitoring or paid services.
- Existing provenance and absence-of-evidence semantics remain fail-closed.

## Release checks
Run node --test tests/command-center-release-proof.test.mjs tests/command-center-pr-artifacts.test.mjs tests/command-center-voice-ui.test.mjs, then existing Core/Specialist/Guard, protected merge, Vercel READY SHA/alias and guest denial. Authenticated iPhone browser E2E remains separate.

## Actual autonomous coding still requires connection
A reviewed headless code-agent host (Codex or equivalent) and approved scoped GitHub credentials are still required. Owner laptop currently offline. Next: sandbox worktree runner, bounded permissions/cost, plan/artifact receipts, independent browser QA and verified delivery; then task-specific approved code writes. Never label read-only GitHub worker as a connected coder.
