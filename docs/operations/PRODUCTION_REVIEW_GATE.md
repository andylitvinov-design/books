# P0 · Independent GitHub review gate for Holistic House

Repository: `andylitvinov-design/books`; **production is `codex/public-book-library`**, not GitHub default `codex/bootstrap-books`.

## Facts at 2026-10-31

- GitHub API reported production `protected=false` and `GET /rulesets` returned `[]`.
- `.github/CODEOWNERS` was absent on production. PRs #2607, #2629, #2532, #2710 and #2716 had zero submitted reviews in checked history.
- GitHub connector is an installation without administration access: it can read current branch/rulesets but cannot create a ruleset or invite a collaborator.
- **No independent human GitHub login has been designated or verified. Do not substitute the PR author, bot, or second AI agent.** No claim of implemented protection is authorized yet.

## One-time owner + independent reviewer setup

1. Owner selects a real independent human GitHub account (not `andylitvinov-design`). Invite under **Settings → Collaborators and teams**; reviewer must accept and have **Write**, **Maintain** or **Admin**. Prefer the minimum required **Write**. This is a human decision, not something an AI can invent.
2. On a feature branch based on current production, with a GitHub admin token in the environment (`GH_TOKEN`, never committed or printed), run:

   ```bash
   node scripts/admin/production-review-gate.mjs codeowners --reviewer GITHUB_LOGIN > /tmp/hh-CODEOWNERS.new
   test -s /tmp/hh-CODEOWNERS.new && cp /tmp/hh-CODEOWNERS.new .github/CODEOWNERS
   node --test tests/production-review-policy.test.mjs
   ```

   The generator refuses the owner account, invalid usernames, unaccepted invites and missing WRITE access. `.github/CODEOWNERS` covers workflow/CI, middleware/auth/client access, payments/billing/commerce, SQL and Supabase migrations, and its own file.
3. Open a separate PR against `codex/public-book-library` and obtain an actual independent review of this file. Pass current exact-head CI, merge without direct push or override; **CODEOWNERS must exist on the production base** to take effect for subsequent PRs.
4. With admin-scoped GitHub credentials, run only after that PR merges:

   ```bash
   node scripts/admin/production-review-gate.mjs inspect --reviewer GITHUB_LOGIN
   node scripts/admin/production-review-gate.mjs apply --reviewer GITHUB_LOGIN --confirm-active
   ```

   `apply` is opt-in; requires production CODEOWNERS readback, checks reviewer access, refuses duplicate/nonconforming ruleset, and reads back ruleset and branch protection. Use **no bypass actors**. The ruleset applies only to `refs/heads/codex/public-book-library`, requires 1 approval, Code Owners, latest push approval by another person, dismissal of stale reviews, resolved conversations, strict successful `release-ready`, forbids force push/deletion, and allows squash merge.
5. **Acceptance test with real accounts:** on an otherwise green test PR, verify merge is **BLOCKED** before approval; get a real review from the independent CODEOWNER (who must not author or most recent pusher); verify required checks still `SUCCESS` at exact HEAD and merge becomes available. Perform one normal protected squash merge, then read back the merged SHA and Vercel deployment. Do not force a merge, rewrite history, fake review or use admin bypass.

## Failure handling

If the owner cannot supply an independent person, keep task at `WAIT_REVIEWER`, do not enable auto-merge against unprotected production. If GitHub app returns `Resource not accessible by integration`, use an authorized admin GitHub session for settings—not an invented API capability. An `APPROVED` comment, LLM review, action success, CODEOWNERS template, or personal owner review **never** substitutes for GitHub's enforceable required review.

Once active, CI-only PRs also need a real human review. **Do not quietly exclude CI, auth or payments from the ruleset.** Avoid claiming READY/LIVE until actual Vercel production deployment matches merged source SHA.
