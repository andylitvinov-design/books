# Mandala Video Studio — single editable preview + shared scene library (30 Oct 2026)

## Reference and page identity
- Owner-approved reference: first image of the nine images attached to the 30 Oct 2026 conversation, a mobile cream/emerald storyboard; following eight screenshots show the existing iPhone route. User-supplied images are not committed as repo assets.
- Exact public page: `/{ru,en,es}/holistic-support/mandala`, central Video Studio editor, not dashboard or a separate protected page. No query change. Screenshot comes from an iPhone webview with app dock.
- Page identity: **PASS (route/view intention)**. Auth/cookies and viewport CSS pixels of owner's phone cannot be independently verified from a screenshot; do not claim pixel comparison parity.
- Owning files: `components/mandala-free-video-studio.tsx`; `components/mandala-video-mobile.module.css`; original `MandalaMeditationClient` entry preserved.
- Verified baseline before feature PR: Vercel READY, alias `holistichouse.vercel.app`, branch `codex/public-book-library`, SHA `af815d51e03cc4e9ddec2949a84d9d6ce170952c`; GitHub *default* `codex/bootstrap-books` is not live.
- User screenshot browser chrome, clock and iOS bottom bars are not page content; do not measure/copy them.

## Before / after structural map

| Order | Owner reference | Existing production | This change / selector |
| --- | --- | --- | --- |
| 0 | Small Holistic House hero + four benefits | Full hero, intro and four benefits | Keep existing `data-video-quick-builder` header and benefits |
| 1 | Topic photo choices | Six actual first-party photo buttons | Keep `data-video-quick-section="1"` |
| 2 | **One large editable moving video screen** | Main original Canvas video buried in the advanced catalog below format/style | **Move** same `data-video-mandala-hero`/Canvas to `data-video-live-stage` immediately after topic; 16:9, responsive Play/Pause and local settings |
| 2a | Genuine mini-video example under screen | Native H264 demo embedded at side of the quality accordion | **Move** same `data-video-quick-live-preview` and native MP4 source to `data-video-mini-source` below main screen |
| 2b | Popular Full HD looks + 24 montage films | Two disconnected carousels far apart | **Combine** original selectors, original clips and existing 24 × 4-MP4 films under `data-video-scene-library` without new catalogs or uploads |
| 2c | Optional cover / my photo | Cover/photos section buried in advanced settings | **Move** photo upload, sample covers and existing consent into one collapsed `data-video-cover-options` disclosure after the scene rails; consent flow opens it when necessary |
| 3 | Video; video+meditation; eight-session therapy, exclusive golden accordion | Existing format accordion with squeezed split 36:64 by a second video | Keep exclusive cards but make the tier cards full-width, `data-video-quick-tier` |
| 4 | Six styles | Existing quick style picker | Keep `data-video-quick-section="4"`, unchanged handlers |
| 5 | Personal goals, voice/music, affirmations | Existing personal & deeper editor | Keep original on-device state, audio, consent, editable Director and free export; paid Smart/Pro disabled |
| 6 | Price, real Create | Sticky footer covering content on iPhone | Preserve exact price/action and position it **in normal document flow on mobile** to avoid covering cards and native bottom tabs |
| 7 | Advanced settings and guided program | Active professional editor + privacy gates | Keep existing `data-video-quick-legacy`, 49-question director, 8-session journey and original `MediaRecorder` path |

### Visual geometry / breakpoints
- Source screenshot is a **design concept** and may not correspond to a real DOM state/crop; quantitative overlay is **NOT RUN**.
- 320, 354, 390, 430 CSS px: 16:9 dominant central stage; player spans entire card width; mini 16:9 MP4 is max 45% of its own row; 3 formats stack below; scene rails swipe horizontally without page-wide overflow; 44px minimum tap targets; no sticky price obstructing app dock.
- 768 and 1440: stage max-width bounded by original 1040px studio, no duplicate full-screen renderer; full-width format benefits readable.
- Colors: existing cream `#fffdf7`, emerald `#174c3f`, subtle warm gold selection, pale green borders. Use existing media/posters only.

## Real state / privacy flows
- **Topic → Canvas preview:** theme, chosen scene, optional affirmation, image, speed and caption still update original in-page state; Play advances actual Canvas frames (not a fake poster). Preview is temporary, no backend upload.
- **Mini video:** one existing same-origin original MP4 element; no second recorder, separate provider or generation.
- **Popular look:** original thumbnails affect existing `moneyScene`/`otherScene`; original Full HD labels only on real footage.
- **24 film presets:** original `FREE_FILM_PRESETS`, four distinct first-party clips and original `compileFreeFilmPreset`; 4 ready MP4s required to enable local Create.
- **Cover/my photo:** original user blob input remains private; photo+rights opt-in required. If no valid consent, create action opens the relocated disclosure before scrolling to the real checkbox.
- **Free video:** only Local / Basic can create via original Canvas and MediaRecorder. Do not enable paid quote, billing, subscriptions, provider API or live therapy delivery based on preview.

## QA & release gates

| Engine / viewport | Render | Real click & media export | Notes |
| --- | --- | --- | --- |
| Chromium 320/354/390/430, RU/EN/ES | NOT RUN | NOT RUN | Existing `scripts/verify-holistic-mandala-browser.mjs` extended to check order, canvas, mini sample, real Play/selection, overflow |
| WebKit 320/354/390/430, RU/EN/ES | NOT RUN | NOT RUN | Must pass authentic media/codec/consent tests |
| Desktop 768/1440 | NOT RUN | NOT RUN | Avoid layout regression |
| Owner physical iPhone Safari / Share → Save to Files | NOT RUN | NOT RUN | Requires real device |
| Reference-versus-rendered matched PNG crop and overlay | NOT RUN | — | Compare matching view after preview deployment, never declare pixel-perfect from source contracts |

**Mandatory before production**: focused source tests, browser Chromium/WebKit including true recorded video and audio/ffprobe, lint, TypeScript, Next build, exact-head specialist and `release-ready` SUCCESS, PR diff review, Vercel READY matching merge SHA, canonical `holistichouse.vercel.app` alias, actual RU/EN/ES page interaction.

Visual: **IN REVIEW, not verified**. E2E: **NOT RUN**. Live release: **NOT DEPLOYED** at document creation.
