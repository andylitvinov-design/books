# Video Studio · Concept paragraph + one-column parameters

**Owner reference:** 2026-11-10 iPhone screenshot supplied in chat; private reference is not committed. The reference is the *current/before* layout, not a pixel-perfect approved after mockup.

## Page identity and flow

- Canonical route family: \`/{en,ru,es}/holistic-support/mandala\`, under **MyVideo → Ideas → Concept**. The browser URL and auth state were not visible in the screenshot; source component mapping was independently verified. No route or query changes.
- Real component: \`components/mandala-video-concept.tsx\`; scoped styles: \`components/mandala-video-concept.module.css\`; one canonical generator \`lib/mandala/auto-video-concept.mjs\`.
- Current working source branch: \`codex/public-book-library\`; snapshot on 2026-11-10: \`bf5b8b881\`. Deployment evidence is separate.
- Existing actions retained: guest concept approval, signed-in taxonomy editing, sign-in overlay and return, Style link, storyboard disclosure, downstream \`onApprove\` into the existing Montage.
- New action: a separate prose edit control with save/cancel, including guest access; it saves \`conceptText\` on the canonical approved concept object and does not overwrite short \`mainMessage\` or source audio/transcript.

## Visual section map

| Order | Current screenshot or component | Target |
| --- | --- | --- |
| 1 | Native iPhone chrome, site dock, Ideas/Concept tab | Keep untouched |
| 2 | Heading and brief instruction | Keep, update instruction for narrative editing |
| 3 | Context row + short headline | Replace with readable 2–3 sentence, generated RU/EN/ES prose; edit in place |
| 4 | Four small summary tiles in 2×2 | Remove duplicated cards; canonical values appear once in one-column parameter list |
| 5 | Four emotional tiles in 2×2 | Show inside parameter row as one vertical numbered sequence |
| 6 | 38 details hidden behind disclosure | Display all meaningful creative fields by default, one per full-width card with label, value, source state |
| 7 | Sticky approve/edit footer above site dock | Preserve both genuine handlers and safe-area position |
| 8 | Four story stages and editorial caveats | Preserve existing disclosure and notes |

## Responsive and behavioral contract

- Single column at 320 / 354 / 390 / 430 / 768 / 1440 CSS px; editor, parameter cards, emotional list all have \`grid-template-columns:minmax(0,1fr)\`.
- \`textarea\` limited to 1200 chars, accessible label and visible Save/Cancel; approval disabled while textarea is being edited.
- Preserve RU/EN/ES labels, no new backend, provider, token or login requirement for the narrative text.
- Keep four-stage storyboard visible through existing disclosure, without replacing the Montage editor.
- Avoid implying that proposed scenes/audio or a finished MP4 already exist.
- Existing tests + new prose unit test cover narrative localization, semantic paths, 38 parameter row contract, single column, single approval and data hand-off.

## Verification evidence and limits

- Focused Node test suite: **28 passing** on 2026-11-10 (four test files).
- \`git diff --check\`: PASS.
- Local Next build / browser pixel overlay / private signed-in E2E: **not verified**, isolated Mac did not have installed \`next\`, \`tsc\`, \`eslint\` dependencies; disk too low to safely add dependencies. Mandatory protected PR CI still required.
- UI on iPhone Safari and Vercel LIVE: **not verified until actual deployed SHA + mobile smoke**.

## Merge resolution (2026-11-10)
- Preserve production's confirmed goal-personalization routing, low-confidence topic safeguards and 30-second six-shot creative sketch.
- Keep legacy 38-parameter storage compatibility but display only actual, nonempty, decision-relevant fields, including main idea, meaning, style, motif, scenario and emotional journey, in one column.
- Avoid showing placeholders for missing data; preserve a separate storyboard disclosure and the existing Montage handoff.
- The rendered UI and served production SHA must be independently checked after protected merge.
