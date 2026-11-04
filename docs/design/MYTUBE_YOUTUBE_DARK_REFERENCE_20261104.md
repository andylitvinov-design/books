# MyTube — YouTube-inspired Dark Mobile · screenshot-to-code specification (2026-11-04)

## Reference and page identity
- **Reference:** owner-supplied YouTube Premium dark-mode screenshot, used as a **visual-language inspiration** rather than a pixel-identical view (different service, data, channel, and navigation).
- **Current source:** owner-supplied mobile screenshot of MyTube showing warm-white canvas, beige `Канал Диониса` series banner, large video thumbnail and six-icon bottom dock.
- **Actual product route:** `/ru/mytube` with `/en/mytube` and `/es/mytube`; public guest video discovery, no account or private dashboard identity.
- **Owner:** `app/[locale]/mytube/page.tsx`, `mytube.module.css`, shared but **variant-scoped** `VideoDiscovery` / `LibraryFeed`, unified mobile dock with a localized MyTube route flag.
- **Production at start:** `codex/public-book-library`; release must re-read latest SHA/READY, never use `codex/bootstrap-books`.

## Visual specification
| Region | Preserve | Design change |
| --- | --- | --- |
| Header | MyTube brand, Video Studio and Library links | Sticky charcoal-black #0f0f0f; red #ff0033 play mark; white brand; compact 57px mobile height |
| Search | Existing real client-side title/topic/author search | Rounded #121212 field, high contrast, accessible focus |
| Category chips | 4 canonical categories + All, preserving ranked filters | Single horizontal scrolling row of graphite #272727 buttons, white active pill, 44px touch target |
| More filters | Subcategory → topic → scenario; audio, sort, saved, source, date, length | Disclosure with `aria-expanded` + `aria-controls`; defaults closed **only on MyTube**; state and handlers preserved |
| Video results | Count and real published/approved list | Compact white count with gray badge; video-first above fold |
| Series | Existing playlist and link | Reduce large beige serif panel to compact charcoal heading |
| Video cards | 16:9 thumbnail, click-to-play youtube-nocookie iframe, original link | Graphite/no borders; white two-line title first, muted channel avatar and metadata; compact circular action icons |
| Bottom dock | Same six destinations and safe-area/visualViewport logic | Charcoal background and muted icons, red active MyTube accent; only when MyTube route is active |
| Sitewide | Privacy, shell, protected APIs, all other routes | **No changes**. Other Holistic Light, Studio Warm Peach, Business and My Course palettes stay intact |

## User journey to retain
Search -> category -> optional refine subcategory/topic/scenario -> ordered approved list -> user click thumbnail -> consent-on-click YouTube embed, or open original public URL. Save/unsave uses browser localStorage; dislike hides from current list. Guest, EN/RU/ES and existing taxonomy rankings remain unchanged. No new API, storage, publishing, paid video render or tracking.

## Acceptance and limitations
- Screen widths: 320 / 354 / 390 / 430 CSS px and larger; Chromium + WebKit mobile, no x-overflow or six-tab dock overlap; touch controls 44px where practical.
- Review rendered page and actual thumbnail/iframe action in a browser before claiming visual/functional E2E.
- This is a styling adaptation, **not** copying YouTube logos, videos or navigation functionality.
- At source authoring time, live mobile screenshot overlay and real iPhone Safari verification were **not yet available**. A green static contract/CI test is not a rendered acceptance result.
