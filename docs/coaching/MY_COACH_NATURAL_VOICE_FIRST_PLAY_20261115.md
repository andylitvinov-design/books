# My Coach · Natural voice from the very first Play

Owner decision: a robotic iPhone voice is **not** an acceptable coach voice, even as a silent-failure fallback. The coach may display text when natural audio is unavailable but must never claim to be speaking while merely attempting system TTS.

## Current deployment target / routes

- Canonical pages: `/{en,ru,es}/coaching/sessions?coach=<approved-id>` in `components/my-coach-live-dialogue.jsx`, selected AI persona, not human master video.
- Playback runner: `components/my-coach-speech-loop.jsx`. The one prominent Play immediately unlocks Safari's existing audio output. It now requests real MP3, rather than `SpeechSynthesisUtterance`.
- For *first welcome*, `GET /api/coaching/intro?coach=mira&locale=en` is an editorial-only public audio route for **exactly 8 × 3 authored, previously approved, synthetic persona introductions**. It never accepts user speech, user text, conversation history, arbitrary voice IDs or uploaded samples.
- Fish Audio `s2.1-pro-free` is used **only if** the existing free-mode enabled/approved/data-training acknowledgement flags and secure API key are valid. It cannot silently use a paid model. Promotional offer presently documented through **2026-11-30**; the existing `myCoachFishConfig` fails closed at 2026-12-01. New free/public backend route has **12 global upstream requests/minute and 40/day**, atomic via existing first-party database; CDN caches the same authored MP3 for 24 hours on cache hits. No new server, subscription, db migration or provider secret. Google Chirp 3 HD remains an eligible future authenticated provider, **not** automatically activated or charged on this release.
- For *follow-up live replies*, keep the existing authenticated `/api/app/my-coach/voice/synthesize` endpoint, strict per-user quota, account verification, private/no-store response, safety/boundary handling and only previously acknowledged provider. An unauthenticated user can hear the fixed public introduction; arbitrary client-dependent replies are **not** exposed through a public TTS proxy. A login or approved provider configuration is required to voice dynamic turns.
- The session's Replay uses the public editorial MP3 when replaying the first intro and the existing approved private TTS endpoint for model replies.
- The user Play/Replay is the gesture that unlocks the existing Web Audio pipeline on iPhone. A response is marked `speaking` only by real MP3 player `onStart`, and `onEnd` resumes the microphone; no two-tap recorder. All audio is output only, not an audio recording of the user.
- On Fish error/unconfigured quota/vendor latency, no Apple phone voice or wizard voice is played. Use an unobtrusive EN/RU/ES error and permit text or retry. For iOS 27 Web Speech's multi-turn microphone recovery, the browser's short internal `SpeechSynthesisUtterance` cue is set to `volume=0`: no device narration is audible.
- EN/RU/ES privacy disclosure behind the existing compact `Voice privacy` details: only fixed public intro text is sent to Fish at opening; for later signed-in turns Fish free may train on the coach-generated replies, while audio from the microphone is handled by browser speech recognition (which may be external); the first-party service does not store user audio files.

## iPhone visual preservation

The previous reduction to 20dvh made Mira's portrait too small. Restore a moderate `clamp(155px,25dvh,222px)` on normal iPhone screens and `clamp(120px,20dvh,154px)` on very short ones. The single five-action row, visible microphone, text composer and send remain inside the visual viewport; history alone scrolls.

## QA / stop conditions

1. Exact-HEAD source/Node unit tests verify all 24 authored inputs, public-only route shape, provider/quota/expiry fail-closed, user-gesture MP3 player, no coach device playback, no separate consent checkbox or audio-track upload. CI Core, applicable Specialist and `hh-merge-check` **must pass**.
2. Protected squash merge; Vercel Production `READY` SHA descendant of merge; public alias and EN/RU/ES HTML 200; public `/api/coaching/intro?coach=mira&locale=en` responds `audio/mpeg` when Fish free is actually reachable (and 400 for invalid persona). The public endpoint cannot prove a private signed-in model turn.
3. Physical iPhone Safari owner acceptance: first Mira Play **audible** in quality natural voice; RU, EN and ES intros, three consecutive live turns, typed Send, Replay, no status that says speaking without playback, and controls visible with the keyboard. Service returns 503 instead of silently falling back if premium is unavailable. No simulated browser/source test or HTTP success is proof of actual speaker volume.
4. Longer-term durable premium voice: owner-approved Google Chirp 3 HD must be configured in a separately cost-controlled, billing-authorized GCP project, *or* licensed/cached HeyGen voice masters must be supplied. This release does not create new billable cloud resources or pretend those assets are already present.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=source_contract_partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
