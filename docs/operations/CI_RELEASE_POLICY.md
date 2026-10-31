# Holistic House CI / PR / LIVE release policy

This is the authoritative current policy for CI and production delivery. GitHub ruleset 26269892 is the authoritative configuration; verify its current readback before delivery and do not modify it as part of routine releases.

## Production and merge gates

- Production branch: `codex/public-book-library`. The sole required GitHub status is `release-ready`; it must be SUCCESS on the exact PR HEAD. Applicable specialist CI workflows must execute and succeed on that HEAD; missing, pending, cancelled, skipped, failed, zero-job or stale results are not success. FAST presentation-only changes include only explicitly allowed CSS and public raster images, excluding sensitive paths, and take the short path only when no specialist is applicable. Mixed, unknown, security, payment and policy changes are STRICT. GitHub uses loose required-status checks: a production advance alone does not require updating the PR branch; conflicts and required checks still block merge. Never bypass protection.
- The PR must be Ready, mergeable, and all review discussions resolved. Human approvals: 0 required. CODEOWNERS approval and independent mandatory AI Review are not required. Use native GitHub Auto-merge with the allowed squash method after the required checks succeed. Force-push and deletion of the protected branch are prohibited.
- Preserve applicable browser, authentication, privacy, RLS, consent and payment checks and actual provider/E2E requirements. Draft-skipped tests are not passing evidence; Ready transitions must run applicable tests. Workflow migrations must preserve coverage and follow BASE-trusted successor and exact-HEAD evidence; never delete or weaken security or browser tests to pass CI.

## Ownership and efficient repair

- One responsible agent per PR. Acquire and re-read a GitHub comment lease before branch changes; respect an active foreign lease, heartbeat and release at handoff. Technical commands and fingerprint semantics are in [PR Sweep Guard](PR_SWEEP_GUARD_20261029.md).
- Inspect exact-head logs and shared evidence. Fix one confirmed root cause with one coherent correction; do not repeatedly rerun unchanged failures or push empty commits. Batch related commits, run focused checks locally before a meaningful push, and allow applicable current checks to finish. Minimize duplicate checks without reducing coverage.

## LIVE acceptance

After merge, record GitHub merge SHA and verify the correct Vercel project has a READY production deployment built from that exact SHA and serving the public domain. Open the public domain and perform the relevant LIVE smoke; report CI, merge, deployment and real user/provider E2E evidence separately. A merge, READY status or HTTP response alone does not establish the intended outcome.

## Four-level Core route (base-trusted rollout)

Core's `classify-change` job computes the changed file set from the exact tested
PR merge checkout (HEAD^1 BASE, HEAD^2 PR HEAD). Route execution uses the
`scripts/ci-quick-route.mjs` script from that immutable BASE, **never** the
candidate's copy. A missing or incompatible trusted router defaults to CORE.

- **ASSETS:** only added/modified, non-sensitive `public/**` PNG/JPEG/WebP/GIF/AVIF/ICO files accepted by the BASE risk classifier. The trusted router verifies every Git blob SHA, file mode, binary container, image dimensions, and relevant structural checks. Core npm install, lint and Next build are skipped. Invalid or corrupt assets FAIL rather than being counted as clean.
- **TEXT:** only modified, allowlisted public `app/[locale]/**` JSX/TSX pages, with no other changes, **after** PR #2777's AST-based `classifyStaticUiText` and the pinned parser are deployed on BASE. The proof compares complete BASE/HEAD sources and may only accept static public wording; unavailable parser, unexpected source or missing proven classifier falls back to CORE. CSS, new pages, mixed files and executable changes do not use this Core bypass.
- **CORE:** normal application code, changed CSS, unknown files, and unproven presentations. One Core install/lint/build job; applicable specialists remain required by immutable-base and candidate workflow triggers. Specialist-level duplicate builds are separately retired by their named owner PRs.
- **FULL:** any security-critical path (auth, payment, billing, privacy, consent, client/private data, database/migrations, provider APIs, CI policy, dependencies). Always runs the complete Core build, applicable specialist/security/browser suites, and release-ready.

The lightweight route never waives `release-ready`, exact HEAD/base rechecks,
GitHub protection, unresolved discussions or security checks. Specialist
aggregation still runs on all routes using BASE-trusted logic. No reduced
workflow is allowed to treat a missing/pending/failed mandatory security check
as success. Before #2777 merges, safe-looking UI text still follows CORE.

## SAFE public-text and scoped-CSS release routing

The immutable production BASE may classify literal public JSX/TSX text,
noninteractive static content and self-contained local UI toggles through the
pinned TypeScript AST parser. Only verified safe public CSS modules may treat
specific unchanged browser diagnostics as advisory. The parser's own failure,
untrusted source or unknown/mixed/sensitive paths revert to STRICT. Payment,
authentication, privacy, consent and other security coverage remains mandatory.

**Configuration alert — 31 October 2026:** GitHub ruleset #26269892 no
longer contains the required-status-check rule. This is a deviation from
the policy above, not an approved waiver. Restore a single required
`release-ready` status with strict base synchronization OFF before relying
on native Auto-merge. A GitHub PR merge is not evidence of successful CI.
