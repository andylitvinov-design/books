# PR Monitor full dashboard — restore paint reliability (2026-11-12)

Owner reported a blank/not-loading iPhone screen after the full monitor was restored. On LIVE, the canonical HTML was HTTP 200 and contained all modules and the static Commander navigation; this did not prove browser usability.

**Confirmed source-level contributors:** the 7,921-byte canonical page had 28 render-blocking CSS links (27 distinct first-party styles) and 33 scripts, including an initial **synchronous, parser-blocking** `/pr-two-screen-pre.js`. Many resources are Vercel Project Routes to immutable GitHub Raw content. This can cause severe initial render delays and prevent the first visible DOM from appearing during a slow request. Some scripts also use MutationObservers and direct browser GitHub fetches; no physical Safari trace was available to attribute the freeze definitively to any one of them.

**Minimal, non-destructive recovery:**
1. Keep the complete canonical original document and all 33 original JS files, all 27 CSS styles, all PR/CI stages, both full chart engines, recommendations, error funnel, clients and Agent Commander navigation.
2. In exactly the original CSS order, concatenate the 27 CSS responses into one `pr-monitor-bundle.css`; inline the original `commander-shell.css` at its old imported location, removing the CSS `@import` network dependency. Source styles remain unchanged except for that import inlining.
3. Replace 28 HTML stylesheet links with exactly **one** same-origin `/pr-monitor-bundle.css` link. Make the existing 124-byte `pr-two-screen-pre.js` `defer`, removing the initial HTML parser block while retaining execution order before `pr-two-screen.js`. All original later scripts are already deferred.
4. Keep `index.html`, `pr-monitor.html`, `pr-monitor-full.html` byte-identical. Keep the earlier optional 2-chart summary ONLY at `/pr-monitor-fast.html`.
5. Preserve existing Vercel functions, owner authentication, CSP, routes and old deployment. No new project, paid tool, token, cron or polling.

**Release:** merge protected single PR, stage Vercel Routes for three canonical pages and `/pr-monitor-bundle.css` to immutable merged GitHub SHA. Test stage HTML / bundle MIME, original modules and API and the separate Commander pages. Promote routes only after staging passes. Existing route version `f7bf7fe7-079a-48fe-8fd9-ecec35ea58ba` is rollback target. Do NOT redeploy the incomplete project archive.

**Acceptance limitation:** Source/HTTP checks do not measure actual Safari render timing. A real browser screenshot and working navigation are required before calling the underlying iPhone symptom definitively fixed. There is no need to repeat owner prompts or create a new overlapping PR.

GLOBAL_PR_ONE_PUBLISH_V1: source+tests+docs staged before one remote publish; exact-HEAD protected merge, independent LIVE proof.
