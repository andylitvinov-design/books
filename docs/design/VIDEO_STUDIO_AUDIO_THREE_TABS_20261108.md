# Video Studio — Audio / Music / Voice / Meditations (2026-11-08)

## Goal and scope
Route: `/{en,ru,es}/holistic-support/mandala`. Reconfigure the existing mobile Video Studio without a duplicate renderer/player. Top-stage six tabs become Goal / Ideas / Montage / **Audio** / PRO / Ready. `effects` remains the internal workspace key to avoid breaking saved state and existing local effect/export functions. Owner's 2026-11-07 screenshots of Hypno and Montage Audio are the visual reference.

## Audio stage
- **Music:** relocate the existing `montageAudioCompact` picker from Montage. Keep originals: music library, category filters, favorites, preview, upload/record, rights consent, volume, attach/detach, narration/music bed mixing, local files, and one main player. No second audio state or API.
- **Voice:** mount one existing `MandalaAffirmationVoice` with the approved phrases, six profiles, own-voice record/upload, stale-script check and consent. The standalone optional `MandalaCloudVoiceStudio` stays collapsed in Voice. Ideas retains only its existing idea/phrase authoring and a shortcut to this Audio voice tab.
- **Meditations:** reuse the existing `MandalaPersonalMeditation` editor moved from Ready. Editable free locally-generated script; separate free on-device listening; cloud narration only after an explicit request, auth and provider consent. Keep existing callback `attachMeditationNarration` only on a valid returned audio file. Ready retains save/download/Telegram, ritual and 8-session journey, no second meditation entry.
- **Visual effects:** retain `MandalaHypnocorrectionMobile` within collapsed *Optional visual effects* disclosure, not the principal Audio page. No duplicate voice editor within effects.

## Pricing/privacy safety gate
At the time of this change, `/api/holistic-support/voice` is a **free quota pilot** and does **not** debit the customer's wallet. There is no verified priced narration SKU + authenticated atomic hold/confirm/release or customer-visible quote. Do not simulate, label or trigger account deductions. Explicitly state on the Meditations tab that text and on-device preview are free and account charge is disabled until approved billing is implemented and E2E verified. Real paid voiceover requires: owner-approved price; signed-in server-side balance check and idempotent hold; provider-success confirm or failure release; positive user confirmation and receipt, anti-abuse/idempotency; E2E provider + ledger test. Never include health/test content in push, messenger or marketing pixels. No new paid API or provider configuration is enabled in this PR.

## Acceptance
1. At 320/354/390/430px iPhone viewport: warm ivory/emerald, six top nav, Audio three visible large tap targets, no sideways page scroll, player still 16:9 with clean overlay.
2. Tab switch persists selected track and generated meditation script, does not start playback, render, charge or reveal hidden panel.
3. Music → attach → render uses the current original renderer and consent validations; Voice uses selected approved phrases and invalidates outdated speech; Meditation text can be edited and optionally previewed, no auto-cloud TTS.
4. EN/RU/ES and keyboard + accessible roles/labels verified. Browser smoke should additionally cover iOS WebKit and local provider stubs; green TypeScript alone is not end-to-end delivery.
5. Production is only confirmed once PR exact-head required CI, protected merge, Vercel READY correct SHA and real phone QA all pass.

## Coordination
Related concurrent active work: books #3935 (music + voice independent lanes), #3936 (Text/Voice/My Voice), #3945 (Ready inline meditation), #3904 (Music Match). Integrate/reconcile code and active leases with those owners before a protected merge, do not overwrite parallel PRs or create duplicate features. `GLOBAL_PR_ONE_PUBLISH_V1`: staged_before_open=yes; local_checks=verified when recorded; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
