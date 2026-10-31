# Mandala Video Studio — single Video Style block · 31 Oct 2026
Status: CODE CANDIDATE / browser QA and LIVE acceptance pending.

## Screen identity
- Reference: owner-provided RU iPhone screenshot of `https://holistichouse.vercel.app/ru/holistic-support/mandala` (guest Video Studio editor; no account/client data).
- Actual: same RU video editor and source selectors; EN/ES same route family. Source screenshot content width ~390 CSS px; iOS browser chrome is excluded from page geometry.
- Canonical route: `/{ru,en,es}/holistic-support/mandala`; component `components/mandala-free-video-studio.tsx`; CSS `components/mandala-video-mobile.module.css`.
- Branch: `codex/public-book-library` is production; reconcile HEAD and Vercel READY SHA at release.

## Screenshot-based visual map
| Order | Page area | Reference / required change | Source selector |
| --- | --- | --- | --- |
| 1 | Goal rail / main 16:9 Canvas video / 6 controls | Keep one real player and controls | `data-video-live-stage`, `data-video-mandala-hero` |
| 2 | Style 3 | Keep visible row of first-party posters below player | `data-video-quick-section="4"` |
| 3 | Advanced scene choices | Move two redundant external galleries INSIDE Style 3, CLOSED by default | `data-video-style-more` |
| 4 | Extra collections | One compact two-choice selector: original Full HD templates OR existing 24 four-MP4 film presets, never two visible sections together | `data-video-style-catalog-tab`, `data-video-scene-library` |
| 5 | Cover/photo | Preserve nested optional cover/photo disclosure, local file handling and consent | `data-video-cover-options` |
| 6 | Phrases and music | Preserve below the single style block | `data-video-quick-phrases`, `data-video-quick-audio-choices` |

## Behavior and constraints
- Visible Style poster, expanded template, and 4-MP4 film preset all update existing state and SAME Canvas/MediaRecorder preview, not a replacement renderer or mock.
- `#video-templates`, Style Change, and other in-page design links open the same optional gallery. EN/RU/ES translations, keyboard/focus, touch targets >=44px and 320–430px no horizontal clipping.
- 24 film presets remain real catalog options; full list is revealed only by `All 24` from Film tab.
- No duplicate component, new API, payment, photo upload, private record or paid AI call.
- Browser evidence needed: actual Chromium/WebKit 320/354/390/430; initial collapsed view; expanding, switching tab, selecting a real MP4; four-source media, native time advancement, ffprobe; screenshot/overlay to original crop.

Visual status: NOT RUN (no interactive local browser connection in this chat).
Functional E2E status: NOT RUN (GitHub exact-head acceptance required).
Live status: NOT DEPLOYED; do not infer from PR or HTTP 200.
