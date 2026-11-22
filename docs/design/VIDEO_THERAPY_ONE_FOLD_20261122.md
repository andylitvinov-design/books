# Video Therapy · compact Topic first fold · 22 November 2026

## Page identity / approved source
- **Actual:** anonymous mobile /{en,ru,es}/holistic-support/mandala → Magic Mirror → Video Therapy for Myself → Topic step 1. Not the opening format landing, Therapy meditation tab, authenticated client cabinet or Montage editor.
- **Reference:** owner's fourth attached image, 768 × 1536 composition. The first three iPhone screenshots show the broken same state at successive scroll positions, with browser top/bottom bars and a sticky 7-item site dock. Compare page-content crops, not Safari chrome.
- **Existing source:** components/mandala-magic-mirror-goal.tsx and .module.css, original MandalaFreeVideoStudio intro player, studio shell and bottom dock. **No duplicated player, wallet, provider, app route, or state machine.**

## Visual specification (CSS px, responsive, not a screenshot-as-background)
| Region | Before (mobile CSS) | New target |
| --- | --- | --- |
| Back to Magic Mirror | separate ~36px row | ~32px clickable badge over the hero; keeps navigation |
| Photo hero | min 185px | natural readable ~110–132px, wraps if translation needs more |
| Example video | min 145px | 76–96px cinematic crop, one real Play button |
| Progress strip | 51px | ~35px, 3 steps preserved |
| Wish field | textarea min 117px | initial 47–64px, remains editable/resizable, 500-char limit |
| Composer toolbar | wraps at <=359px | compact one row at 320–430px, all six actions remain |
| Four categories | min 133px EACH | 2×2 grid, ~70–85px tiles with original image, label and check |
| CTA | min 60px plus gaps | ~47px (44px on short view), same real Ideas → Goal action |
| Intro player below | originally hidden until Play | unchanged; user gesture reveals one original player |

Design: warm ivory, cream imagery, forest green and emerald primary, retained native fonts, natural image crops, visible focus and accessible buttons. The approved image has a photo not separately licensed as a site asset; do not paste mockup pixels as UI.

## Geometry, scrolling and safety
- Primary target: first fold at 390×840 and 430×840 browser CSS viewport, with 320/354 horizontal overflow and one-row toolbar contracts. On real Safari chrome or short 320px screens, allow **natural vertical scroll** instead of clipping or truncating accessible text, and preserve keyboard scrolling, dock clearance and large-text zoom.
- Height-aware adaptation at 740px and below reduces ornamental crop/card heights. Layout only; no provider requests, payment/XP charge, auth, profile or video render.
- Functional journeys preserved: me/others/work, pick category → 4 subs → 4 topics; typed wish → local classifier → Ideas Goal; keyboard mic focus, dropdown, poster→existing intro playback, EN/RU/ES.

## Verification and release
- Prepared from production source with one atomic Git tree, isolated CSS and focused CSS contract. Existing comprehensive Mandala browser workflow remains independent. Note **static source tests are not rendered screenshots**.
- Required before LIVE acceptance: exact PR HEAD CI (Core typecheck/lint/Next build, specialist/browser), Chromium/WebKit screenshots at 320/354/390/430 with the same Topic state, actual iPhone Safari dock+CTA visual, protected merge, and normal hourly Vercel production publisher.
- Production alias and SHA must be independently rechecked after the hourly publisher; do not manually deploy or claim a successful video export from this layout patch.
