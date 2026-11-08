# Agent Commander — Multi-Chat Workspace V1 (2026-11-07)

Root: HH_AGENT_COMMANDER_THREADS_V1
Canonical site: https://holistic-house-pr-monitor.vercel.app
Source directory: ops/pr-monitor/
Status: source patch, not production LIVE until separately verified.

## Baseline
Prior to V1, PM Agent Chat was a single temporary browser-tab dialogue with local deterministic PM Advisor or server-selected OpenRouter :free, plus on-demand trusted GitHub reports. No persistent multi-thread index existed. Existing owner cookie and PR-monitor read-only guest mode remain unchanged. The protected editor from merged PR #3886 already provides a private GitHub issue store contract, but that store needs explicit server-side configuration.

## Data model and UX
- One independently addressable UUID thread per task or team. Metadata: title, project, goal, 0–8 task IDs, 0–15 linked PRs, 1–6 executors, status, revision, timestamps.
- Executors: local advisor, OpenRouter Free, Codex, ChatGPT Work, GitHub Repair Worker, Hermes, human. Only the first two currently converse through the existing AI API; other assignments create a clear manual handoff, never a claimed launch.
- Statuses: planned, assigned, working (self-reported), review, blocked, archived. Owner cannot self-select done/merged/live_verified. Archive is not proof.
- Messages: owner, AI advice (UNVERIFIED), private note, source-validated GitHub bot/ChatGPT connector report. Append-only event IDs prevent duplicate POST retries. Reports do not prove a source commit.
- Each thread includes on-demand real GitHub PR status, current HEAD and merge marker, with CI and production functional LIVE deliberately not certified. Search, filtering, aggregate counts and handoff copy are included.
- The existing five-tab bottom Commander dock remains; Agents, Project Management and quick chat link to a dedicated /chats.html workspace.

## Storage and security
- Owner authentication: existing signed hh_seo_owner cookie, same-site /api/seo-auth; no Google login, no public write API.
- Remote mode: /api/commander-chats uses only the existing configured private GitHub repository after verifying private=true, owner and push permission. One private issue per thread and append-only private issue comments for events. Authenticated reads, same-origin writes, bounded payloads, idempotency UUID, optimistic revision 409, unknown/incomplete indexes labelled explicitly. Public books GitHub issues are forbidden as private chat storage.
- Server variables reused from protected editor: HH_PM_TASKS_PRIVATE_REPO and HH_PM_GITHUB_WRITE_TOKEN. No new provider, OAuth login, database, service, token, paid plan, background cron, automatic polling or GitHub Action.
- While those variables are absent: opt-in local persistent vault encrypted with AES-256-GCM. PBKDF2-SHA-256, 210,000 iterations, random 128-bit salt, random 96-bit IV each save. Only ciphertext/salt/IV stored in browser localStorage; the key stays in JS memory. Encrypted JSON backup export/import provided. The separate vault password is necessary to reopen; it cannot be recovered by the site. Cross-device sync is NOT provided in fallback mode.
- Existing OpenRouter API maintains its live zero-price model checks; if the model/credential is missing, it remains disabled. Private secrets/client data must not be pasted into third-party models.
- A private owner message or AI reply is not a trusted code execution receipt; only independently proven PR HEAD, exact-HEAD CI, protected merge, deployment ancestry and functional LIVE justify completion.

## User flow
1. Open Agent Commander / Agents -> Рабочие чаты, authorize with existing PR Monitor owner code.
2. Choose server mode automatically if existing private store configured; otherwise unlock/create encrypted local vault (label device-only).
3. Create project/chat, attach selected task IDs and PR numbers, assign one or more executors.
4. Ask local advisor or the verified OpenRouter :free model if assigned; add notes, attach verified GitHub report sources, copy task handoff to external executor as needed.
5. On demand check linked PR state and current HEAD. Leave CI/LIVE unknown until the independent protected proof process.
6. Archive without pretending to have finished the task. Future integration can attach signed source/CI/merge/LIVE evidence and only then show a verified completion state.

## Acceptance
- Node tests: ops/pr-monitor/tests/commander-chats.test.mjs: cookie gate 401, store-not-configured honesty, invalid statuses and spoofed agent reports denied, private codec, multiple executors, encrypted local fallback, nav and mobile HTML.
- Browser: iPhone Safari 320/390/430 width, keyboard/dock, create multiple chats, edit assignments, switch chats, save/reload encrypted history, wrong password, backup import/export, no cross-chat context bleed.
- With explicit private repo setup: create, list, append, read on second authorized device, stale version 409, duplicate event ID, attach only trusted comment, no public leak. When remote store is not configured, do not claim server persistence.
- Confirm no new paid provider, new CI, cron, Vercel storage, public chat write, unverified auto-launch or fake LIVE.
- Focused tests and exact-HEAD required checks before protected merge.

## Release
PR targets codex/bootstrap-books, the control plane. A merge does not deploy this manually managed standalone PR Monitor. For actual LIVE, overlay changed paths onto the COMPLETE verified prior READY Vercel deployment source manifest, retaining existing APIs, /, /pr-monitor.html, /legacy.html, task editor and all static assets. Never deploy the partial GitHub ops/pr-monitor archive. Verify real owner login, /chats.html, API 401 guest, encryption, PR check, mobile and production alias before declaring LIVE. Keep rollback deployment ID.

Global one-publish standard: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md
