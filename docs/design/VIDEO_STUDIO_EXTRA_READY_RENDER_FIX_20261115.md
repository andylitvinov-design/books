# Video Studio · Extra / Ready · owner mobile correction (2026-11-15)

## Page identity and references

- Canonical guest route: `/ru/holistic-support/mandala` (EN/ES use same Video Studio). The owner provided two iPhone images: first shows the **fifth Montage subtab** and second shows **Ready without an exported movie**. They represent two different UI states on the same video-creation page, not two separate apps.
- Component owners: `components/mandala-free-video-studio.tsx`, `mandala-montage-pro-offer.tsx`, `mandala-video-ready.tsx` and existing CSS modules.
- Intended mobile ranges for QA: 320, 354, 390, 430 CSS px. Phone browser/OS chrome is not part of the web-page pixel target.

## Screen corrections

1. Montage fifth subtab label **Extra** for EN/RU/ES, still contains three approved offers (Free / €3 / €5); advanced storyboard accordion is no longer rendered below those choices. Preserve advanced controls in the Story settings path, not a duplicated editor.
2. Ready before generation: ONE existing local **Generate video** action immediately below the preview. Do not repeat the Free / paid radio selection; paid routing stays in Extra. No automatic rendering when opening Ready from Goal/Montage.
3. Ready during generation/verification: show the actual local export status and the EXISTING four-domain check-in questionnaire below the preview. The questionnaire must share Goal scores/state instead of creating a duplicate dataset.
4. Ready after a newly exported file: make the local Blob available to the VISIBLE player so Safari can decode and report loaded/canplay. Keep Save/Telegram unavailable until native playback verification and the original server-side credit operation has completed. After confirmation, retain two real delivery buttons and three next choices: new video, meditation, eight-session course.
5. Preserve original private signed uploads, rights/auth gates, manual payment rules and EN/RU/ES strings. No auto-purchase, paid scene rendering, publish action or unapproved customer-data transfer.

## Root-cause hypothesis and acceptance evidence

On the prior source, `readyGenerationPending` could be cleared only after `resultVideoRef` was decoded and credit-confirmed. On the Ready workspace that legacy verifier was hidden/inert and may not decode on iPhone Safari; meanwhile `MandalaVideoReady.video` was gated by the same pending boolean. This cyclic dependency can keep an otherwise encoded MP4 invisible. The change breaks that UI/verification cycle **without weakening the credit/Save gate**.

Required before claiming live-functional:
- Focused Node suites and TS/ESLint/Next build, then required exact-HEAD CI; do not relax Core.
- WebKit + Chromium 320/354/390/430 layouts: fifth subtab, absence of Extra accordion, Ready button below preview, no bottom dock overlap/overflow, four sliders during render.
- Real per-browser locally encoded MP4/WebM (not a catalog master): native duration/codec/decode; created Blob appears in Ready; user-tap playback; Save to My Videos private signed upload, provider readback and full E2E only with authorized signed-in session.
- Deployment: Vercel READY matching production SHA, canonical alias and real interaction checks. **No browser/iPhone/provider QA is implied by a PR or this specification.**
