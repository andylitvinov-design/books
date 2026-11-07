# Agent Commander — source task to GitHub draft PR (V1)

**Owner request (7 November 2026):** the agent must make a real, auditable source-code change, not only write a prompt or start a monitoring job.

## Existing architecture (reuse, no new VPS or scheduled workflow)

- Standalone Vercel Commander: public monitoring, mobile task drafting and navigation. It is not a privileged coding endpoint.
- Protected Holistic House PM gateway: the only intended owner-authenticated entry for writes; confirm owner session, CSRF and same-origin.
- Supabase: private task state, existing ten-minute read-only GitHub scheduler monitor. A healthy Cron response is not a code change.
- Existing GitHub Watchdog and Repair Worker: preserve their exact-head PR repair, leases, Core/Specialist CI, protected merge and release receipts.

The existing Repair Worker handles **already open, failing PRs**. A new feature request previously lacked a secure path into GitHub source editing. This change adds an owner-only task path inside the **existing** hh-pr-repair-worker.yml (no additional cron, workflow, third-party model or server).

## Implemented route: confirmed task → source edit → draft PR

1. An authenticated owner explicitly approves a single task, one allowlisted source path and the **current expected SHA** of either codex/bootstrap-books (infrastructure) or codex/public-book-library (product).
2. The existing workflow accepts an optional commander_source_task JSON input. Blank input preserves the ordinary PR Repair Worker behavior. Only the repository owner may invoke the new mode on the protected default ref.
3. The unprivileged preparation step reads an exact source blob. Literal mode applies a unique, exact-string replacement **without any AI key**. Free AI mode sends a bounded source/instruction to the **existing** zero-priced OpenRouter :free adapter only when the existing HH_OPENROUTER_FREE_API_KEY is provisioned. It accepts strictly two fields: find and replace.
4. Preparation rejects sensitive paths, multiple/absent matches, unexpected bytes, stale branch HEAD, no-op, oversized source and invalid JS syntax. TS/TSX/JSX semantic validation remains the responsibility of required CI. It does not make a remote source write.
5. A separate authenticated publisher with the existing HH_AUTOMERGE_TOKEN checks the same owner, task identity, artifact hash, original blob, current protected base and deterministic task branch absence **again**. It cannot execute generated code.
6. The publisher creates **one** Git blob, one tree, one commit, one new task branch and a **draft** PR to the correct base. It never directly pushes to production or bypasses branch protection.
7. Existing exact-head checks, review/merge gates and an independently verified served Vercel release are still required. Neither a draft PR nor a Vercel READY response is LIVE.

## Owner task contract

One JSON string in the existing GitHub Actions workflow_dispatch input named commander_source_task:

    {
      "task_id":"commander_20261107_0001",
      "target_base":"codex/bootstrap-books",
      "expected_base_sha":"40-character real Git commit SHA",
      "path":"components/verify-existing.js",
      "title":"Correct verified behavior in existing component",
      "mode":"literal",
      "find":"an exact current substring",
      "replace":"a reviewed replacement substring"
    }

This is an **interface example**, not a ready-to-run production request. Task IDs are deterministic ownership keys; repeat dispatch with the same task ID cannot create another PR. For mode free_ai, replace find/replace with instruction (15–3500 characters) and configure the existing HH_OPENROUTER_FREE_API_KEY as a GitHub Actions secret. Without that secret this mode fails closed with COMMANDER_FREE_AI_KEY_NOT_CONFIGURED. There is no paid fallback.

Never put client data, access tokens, private conversations, credentials or medical details into Actions inputs: workflow metadata is not a private messaging channel.

## States and evidence

| State | Meaning |
| --- | --- |
| OWNER_APPROVED | Owner-authenticated intent and exact target |
| SOURCE_PREPARED | A verified source candidate exists only on the runner |
| BLOCKED_FREE_AI_KEY | Model mode cannot run; no source publication |
| BLOCKED_STALE_BASE | Branch moved; no source publication |
| BLOCKED_SCOPE_OR_SYNTAX | Candidate refused |
| SOURCE_COMMIT_PUBLISHED | GitHub commit SHA and task branch verified |
| DRAFT_PR_CREATED | Exact PR number, base and source commit |
| CI_PENDING / REVIEW_REQUIRED | Existing protected checks/review still required |
| MERGED | Current-head protected merge succeeded |
| LIVE_VERIFIED | Served production alias SHA + functional smoke verified |

Unknown external state is UNKNOWN, never a fabricated success. A publisher error after creating the branch requires inspection of that branch; do not blindly replay the task.

## Unfinished integration / deployment boundary

- The standalone Vercel task form is **not yet wired** to the privileged dispatcher. The safe first operation is a manual authenticated GitHub Actions owner dispatch. The existing protected PM gateway must gain scoped server-only GitHub dispatch credentials before mobile one-click source execution; never expose a PAT from a public website.
- Supabase's existing ten-minute job is still **read-only**, not an authority to mutate GitHub. No unauthenticated pg_net-to-GitHub workflow launch was enabled.
- Free AI only handles one bounded existing source file; it is not arbitrary multi-file coding or general-purpose persistent browser RPA. More complex or sensitive source work remains with reviewed coding agents/Work.
- The independent Commander monitor is a manually deployed Vercel project whose complete source manifest exceeds the GitHub subfolder. A control-plane merge must never trigger a partial deployment.
- Do not call this feature LIVE until the workflow change has merged, a real owner test dispatch creates a draft PR, its CI/review is verified, and any site change is separately deployed and smoke-tested.

## Acceptance tests

- Run node --check on the source module.
- Run node --test tests/ci-pr-commander-source-task.test.cjs (eight focused tests for scope, owner auth, uniqueness, syntax, candidate integrity, exact-head, duplicate branch, and one-commit draft PR publication).
- Require normal exact-head control CI before merging this code.
- Test a real safe source task and verify GitHub branch/commit/PR evidence, not only a workflow HTTP 204.
- If a base SHA changes or model key is absent, show BLOCKED and do not weaken CI.
- Before any manual task, inspect an existing matching PR/root and source lease. If the same root is already open, reuse it rather than generate a competing task identifier.

Contract: [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md), local PR_AUTOMATION_CANONICAL_V1.md. No additional paid services or recurring CI introduced.
