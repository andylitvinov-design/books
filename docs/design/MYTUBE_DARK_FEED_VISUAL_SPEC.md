# MyTube dark video feed — screenshot-to-code acceptance (4 Nov 2026)

## Identity / scope
- Owner reference: two supplied iPhone screenshots: current Holistic House MyTube video feed and YouTube Premium dark home feed. Browser chrome/status is excluded.
- Target: existing public `/{ru|en|es}/mytube` feed, no new route, same guest/signed-in public media data. In supplied screenshot bottom dock identifies MyTube; canonical query and authentication state are not visible. **Route inference, not browser-verified identity parity**.
- React page: `app/[locale]/mytube/page.tsx`; existing reusable filter `components/video-discovery.tsx`; existing feed/player `components/library-feed.tsx`; shared `components/unified-mobile-dock.tsx`.
- Verified before change: production `codex/public-book-library`; Vercel canonical `holistichouse.vercel.app` READY on `92ac293ec3d3b4ecee9fbc7f28440e5285b8e7f5` (production branch had already advanced to `29f7935a5c80c053ed6f57782e983c5aa0ead962`).
- Reference: portrait iPhone, browser content only; screenshots have different viewport/device crops. Do not claim pixel-score parity without a live same-view screenshot.

## Element mapping
| Reference area | Existing selector | Intervention |
| --- | --- | --- |
| Platform masthead | `mytube.module.css .topbar/.brand/.playMark` | Dark sticky header, red Play mark, white name |
| Search, horizontal topic chips | `video-discovery.module.css .mytube .topSearch/.lifeAreas` | #121212 search, horizontal gray/white active pills |
| Advanced filters and bookmarks | `video-discovery.module.css .mytube .controls/.advanced/.saved` | Graphite controls and readable states, keep handlers |
| Heading/result count | `video-discovery.module.css .mytube .results` | White title, graphite count |
| Video imagery | `library-feed.module.css .mytubeFeed .visual` | 16:9 hero cover, minimal dark frame |
| Title, source, metadata | `library-feed.tsx` / `.mytubeFeed .details` | Title first, author second, metadata third on MyTube only |
| Actions/bookmarks/dislike | `.mytubeFeed .actions/.preferenceAction` | Compact dark actions, red selected bookmark border |
| Series groups | `.mytubeFeed .seriesHeading` | Dark separators, no beige banner |
| Fixed 6-item dock | `app/unified-mobile-dock.css` scoped `body:has([data-mytube-page])` | Dark dock, red current icon; no shared-layout change |

## Preserved functional journey
- `/{locale}/mytube` → query/category/topic/scenario/language/sort → server-approved public video list; no private test results.
- Poster click → existing consent-on-click `youtube-nocookie` embed; opens only after interaction, no autoplay.
- Save/hide → existing localStorage state and in-memory dismissal; external YouTube source remains distinct.
- Dock keeps all six existing routes, iPhone visual viewport correction and keyboard behavior.

## Acceptance matrix
- Source-focused Node regression: `node --test tests/mytube-dark-surface.test.mjs` (run in CI).
- Existing core/specialist/browser: rely on existing protected production PR checks; no added paid renders or periodic workflows.
- Required rendered QA: Chromium 320/354/390/430 + WebKit 390, EN/RU/ES, guest and signed-in; compare same-route same-viewport screenshots, filter interaction, video click and dock scroll geometry. **Not yet verified from ChatGPT**.
- Original YouTube screenshot is visual inspiration, not a request to reproduce YouTube's branding, content or ads. MyTube remains labeled MyTube.
- READY + SHA + actual canonical browser smoke must be verified after protected merge. Do not infer LIVE from merge or static tests.

Status at source preparation: **code candidate**, visual QA/E2E and LIVE pending.
