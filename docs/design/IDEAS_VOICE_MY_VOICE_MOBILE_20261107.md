# Approved Ideas Voice / My Voice mobile layout · 7 November 2026

Route: `/{en,ru,es}/holistic-support/mandala`; state: public Video Studio → Ideas/Phrases; phone widths 320/354/390/430px.

## Owner-approved UI
- Retain the existing Holistic Light warm-ivory cards, cinematic 16:9 hero, six upper steps and seven-item fixed bottom dock.
- One compact row of exactly three interactive tabs: **Text**, **Voice**, **My Voice**, localized EN/RU/ES. No duplicated audio generator, recorder, or second project.
- **Voice**: choose one approved phrase → Female/Male (3 each) presets with first-party nature covers → real on-demand voice sample → prominent **Generate voice & apply to video** directly after the sample. Explicit approved-text provider consent remains required before generation but visually precedes voice choices. Optional voice settings move below the CTA in an expandable panel.
- **My Voice**: show **Upload my voice** and **Record a voice** side by side. The Record action is the original native MediaRecorder button triggered by the visitor, not a synthetic click. Preserve browser-session-local recordings, playback, duration, attachment, deletion and rights-controlled audio file upload. No personal recording should be sent to a text-to-speech provider.
- **Text**: keep the existing approved-phrase editor. Its Record control switches to My Voice without automatically requesting microphone access.

## Release acceptance
Preserve source/preview/WAV/Canvas video attachment, no pay-per-use TTS, no new provider or backend migration. Check the existing focused Node tests, Chromium and WebKit browser acceptance at widths 320–430, no overflow or bottom-dock overlap, and production exact-HEAD CI, protected merge plus independently verified Vercel READY/SHA/domain. A successful build or HTTP response is not evidence of real third-party generation or mobile audio playback.

Visual reference: the owner-approved warm mobile Voice mockup and three actual-site iPhone screenshots supplied in the ChatGPT project on 7 Nov 2026.
