# Hypno Effects — two-tab warm mobile design, 7 November 2026

## Identity / visual parity
- Reference: owner-approved iPhone Hypno mock in current chat, warm ivory/emerald Video Studio; **component content only** (the screenshot's iOS status bar, top six-step rail, shared main video player and bottom dock already belong to the parent).
- Canonical existing route: `/{ru,en,es}/holistic-support/mandala`, guest Video Studio, active **Hypno / effects** workspace. No new route or duplicate player.
- Implement in `components/mandala-hypnocorrection-mobile.tsx` + its CSS Module. Production base `codex/public-book-library`; preserve PR #3706's shared player and both original export handlers. PR #3707 is unrelated early Mandala CI preflight; never roll it back.

## Concrete design translation
1. Warm near-white rounded panel: sparkle icon, clear heading, optional local Wave preset in the introduction.
2. Two mutually exclusive 44px+ accessible segments: **Visual effects** (initial) and **Audio effects**; phrase display is moved into Visual, not deleted.
3. Visual screen: real light-wave overlay ON/OFF and 3 opacities (12/18/28%) with adjustable 5–8 cycles/min; on-screen readable phrases with actual top/centre/bottom placement; experimental brief frame toggle with no unsupported efficacy claims; original scene chooser and personal-photo picker/removal.
4. Audio screen: original authorized speech, quiet audible repeats with gain/pause and binaural stereo beat with adjustable frequency; disabled/pending/consent paths unchanged.
5. Summary counts genuinely active optional visual/audio effects. Primary CTA remains `onCreate`; secondary remains `onCreateWithoutEffects`. Free Wave never calls paid or external AI; both buttons use original local render/export path.
6. Do **not** add pretend Fairy/Guide/Angel/Sparkles/Yin-Yang generation: that illustrative mock contains conceptual options; their existing scene/add-on selection lives elsewhere (PRO), and new effect engines require separate renderer/export parity and test coverage before clickable activation.

## Acceptance / release evidence needed
- One-publish atomic PR to `codex/public-book-library`; independent exact-HEAD mandatory Core, Mandala Specialist, hh-merge-check.
- iPhone 320/354/390/430 and EN/RU/ES: no horizontal overflow, controls >=44px where possible, visible CTAs, no unexpected dialogs, screen-reader tab state and no visual switch while off.
- Real preview and export must agree for all enabled effects; check visual and audio mode changes, Wave, no-effects export, signed/guest privacy and file rights, MP4/WebKit/Safari. Do not infer E2E from source assertions.
- After merge: Vercel READY production deployment and canonical public alias SHA ancestry, same-route guest screenshot compare and smoke. Manual physical iPhone Save-to-Files remains an explicit separately verified action.

## Boundaries
- No 2nd player, no paid credits, no new APIs or RLS, no uploaded personal notes, no guaranteed clinical/subconscious effects, no automatic tracking.
- Render test and full mobile browser QA **not** proven merely by this design note.
