# PR Monitor direct HTML restoration — 12 November 2026

Incident: iPhone Safari opened `/pr-monitor.html` but remained indefinitely on the dark “Загружаю проверенный монитор PR…” page. The previous 687-byte entry relied on an external `pr-two-screen-boot.js` asynchronously fetching `/legacy.html`, then calling `document.open(); document.write(...); document.close()`. HTTP 200 and valid JS syntax did **not** prove that the bootstrap completed on iPhone.

The replacement `pr-monitor.html` is a **generated snapshot of the complete verified existing legacy markup plus all exact UI additions of the LIVE Nov 7 boot loader**. This is source-preserving: no new data backend, no token, no new polling, no replacement of graphs, compact PR KPIs, journey, or recommendations. On initial HTML parsing, the real queue content is present even if JavaScript is delayed or fails. Existing scripts enhance it, without asynchronous document rewriting. The small mobile override is moved from an inline `<style>` (blocked by strict CSP) into the same-origin stylesheet `pr-monitor-mobile-safe.css`.

Test: `node --test ops/pr-monitor/tests/pr-monitor-direct-entry.test.cjs`. Source fails closed on a loading placeholder, missing core/chart/lifecycle references, or missing mobile styles. It is not, by itself, visual browser acceptance.

**Safe publish:** after protected control-plane merge, stage two exact Vercel Project Routes for `/pr-monitor.html` and `/pr-monitor-mobile-safe.css` to the **immutable merged SHA**. Preserve existing routing table, CSP, owner auth, API functions and current complete underlying deployment. Test staged URLs for HTML+JS+CSS (and a real iPhone when possible); then promote **routes only** without creating/replacing a partial Vercel build. Roll back to previous routing version if anything breaks. A future independent full deployment must include this direct page, the CSS and the complete legacy bundle.

Owner policy: GLOBAL_PR_ONE_PUBLISH_V1, no new paid services or CI workflows. LIVE verification is separate from GitHub merge.
