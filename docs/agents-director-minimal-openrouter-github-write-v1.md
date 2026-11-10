# Agents Director: minimal OpenRouter-to-GitHub write path

Status: first-version implementation contract for the existing PR Repair Worker.

## Decision

Keep one model adapter, one isolated repair workflow, and one trusted GitHub publisher. Do not add a separate coding-agent platform, database, queue, or runtime service for this first version.

## Runtime chain

1. The existing Repair Worker claims an eligible repair task against one exact PR number and HEAD SHA.
2. The trusted workflow checks out the source at that exact SHA with checkout credentials disabled.
3. The OpenRouter adapter selects only an explicitly free model verified against the live model catalog and requires a zero-cost response. It receives a bounded repair prompt and no GitHub write token.
4. The model returns a unified patch. The worker validates the patch and source-path allowlist, applies it in the isolated runner, and runs the existing focused verification.
5. The trusted publisher uses the separately stored `HH_AUTOMERGE_TOKEN` (never exposed to the model or untrusted source job) to create Git blobs/tree/commit and advance only the exact PR branch.
6. The publisher verifies that the PR branch now points to the exact new commit SHA. The workflow then verifies a new CI run on that new PR HEAD.
7. The repair is successful only after the new exact-HEAD CI passes. A generated patch, a local commit, a successful workflow step, or a push attempt alone is not success.

## Minimal security boundary

- OpenRouter API key: available only to the trusted model-request step; never included in prompts or logs.
- GitHub write credential: available only to the trusted publisher step; never passed to OpenRouter, model context, patch executor, or PR-controlled code.
- Source write: exact PR, exact branch, exact expected HEAD, bounded allowlisted files, no force push.
- If the HEAD moves, the task becomes stale and publication stops. Never overwrite another agent's or owner's update.
- If model output is malformed, refused, truncated, tool-call output, or cannot be verified as zero-cost, stop without retrying a potentially paid route.

## Required proof before calling it LIVE

Record and inspect all of the following for one safe test repair:

- selected OpenRouter model ID and verified free catalog entry;
- exact source PR number and original HEAD SHA;
- accepted patch and changed-file list;
- focused verification result;
- resulting commit SHA;
- GitHub read-back proving the PR branch points to that exact SHA;
- new workflow run ID whose `head_sha` equals that commit;
- terminal CI conclusion for that exact SHA.

A missing secret, insufficient repository write permission, malformed model response, stale HEAD, missing CI run, or failed CI is a blocked/failed repair—not success.

## First-version scope

Use the existing `scripts/ci-pr-repair-openrouter-free.cjs`, `scripts/ci-pr-repair-worker.cjs`, and `.github/workflows/hh-pr-repair-worker.yml`. Fix and test those seams in place. Later enhancements (multiple runtimes, broad tool calling, model ensembles, new dashboards) are explicitly out of scope until this single path works reliably.
