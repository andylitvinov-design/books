# Holistic House — Hypnocorrection mobile visual handoff · 2026-10-30

## Page identity and comparison
Owner's approved reference is the 390 CSS-pixel iPhone mock from the Holistic House Video Studio discussion, **not** a new dashboard or separate video page. Route: \`/{ru,en,es}/holistic-support/mandala\`; anonymous guest editor, central video stage, sixth quick control "Гипнокоррекция" opened. Production branch: \`codex/public-book-library\`, not GitHub default.

## Regions (top to bottom)
1. Existing Holistic House mobile header, topic tiles, central Canvas/MediaRecorder 16:9 original preview — KEEP. No second render preview.
2. Existing horizontal six-control rail — KEEP, but change last label from "Дополнительно" to "Гипнокоррекция". On 320–430px allow horizontal swipe, labels >=13px.
3. Upon choosing the sixth control, show a single mobile panel with title (26–36px) and a cream/lavender Wave quick-setup banner (18px heading, 14px help, full-width Try button, >=44px).
4. Four compact full-width disclosure cards: "Установки и внушения", "Аудиоэффекты", "Визуальные эффекты", "Личная медитация". Header with first-party thumbnail **78x69px on the left**, 20–25px Georgia label and 14px subtitle, large chevron at right. First group expanded; only one expanded at a time.
5. Expanded group contains **three full-width, vertically stacked feature rows** (except meditation: exactly one Create button). Each feature text >=18px and description ~14px; 42px icon and 54x32 toggle; no 3/4-column cramped tiles. Sections show:
   - Affirmations: visible on-screen text, experiment-only brief frame (reuses existing \`AffirmationSettings.visibility\`), audio repetition (disabled pending real narration mix).
   - Audio: existing authorized recording/voice picker (goes to original audio module), quiet speech and binaural sound (not enabled pending encoded-output tests).
   - Visual: real Canvas light pulse rendered into preview AND captured output, original scene picker for places, original permission-gated personal photo picker.
   - Meditation: one link to original \`MandalaPersonalMeditation\` script editor; system speech preview must never claim a finished audio track.
6. One existing bottom Generate Video button and price/credit summary — KEEP; do not add another CTA or charge.

## Behavioral contract
- Wave preset changes only explicit local settings after user taps Try; never calls a paid provider.
- \`paintHypnoLightOverlay()\` is invoked in initial still, animated preview, initial captured frame, and subsequent recorder frames; repeatable 5–8 cycles/minute, smooth gradients, no strobes.
- Use existing phrase selection and visible-text insertion; short frames are experimental and no proof of subliminal therapy is asserted.
- Original recording, voice rights, photo permissions and audio attach must remain intact. Binaural and whisper are clearly not yet enabled until actual output and headset QA; no bogus success indicators.
- No private photo, symptom history or test results go to external AI/analytics; no clone of a third-party/public figure without independent consent/rights.
- EN/RU/ES content mirrors.

## QA gate
Verify 320/354/375/390/430 CSS px, both Chromium and WebKit, one preview, disclosure ARIA, keyboard, swipe rail, no overflow, reduced motion; run new wave/source tests, focused Mandala E2E (actual MP4/WebM bytes and frame changes), typecheck/lint/build, photo rights/audio privacy tests. No pixel-match certification without rendered screenshot/overlay at the same route/state. Merge only on exact-head CI green; confirm Vercel READY, SHA and canonical alias; physical iPhone Safari Save to Files remains a separate verification.
