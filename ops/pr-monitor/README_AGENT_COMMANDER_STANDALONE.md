# Holistic House Agent Commander — standalone monitor shell

**Canonical destination:** https://holistic-house-pr-monitor.vercel.app

This is a **mobile-first, public/read-only navigation and briefing surface**, not a fork of the owner database. Its five-tab dock (Home, Tasks, Create, Agents, Projects) is fixed at the bottom on iPhone with safe-area support, using the original screenshot's dark purple visual identity. Public PM task content comes from the *existing* \`/project-management-public.json\`. The existing PR monitor with its complete \`legacy.html\`, 29 APIs and all historic JS/CSS assets remains at \`/pr-monitor.html\`. Nothing removes the old \`legacy.html\` path.

## Routes
- \`/\` — public daily briefing; truthful task snapshot, blockers and entrypoints
- \`/project-management-public.html\` — existing project → stages → subtasks → GitHub PR evidence and safe bulk executor handoff
- \`/agents.html\` — read-only status semantics and links to existing trusted agent/Watchdog tools
- \`/projects.html\` — public project registry
- \`/pr-monitor.html\` — existing PR → Core → repair → merge monitoring with all prior charts
- \`/legacy.html\` — original unchanged standalone PR page as fallback

The top menu links to protected owner Command Center for actual writing. **No Google login is needed for public monitoring**, but creating a private task, authorizing a coding agent, dispatching GitHub Actions and editing owner notes still require existing owner authorization and server-only trusted credentials. Do not proxy private owner endpoints from the public site. The + action copies a draft and launches the protected editor; it **does not save or execute**.

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
