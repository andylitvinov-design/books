# My Coach — interruption + fast natural spoken turns — 18 Nov 2026

## User outcome
After one Play, a client can interrupt Mira/any selected coach *before the spoken answer finishes*. The central microphone button changes to **Перебить и говорить / Interrupt and talk / Interrumpir y hablar** while the coach is speaking or thinking. One tap cancels the current playback or pending generation and starts the next listening turn, retaining the same session, locale, consent and coach. No Replay/Play, duplicated inference, repeated provider text or delayed onended callback.

On compatible non-iOS browsers that already have the required microphone/recorder/audio capabilities, a conservative local barge-in monitor detects sustained **client** voice during a coach's audible response. It stops the outgoing reply immediately and continues capturing the ongoing client phrase with the existing one-turn recorder; at the end of the phrase it calls the SAME preexisting, bounded Groq Whisper STT and then the SAME Coaching Director. No audio recording is saved, no new provider and no new credentials. On iOS/WebKit the monitor is **OFF by default** because the documented microphone+speaker simultaneous audio bug can distort audio; one-tap interruption works by default. A real owner-device pilot may opt in on iPhone with `?coachBarge=1`. `?coachBarge=0` always disables the monitor.

## Latency
- Short recorded-turn silence window: 1,150 ms (was 1,900 ms). The barge-in monitor waits about 1,050 ms after the user's last voiced sound; VAD requires about 450 ms warmup and four high-confidence frames to guard against speaker echo. No inference call is made for silence.
- Server-authorized `voiceTurn: true` selects Groq's low reasoning effort for the formerly medium-effort **spoken** turns; explicit complex comparisons still use high effort, and probe remains low. The existing strict JSON schema, safety assessment, Coaching Director method/stage checks and optional free-only fallback stay unchanged. Voice turns ask for a concise one-to-two-sentence response, ideally under 240 characters; user-requested detail and safety overrides are preserved.
- Existing Fish streaming MP3 and opt-in `?coachStream=1` WebCodecs mode are retained. **This change is not an LLM-token-to-TTS full duplex stream**: the complete server-reviewed coach reply is still validated before its synthesized voice is requested. Do not promise ChatGPT Voice's latency from code alone.

## Implementation and security
- `components/my-coach-speech-loop.jsx`: interruptible spoken/awaiting phases, epoch bump, abort inflight TTS/AI, cancel media sources, suppress stale callbacks, re-arm STT or continue the already-open barge-in recorder. Cancels on End, typed entry, locale switch, navigation or tab hide.
- `lib/personal-coaching/coach-recorded-turn.mjs`: optional echo-resistant VAD monitor, bounded one-chunk local pre-roll, `onSpeech` event, no upload of the whole preceding coach output. Existing one-shot free STT quota/consent/auth, clip length and size guards remain.
- `lib/personal-coaching/coach-barge-in.mjs`: device/opt-in gate, no client-chosen paid provider or microphone bypass.
- `lib/coaching/generative-persona.mjs`, `lib/app/coaching-brain.js`, `lib/coaching/groq-coach-provider.mjs`: bounded voice-turn performance preference only; no relaxation of validation, privacy or payment.
- Voice privacy disclosure clarifies temporary local microphone interruption detection and existing Groq Whisper transcription.

## Acceptance before universally enabling automatic iPhone barge-in
1. Verify focused Node contracts and synthetic Play → interrupt → speak → AI → TTS → interrupt → mic flow, including cancellation during intro, dynamic MP3, and thinking; no duplicate voice/provider calls.
2. Protected exact-HEAD Core, Coach Specialist and browser acceptance; use the existing hourly publisher, never an ad-hoc Vercel deployment.
3. Physical iPhone Safari 27.2 (fresh tab, real speaker/AirPods): one Play, five Russian and five English turns, interrupted mid-sentence, no echos/glitches, no clipped initial words or spurious interruption from coach's own voice. Test `?coachBarge=1&coachStream=1` and compare against default (tap-to-interrupt). Check denied microphone, iOS capture loss, background, Stop, typed turn, single request and no stored audio.
4. Record numeric first-audio latency p50/p95 and real audible quality. Emulator and CI cannot certify genuine device speaker behavior. Leave iOS automatic monitoring opt-in until it passes. If hardware fails, keep default tap-to-interrupt; do not disable safety or enable paid speech.
5. Free Fish S2.1 expires Dec 1, 2026 under existing policy; no automatic paid upgrade. Native Russian Mira voice remains rights-approved-only. Realtime streaming LLM-to-TTS requires separately reviewed provider/transport and is **not claimed implemented**.

No new backend providers, storage, database tables, cron, billing, workflows, paid deployment frequency or microphone permissions beyond the user Play gesture.
