# PR Monitor + Agent Commander · Full Restoration · 12 Nov 2026

## Owner incident
A previous performance patch (#4423) replaced the canonical PR Monitor with a two-graph summary. The owner lost all historical CI steps, repair funnels, stage delays, per-PR detail, recommendations, and the seven-tab Agent Commander navigation on the main mobile view.

## Recovery completed before source PR
- Existing complete immutable 7,358-byte `pr-monitor-full.html` (merged from #4423) is restored on production routes `/`, `/index.html`, `/pr-monitor.html` via Vercel Project Routes version `6c6a2326-0013-445b-b22c-3f439d3ef08b`.
- The two-graph quick summary is preserved **only** at `/pr-monitor-fast.html` as an optional link, not the default.
- Original agent management URLs remain separate on the same domain: `/briefing.html`, `/agents.html`, `/automations.html`, `/project-management-public.html`, `/chats.html`, `/projects.html`, `/skills.html`, `/task-editor.html`. No second paid Vercel project necessary.
- The full monitor's 58 referenced JS/CSS unique URLs were individually checked on the production alias: all HTTP 200. Both critical graphs, current stage and CI UI, error funnel, recommendation cards, and Commander seven-tab dock are present in source.

## Persistent source fix
The canonical `index.html`, `pr-monitor.html` and `pr-monitor-full.html` now contain **the same full monitor HTML**. None is the lightweight page. A visible static first-paint navigation row with nine paths is inserted before the monitor, styled by `pr-monitor-restored.css`. On successful load, the existing `project-management-nav.js` replaces that fallback row with the original seven-tab mobile dock (without removing any permissions or adding another navigation service). If JS is slow, links to agent management still work.

`verify-release-candidate.cjs` now **requires** real full monitoring, lifecycle, recommendations, error funnel and original Commander navigation on the three canonical entrypoints; validates the fast two-graph summary only on `/pr-monitor-fast.html`. Its full-source gate checks canonical index and full-page byte equality and refuses another fast-only regression.

## Releasing future full bundles
Do not replace the working standalone Vercel deployment with the incomplete GitHub archive. After protected source merge, stage the four restored HTML/CSS project routes to the exact immutable merged SHA. Test paths/asset MIME/API schemas, then promote the routing version, preserving other 39 rules and the underlying full production functions and owner auth. Keep auto-assign on Vercel disabled until the complete-source atomic publisher is proven. Roll back a route version, not an entire site, on failure.

## Limitations
HTTP 200 and source checks are demonstrated; a physical Safari browser paint/interaction acceptance still requires actual browser instrumentation. No new runner, workflow, cron, external AI provider, cost or billing is requested or created.

GLOBAL_PR_ONE_PUBLISH_V1: stage all source, tests and docs before one remote publish, then exact-HEAD merge and separately verify LIVE.
