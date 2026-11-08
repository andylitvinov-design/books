# Mobile Video Studio · visual fidelity patch · 30 Oct 2026

## Identity / source
- Reference: owner's first 2026-10-30 iPhone concept screenshot; actual: three iPhone guest screenshots from the same Video Studio page.
- Route: /{ru,en,es}/holistic-support/mandala, guest, Video Studio, no account or payments.
- Source of truth: components/mandala-free-video-studio.tsx and components/mandala-video-mobile.module.css (one real renderer), while the mobile diagnostic banner is handled by a selector scoped in the Video Studio CSS module (no shared page-level CSS changes).

## Component map
| Element | Original actual | Patch target |
| --- | --- | --- |
| Global first fold | Big diagnostic promotion before main editor | Existing service banner hidden only on iPhone; compact local brand bar |
| Hero | Tall close-up portrait, no Play | ~174px split heading/portrait, real Play controlling original first-party MP4 |
| Trust benefits | Four tall tiles | One compact four-column line |
| Goals | 3 large tiles visible, others clipped behind long rail | 4–5 smaller image-led goals visible, swipe for six, labels fully wrapped |
| Formats | One real video + exclusive gold accordion, preview narrow | Preserve one real 16:9 video, better width; stack at <=379px to avoid tiny quality buttons |
| Video styles | Large tiles / long page | 4–5 short image tiles visible, real scene selection preserved |
| Customization | Tall square tools | Four 44px+ accessible actions, compact wish |
| Additional settings | Buried in advanced editor | Collapsible step 5 links to existing real controls; no duplicate renderer |
| Price/Create | Sticky layer covers cards | In-flow combined panel above film catalog, no overlap; free-only gate unchanged |
| Film catalog | 24 editable four-MP4 presets | Keep all 24, original licenses and processing on device |

## Acceptance
- 320/354/390/430 guest RU, plus EN/ES at 390; visual screenshot and DOM geometry in existing Mandala Chromium/WebKit workflow.
- No horizontal overflow, 44x44px reachable controls, no pinned bar obscures selection, real clicked scene and hero playback, exclusive accordion, same local MediaRecorder and existing consent/privacy.
- Pre-approved, non-live paid pricing remains a proposal. Never fabricate balance, credits, paid render, checkout, medical efficacy.
- Browser pixel overlay against owner-supplied image requires aligned cropped reference/actual at same DPR and fonts. Different device/browser chrome are excluded from strict pixel matching. Physical Safari Save to Files not proven by CI.

## Merged-source compatibility (2026-10-30)
- Rebased after approved audio PR #2696 into production `9cc7502d1af72a6ccc1342f7d1c340f384747d5b`, applying only unique, non-overlapping quick-UI hunks and preserving the full existing audio code and tests.
- Both video hero MP4 Play and separate native WAV track Play/Pause need successful exact-head Mandala Chromium/WebKit E2E on the combined SHA, not merely independently green predecessor PRs.
- Do not restore duplicate mic/audio panel, create a second video player, or enable paid checkout.
