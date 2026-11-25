# Holistic House · Live Voice over Coaching Brain v1

Date: 2026-11-10
PR: #4187
Parent: #4018 and #4016
Target: existing `codex/public-book-library` production source.

## Implemented (guarded; NOT LIVE)

A single optional **Live Voice** panel sits in the existing signed-in Personal Coaching
session, beside the existing self-guided questions and Coaching Brain text dialogue.
It is not a new app, second account, session runner, coach persona database or model engine.

- RU/EN/ES localized modal and speech language selection; manual language switch
  plus script/diacritic detection for new utterances.
- Browser Web Speech recognition turns microphone input into an ephemeral text turn;
  only finalized words after a silence window are sent. The audio is never
  recorded or uploaded by Holistic House, but the browser/OS recognition provider
  may receive microphone audio as disclosed before Start.
- Browser device speech synthesis reads the reply aloud. Mic off/on, Pause/Resume,
  manual Interrupt, Repeat, End, typed text fallback and background shutdown.
- A recognition session ending silently leaves the mic visually OFF rather than
  pretending to be listening. On iPhone Safari it may require another tap to restart.
- Stop/Interrupt cancels speech playback, invalidates stale promises and aborts
  the client request; server forwards the abort signal to the existing Brain
  adapter which combines it with the 18-second timeout.
- A response marked safety interrupts normal coaching and disables further
  microphone and typed input in that dialogue until explicitly ended.
- The temporary voice conversation is discarded on End and on a new session.
  Nothing is automatically added to Report v2, My Coaching Plan, consultation
  notes, analytics, CRM, localStorage, sessionStorage, or the answer database.
- Exact microphone permission override for `/en/app/coaching` and
  `/ru/app/coaching`; unrelated client/guest, report and API routes keep
  the global microphone deny. Spanish account entry currently uses the EN cabinet
  redirect; Spanish is selectable inside the private voice dialogue.

## Shared brain, one provider policy

`POST /api/app/coaching/voice/turn` is a **voice-to-Coaching-Brain adapter**, not
an independent LLM gateway. It verifies same-origin request, authenticated
Supabase actor and exact account header, explicit current voice consent, size
limits and per-account 8/minute and 90/day rate limits. It maps recent ephemeral
voice turns onto the existing `personalCoachingBrainTurn()` contract, whose
server validates current encrypted session owner/status and conversation safety.

Voice therefore inherits existing reviewed GROW / MI / WOOP / solution-focused /
OSKAR / values / decision-options selection, contextual stage choice and evidence
rules. Client decisions are never silently confirmed.

Existing Coaching Brain uses the Agent Director **verified OpenRouter `:free`**
text gateway (live catalogue must verify zero-priced text input/output and
an explicitly zero-cost response). Voice overlays
`provider.data_collection:'deny'`, preserves
`provider.max_price:{prompt:0,completion:0}` and disables fallback escalation.
If no model satisfies these conditions or the gateway fails, Coaching Brain
returns a clearly marked **offline authored question**, not a fake AI response.
There is no separate paid OpenRouter model/key or new vendor subscription.

## Deployment switches (all default OFF)

1. `NEXT_PUBLIC_HH_COACHING_LIVE_VOICE_UI=true` (build-time client UI)
2. `HH_COACHING_LIVE_VOICE_ENABLED=true` (server)
3. `HH_COACHING_LIVE_VOICE_APPROVED=true` (explicit owner provider/privacy approval)
4. `HH_COACHING_BRAIN_ENABLED=true` (existing text Brain gate)
5. Existing `HH_AGENT_OPENROUTER_ENABLED` and `HH_AGENT_OPENROUTER_API_KEY`
   are only needed for optional verified free model responses. If unavailable,
   the authored offline questions remain the safe fallback.

No keys/flags are set or enabled by this PR. A merge is not provider approval.
The browser speech engine and OpenRouter model provider have their own data
processing/retention conditions. Approval must be based on reviewed terms
and real device testing. Stop does not guarantee a model provider refunds a
previously accepted call, even when an upstream abort is forwarded.

## Required acceptance

- Check exact PR SHA: voice + Brain focused tests, Node/JSX parsing, scoped ESLint,
  TypeScript, Next build, GitHub guard, production Core and relevant WebKit/mobile.
- Confirm the current production branch integration preserves Coaching Brain's
  text panel, authenticated session, chosen confirmed action, action-plan/PDF
  and no mic permission on other routes.
- On an approved staging identity: consent rejection, first voice reply,
  short utterance, real EN/RU/ES language change, denied microphone, no-TTS,
  mic on/off, overlapping transcription, pause/resume, manual interrupt during
  pending model response and during playback, background/route exit,
  terminal safety handoff, offline zero-cost fallback and no leaked transcript.
- Account A must not be able to invoke account B's session; signed-out/finished
  sessions and invalid histories return guarded errors.
- Verify actual zero-cost backend receipt and provider non-collection policy.
- Prove Vercel Production READY exact SHA, canonical deployment alias and
  signed-in real iPhone Safari 320/390/430px after protected merge before LIVE.

## What is *not* implemented

This v1 is **turn-taking**, not an always-open native full-duplex WebRTC session.
Manual Interrupt stops the coach; automatic acoustic barge-in without touching
the screen is not yet certified. Native realtime requires an approved WebRTC
provider, ephemeral account-scoped media credential, server-authoritative
20-minute lease and usage cost cap, interruption events and hard-stop watchdog.
Do not rebrand the public LiveKit owner→audience broadcast as private AI voice.
