# My Coach · Gemini Live + Groq streaming — implementation specification
**Date:** 19 November 2026 (Toronto)  
**Scope:** existing /{ru,en,es}/coaching/sessions; NOT a second chat product.  
**Release:** protected PR → exact-HEAD CI/Specialist/hh-merge-check → native merge → existing hourly Vercel publisher. No manual production build, new paid vendor/runner, database, schedule or credential movement.

## Decision and rollout priorities

**P0 — Keep the current production voice loop intact.** The existing iPhone microphone, user-gesture audio unlock, barge/interruption, RU/EN/ES routing, MP4 coach visual, natural TTS, session progress, typed fallback and 20-minute timebox remain. Existing #5188 is merged. The independent #5189 semantic-intelligence branch is not edited or superseded.

**P1 — Groq streaming, zero new API providers.** The existing authorized Groq free-tier and account-ZDR gates remain mandatory. One generation call per turn uses Groq Chat Completions with stream=true and **NO** response_format:json_schema (those are incompatible). The streaming system prompt reuses the reviewed persona, client context and server Director, changing only the output representation to short plain speech. Streaming SSE frames are:
- \`{"type":"delta","value":"…"}\` — **provisional preview only**. Not conversation evidence, saved plan, stage advancement or audible TTS.
- \`{"type":"result","result":{...canonical coaching response...}}\` — final answer after the original parser and \`enforceCoachSessionDirective\`. Only this final result is eligible for the transcript, stage progression and audible output.

Existing authenticated catchall \`POST /api/app/my-coach/stream\` shares same-origin/session, 40/hour per-account turn budget, global free-model reserve and consent/content checks with \`/turn\`. No transcript, microphone data or API key is logged. Invalid chunks, overlong text, wrong model, incomplete upstream, cancelled requests, failed final language/semantic validation and rate limits **fail closed** to a server-authored offline response. No extra paid/free inference is automatically retried. The original strict-JSON \`/turn\` remains selectable under *More options* and remains unchanged. Voice STT/TTS remains the existing stack during this phase; incremental screen text is **not** misleadingly described as full streaming TTS.

**P2 — Gemini Live, gated adapter first.** Prepare a provider adapter with a model allowlist, server-side key and ephemeral-token REST helper. Prefer \`gemini-3.8-live\` as the currently recommended production-oriented Live model; keep \`gemini-3.1-flash-live-preview\` only as a controlled preview fallback and subject both to RU/EN hardware QA. Gemini mode remains disabled in the UI until an actual end-to-end client exists and passes all gates. Required server-only settings:
- \`HH_GEMINI_API_KEY\` — new owner-approved secret, **never** \`NEXT_PUBLIC_*\`
- \`HH_MY_COACH_GEMINI_LIVE_ENABLED=true\`
- \`HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED=true\`
- \`HH_MY_COACH_GEMINI_SPEND_APPROVED=true\`
- \`HH_MY_COACH_GEMINI_DIRECTOR_BRIDGE_VERIFIED=true\`
- Optional \`HH_MY_COACH_GEMINI_MODEL\` — only \`gemini-3.1-flash-live-preview\` or \`gemini-3.8-live\`

The provider adapter is NOT yet exposed via a client token endpoint: Gemini must not see real coaching or health material merely because a public free tier exists. Free Gemini API requests may be used to improve models; permission for real client data and any paid use require explicit review. The helper only creates model-locked, time-limited, one-use ephemeral tokens after *separate* approved backend routing exists. Never expose the permanent API key, never create credentials or turn on spend automatically.

**P3 — Actual Gemini speech-to-speech bridge (required before enabling the mode).**
1. Create an authenticated, origin-protected, rate- and spend-limited token route for a **deliberately started** voice session. Bind a short-lived ephemeral token to the chosen model and AUDIO response modality. Audit browser permission/consent separately for each provider and voice data policy.
2. Add a separate iOS-safe microphone/WebSocket/AudioContext transport, without modifying the existing reliable recorded-turn loop. Capture consented microphone audio as signed 16-bit mono PCM at 16 kHz in ~100 ms chunks, and play incoming 24-kHz PCM incrementally from a user-unlocked AudioContext. Use server transcripts, no raw audio persistence, and explicit locale RU/EN (ES preservation). Natural native voices and correct accent must pass an audible review.
3. Connect *every meaningful coaching response* to the existing server-owned Director (GROW/TGROW/WOOP/OSKAR/Solution Focused/Appreciative Inquiry). The bridge must enforce the selected step, verified client evidence, consent/boundaries, question freshness, safety and client-owned action approval. A Gemini-suggested step, voice transcript or completion must NEVER authorize stage progression. Reject unsolicited generated speech that bypasses the Director. Start with blocking function handoff; do not confuse model-generated advice with an approved plan.
4. Handle user barge-in during synthesis, playback, model thinking and greetings: stop output within a measured target, discard unheard assistant content from future context, accept new user speech, invalidate stale reply epochs, preserve one live microphone where iOS allows it.
5. Handle \`goAway\`, connection cap ~10 min, context window ~15 min (without compression), compression and session resumption. Test a full 20-minute RU and EN session, network drop, foreground/background, AirPods, built-in speakers, device orientation and page navigation. If resumption is incompatible with the chosen data-retention policy, use a new session with **minimal consented Director state**, not raw private history. Never silently change provider after a disconnect.
6. On Gemini outage, offer the user the already available Groq streaming or strict path **only when the user has consented to its own privacy terms**. Do not silently replicate client audio/transcript to a new vendor or run two AI calls for one turn. Preserve final transcript and step on provider switch.

## UX contract
- Mobile-first, RU/EN fully supported, existing ES route must not regress. Route language is authoritative on entry; changing language is explicit and updates ASR, TTS and response language consistently.
- Keep first-screen microphone / waveform / Text / End layout compact; provider controls are optional and tucked into *More options*, not promoted to large cards.
- Show provisional streamed text clearly as \`Draft reply\`, never feed it to progress markers or spoken history. Remove it on stop, new user turn, timeout, error and successful final result.
- Before Gemini is truly verified, its option is visible as **disabled**, not as an inert selectable control; this is intentional.
- Keep the existing separate customer disclosure for microphone STT and natural TTS. No new marketing popups.

## Acceptance / exit conditions
1. Focused Node tests: SSE byte and CRLF fragmentation, one Groq request, one final Director-validated result, old strict route intact; fail-closed 429/401/overlength/wrong-model/partial/no-final, no duplicate charged provider call. Client abort removes a provisional preview and never persists stale assistant text.
2. Free-tier gate, account ZDR, same-origin, authentication, per-account/global limits and no real-client payload in synthetic readiness probe. Secret never present in a browser JS bundle or SSE frame.
3. Genuine specialist iOS WebKit + mobile design tests and full lint/types/Next build; no weakening existing security, privacy, review or audio workflow checks.
4. Physical iPhone Safari acceptance: >=30 turns across RU/EN including greetings, topic correction, 10+ interruptions, pauses, typed send, weak network, AirPods and speaker; capture timestamps for first useful text and first audible sound and count dropped/duplicated turns. Do not claim target latency before measurement.
5. Gemini needs additional **real** RU and EN voice listening QA, 20-min single-session continuity, Director tool-bridge proof, owner approval and spend ceiling before enabled. Absence of a Gemini key is **not** a deployment failure of the Groq mode.
6. Production is LIVE only after protected merge, existing hourly publisher, exact canonical alias SHA, authenticated end-to-end real browser test. A green PR or configured env variable is insufficient.

## Current implementation boundaries
- **Implemented in this PR:** Groq token-stream endpoint, provisional UI text, one existing-model call per turn, final Director gate, optional strict fallback, Gemini guarded provider/token helper, synthetic tests and this specification.
- **Not claimed as implemented:** true Gemini duplex client / authorized Live token route, new voice licenses, physical iPhone validation, genuine streaming TTS from Groq, confidential data approval, extra paid integrations, or LIVE release.
- **No new services/keys/payments activated:** one-publish atomic PR only. Existing hourly deployment policy remains.

\`GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial (syntax and static checks; hosted CI pending); post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES\`
