# Agent Commander Learning Engine V1 — protected, evidence-bound rollout
7 November 2026. Root: HH_AGENT_COMMANDER_LEARNING_ENGINE_V1. No new paid provider, cron, workflow, task registry or GitHub writer.

## Already live baseline
PR #3854 merged the genuine Worker receipt logic; PR #3875 merged the 30-skill curated catalogue on control, separate manual PR Monitor Vercel release, verified production alias. This PR does NOT change either trust boundary.

## Delivered in this change
- /learning.html: same-site mobile owner dashboard linked from /skills.html; source/CI/merge/LIVE kept separate.
- /api/commander-learning: owner-session HMAC cookie, read-only GET, bounded PUBLIC GitHub issue comments, strict GitHub Actions app provenance, re-derived HH_PR_TASK_V1 proof, exact commit-parent check, and independently fetched exact-HEAD Core/Specialist/merge checks.
- Pure candidate matcher groups only 2+ independent successes of the same skill; never grants code permissions, updates active skill, claims merge/LIVE, invokes models or dispatches runs.
- 120s bounded process cache; GitHub unavailability is 503/unknown, not imaginary zero/green. Dashboard only shows sanitized metadata (PR/run URLs and IDs).

## Operational limits / next protected step
This is honest read-only learning and candidate review, not autonomous skill promotion. The standalone PR Monitor Vercel project currently has SEO_* authentication env only; no private write token, private task store or new owner API persistence is configured. Do NOT add a public write route or copy production credentials. Source cases continue to accumulate in the trusted Worker existing terminal comments. Persisting usage and owner approvals requires a separately integrated owner RLS back end and protected gateway, without replacing existing PM/task data. Candidate version update should proceed via a protected GitHub PR + tests + owner approval.

## Acceptance
1. node --test ops/pr-monitor/tests/commander-learning.test.mjs
2. GitHub exact-head required checks on the PR. Protected merge to codex/bootstrap-books.
3. Manual standalone Vercel release from complete prior READY source manifest overlaying only learning.html, commander-learning.js, commander-learning.css, commander-learning-model.cjs, api/commander-learning.js, skills.html. Never publish a partial repo directory (legacy 120+ file source is not wholly in GitHub). Inspect original API routes and static legacy pages.
4. Verify 401 unauthenticated API, 405 POST, owner GET schema, no raw comments; test iPhone 320/390/430 widths; ensure five-tab dock unchanged; production canonical alias SHA/smoke.
5. If no real trusted source receipts in the recent window, show zero with explicit proof limits: not a product failure or false success.
