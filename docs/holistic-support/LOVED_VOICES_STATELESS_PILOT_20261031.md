# Loved Ones Voices — stateless, guest-access pilot · 31 Oct 2026

## Scope and implementation

A first-party, registration-free pilot at `/{ru,en,es}/holistic-support/loved-voices` linked from the existing Mandala editor. This is a separate **consented speech-synthesis** capability, not the six stock voices being delivered by #2629/#2636.

- Visitor imports two owner-provided files, including WhatsApp/Telegram exports. Both are decoded **in the browser** and converted into bounded PCM16 mono 24kHz WAV.
- One must be a 10–30s natural adult voice sample; the other a 2–22s recording of the **same adult speaker** speaking Google's verbatim locale-specific statement. The user explicitly confirms the speaker also approved the exact selected text.
- Invite handoff uses a URL **fragment** (`#t=`) containing the approved short phrase, not a server query parameter. The speaker may share the final WAV via the native phone Share sheet or download. No sign-up is required. The site does not permanently store raw voice, temporary Google voicekey, consent audio, or generated output. The result is a downloadable `audio/wav`, then manually attachable through the existing Video Studio `#video-audio` picker.
- On submission only, both recordings and exact text are sent to Google Gemini. **Google Free Tier may use this content to improve products**. Explain this before collecting agreement. No model calls on page view.
- The provider calls `POST /v1beta/voices` with `store:false`, then `/v1beta/interactions` with the returned stateless `voicekey_...`. No persistent `voice_...` is created. Refuse incomplete/malformed/quiet recordings; require Google's spoken consent verification and fail without a substitute voice.
- English, Russian, Spanish, same-origin POST only, <=240 Unicode characters / up to three lines, max 3.4 MB multipart upload, 50s provider timeout, durable rate limit 1/IP/hour, 3/IP/day, 12 globally/day.

## Strict operator activation (OFF by default)

All three attestations must be explicitly configured on **server only** and only after a real free-tier proof:
- `HH_LOVED_VOICES_ENABLED=true`
- `HH_LOVED_VOICES_FREE_TIER_CONFIRMED=true`
- `HH_LOVED_VOICES_GOOGLE_DATA_PROCESSING_APPROVED=true`

A dedicated `HH_LOVED_VOICES_GEMINI_API_KEY` is preferred. Opt-in reuse of existing `HH_COUNCIL_GEMINI_API_KEY` is allowed **only** with `HH_LOVED_VOICES_USE_COUNCIL_KEY=true`. Feature flags are not billing verification; confirm current model/account quotas and Google terms. Never switch to paid fallback or turn on billing automatically.

## Architecture

- `lib/mandala/loved-voices.mjs`: pure validation, consent strings, provider gating, PCM header/duration/RMS checks.
- `lib/mandala/loved-voice-provider.mjs`: fixed Google host/allowlisted model, bounded JSON, stateless key, WAV check; receives explicit `fetchImpl` for synthetic tests.
- `app/api/holistic-support/loved-voices/route.js`: bounded multipart parser, production config & origin, shared PostgreSQL durable rate service, no-store WAV; GET capability (no secrets).
- `components/mandala-loved-voices.tsx`: original mobile-safe user flow; local decode/resample, error feedback, no external registrations.
- `app/[locale]/holistic-support/loved-voices/page.tsx`: isolated route without touching central Mandala renderer or sound player.
- `tests/loved-voices-core.test.mjs` and `tests/loved-voices-entry.test.mjs`: PCM, text, disabled mode, provider request shape, consent, i18n, source wiring.

## QA before LIVE

1. Run `node --test tests/loved-voices-*.test.mjs`, `npx tsc --noEmit`, scoped ESLint and Next build; verify no new privacy/CI regression.
2. On a **separate approved free-tier project using synthetic/owner-authorized test data only**, verify both actual Google calls; compare true WAV output, naturalness and spoken consent recognition. A mocked provider is NOT real voice replication evidence.
3. Test 320/390/430px Chromium/WebKit on the new page and native iPhone import/play/save; especially WhatsApp M4A and Safari-incompatible Telegram OGG fallback.
4. Reconfirm latest production branch and shared Mandala CI coverage. Merge only after required native GitHub `release-ready` checks and protected branch policies; verify the exact Vercel `READY` commit and canonical domain.
5. Only after live provider cost/privacy approval, turn on three gates and repeat no-billing true-provider E2E.

## Deliberately not implemented in this small pilot

- No account-saved reusable voice profile, queue, invitation-specific consent URL or revocation across sessions, because **no voice is stored**. The consenting speaker can open the same link and record on their own device; any output they share is a synthetic audio file, not a reusable cloning authorization.
- No automatic transfer of WAV into the still-unmerged independent mixer #2636. Users can download and attach the real WAV through the existing local audio picker. Later integrated UI can call the same provider with session-scoped approved phrases and attach resulting `File` directly after #2629/#2636 are production.
- No 24/7 free GPU or background rendering claim; if Google Voice Replication is not truly free for the account, keep OFF and adapt existing local Qwen3-TTS under a separate verified worker and guest speaker-consent flow.

## Privacy & exclusions

No impersonation/deception, financial instructions, phone/URL output, voices of minors, or auto-generated statements falsely attributed to a person. Owner checks exact text; synthetic output must be labelled as synthesized. These browser checkboxes plus provider audio verification do **not** constitute a legally perfect identity proof; high-risk uses require stronger verification and separate authorization.

No new paid API calls, env mutations, database migrations, or production writes occur from the PR alone.
