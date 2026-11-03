# Video Studio / Style Video — approved mobile first screen · 3 Nov 2026

## Page identity and fidelity gate

- Canonical page: `/{ru,en,es}/holistic-support/mandala`, guest/public, Video Studio, first **Video style** workspace (`data-active-workspace="video"`).
- Reference: owner-approved last mobile image in 3 Nov 2026 Homeo Video Site conversation, with enlarged typography, warm ivory/emerald Holistic House theme, a 16:9 presentation video, five compact goal tabs, immediate subthemes, popular themes before input, four story preview tiles in one horizontal strip, and the original CTA.
- Do not compare the browser status/address bar or iOS home indicator to page DOM. The five-item global navigation is **not** the six-item Video Studio tabs. Neither is the separate authenticated dashboard or Montage workspace.
- Changes deliberately reuse existing `MandalaFreeVideoStudio`, `MandalaAutoVideoDirector`, `data-video-director-*controls`, one Canvas/MP4 player, one approved media recorder, the same scene/audio pipeline and locale strings. No artificial video render, upload, payment, new API or duplicate screen.

## Top-to-bottom target, iPhone CSS px

1. Existing Holistic House brand header, warm/cream background; desktop and Studio deep functionality preserved.
2. Six workspace tabs (Style Video, Montage, Phrases, Hypno, Course, PRO), always a single horizontal row at widths 320, 354, 390, 430; visible selected state, accessible full names and compact mobile captions.
3. **Real video preview**, centered 16:9 landscape on first workspace, ~180–255 px tall across phone widths, first-party/licensed live Canvas or MP4 with genuine user-triggered Play/Pause. Visible short heading and secondary copy; do not fake playback or autoplay. Original licensed poster reused, with warm treatment. A separate spoken sales presentation is **not represented as recorded content** until owner-approved source media exists.
4. Goal section: single horizontal swipeable row of **five** text/icon pills (Strength, Calm, Love, Money, Growth) in pastel green/blue/pink/gold/lavender, min 70px width, min 44px tap height; the chosen goal stays indicated by border/check. No large photos.
5. Under the goal, six **immediately visible** contextual subtopic pills in one horizontal scroll row, up to two selected, each selection updates the **same** existing user goal and recomputes recommended licensed scenarios. Disabled third choice retains clear disabled state.
6. Describe section: title ~22–26 px, Free AI clarification action *on explicit click only*, six suggested popular goals in compact pills (3 columns at 354–430px; 2 at 320px). **The editable text field is last**, 16px or larger to avoid iOS zoom.
7. Four verified source-backed scenario video tiles in a horizontal row; original exact four selectable licensed first-scene posters. On a 320px screen the fourth may require horizontal swipe to avoid unreadably tiny labels. Maintain actual storyboard editor, music, timeline, confirmation and result controls under the same existing disclosure/action.
8. Existing bright emerald **Choose supportive words, set up audio guide** CTA, >52px height; next genuine workspace transition to Phrases. No medical promises. Keep original fixed public bottom navigation and safe-area padding.

## Behavioral acceptance

- Locales: RU/EN/ES; guest and public route, active Style workspace.
- Viewports 320/354/390/430 and desktop 768/1440.
- Actual geometry in Chromium and WebKit: tabs before hero, hero before goals, goals before topic, topic before story CTA, no document horizontal overflow; permitted *internal* horizontal scrolling.
- Select 1st category then 2nd, toggle two subtopics, ensure third is disabled; deselect to enable. A popular theme uses the same handler; manually typing resets the derived goal selections and feeds recommendations; input remains below suggestions.
- Four real film posters from existing approved catalog; select alternative, open storyboard, confirm, go to Phrases, return to Montage, export only with required permissions; no paid providers or auto-generated media claimed.
- Responsive legible text and visible focus/selection/disabled states; avoid popups or tracking/consent regressions.
- Check regressions via existing `tests/mandala-auto-video-director-ui.test.mjs`, `tests/mandala-workspace-tabs.test.mjs`, `scripts/verify-holistic-mandala-browser.mjs`, Design QA, TypeScript, lint, Next build and exact-head protected CI.
- Image mock is a visual direction, **not** a file/video for production: visual screenshot parity requires same-view captured browser screenshot, overlay and manual review, separate from source-contract success. Physical iPhone, real media export and provider-specific claims need explicit separate E2E evidence.

## Dependency and release

This UI branch is intentionally based on in-flight PR #3242 (multi-track Montage and compact goal behavior), **not** on the unrelated GitHub default branch. Until parent merges, review as a stacked PR and do not rewrite its leased branch. Only after parent is merged, reconcile this branch to current `codex/public-book-library`, confirm mandatory `hh-merge-check`, safe native merge, Vercel READY production serving SHA and canonical site real browser interaction. Merge != live.
