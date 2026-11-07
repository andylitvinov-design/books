# Agent Commander · owner-approved public source command bridge (V1)
Date: 2026-11-07 · Scope: existing standalone PR Monitor, existing Watchdog, existing Repair Worker.

## Why
After #3872/#3886/#3887, the same-site protected editor had no trusted runtime dispatch credential, and a queue marker could not create a source commit. The Vercel project is intentionally not configured with a GitHub write token or private repo. Do not replace that missing private channel with a public task store.

## Verified zero-extra-service route
1. Open `https://holistic-house-pr-monitor.vercel.app/task-editor.html` and authorize with existing owner code. The protected editor contains a collapsed **Настоящий GitHub commit** panel. It is intentionally separate from encrypted private drafts.
2. For a PUBLIC TECHNICAL task only, choose exact base, one allowed existing file, and either `literal` (unique exact find/replace, no AI key) or `free_ai` (one bounded instruction, may fail on quota). Explicitly confirm public disclosure. The browser reads fresh GitHub base SHA and constructs a deterministic idempotent `!pm source {JSON}` command; the command is *not posted automatically* and no write credentials appear in browser.
3. The owner reviews and posts the command to the **existing public technical inbox** `https://github.com/andylitvinov-design/books/issues/3890`. Do not place client data, private chats, passwords, paid credentials, private URLs, medical details or secret keys in this public command.
4. Existing 10-minute Watchdog job reads only exact owner GitHub comments, validates the full bounded existing source-task schema, permitted path, consent marker, exact current protected base SHA, deterministic task branch not already present, comment age and daily quota. It publishes a durable CLAIMED bot receipt *before* requesting anything external.
5. Same trusted Watchdog job uses existing GitHub Actions secret `HH_AUTOMERGE_TOKEN` to request the EXISTING `hh-pr-repair-worker.yml` with `commander_source_task` input, so GitHub dispatch actor is the authorized token owner. The owner identity check inside Worker remains unchanged. The existing `HH_OPENROUTER_FREE_API_KEY` is used only for the optional free_ai mode; paid fallbacks remain forbidden.
6. If GitHub dispatch responds HTTP 204, the inbox logs **DISPATCH_ACCEPTED_UNCORRELATED**. This is not a commit. The Worker must independently verify actor, source blob, SHA, no-op/scope restrictions, task branch and candidate hash, then publish at most one source commit and draft PR. A failure is BLOCKED with no blind retry.
7. The editor's on-demand **Проверить созданный PR** reads the actual GitHub PR for deterministic branch and shows only verified PR state/SHA. CI, protected merge and functional Vercel LIVE require separate evidence. The first real approved command must be used for meaningful work; never create a no-op PR just to obtain a green test.

## Security and costs
- GitHub Issue #3890 is PUBLIC and intentionally opt-in. Private source task drafts and private chat must not be published there.
- The editor uses public GitHub GET only. No PAT, browser write API, new service, new workflow, new cron, new database, hidden polling or paid model.
- The existing private editor `/api/commander-drafts` still requires `HH_PM_TASKS_PRIVATE_REPO` and `HH_PM_GITHUB_WRITE_TOKEN` in the Vercel server; neither value is created or copied by this bridge.
- Owner token never appears in error logs, bot replies, UI or GitHub comment. Provider or dispatch ambiguity is terminal, not retried.
- Source command age <=24h, max three public source commands among the existing daily claim budget. GitHub `GITHUB_TOKEN` is read-only for source dispatch; the existing scoped owner secret is used server-side for a 204 request and still cannot bypass Worker's own authorization.
- The deterministic task ID and PR branch make replay a known `SOURCE_TASK_BRANCH_ALREADY_EXISTS` or protected Worker duplicate rejection.
- No new run occurs until the owner posts a public technical command or existing scheduler ticks. At most existing CI/Actions capacity for the explicitly approved task is used.

## Acceptance
1. Node: `node --test tests/ci-pr-pm-agent-inbox.test.cjs ops/pr-monitor/tests/commander-source-bridge.test.cjs` and existing watchdog contract tests on exact HEAD, including signed receipt, owner-only, fake marker, stale SHA, missing secret, duplicate branch, no-204 and XSS guard.
2. GitHub PR merged on control branch after required review/checks; manually deploy standalone PR Monitor using FULL last READY source manifest, preserve all older APIs/routes and unrelated recent agent changes, then verify Vercel production alias points to intended deployment.
3. Owner-authenticated iPhone 320/390/430 UI, handoff, original source and copy, disabled state until public consent, invalid path rejection, fresh SHA, exact technical command and actual public GitHub owner comment.
4. Independent GitHub Actions run evidence: Watchdog CLAIMED -> dispatch HTTP 204 -> Worker run with actual owner actor -> SOURCE_COMMIT_PUBLISHED + draft PR (new SHA) -> protected exact-HEAD CI -> merge -> Vercel publish + HTTP/functional smoke if that PR changes the site. A preview READY alone is not enough.
5. Explicitly report any unverified steps rather than claiming full autonomous private execution.

GLOBAL_PR_ONE_PUBLISH_V1: prepare/test before one atomic remote publication; no extra CI wave without evidence. Source root HH_COMMANDER_PUBLIC_SOURCE_COMMAND_BRIDGE_V1.
