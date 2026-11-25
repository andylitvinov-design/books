# Holistic House — Gemini voice selections (owner-approved)

**Approved:** 2026-11-20. **Status:** final voice **IDs** selected by owner; not an approval to turn on billing, new voice processing, or Gemini Live without its existing gates.

| Persona | RU | EN |
| --- | --- | --- |
| Mira | Erinome | Gacrux |
| Max | Orus | Orus |
| Sofia | Vindemiatrix | Sulafat |
| Alex | Alnilam | Charon |
| Merlin | Sadaltager | Algenib |
| Harry | Achird | Achird |
| Meditations | Algieba | Algieba |

## Implementation contract

- Canonical mapping is `APPROVED_GEMINI_VOICES` and `approvedGeminiVoice(id,locale)` in `lib/coaching/gemini-voice-catalog.mjs`.
- Resolve voice on the server from **persona ID + validated `ru` or `en` locale**. Never let clients supply arbitrary provider voices in production without allowed-list validation.
- For `ru` and `en`, these approved identities are the defaults. `es` voice is **not selected**: maintain current Spanish fallback, with truthful provider disclosure, until owner approves Spanish voices.
- Any audition/QA alternatives are not owner-approved session defaults; do not silently override these selections.
- Meditations use their own `meditations` profile, not a coach persona or coaching-session model.
- Preserve existing privacy, explicit voice-consent, free-tier data-use, rate-limit, spend and Gemini Live / Coach Director bridge gates.
- Gemini 3.8 Flash TTS catalog identity does **not** establish Gemini Live transport availability or equivalent sound quality. Verify both RU and EN samples in real iOS Safari and in full duplex before claiming LIVE.
- Do not spend on synthesis or trigger new Vercel builds solely to record this mapping.

## Acceptance

1. Exactly 14 voice entries (7 personas x RU/EN) match this matrix; test: `node --test tests/my-coach-gemini-approved-voices.test.mjs`.
2. RU/EN calls use mapped voice IDs for each persona when the relevant Gemini engine is actually enabled; no change to Groq, Chirp or Fish fallback.
3. No unintended Spanish voice substitution and no new provider spend/deploy claims.
