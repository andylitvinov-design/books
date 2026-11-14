# My Coach · bilingual natural voice with opt-in Fish Audio

Owner task: real hands-free voice dialogue in the canonical My Coach session, not a separate runner.
Built on merged PR #4370 (SpeechRecognition → Coaching Brain → browser voice).

## The user experience

- The large microphone sits **ahead of** the catalog/topic cards on the first mobile screen.
- One compact consent checkbox for the model / recognition provider is directly above it; full terms can be expanded.
- RU/EN/ES browser speech recognition feeds the existing selected coaching persona (Mira, Max, etc.).
- The same already-authorized Coaching Brain produces text, keeping crisis/stop gate and private account authorization. If the free/ZDR model is unavailable, the screen **clearly says authored offline**, not fake generative AI.
- A separate, default-OFF natural-voice checkbox appears only when Fish free TTS is actually enabled server-side. It plainly states that **the coach's reply** will be sent to Fish and may be used for model improvement.
- Natural voice uses Fish's own default voice, **not the community Harry Potter/actor/dub models** in old ENV IDs. Those unlicensed IDs are never passed.
- Client only requests own server endpoint; key stays in Vercel. The response streams audio/mpeg; browsers without MP3 MediaSource use the existing Blob playback fallback.
- Interrupt, page hide, consent withdrawal, component unmount and session end abort both network and playback. If Fish errors or autoplay is blocked, use device speech with an explanatory message, never a paid model.
- iOS Safari may require another manual microphone tap between turns. This is turn-taking, not full-duplex WebRTC acoustic barge-in.

## Release configuration (all new flags default OFF)

Server env variables on **Vercel Project codex-public-book-library**:

```env
HH_COACHING_FISH_API_KEY=(already in Production, never NEXT_PUBLIC)
HH_MY_COACH_FISH_TTS_ENABLED=true
HH_MY_COACH_FISH_TTS_APPROVED=true
HH_MY_COACH_FISH_FREE_DATA_ACKNOWLEDGED=true
```

The last two flags record an **informed owner-level acknowledgment of the free model's data policy**. Do not set automatically without reviewing the actual vendor terms, commercial usage eligibility and privacy notice. End users must *also* independently opt into natural TTS in the client; an enabled flag never sends their answers by itself.

The server always uses **model s2.1-pro-free** and refuses to select paid s2.1-pro. Fish advertises this free API through **2026-11-30** with fair use and no SLA/retention guarantees. If Fish withdraws free access, natural voice fails closed and device voice remains; there is no paid escalation. Upstream requests have fixed model/header/format, restricted 900-character / 3KB UTF-8 text and **5 requests per minute / 35 per signed-in account per day**. Only the signed-in actor may use it; same-origin and actual consent fields are enforced. Text/audio are not saved by Holistic House.

## QA / evidence required

1. Exact PR HEAD Core + Specialist + privacy/security gates pass; no safety weakening.
2. Vercel Production READY + canonical alias serves the merged commit or verified descendant.
3. Sign in as real test user (never a public unauthenticated test), verify RU and EN recognizer permissions, first AI turn, local authored fallback, Fish opt-in TTS, mute/stop, replay/abort and iPhone Safari background cleanup.
4. Verify API key authentication and **zero real billed usage** on Fish; no real client material is needed for a synthetic readiness probe.
5. Inspect Vercel errors and Fish usage; do not claim full duplex or true AI responses if model probe unavailable.
6. Do not use exact character/movie actor voice clones without verified rights. Default Fish voice only.

## Provider references
- https://fish.audio/blog/s2-1-pro-free-api/
- https://fish.audio/app/developers/
- https://fish.audio/terms/

## Merge with iPhone dictation (13 Nov 2026)
This revision deliberately preserves the current LIVE speech-to-editable-draft, RU/EN
selection, consent gate and compact mobile scene. Natural Fish output is a small
opt-in row beneath the microphone instead of an expanded coach panel.
No third-party ASR is added. The server automatically disables the free TTS
after 2026-11-30 until a new, separately verified free offer is authorized.
