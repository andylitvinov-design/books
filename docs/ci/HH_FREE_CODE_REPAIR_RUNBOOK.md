# Holistic House — Free Code Repair v2 (control-plane)

Repository: `andylitvinov-design/books`
Production base: `codex/public-book-library`
Trusted control plane: `codex/bootstrap-books`

## What is actually automated

A *signed exact-HEAD reservation* selects a non-draft, same-repository production PR. Only the trusted Watchdog's exact-HEAD Core source-failure receipt can select the `code` strategy. One PR lease prevents concurrent writers.

1. `fix` tries the existing trusted deterministic TypeScript and ESLint repairs.
2. If a verified patch was not produced, `code_fix` checks out that exact PR HEAD with **no persistent credentials** and installs dependencies with npm lifecycle scripts disabled.
3. The free generator reproduces a TypeScript or directly related unit-test failure. It sends bounded, non-sensitive source text and redacted diagnostics to the **specific** model `opencode/glm-5.3-flash-free`. Its OpenCode agent runs in a fresh temporary directory with **all tools denied**. It receives only a minimal environment: **no GitHub token, no owner token, no paid provider keys, no app secrets, no repo checkout**. No other model or fallback is permitted.
4. The model can return complete replacement source text only for already-existing paths in the trusted bounded source scope. The generator writes an untrusted JSON artifact, not a source commit.
5. `code_verify` runs on a fresh exact-HEAD checkout without write credentials. The trusted verifier validates original blob SHAs, path allowlist, diff size, exact modified files, `git diff --check`, direct-import scoped unit tests, ESLint where configured and TypeScript for TS/TSX.
6. Only a fully verified candidate reaches the existing trusted `publish` job. Publisher rechecks owner/PR/HEAD/blob SHAs and posts one source commit through the existing owner-controlled token. A publish receipt is **not** a CI pass. All normal fresh-HEAD CI, Specialist and branch-protected AutoMerge checks remain mandatory.

The model and verifier cannot publish or bypass CI. At most one free-model attempt occurs per verified addressed task; no loops or paid Codex are invoked. Free-model rate limits, unavailable model, unsafe scope, missing tests, failed verification, stale SHA or no owner token stop safely and yield manual repair. GitHub Actions runner minutes and npm bandwidth may still be consumed even when provider inference is free.

## Deliberate scope limits

The generator supports existing, non-sensitive JS/TS source paths under `app/`, `components/`, `lib/` and `scripts/`, at most eight input paths and four proposed replacements. No tests, workflows, configs, lockfiles, credentials, auth, payments, private client data or API handlers may be changed by AI. The 56 KB aggregate input limit means larger PRs require the manual queue. This is **not** a promise to repair arbitrary CI, integration, browser, environment, deployment or third-party failures.

For a failed model quota response, never configure paid credentials or route to Codex. Manual review must decide whether a code change is necessary. Never treat unit test pass as real production delivery.

## Acceptance before a LIVE claim

- New PR's watchdog contract workflow passes, including `ci-pr-free-ai-code-candidate.test.cjs`; verify actionlint/YAML structure and no privileged tokens in `code_fix` or `code_verify`.
- The control-plane change merges to `codex/bootstrap-books`. A source-failing **synthetic non-sensitive PR** with signed reservation and true reproducible TypeScript failure runs the free model once.
- Observe `code_fix: proposed` → `code_verify: ready` → `publish: committed` for the same exact SHA; GitHub shows a new source commit and fresh required CI succeeds before any AutoMerge.
- Test negative cases: free model unavailable/429, malicious path, stale SHA, invalid candidate, failing selected test, expired reservation. Each must leave source untouched and enter manual repair.
- Production LIVE acceptance requires an exact merged SHA and a READY production deployment; a source repair commit alone is neither merged nor LIVE.

Existing limited Free Express Gauntlet is independent of this flow, as is the separate production-base deterministic ESLint PR #3231. The previously mentioned #3212 relates to Hypno Effects audio and is not a Code Repair prerequisite.
