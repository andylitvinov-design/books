# PR Monitor — open production PR queue and trends chart recovery (5 Nov 2026)

Scope: **independent** Vercel project `holistic-house-pr-monitor`, not the main Holistic House Next.js site. Source control is `andylitvinov-design/books` branch `codex/bootstrap-books`, but merging that control branch alone does **not** release the Vercel monitor. Preserve **all 109** currently deployed source files from ready deployment `dpl_324TfEkTHXrmyV8b55tbiNWLuUs3` including APIs and the three-line velocity graph.

## Open PR queue

A compact inline bar is placed immediately after the existing two CI cards on the FIRST overview screen. It shows open PR targeting protected `codex/public-book-library` (production), functional/technical/unknown classes, Ready/Draft, total open PR including other target branches. This is **not** the workflows/runners queue. Data comes from a full bounded anonymous GitHub REST open-PR enumeration (100 per page, max 6 pages), not from a 10-minute activity chart. No client credentials, Google/Vercel backend, cron, runner, new provider or paid service. One initial read and explicit reload, with a 15-minute valid local cache; fetch failures show `—` or a labeled older snapshot, never zero.

Classification uses exact `kind:type` labels when present, otherwise conventional PR action/scope and a limited fallback. Mixed/ambiguous names are `unknown`; functional+technical+unknown MUST equal production total. This is heuristic labeling, not an audit of changed-file content. `pr-open-queue.js` exports pure helpers tested by `tests/pr-open-queue-recovery.test.cjs`.

## Original PR created/merged chart

The upper `#hh-pr-trends` chart can lose its colored paths when coverage is unavailable even though the six visible interval cards still have verified `Ф·Т·?` subtotals. `pr-trends-recovery.js` builds a *visual fallback* from those existing exact interval-card numbers (two typed rows per card) with no new API request. It keeps the original chart when valid paths are present and restores it if they reappear. It never treats absent cards/history as zero or changes CI/merge processing.

## Release and budget

GitHub: one atomic multi-file commit, one Ready PR, no repeated code push. Reuse the existing Standard Build Machine demonstrated in production Vercel build logs (4 cores/8 GB, no paid concurrent build). The Vercel Pro plan says non-concurrent standard machines incur no additional build-minute fee. Preserve the 109 Vercel sources byte-for-byte except the existing `pr-two-screen-boot.js`; add only `pr-open-queue.js`, `pr-trends-recovery.js`, `pr-queue-recovery.css`.

Acceptance: six local Node tests, `node --check` for each JS and boot file, complete 109-source continuity, same production canonical alias/READY, both inline sections accessible, original three-line velocity chart still mounted with 1/6/24/72 selectors, genuine mobile browser QA if authorized browser is connected; never claim actual iPhone Safari without a browser run. The source deployment should contain **112** files after safe replacement. No new paid browser testing, monitoring, cron or external resources.