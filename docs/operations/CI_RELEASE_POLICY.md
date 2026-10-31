# Holistic House CI / PR / LIVE release policy

This is the authoritative current policy for CI and production delivery. GitHub ruleset 26269892 is the authoritative configuration; verify its current readback before delivery and do not modify it as part of routine releases.

## Production and merge gates

- Production branch: `codex/public-book-library`. The sole required GitHub status is `release-ready`; it must be SUCCESS on the exact PR HEAD and current production BASE. For STRICT changes: All applicable specialist CI workflows must execute and succeed on that HEAD; missing, pending, cancelled, skipped, failed, zero-job or stale results are not success. FAST presentation-only changes include explicitly allowed CSS modules without global escapes or network imports and public raster images, plus verified static public JSX/TSX markup and self-contained local toggles or literal tab selectors; specialist runs remain visible but do not gate them. Sensitive paths, other interactions, unknown source changes, mixed security, payment and policy changes are STRICT. Re-read HEAD and BASE before merge; update an outdated branch and obtain fresh checks. Never bypass protection.
- The PR must be Ready, mergeable, and all review discussions resolved. Human approvals: 0 required. CODEOWNERS approval and independent mandatory AI Review are not required. Use native GitHub Auto-merge with the allowed squash method after the required checks succeed. Force-push and deletion of the protected branch are prohibited.
- Preserve applicable browser, authentication, privacy, RLS, consent and payment checks and actual provider/E2E requirements. Draft-skipped tests are not passing evidence; Ready transitions must run applicable tests. Workflow migrations must preserve coverage and follow BASE-trusted successor and exact-HEAD evidence; never delete or weaken security or browser tests to pass CI.

## Ownership and efficient repair

- One responsible agent per PR. Acquire and re-read a GitHub comment lease before branch changes; respect an active foreign lease, heartbeat and release at handoff. Technical commands and fingerprint semantics are in [PR Sweep Guard](PR_SWEEP_GUARD_20261029.md).
- Inspect exact-head logs and shared evidence. Fix one confirmed root cause with one coherent correction; do not repeatedly rerun unchanged failures or push empty commits. Batch related commits, run focused checks locally before a meaningful push, and allow applicable current checks to finish. Minimize duplicate checks without reducing coverage.

## LIVE acceptance

After merge, record GitHub merge SHA and verify the correct Vercel project has a READY production deployment built from that exact SHA and serving the public domain. Open the public domain and perform the relevant LIVE smoke; report CI, merge, deployment and real user/provider E2E evidence separately. A merge, READY status or HTTP response alone does not establish the intended outcome.
