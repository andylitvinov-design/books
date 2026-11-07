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
