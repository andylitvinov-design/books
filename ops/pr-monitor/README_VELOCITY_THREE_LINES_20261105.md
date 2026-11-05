# PR Monitor — three timing lines on the Merge velocity plot (5 Nov 2026)

**Project:** stand-alone Vercel `holistic-house-pr-monitor` (`prj_qD9cWLfw4sVE0Da9nqDyZxHkqI3L`), not the Next.js Holistic House app. Main chart `#hh-merge-velocity`, six bins, selections 1h / 6h / 24h / 72h.

## Display

- Left axis: actual merged production PR/hour (existing green columns).
- Right axis: **one shared P50-minute scale** for all three time-series; never separately normalize lines while making them appear comparable.
- Blue solid: `PR.created_at → PR.merged_at` median from existing complete `/api/pr-stage-timeline` population, bucketed by `merged_at`.
- Orange solid: `PR.created_at → earliest archived GitHub Core CI workflow queued_at` median, *only* for merged PRs with exact trusted archive run matched to creation timestamp; **first observed** CI, not guaranteed true first-ever CI if history missing.
- Purple dashed: `first archived CI queued_at → first CI queued_at on the last different source HEAD SHA`. This is **an upper bound** for a subsequent HEAD update, not its actual GitHub publication time. Render no point (not zero) when no changed HEAD is observed. Exact `push`/`pull_request.synchronize` timestamps would be needed to replace the bound with exact HEAD publication.
- Every bucket lists sample sizes (`n`) for orange/purple, explicit missing values `—`, and a provenance note. Colors distinguish meanings and the dashed style distinguishes proxy evidence.

## Sources, safety and bounds

New read-only `api/pr-merge-ci-head-trends.js` joins a bounded GitHub `is:merged base:codex/public-book-library` search against the existing trusted `HH_CORE_CI_JOURNEY_SHARD_V1` (issue #3419), checking author, schema, PR ID, initial SHA, timestamps and archive source; it never accepts PR.updated_at as a HEAD change. Search paginates at most 5 pages; comments at most 4; incomplete coverage is surfaced, not conflated with zero. CDN s-maxage=90 seconds, in-instance archive cache=2 min. No new scheduled tasks, actions/CI dispatch, paid APIs or provider credentials.

The frontend `pr-velocity-three-lines.js` adds a single on-demand request when the original chart finishes loading/changing range. It re-reads the existing cached stage API to obtain exact bucket coordinates and medians. On failure it **leaves the original blue line and bars intact**. No duplicate chart, iframe, hidden vertical scroll, background poll or misleading sum of population medians.

## One-publish and release conditions

`GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=verified (7 focused local unit checks; browser E2E pending); post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES`

GitHub **control branch** `codex/bootstrap-books` is a source archive only. Opening or merging this PR does **not** publish the independent monitor to Vercel. To release safely: snapshot **all** source digests/assets from currently READY Vercel monitor deployment, preserve original APIs, `index.html`, `legacy.html`, CSS and runtime config byte-for-byte, replace only `pr-two-screen-boot.js`, and add the two JS + CSS assets and one API source. Do not deploy only `ops/pr-monitor` GitHub files as that would delete live assets/functions. Prefer one staged production deploy and promotion after read-only browser checks; do not create previews or builds without an independently verified budget envelope. The Vercel FOCUS billing endpoint currently returns `404 Plan not found`, so **no deployment is authorized under the no-new-charges rule** until cost can be independently bounded. Never claim LIVE from a GitHub merge, READY deploy alone, a screenshot or a CI test.

Acceptance: `node --test tests/pr-monitor-velocity-three-lines.test.cjs` + existing monitor tests; JS syntax; real responsive Chromium/WebKit at 320/390/430; 1/6/24/72 selectors and historical empty bins; source/E2E `/api/pr-merge-ci-head-trends` returns 200 with matching 6 bin timestamps; inspect existing bar values and all other Monitor blocks; production URL and deployment ID readback; no new charge or unapproved service.