# Holistic House · Video Studio orientation cards · 16 Nov 2026

## Exact view & baseline
- Owner reference: user-provided iPhone screenshot of the Video Studio **Goals** lower section, not the Style panel; screenshots of different tabs cannot be pixel-compared.
- Canonical real editor: `/{en,ru,es}/holistic-support/mandala`; `/{locale}/video-studio` redirects here.
- Edited view: Montage → Style on the existing guest/signed-in public editor. Existing source owner `components/mandala-free-video-studio.tsx`, styles `components/mandala-video-mobile.module.css`.
- Source production base at patch staging: `df6be30caebc2ff91b51d76b692161c5fa0029ed`. Vercel production is hourly, independent from protected PR merge. No new workflow or deployment.
- Design: Holistic Light / Warm & Alive, warm near-white cards, forest green text, distinct rectangular illustrations (real 16:9 horizontal vs 9:16 vertical), two columns on 320–430px.

## Visual / function block map
| Region | Existing | New behavior |
| --- | --- | --- |
| Style thumbnails | Six selectable licensed films | Keep and preserve underlying selected scenes |
| Brightness | Soft/Bright pair | Remove visible selector; retain internal defaults and old project compatibility |
| Format | Two identical Film icons with ratios | Two accessible, illustrated choices with orientation, ratio, and familiar uses in EN/RU/ES |
| Next · Audio | Working navigation button | Keep same action |

Neither illustration asserts source-MP4 availability nor renders/charges anything. Same `changeVideoAspect` handler, `aria-pressed` and disabled recording/preparing states.

## Acceptance evidence
- In-memory source contracts: format handler preserved, distinct CSS `16/9` and `9/16`, EN/RU/ES captions, no visible Brightness in Montage Style.
- Pending: focused Node tests, targeted lint, typecheck, Next build and rendered browser screenshots/interaction at 320/354/390/430 Chromium & WebKit, matching **Style** tab with same data/state. No cross-tab pixel overlay.
- Await protected exact-HEAD CI and native auto-merge; after merge await ordinary hourly Vercel publication, then verify READY, exact SHA, canonical domain and actual taps.
- Visual status: NOT RUN · functional E2E: NOT RUN · Live: NOT DEPLOYED.
