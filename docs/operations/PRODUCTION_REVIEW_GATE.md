# P0 · Human review + CODEOWNERS — finish the existing protected production gate

Repository `andylitvinov-design/books`. **Production** `codex/public-book-library`, never GitHub default `codex/bootstrap-books`.

## Verified live baseline, 31 October 2026, 08:13 Toronto

- The **EXISTING** ruleset is **#26269892** (`Holistic House · production release protection`), **active**, branch `protected=true`, targeting `refs/heads/codex/public-book-library` alone.
- It requires strict exact-head `release-ready` from GitHub Actions **integration ID 15368**, one valid review, last-push approval by another person, dismissal of stale approvals, resolved threads and `squash` merges. Deletion/non-fast-forward are denied; `bypass_actors=[]` and `current_user_can_bypass=never`.
- **Unfinished:** production `.github/CODEOWNERS` is absent; `require_code_owner_review=false`; no independent human reviewer with accepted Write access is verified; negative/positive real-merge tests not executed. Thus **P0 is not yet complete**.
- This PR (#2718) contains policy checks and the upgrade tool. It does **not** perform a ruleset write, fake an approval or claim LIVE.

## Fastest safe completion — reuse existing PR #2718 (do NOT open another PR)

1. Choose a **real human**, not the PR author `andylitvinov-design`, not an AI agent or bot. Owner invites their GitHub account in repository Settings → Collaborators. The human **accepts** and receives at least **Write** (prefer minimum Write). Confirm their account controls are independent of the PR author.
2. On the **existing #2718 branch**, with owner-authorized GitHub token placed in local environment and **not** in files/CI logs:

   ```bash
   node scripts/admin/production-review-gate.mjs inspect
   node scripts/admin/production-review-gate.mjs codeowners --reviewer HUMAN_LOGIN > /tmp/hh-codeowners
   mkdir -p .github && cp /tmp/hh-codeowners .github/CODEOWNERS
   node --test tests/production-review-policy.test.mjs
   ```

   `codeowners` validates accepted Write permission before printing. Commit the `.github/CODEOWNERS` file to **this same PR**, ideally in one push. Verify generated owners are exactly the eligible human and cover CI/auth/payments/data/security and deployment configuration. Do not add owner/bot/AI accounts.
3. Mark #2718 Ready only when the file is included. Run real exact-head required Core + relevant specialist CI. Obtain a real GitHub **APPROVE** from the designated human (not the last pusher). Merge #2718 via the **already-enforced protected squash path**; no admin override, temporary disabling, or direct production push.
4. Only **after CODEOWNERS is present in the production base**, run in an authorized admin session:

   ```bash
   node scripts/admin/production-review-gate.mjs inspect --reviewer HUMAN_LOGIN
   node scripts/admin/production-review-gate.mjs apply --reviewer HUMAN_LOGIN --confirm-active
   node scripts/admin/production-review-gate.mjs inspect --reviewer HUMAN_LOGIN
   ```

   `apply` updates the **existing #26269892** with `PUT` to set **only** `require_code_owner_review=true`; it never creates another ruleset. It refuses an unrecognized/changed/weak ruleset, missing CODEOWNERS, an unaccepted reviewer, a non-protected branch or missing admin scope. It preserves all existing checks/rules, including integration ID 15368, readbacks the result and forbids bypass.
5. **Real acceptance, without bypass:** (a) an otherwise green PR on the current base **must be blocked** with 0 approvals; (b) for changed CODEOWNERS-covered paths, it remains blocked without an eligible CODEOWNER approval; (c) after valid independent human review of the **current diff**, all required checks green, latest-push rule satisfied and comments resolved, GitHub permits a protected squash merge. Verify actual merge SHA and Vercel `READY`, source commit and canonical `holistichouse.vercel.app` alias separately. Record evidence; CI success or an “approved” comment is not equivalent.

## Existing stacked releases: no forced rewrite

The active ruleset allows **squash-only**, whereas #2629 → #2636 (and #2528 → #2532 → #2676) have parent/child ancestry. Do **not** relax rules, force-push, or cherry-pick blindly. After each parent's protected squash merge, the existing Dependency Consolidation owner should restack the child with a new reviewed normal non-force commit that preserves all child-specific changes, retarget to production and rerun the child exact-head Core + specialist tests. For stacked releases already under active Work Merge/Consolidation, leave their branches untouched.

## Scope and limitations

This repository is **user-owned**, so team-required-reviewer restrictions are unavailable; CODEOWNERS must name verified eligible individual users. The connected GitHub app lacks admin settings/invite APIs, so ChatGPT cannot independently grant Write access or perform the admin `PUT`. No verified reviewer has been provided. The script can validate a reviewer once the owner's account has granted actual permissions; it cannot prove human identity from username syntax alone. Do not turn on native auto-merge before a particular PR has a real valid independent approval and all required CI and dependencies are satisfied. If the existing ruleset changes, stop and re-audit instead of replacing it.
