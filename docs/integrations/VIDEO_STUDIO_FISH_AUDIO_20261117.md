# Fish Audio free meditation voice · Video Studio Therapy · 2026-11-17

The production editor already offers on-device Web Speech, six Gemini voices (Mark/Alexander/Leon/Sofia/Maya/Alice), English Deepgram Flux free fallback, optional separately approved xAI paid fallback, and the original local nature WAV mixer. Do not relabel these as Fish voices.

This change uses existing /api/holistic-support/voice and the Voice Studio component, selecting the existing original licensed Fish voice for EN or RU. User explicitly chooses Fish, requests a fixed public sample or consents before sending a short excerpt. Only s2.1-pro-free is transmitted; never fall back to a paid model. The output is PCM WAV 24kHz/mono and can be mixed locally, downloaded or attached to the video. Guest/owner access, same-origin, explicit consent, global rate gates and 20/day Fish cap are retained; no private profile, CRM, test or health data is sent on page load.

The Fish free model is publicly guaranteed only through Nov 30, 2026. At 2026-12-01T00:00Z the Fish option stops even if flags are enabled. Free API requests may be used for model improvement. Confirm provider license, data policy and the offer before a future extension.

Owner must independently approve all **three** production environment flags (do NOT set without authorization):
- HH_VOICE_STUDIO_FISH_ENABLED=true
- HH_VOICE_STUDIO_FISH_OWNER_APPROVED=true (rights to both RU/EN original coaching voices, approved reuse of the existing Fish key)
- HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED=true (Fish free-tier data processing, no personal/medical material)

Already installed: server-only HH_COACHING_FISH_API_KEY and HH_COACHING_FISH_VOICE_EN_ID / HH_COACHING_FISH_VOICE_RU_ID. Do not copy to browser, logs, client env or another service. No new paid API, CI job, DB, deployment or background media generation.

Complete E2E only after activation: confirmed Fish response containing valid playable WAV for EN and RU, listening QA on iPhone, nature mixing and video attachment or download. Unit/provider mocks and green CI alone are not E2E. Release through existing protected PR and hourly Vercel publisher, not manual production deployment.
