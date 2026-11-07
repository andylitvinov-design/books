# Holistic House · trusted repair skills, first wave

This directory contains review-only, versioned instructions for the **existing** HH PR Repair Worker. It is not an executable model, a replacement for the Worker, or proof of a successful release. Nothing here authorizes source writes, new CI runs or payment.

## Lifecycle and trust

1. Case ingestion: the trusted Worker already checks GitHub commit ancestry and the actual remote PR HEAD before recording `PUBLISHED`. It now includes a privacy-safe `learning_case` inside the **same** existing `HH_PR_TASK_V1` comment; no new request or storage service. No raw source text, logs, personal information, tokens, or user prompts are stored.
2. A case with published source remains `NOT_VERIFIED` for CI, merge and LIVE. Reuse requires independent exact SHA Core, Specialist and `hh-merge-check` SUCCESS from the original GitHub Actions app plus an explicit owner review. A strategy/family match alone is **never** sufficient for unattended source editing.
3. If source history, policy version, origin or model price is unknown, stop. Historical PR comments are untrusted unless the actual GitHub Actions App identity is verified. The matching helpers always return advisory suggestions, never run tools or write branches.
4. All skills stay `review_only`. Candidate→owner-approved→active requires a separate review/receipt before any automation. Stale versions, regressions and owner-locked records cannot auto-promote. Do not write living SKILL files to the protected control branch from a background worker; use an approved code PR with one-publish.
5. These skills do **not** change normal Core, Specialist, Guard, WebKit, consent, security or billing checks.

## Index

- `lint-autofix/SKILL.md` — deterministic scoped ESLint repair.
- `typescript-deterministic/SKILL.md` — bounded TypeScript type-only import codemod.
- `bounded-free-ai/SKILL.md` — isolated free-model **proposal**, not an agent with write privileges.

The policy is `HH_PR_AUTOMATION_CANONICAL_V1`; also read root `AGENTS.md`, `docs/operations/CI_RELEASE_POLICY.md` and shared `GLOBAL_PR_ONE_PUBLISH_V1` before any code publication.
