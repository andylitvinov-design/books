# HH PM OpenRouter Free · GitHub Secret Relay · 2026-11-07

## Delivered and security boundaries
- GitHub Actions Secret `HH_OPENROUTER_FREE_API_KEY` was independently confirmed **present** in the real Worker claim run 42416232216, without accessing or copying its value.
- Reuse existing `HH PR 10-minute watchdog` schedule **and existing reconciliation runner**. A small new trusted step reads owner technical comments from PUBLIC GitHub Issue [#3890](https://github.com/andylitvinov-design/books/issues/3890), calls `openrouter/free` with zero maximum prompt/completion price and no paid fallback, then posts source-linked bot receipts.
- No new cron, independent workflow, external key transfer, API token, model purchase or website write permission.
- Only verified repository-owner comments starting `!pm ask` or `!pm repair` are executable inputs; all other comments ignored. Claim receipt is created BEFORE any inference or dispatch, preventing duplicate calls after timeouts. At most one command per existing Watchdog cycle, and 12 claimed requests in any 24 h. Failures are explicit and not repeated automatically.
- `!pm repair N SHA` re-checks owner repo/PR/base/head, required repair label and signed GitHub Actions Core failure before sending addressed request to **existing trusted Watchdog**. The Watchdog independently re-verifies lease, capacity and signed provenance. Dispatch acceptance has no correlated run ID and never means code published.
- GitHub Issue #3890 and bot responses are PUBLIC. **Do not post any personal, client, financial, credential, private business or sensitive material.** The owner-private PM chat stays private; moving text into GitHub requires a separate visible confirmation, copy and explicit GitHub comment submission.

## Real user workflow
1. Open https://holistic-house-pr-monitor.vercel.app/project-management-public.html and unlock owner chat using the existing PR Monitor owner code (not Google).
2. Select the free GitHub OpenRouter executor, choose checked public technical tasks and type your question.
3. The UI shows a PUBLIC warning and a prepared `!pm ask` command, and links to [Agent Inbox #3890](https://github.com/andylitvinov-design/books/issues/3890). The owner posts the comment on GitHub; opening the link alone is NOT a dispatch.
4. The already scheduled Watchdog polls the trusted issue, records CLAIMED, uses GitHub Actions Secret to contact free model, posts REPLIED or BLOCKED with run URL. PM > Reports displays the signed source and can display bot replies in chat after a refresh.
5. For a specific eligible current FAILED Core PR, use `!pm repair PR SHA` in the same GitHub issue. Never infer repair, commit, CI, merge or LIVE without independently observed SHA and checks.

## Non-delivered
The monitor's original server-side private Vercel OpenRouter adapter remains disabled until a *separately approved* Vercel secret is configured. A GitHub secret cannot be decrypted via API and is not copied into Vercel. This new channel provides actual GitHub-side free model execution, but not private direct OpenRouter prompts from the PR Monitor.
Replies and model calls use the public Github issue; other external agents are not secretly connected. User-visible messaging distinguishes HANDOFF_PREPARED, CLAIMED, REPLIED, DISPATCH_ACCEPTED_UNCORRELATED, BLOCKED, and actual verified source publication.

## Acceptance checklist
- [ ] Existing contract CI passes new pure tests and all previous tests without skipping required gates.
- [ ] Control branch merged through protection.
- [ ] GitHub Issue #3890 test owner `!pm ask` -> GitHub Actions bot CLAIMED + REPLIED with real Watchdog run and zero reported price (or explicit provider error).
- [ ] Standalone PR Monitor deployed by overlaying *complete prior source manifest*, preserving all existing APIs and assets, and verified READY+alias.
- [ ] Public PM page and signed owner report tab show Issue #3890 source-linked messages; verify no unauthenticated access to owner-only API.
- [ ] Owner-authenticated mobile 320/390px interaction if browser authorization available. HTTP 200 alone is not E2E.
