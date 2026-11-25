# Ali Free Audio 2.0 — implementation and acceptance (25 Nov 2026)

## Scope and architecture
Keep one canonical Ali web messenger, one selected dialogue provider and the existing account/history consent. Text chat remains accessible; a separate phone action exposes hands-free audio, while the existing hold/tap microphone continues to send individual voice notes. Audio never activates Simli or video and never spends the avatar's video allowance.

Explicit Start talking -> device microphone -> browser recognition or existing iPhone-safe recorded-turn Groq Free endpoint -> latest committed canonical sendSelectedTurn (Free Alchemy or already authorized Gemini Free) -> actual assistant message -> device speech synthesis -> listen again. No independent LLM, cloud TTS, new subscription, recurring job, or database migration. Raw audio is ephemeral in the app; external STT/browser vendor processing is disclosed. Existing history retention/consent rules apply.

### Lifecycle
Pause retires capture and speech callbacks and releases the microphone without resetting conversation messages. Resume is an explicit gesture, using the current chat state. Hidden page suspends audio; End stops it. Typed submit pauses capture; existing voice note controls remain separate. New recognition/account scope requires informed activation; no hidden restart. Unsuitable or overlong recognized text is retained in the draft. Speaker errors and 429 stop safely; text remains available. Interrupt uses an explicit tap (not automatic full-duplex barge-in).

### Budget
Existing Ali authenticated STT limits remain 6/minute and 60/day per user AND sitewide, shared coach global 12/minute, 240/day; guest public pool remains 3/minute, 20/day. These are requests, not minutes or unlimited free calls. No paid fallback or change to Vercel spending. Plain text output is used only for Ali/public recorded calls when expressly selected; coach timestamp output remains unchanged.

## Verification and release gates
Source checks: 151 literal positive/negative source assertions checked in the two relevant suites on candidate code; this is not a full Node or browser run. Require exact-HEAD protected CI including TypeScript, relevant unit and Chromium/WebKit phone viewport regressions. Do not bypass required checks or manually build/deploy Vercel. Production only via existing publisher. Verify canonical alias READY and exact commit lineage; physical iPhone Safari acceptance is still required before claiming actual audio works: consent, two or more distinct conversational turns, pause/hidden page/reopen, interrupt, End, denial, 429, sign-in, same history and no video usage. Mac remote device offline; no actual microphone test conducted here.

## Deferred
Native streaming Gemini Live for Ali is a distinct P2 transport, not shipped here. A future adapter must lock Ali's own system instructions and catalog context server-side, preserve the canonical conversation and approved memory, use confirmed free entitlement with hard quotas and explicit sensitive-data/provider consent, and be tested with the real device. Do not repurpose coaching tokens or silently switch providers. The shipped candidate is turn-based hands-free audio, not native duplex streaming.
