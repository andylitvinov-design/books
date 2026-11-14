# AI Messenger · one-row composer and free device dictation · 2026-11-14

## Identity gate
Owner reference is the **current broken view**, a 706×1536 mobile screenshot showing the first AI Messenger screen: English, AI tab, guest or ordinary account, no established chat turns. Canonical implementation: `/{en,ru,es}/app/messages?section=ai`, `HolisticAgentChat` mounted by Messenger; first state uses `MessengerAiLanding` and the very same composer as ongoing dialogue. This is NOT the My Coach session or admin editor.

## Visible measurement and requested changes
Screenshot's welcome section: video hero, the question bubble, a 2-row composer with a full-width textarea above a row of + / mic / audio / Send icons, then quick-action cards and the unchanged seven-item dock. The user explicitly requests one horizontal composer row and a real microphone for speech-to-text. Keep the existing warm ivory background, dark-green ink, calm teal Send, hero, cards, language picker, current chat mode and bottom navigation. Do not add a separate voice setup field or overwrite optional voice conversation settings.

One shared flexible composer: textarea takes remaining width; + / dictation mic / existing playback / Send stay adjacent and vertically centered with >=44px touch height at 320, 354, 390, 430 CSS px; initial welcome and ongoing pinned states use consistent tokens. No horizontal scrolling, overlap with fixed dock or iPhone keyboard, or second row. On capture, a small transient status bubble is permitted; no sticky blank status bar.

## Real action map and consent
Mic tap → one first-use browser recognition disclosure (same approach as the existing coaching dictation) → browser `SpeechRecognition`/`webkitSpeechRecognition` → only *final* recognized words appended into the **editable** existing draft (EN/RU/ES); partial words never auto-send. Send remains the existing consent/AI backend and locale-detection path; no separate AI or paid STT API. Tap again ends capture. Reset, page hide, changing language, component unmount and submit abort active microphone; no audio recording is kept. Unsupported/denied browsers receive explicit feedback and keyboard dictation fallback.

## Verification
Existing synthetic Chromium/WebKit Messenger browser script now asserts one-row bounding rectangles, 44px controls and no clipping across 320/354/390/430 widths and EN/RU/ES. It simulates Web Speech results to confirm preserved manual draft, no duplicated final words and no auto-send. Existing pure coaching transcription tests are reused. Required Core/Specialist/browser QA, exact production Vercel SHA, same-view rendered screenshots/overlays and physical iOS microphone acceptance are independent release gates and are NOT implied by static source checks.
