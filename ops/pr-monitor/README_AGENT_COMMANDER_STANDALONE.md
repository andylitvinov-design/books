# Holistic House Agent Commander — standalone monitor shell

**Canonical destination:** https://holistic-house-pr-monitor.vercel.app

**AI-ремонт PR из Commander:** [Handoff V1](../../docs/operations/HH_COMMANDER_FREE_AI_PR_REPAIR_HANDOFF_20261107.md). Кнопка на карточке PR выполняет read-only preflight exact HEAD + trusted RED Core, готовит только публичную команду владельцу в существующий GitHub Inbox #3890; запускает Worker только настоящий GitHub-комментарий владельца. Бесплатный auto Worker уже в control-plane. UI не пишет PR и не хранит токены.

**Постоянный концепт выбора бесплатных моделей для кода и исправления PR:** [AI Coding Models · HH_AI_CODE_PR_MODEL_ROUTING_V1](../../docs/operations/HH_AI_CODE_PR_MODEL_ROUTING_V1.md). Выбор модели в UI не означает реальный запуск агента: Worker должен доказать выполнение, нулевую цену, текущий SHA и проверку CI.

This is a **mobile-first, public/read-only navigation and briefing surface**, not a fork of the owner database. Its seven-tab dock (Home, PR, Tasks, Create, Agents, Chat, Projects) is fixed at the bottom on iPhone with safe-area support, using the original screenshot's dark purple visual identity. Public PM task content comes from the *existing* \`/project-management-public.json\`. The existing PR monitor with its complete \`legacy.html\`, 29 APIs and all historic JS/CSS assets remains at \`/pr-monitor.html\`. Nothing removes the old \`legacy.html\` path.

## Routes
- \`/\` — public daily briefing; truthful task snapshot, blockers and entrypoints
- \`/project-management-public.html\` — existing project → stages → subtasks → GitHub PR evidence and safe bulk executor handoff
- \`/agents.html\` — read-only status semantics and links to existing trusted agent/Watchdog tools
- \`/chats.html\` — existing private task chats, PR evidence and owner-authorized messages; no second database
- \`/projects.html\` — public project registry
- \`/pr-monitor.html\` — existing PR → Core → repair → merge monitoring with all prior charts
- \`/legacy.html\` — original unchanged standalone PR page as fallback

The top menu links to protected owner Command Center for actual writing. **No Google login is needed for public monitoring**, but creating a private task, authorizing a coding agent, dispatching GitHub Actions and editing owner notes still require existing owner authorization and server-only trusted credentials. Do not proxy private owner endpoints from the public site. The + action opens the **same-origin** `/task-editor.html` in the current tab. It transports a 10-minute ephemeral handoff envelope without URL params; nothing is auto-saved or executed.

## Конкуренты / Market Intelligence (11.11.2026)

Публичный read-only каталог /competitors.html: 20 видео, 22 активных коуч/HR и 2 архивных. Источник в ops/pr-monitor/competitors-data.json, тест test-competitors.cjs. Правки внутри браузера сохраняются локально, общая версия обновляется только через защищённый PR. Не создаются новые API, обработка персональных данных или Supabase-таблицы.

Для безопасного релиза без замены неполного source-архива допускается отдельный Vercel Project Routes overlay, как уже используется для /learning.html: статические assets из immutable GitHub merged SHA с правильным MIME, CSP только для каталога, две существующие ссылочные JS-подсистемы. Это не полный redeploy. Старый READY deployment, API и маршруты сохраняются. Проверить live readback всех новых путей и регрессию PR Monitor. Откат маршрутов — возврат к прежней routing version. При полном redeploy по-прежнему нужен полный verified source manifest.

## Release safety
The independent Vercel monitor is currently manually deployed, and the GitHub archive is incomplete relative to the already deployed source tree. NEVER use a partial deploy. Obtain complete prior deployment file manifest and include every existing unchanged asset by its verified SHA. Overlay only these source assets after protected control-plane PR merge; verify all API endpoints, old monitor routes, assets, mobile interactions at 320 / 390 / 430 and canonical URL. Keep the previous deployment ID for rollback. A control-branch merge does not itself deploy this manual Vercel project.

GLOBAL_PR_ONE_PUBLISH_V1: source/tests/docs staged before the PR; one coherent source HEAD, exact-HEAD CI and independent LIVE checks. No new paid services, external worker, tokens, cron, release bypass or extra polling.


## Task intake UX — voice and decomposition (7 November 2026)

The purple «Создать» dock action on the independent PR Monitor opens a keyboard-aware mobile sheet. Two owner-requested additions:

1. **🎙 Диктовать.** Uses in-browser Web Speech/SpeechRecognition when allowed by iPhone Safari or its host browser. Russian by default; English/Spanish honor the page language. Manual start and stop, no automatic submission, late-callback guard, denial/unsupported fallback to keyboard dictation. The site stores no audio. The browser/OS may use its own speech processing service. visualViewport helps keep the form scrollable with the software keyboard open.
2. **✦ Разобрать задачу.** Immediately prepares a local and editable agent-ready brief with the original input, steps, observable acceptance criteria, supplied references and missing prerequisites. If an authenticated owner session exists and the existing free-only OpenRouter connector is available, this explicit click sends the text to the owner-only decompose action in the existing PM chat API. The backend checks the owner cookie and same-origin request, obtains a currently verified $0 model whose ID ends in :free, and requires zero prompt/completion prices. Free quota failure or missing credentials retains the local brief.

Guest monitoring and local preparation do not require Google login. The pre-existing PR Monitor owner login is still required for the third-party AI call and is separate from Google. The public sheet **does not create task records, dispatch workflows, launch agents, merge PRs or claim LIVE**. Copy the editable brief to the protected Agent Commander editor opened in a separate tab. Do not label this as one-click execution until a trusted, auditable write endpoint exists.

## Release and functional acceptance

The independent Vercel project is manually deployed. Overlay all changed files and the new commander-task-input.js onto the complete prior READY deployment source manifest; never deploy a partial GitHub archive. Preserve every existing API, legacy chart and route. Run the focused Node source tests and physical iPhone Safari checks: permission, mic start/stop, transcript edit, keyboard fallback, small 320/390/430 px sheet, local and authenticated free AI fallback, copy, protected editor handoff. A merge or Vercel READY is not sufficient to assert the feature is functionally LIVE.


## Updated owner requirement: processed task becomes a full executor prompt

Owner clarified the goal after initial PR publication. The «Разобрать задачу» action must immediately generate an editable, copyable prompt whose FIRST FOUR sections are:
1. **ЧТО НАДО ВЫПОЛНИТЬ** — concrete steps and deliverables from the original description
2. **КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ** — observable success criteria and tests
3. **ОРИЕНТИРЫ КАЧЕСТВА — КТО ДЕЛАЕТ ЭТО ХОРОШО** — relevant real-world named benchmarks, with public documentation URLs and a specific feature to learn, never copy protected IP
4. **КОНТЕКСТ БИЗНЕСА И ПРОЕКТА — ЦЕЛИ И АДРЕСА** — public Holistic House mission, domains, GitHub repository, pertinent product area, working branches, workflow boundaries, no invented street addresses or secrets.

The content adapts to Agent Commander / PR Monitor, Video Studio, or Holistic House core, and is available instantly without a model/API request. Unknowns remain explicit. The existing owner-authenticated OpenRouter Free call can append clearly labelled suggestions after the canonical four blocks, but cannot replace verified context, distort the owner request or overwrite manual edits. Generating a prompt never stores a task, schedules execution, changes PRs or claims LIVE. This is a correctness correction to the existing PR, not a separate product or new provider.


## Hold-to-talk on the central Create button (7 November 2026)

- **Tap** the fixed «+ Создать» dock button: original task entry form and separate manually toggled dictation.
- **Hold** for 420 ms with touch or pen: start the existing Web Speech recognition in Russian by default (EN/ES follow page language), show a pink recording state and do not open the keyboard. Pointer capture, cancel/blur cleanup and click suppression prevent duplicate task opening.
- **Release**: SpeechRecognition.stop() allows final results (bounded 2 seconds), then a separate mobile review screen shows editable recognized text and two actions: **«Сделать промпт»** and **«Спросить Совет ИИ»**. Empty or denied transcripts remain editable rather than simulating success.
- **Prompt** uses the existing approved four-block executor specification; owner-only free enhancement is optional. **Council** uses the existing owner-protected API, one currently verified zero-price OpenRouter :free model to give three explicitly labeled advisory perspectives. This is NOT independently executing experts or a connected Telegram Council.
- The browser/OS may process microphone speech, but no audio file is saved by the public site or sent to our server. The text goes to AI only after a deliberate click, and only with owner authorization. Neither button persists tasks, starts agents or changes code.

**Acceptance:** physical iPhone Safari at 320/390/430 px: tap vs hold, live state, release/final transcript, edited text → prompt, edited text → authenticated Council, microphone denial and unsupported Web Speech, pointercancel and blur, very short press, long speech, late callbacks, keyboard obstruction and reduced-motion mode. Speech permission after an iOS timer may be restricted; in this case display the manual mic/keyboard fallback, never pretend audio was recorded.

**Release:** protected control-plane PR and exact-head CI, then standalone Vercel *full existing deployment manifest* overlay and real iPhone functional smoke. This monitor's GitHub archive is incomplete compared with its manually deployed source; source merge or Vercel READY alone is NOT functional LIVE. No additional paid provider, cron, polling or deployment shortcut.

## Same-origin protected task editor (7 November 2026)

The old `/admin/command-center` handoff belonged to the separate Holistic House site. That hardcoded redirect is removed. On https://holistic-house-pr-monitor.vercel.app owners open `/task-editor.html` in the current tab. The existing owner password/session (`/api/seo-auth`, cookie `hh_seo_owner`) protects the editor and all server-side writes; no separate Google login.

The mobile editor reuses the existing fixed five-tab dock and contains task identity, verbatim source, understanding, PR search and selection, plan, editable prompt, quality checks, agent and mode choices, restrictions, save, handoff, history, PR status and evidence.

- Handoff is ephemeral `sessionStorage` transport, consumed and deleted after owner authorization; it is not public task persistence.
- Private server endpoint `/api/commander-drafts` checks the signed owner cookie, same-origin POST, request bounds, and verifies repository `private=true` and `permissions.push=true`. Requires BOTH protected Vercel variables `HH_PM_GITHUB_WRITE_TOKEN` and `HH_PM_TASKS_PRIVATE_REPO` referring to a private repo under `andylitvinov-design`. These are NOT configured by this PR; public GitHub issues must never store potentially private owner drafts.
- Until a private destination exists, server save and queue are disabled with explicit messaging. A device-only AES-GCM/PBKDF2 encrypted recovery copy (210k rounds) uses a separate password and does not imply cross-device storage.
- Queuing a private issue (`QUEUED_FOR_REVIEW`) is NOT launching an executor or dispatching Actions. A trusted worker integration must be verified before claiming RUNNING.
- PR search reads GitHub live, includes Draft and bounded exhaustive pagination; inability to verify appears as an error, not verified zero. Linked PR state refresh only happens while page is open. No new background worker, cron or paid service.
- User source edits invalidate the acceptance check until prompt regeneration; optional free AI supplements do not overwrite owner edits.
- Release preserves the full existing manually deployed source manifest including legacy monitor and all API files; never deploy only the GitHub subset. MERGED is not LIVE.

Acceptance: tap «Передать в защищённый редактор» → same-origin route, same tab → owner login or valid existing session → source/prompt remain editable → live PR search, quality checks, draft options, truthful queue status. Guests get 401 on `/api/commander-drafts`. Validate 320/390/430px Safari and production alias.


## AI Projects Brain · public read-only project memory (7 November 2026)

Source of truth: https://github.com/andylitvinov-design/ai-projects-brain/tree/main/projects

- `/memory.html` exposes the existing `projects/` folders plus the active `projects/portfolio-registry.json` routing overlay. Search uses names, aliases and repository names; opening one project reads only its allowlisted public `PROJECT.md`, `STATE.md`, `SYSTEM_MAP.md`, `CODEX_BRIEF.md`, `CHECKS.md`, `DECISIONS.md`, `RISKS.md`, `LOG.md` files.
- The mobile task form can select one folder and **explicitly** append a bounded, source-linked reference bundle to an editable executor prompt. The reference is inserted before step 5 to survive the existing 8,500-character protected draft handoff. The agent must verify current code, CI, merge and LIVE independently.
- No localStorage, audio storage, personal/client data, credentials, server-side GitHub token, new OpenRouter payment, vector database or background polling. Reading public external content does not grant tool permissions and does not establish system instructions.
- If GitHub API is rate limited, the public registry still works when available. If both sources fail, the app visibly says unavailable; it does not invent a project list. The registry's last_updated field is displayed to prevent confusing old status with current live evidence.
- This is **source integration**, not a persistent autonomous memory write-back or production deployment. Updating durable project memory still happens through reviewed AI Projects Brain commits/PRs; protected Agent Commander remains the only authority to create/execute private tasks.
- Test: `node --test ops/pr-monitor/tests/commander-memory.test.mjs ops/pr-monitor/tests/commander-shell.test.mjs`. Release is the usual **full source-manifest** manual Vercel overlay, exact-HEAD CI, iPhone 320/390/430, and production smoke; never deploy just the new files. Coordinate merge with pending Agent Commander skills/task-tree PRs rather than editing their active HEAD.

## Protected task-bound executor chats · 8 November 2026

A saved owner task opens `/chats.html?task=<uuid>` only after its private GitHub Issue save succeeds; the private chats API re-validates task provenance and creates/reuses one task-ID-bound chat. Shared top navigation links to Skills, Brain Memory and Chats. Private storage is mandatory for cross-device task linking. A local encrypted chat vault is device-only, not a backend queue. Assigned executor and advisory AI are **not** proof of execution, source commit, CI green, Merge or functional LIVE. The existing per-task worker receipt lineage remains an independent gate; never forge a reply from general #1419/#3128 reports.
