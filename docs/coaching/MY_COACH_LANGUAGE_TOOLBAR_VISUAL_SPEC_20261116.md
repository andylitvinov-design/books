# My Coach: one language selector for voice, transcription, and AI responses
Owner request: 16 November 2026. Reference: supplied 706 × 1536 px iPhone screenshot of Alex, English session, after introduction. No private client content, screenshots, audio, or provider keys are committed.

## Reference / identity
- Canonical view: `/en/coaching/sessions` (and `/ru/coaching/sessions`, `/es/coaching/sessions`), selected Alex persona, interactive AI-coach voice session. Same route/view; not a specialist editor, dashboard or separate simulation.
- Production source: `codex/public-book-library`; relevant actual files `components/my-coach-live-dialogue.jsx`, `components/my-coach-speech-loop.jsx`, and module CSS.
- Screenshot pixels: 706 × 1536; browser CSS viewport and DPR not independently verified. Exclude phone status bar/chrome for rendered comparisons.
- State: public coach session with the intro displayed, voice Play/mic, transcript and text field visible. Account authentication and vendor consent continue to use existing routes, no extra prompts.

## Region map (source / action)
| Order | Region | Existing source | Scope |
| --- | --- | --- | --- |
| 1 | Holistic House header, coach picker | `sessionTopbar` | KEEP |
| 2 | Animated coach portrait and Play | `sessionHero`, `heroPlayControl` | KEEP; intro locale derives from language |
| 3 | Five-button voice toolbar | `voiceControls` | REPLACE left CC button with native Language select; retain Text, Mic, Replay, End |
| 4 | Voice privacy disclosure | `voicePrivacyDetails` | KEEP |
| 5 | Conversation and transcript | `transcriptHeading`, `transcriptFeed` | REMOVE duplicate language select in header; preserve visible speech |
| 6 | Text composer, More options | `textComposer`, `sessionMore` | KEEP; subtitle toggle moved to More options |
| 7 | Bottom navigation / responsive shell | `sessionBottomNav`, v4 CSS | KEEP without overflow |

## Interaction contract
- Language control: `Auto / RU / EN` in the same iPhone toolbar row; `ES` on the existing Spanish route. Native select is accessible, iOS-ready, and respects existing layout.
- Manual `RU` or `EN` wins over uncertain browser ASR script for every new utterance; speech recognition receives corresponding Web Speech language code. Auto uses the first supported device locale for introduction, and the existing last-transcript/device context for recognizer turns. **Web Speech Auto is not audio-level bilingual recognition.**
- Coach Brain receives the selected response locale; the fixed introductory MP3 and each dynamic natural TTS request use the selected language with the server-controlled fictional persona ID. No user-chosen or unapproved vendor voice ID.
- Switching language while listening restarts an empty recognizer without another Play; when words are already captured, the old turn completes and the next turn uses the new language. No interruption or discarded words.
- Replay retains the locale stored with each coach reply rather than switching its original language unexpectedly.
- Speech-to-text audio, TTS, consent, rate limits, privacy, and Stop behavior are unchanged.

## Acceptance checklist / pending browser evidence
- Source / unit contract for RU/EN override, device Auto, player intro, replay, selected persona TTS, subsequent turns: prepared, subject to existing protected CI.
- Screen widths to render with same-view fixtures: 320 / 354 / 390 / 430 px Chromium, 390 px WebKit, and desktop 768 / 1440. Check native select width, touch height, transcript layout, absence of keyboard/mobile nav overlap.
- Reference overlay / heatmap: NOT RUN — this connector session has no authenticated local browser or preview; do not claim pixel-perfect match.
- Real device mic, RU/EN recognized utterances, actual vendor voice audio and iPhone PWA: NOT YET VERIFIED — require consented manual LIVE QA.
- Production: NOT LIVE until protected merge, existing hourly Vercel release, exact served SHA and mobile speech acceptance. No extra deploy or paid provider call.
