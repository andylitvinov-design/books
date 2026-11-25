# MyTube · YouTube continuation after owned videos — plan, implementation specification and Codex Goal

**Goal / owner instruction, 13 November 2026:** when visitors reach the end of matching, approved MyTube content, continue recommendations with clearly identified public YouTube links. No third-party video may be misrepresented as our master, our own course or a rights-cleared downloadable asset.

**Target:** `andylitvinov-design/books`, production source branch `codex/public-book-library`, `https://holistichouse.vercel.app/{ru,en,es}/mytube`. Read `GLOBAL_PR_ONE_PUBLISH_V1` and repo `AGENTS.md` / `docs/operations/CI_RELEASE_POLICY.md` before any remote source write. Related issue: #4532. Overlapping open PR: #4510 touches `components/video-discovery.tsx`; coordinate or rebase safely, do not update its head without lease.

## Implementation program

| Stage | Work | Acceptance |
|---|---|---|
| 1 · Read | Inspect canonical MyTube collection + filters, course group expansion, approval gates, open PR ownership and exact production SHA | Don't add a parallel catalog or break Masters / numbered lessons |
| 2 · Match | Map public shelf/category/collection/goal/language to a finite, multilingual deterministic query | No text from client profiles, tests, chat or user-entered search is sent to YouTube |
| 3 · Provider | Server-only YouTube Data API v3 `search.list`, then `videos.list` validation, shared 24h cache and quota-controlled enablement | Secret never exposed; only `public`, embeddable, verifiable-duration videos; <=900 seconds for Practices |
| 4 · UI | Lazy intersection-based continuation AFTER local results, 12 video cards at a time, compact mobile dark theme, external attribution and YouTube original link | RU/EN/ES; no duplicates, no false author endorsement; courses wait until every collection visible |
| 5 · Resilience | Feature flags off by default; if key, free-quota approval, search or metadata unavailable, provide category-specific YouTube search link | No fabricated videos, paywall, hidden requests or unapproved third-party content |
| 6 · Test | Node unit/source checks, repository TypeScript/ESLint/Next, exact-HEAD Core/Specialist/Guard and Chromium/WebKit mobile | Verify 320/390/430px, keyboard, redirects, filters and dropdown transitions |
| 7 · Release | One atomic source publish only if billing/owner lease clear; native protected PR merge; independent Vercel READY deployment SHA and real live browsing | No claimed LIVE until actual URL served and functional E2E verified |

## Scope and detailed contracts

**Client:** existing `VideoDiscovery` renders all owned Practices/Masters/Videos (the existing `LibraryFeed` shows complete MyTube shelves). It must mount `MyTubeYoutubeContinuation` only *after* that rendered list. For Courses, the course component shows 6 collapsed collections with a *Show more* control; only mount the continuation when all of that filtered course list is visible. Never insert third-party items into the `ordered` array, `LibraryFeed`’s approval status, the owner dashboard, course `lessons`, or personal `My Videos`.

**Endpoint:** `GET /api/public/mytube-youtube?shelf=practices|courses|masters|videos&locale=ru|en|es&language=all|ru|en|es&category=...&collection=...&goal=...`. Every value is checked against an allowlist; unknown query params are rejected. A finite topic is selected by **collection > category > goal > shelf** for Practices; otherwise only shelf. UI free-text search and Saved-only / source-specific views do not trigger external discovery. Result shape `{source:'youtube',mode:'ok'|'fallback',videos:[{id,provider,title,channel,href,poster,durationSeconds}],searchUrl}`.

**YouTube API:** server-only `YOUTUBE_DATA_API_KEY`, `HH_MYTUBE_YOUTUBE_ENABLED=true`, `HH_MYTUBE_YOUTUBE_FREE_QUOTA_CONFIRMED=true`. The two flags MUST remain disabled until the owner confirms the existing Google API project's nonbillable quota and API key has been securely configured (never ask for key in chat, do not decrypt credentials). Use `search.list` only for `type=video` with `safeSearch=moderate`, `videoEmbeddable=true`, `videoSyndicated=true`, `relevanceLanguage`, `maxResults=50`, then `videos.list(part=snippet,contentDetails,status)` for actual duration, public privacy, embed status and source metadata. Exclude Made for Kids from this playlist. No autoplay, download, remix, unauthorized rebroadcast, video export, fake translation or unverified meditations. User always has a direct YouTube watch link.

**Quota model:** one search + one metadata fetch per cached topic/language/shelf; each shared public query is cached for 24hs via existing Next cache. This reduces calls but **is not a cross-region globally atomic daily quota counter**. Google publishes a default of **100 `search.list` calls/day**, so do NOT enable live until the provider quota and traffic policy are checked. The implementation shows a direct YouTube search link when Google refuses the call. No paid recurring infrastructure, credential creation, cron or workers. If rigorous globally bounded quotas are demanded, implement a verified existing shared database counter/lock in a separate authorized change. Keep cached metadata <=30 days and do not store YouTube audiovisual files.

**Failure response:** on unavailable/disabled provider return `mode=fallback` with sanitized topical search URL and no fake cards. Client can open the real YouTube results page. Every external card is separately labeled as YouTube and states the real channel. Saved-only, custom free-text and source-filtered MyTube are not silently broadened. No health, personal or test inference.

**QA negative cases:** irrelevant video titles, duplicate YouTube IDs, unknown/private/unlisted/embed-disabled/Made For Kids/live/zero-duration/over-15m practices, unknown key/config, API 403/429/timeout, user text passed in URL, strange category, changing selected tab, changing language, All vs course series expansion and hidden local course collections. Do not weaken existing approval gates in `lib/video-discovery/catalog.mjs`.

## Codex execution prompt — Goal

> **Goal:** Implement MyTube public YouTube continuation from existing owner-approved issue [#4532](https://github.com/andylitvinov-design/books/issues/4532) in `andylitvinov-design/books`, using the provided source bundle as a pre-staged implementation, against the current `codex/public-book-library` branch. First read [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md), `AGENTS.md` and `docs/operations/CI_RELEASE_POLICY.md`; inspect PR #4510 and ownership/lease. Verify current Vercel cost before any remote branch write. Rebase/port the smallest cohesive patch, run local Node/TS/ESLint/Next and relevant real WebKit/Chromium tests. Do not run an unfunded API; keep flags off until existing secret + free quota confirmed. Publish **one** coherent atomic HEAD and protected ready PR if allowed; complete exact-HEAD Core/Specialist/Guard, native auto-merge, Vercel READY/alias SHA and read-only iPhone live acceptance. If blocked by confirmed billing, API configuration or ownership, stage the patch without remote publication, document the exact blocker in #4532, and **never call it LIVE**.

**Status as of staging:** Source-only bundle prepared; unit checks feasible in isolated local runtime, not full repo build; remote Mac Desktop Commander is offline. Vercel API billing charges returns `404 Plan not found`; current free headroom cannot be independently verified. PR #4510 remains open on the same component. No remote code branch, build, API calls or LIVE release initiated by the bundle.

## Source mapping

- New `lib/video-discovery/mytube-youtube.mjs` + declaration: finite scope, query, ISO duration and provider-result validation.
- New `app/api/public/mytube-youtube/route.ts`: server-only, flagged, 24h cached, API-backed JSON.
- New `components/mytube-youtube-continuation.tsx` + scoped CSS: lazy loading, split-source links, responsive grid, direct fallback search.
- Edits to `components/video-discovery.tsx`, `components/mytube-course-playlists.tsx`: append after entire local output; never splice external into ranked source.
- New focused `tests/mytube-youtube-continuation.test.mjs`: query privacy, durations, public/embeddable/content boundary, integration proof.

**Provider sources:** https://developers.google.com/youtube/data/determine_quota_cost , https://developers.google.com/youtube/data/reference/rest/v3/search/list , https://developers.google.com/youtube/data/reference/rest/v3/videos/list , https://developers.google.com/youtube/terms/developer-policies .
