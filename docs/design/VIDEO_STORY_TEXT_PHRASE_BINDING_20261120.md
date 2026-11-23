# Montage Story → Text · linked selected phrases (20 Nov 2026)
Route: `/{en,ru,es}/holistic-support/mandala`, guest/editor, Montage → Story.
Reference: user iPhone screenshots of Making Room for Love, six 5-second
scene-photo rows and Montage → Text seven phrase options. Same route and mode,
not practitioner dashboard or separate therapy page.

## Implementation
- Reuses approved #5184 action-to-phrase mapping and #5179 six-source approval.
- Each scene containing a *selected* phrase shows that exact phrase in an ivory/
  light-mint edit row, its current scene/shot time and original story action.
  Opening recognition scene with no selected text stays honest and unchanged.
- Scene edit button opens Montage → Text and the matching existing original
  `MandalaVideoIdeas` pencil/input. If locale or custom phrase differs from the
  current list, it opens Text without selecting an unrelated phrase.
- Any user phrase change naturally invalidates the original `phraseKey`
  photo approval and triggers existing fail-closed source re-approval;
  this UI neither re-renders nor automatically calls a paid provider.
- Original rendering, voice, 30s captions, licenses, rights, H.264/AAC
  codec, credit reservation/refund and My Videos private save remain unchanged.
- Warm ivory/green palette, no new screen, one compact edit row per linked
  phrase, touch/focus styles. Other no-phrase cards keep 66px dimensions.
- RU/EN/ES labels; no diagnosis or guaranteed psychotherapeutic effect.

## Acceptance
Focused: `node --test tests/mandala-automatic-storyboard-tab.test.mjs tests/video-scene-semantic-qa.test.mjs`.
Protected Core + Specialist/WebKit/`hh-merge-check`, typecheck/lint/build.
Visual: real route and state, 320/354/390/430px Safari/WebKit; card geometry,
disabled recording state, long RU/EN/ES captions and safe-area dock.
Functional: edit 5th scene text, return Story, verify recalculated placement,
approve original six sources again, create one 30s H.264/AAC with audio,
download/reopen and private My Videos saved result; no old forest, no repeated
charge. Real physical signed-in iPhone is needed for full device acceptance.
Vercel: hourly publisher only, READY and exact canonical SHA. No manual
extra build/promotion, new paid provider or credit-consuming sample render.
