# Video mandala: screenshot-driven mobile control simplification (2026-10-29)

## Page identity and evidence
- Owner reference: uploaded iPhone screenshot from 2026-10-29. Shows four topic cards, Style / Animation / Duration row, live ocean-video hero, two large photo/background choices, and five-tab Support dock.
- Route: `/{en,ru,es}/holistic-support/mandala`; public guest editor with local media. The source URL path is not visible in the screenshot, but this existing route and `HolisticSupportMandalaDock` reproduce the controls and five tabs. **Identity inferred from the exact component tree; visual capture required to confirm.**
- React owner: `components/mandala-free-video-studio.tsx`, CSS `components/mandala-video-mobile.module.css`; page `app/[locale]/holistic-support/mandala/page.tsx`.
- Base branch and snapshot: `codex/public-book-library` at `4ffac122b2f9c662ee8f976796c46816c4950ace`. Vercel deployment state and production alias must be checked separately at merge.
- Visible content crop: approx. 704 physical px across, Safari in-app browser screenshot including status/navigation bars; CSS viewport and DPR cannot be inferred precisely. Do **not** match browser chrome as page UI.
- EN/RU/ES localization maintained; local user photo stays in memory, does not upload, and remains opt-in. The existing consent checkbox is separate from the photo inclusion checkbox.

## Order and component action map
| Order | Region | Existing selector | Change |
|---|---|---|---|
| 1 | Optional user/goal photo | new `[data-mandala-output-mode]` compact row | One photo inclusion checkbox followed by small inline `onPickPhoto` link; newly chosen photo enables opt-in; toggling off keeps local selection but excludes it from video |
| 2 | Energy / Money / Relationships / Goals (plus Life/Wellbeing in rail) | `[data-video-category-rail]` | Keep real theme state. Switching theme must not silently reset photo choice. Ensure four first cards fit narrow iPhone width. |
| 3 | Real video preview and primary free-create CTA | `[data-video-mandala-hero]` | Keep live canvas/film, intro, sound, CTA; no top filter interruption |
| 4 | Real template thumbnails | `#video-templates` | Keep existing scenes, photo suppression in previews when toggled off |
| 5 | Advanced quick choices (collapsed) | `[data-video-advanced-filters]` | Move existing Style / Animation / Duration selectors **below** preview/gallery; retain original state handlers |
| 6 | Wish, affirmations, 8-session guided plan, full settings, audio, consent, export, download/share | existing panels | Preserve user choices, private local photo handling, preview, final render, source media, ability to download |
| 7 | Five-tab Support dock | `[data-mandala-support-bottom-nav]` | Unchanged; do not add a duplicate dock |

## Behavior
- Initial: checkbox OFF, generate video background-only if user does not select a photo. Existing photo is never implicitly shared; it is not uploaded.
- Photo link opens the existing native input (JPG/PNG/WebP); selected local photo sets the inclusion checkbox ON; checkbox OFF excludes the image from preview, thumbnails and export. If checkbox ON with no image, primary CTA invokes existing photo picker.
- Separate proof-of-rights consent remains required to export personal photo, with focus/scroll guidance.
- Theme filter preserves photo checkbox; template/style/motion/duration remain interactive below hero.
- No changes to auth, APIs, Supabase, CRM, payments, paid renderers, music licensing or storage.

## Browser/visual gates
| View | Current status |
|---|---|
| Chromium 320/354/390/430 | Not yet captured; browser CI required |
| WebKit 320/390/430 | Not yet captured; browser CI required |
| Overlay/heatmap of owner screenshot | Not yet available due browser chrome/viewport and missing live candidate capture; do not claim visual match |
| Auth/real signed-in | Not applicable to guest-local photo flow; private client cloud save remains separate |
| Actual photo opt-in, legal consent, theme preservation, 10s background-only export, no upload | Browser workflow updated, **result pending** |
| Production canonical alias + READY + exact SHA | **Pending after reviewed merge** |

Owner approval target: compact controls and clean video-first order, not a pixel-perfect reproduction of the screenshot's old two-button mode.
