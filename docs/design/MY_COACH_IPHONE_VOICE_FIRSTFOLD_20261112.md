# My Coach · Voice-first iPhone correction · 12 November 2026

## Same-view source
Owner screenshot: `/ru/coaching/sessions?coach=mira` (and EN/ES) in the iPhone in-app browser. Approved style reference: the *same selected AI-coach conversation view*, displayed with Sofia; preserve the real selected Mira, login and session state.

## Root cause and actual repair
Previously the 245–350px portrait, 140%-cropped WebP and duplicated portrait card, progress, prompt, 3 topic cards and permanently expanded model/consent/composer pushed the real microphone, replay and keyboard beneath the phone viewport. Consent was unreachable, so voice looked broken.

Use an app-like 100dvh shell: scroll only introduction (hero 146–190px, or 140 on short heights, aspect-preserved WebP; selected AI role, disclaimer, six steps, prompt, topic actions and history). Keep real browser microphone, keyboard, replay, editable goal and five-tab nav *outside* scrolling and always visible; text composer opens on keyboard tap. Preserve RU/EN/ES, safe areas, reduced-motion stills, live user replies, server auth and no private storage.

On first microphone tap, native dialog shows actual OpenRouter and browser recognizer consent; approval sets consent and directly calls browser recognition within the click. When embedded browser has no SpeechRecognition, show Safari/text alternative, not fictional capture. Replaying latest response uses device speechSynthesis, with visible unsupported error. No new API, Fish Audio billing, key, database, workflow or prerecorded fake speech.

## Acceptance gates
Run `node --test tests/my-coach-session-viewport.test.mjs tests/my-coach-living-dialogue.test.mjs tests/coaching-live-voice.test.mjs tests/my-coach-photographic-motion.test.mjs`, lint/build and exact-HEAD GitHub Core/Specialist/hh-merge-check. Browser Chromium/WebKit at 320/354/390/430 + short 390×650, same-route RU/EN/ES screenshot geometry, topic taps, consent/cancel, text send, speaking, replay, iOS mic permissions and keyboard. Only mark LIVE after protected merge and Vercel READY SHA on canonical alias.