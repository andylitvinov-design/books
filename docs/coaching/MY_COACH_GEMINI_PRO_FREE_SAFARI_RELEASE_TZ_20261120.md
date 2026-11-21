# My Coach: Gemini Pro experience + Safari interruption · release TZ
Date: 20 November 2026. Source evidence: owner iPhone screenshot in /en/coaching/sessions.

## Observed
Basic Groq remains selected; Safari says "Automatic interruption is unavailable"; a coach inaccurately says "I run on OpenAI's GPT-4".

## Verified root causes
1. Basic/Pro toggle disabled whenever voice phase is not idle. Users cannot select Gemini while speaking.
2. Pro is an EXPERIENCE MODE for Gemini Free text plus separately opted-in Gemini Free TTS, NOT an activated Google Gemini Paid subscription. Production only has a Free API key; Paid key absent and Paid gates OFF.
3. Safari temporarily failed microphone capture and latched STT as unavailable. PR #5270 separately repairs one mic-only capture retry without disabling Groq Whisper.
4. User-visible status overflow; the generative model invents its own provider name without authenticated evidence.

## Implement now in PR #5270
- Preserve all approved compact 5-column, profile/summary, transcript, Director and mobile layouts.
- Let Basic ↔ Pro switch during speaking, listening or thinking: stop local microphone/audio and abort stale provider turn before switching, without losing the prior conversation or goal.
- Require distinct explicit client text consent, then separate TTS consent. Label Pro accurately as Gemini Free, not Paid. If TTS is not consented, never silently send text to Gemini TTS or claim the voice switched.
- Recover Safari microphone capture once, preserve Groq STT after transient MIC_CAPTURE, allow manual interruption, no extra provider billable retry.
- Reject fabricated underlying model claims such as GPT-4 in final server validator; true provenance comes from validated server inference metadata. Preserve RU/EN/ES.
- Use short, actionable voice-monitor notices; retain accessibility.
- Extend existing synthetic/regression CI; no new paid service or Vercel project.

## Later PR #5234 · actual Gemini Live Free duplex
- Independent Free Live feature remains OFF until genuine server-token/Google Live handshake and physical iPhone RU/EN audible 20-minute barge-in verification. Merge with current approved UI, including Basic/Pro and summary/profile; never replace these with old markup.
- Native Live: authenticated one-use Free token, constrained model/voice, 16 kHz input, 24 kHz output, interrupt spoken stream, reconnect/stale-turn cleanup, Director evidence checkpoint without another inference call.
- Free data may be used by Google to improve models: explicit per-client voice and text consent required. Do not enable Paid or silently upgrade providers. Free billing tier is owner-asserted but not independently verified.

## Release acceptance
- Basic/Groq and Pro/Gemini Free switch in mid-session (one click → explicit consent); text and TTS opt-in separately; a visible provider label matches actual server provenance.
- Real 4-voice selections in RU/EN for every approved coach; no falsely claimed GPT-4; no background audio persistence.
- Safari one-tap interruption works during playback and microphone recovers after transient capture loss; failure remains transparent if hardware denies capture.
- All protected exact-head GitHub CI, Next build, voice/WebKit and home acceptance pass; native auto-merge only; existing budget-capped production publisher. Verify READY + canonical holistichouse.vercel.app SHA and real iPhone smoke. Do not claim hardware verified from synthetic CI.
