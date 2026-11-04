# AGENTS.md — Holistic House / Books

## Required cross-project CI wave policy

Before any ChatGPT, Codex, Claude, Hermes or GitHub agent creates/updates a PR, **first read** the global [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md).

**Local, stricter authority:** [Current Holistic House PR automation canon](docs/operations/PR_AUTOMATION_CANONICAL_V1.md). Keep the correct `codex/bootstrap-books` control vs `codex/public-book-library` production branch routing, existing Task leases, exact-HEAD Core/Specialist/Guard, branch protection, and separate verified Vercel LIVE. No financial additions.

**PR creation admission:** prepare a coherent source/tests/docs patch **before opening PR**, validate the smallest relevant local checks, publish **one complete HEAD**, open one PR, then freeze HEAD while mandatory checks run. Only a verified required-check failure or urgent security/correctness issue authorizes a new complete repair HEAD, which must be rechecked. Do not publish per-file intermediate commits into an open PR, push no-op commits, retry valid CI merely for status, or rewrite PR title/body for progress (an `edited` event can re-trigger Core). Use comments or existing issue ledgers for progress.

**Safety:** Never disable/skip required gates, merge stale HEAD, invent timings, introduce new scheduled CI, Vercel preview/build, token/provider or paid service. For non-PR work mark this policy N/A; retain normal product scope and privacy controls.
