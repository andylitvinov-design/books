# Holistic House · AI Messenger · four selectable guides
Date: 2026-11-18
Status: implementation PR. Production release requires green CI and owner's existing hourly deploy cost guard.

## Product contract

- The existing AI Messenger remains the ONLY conversation engine, model, order flow and private history.
- Replace the toolbar **past-chat history icon** with **Persona / Персоналия**. Do not move language or add a new toolbar row.
- Opening Persona shows **four face cards, two masculine / two feminine**, with a short character style, independent voice Play/Stop, and selected state.
- Catalog is editorial and fictional, not four human therapists:
  - **Ali** (alex voice/photo mapping): warm reflective male, default.
  - **Max**: clear and energetic male.
  - **Mira**: gentle and attentive female.
  - **Sofia**: thoughtful female.
- Click portrait to select; selection is shared across toolbar, landing, assistant reply photo and browser speech; no conversation reset or page refresh.
- Selection is stored as an **opaque ID only** in localStorage. No message, diagnosis, payment or other private data is added.
- Previous AI history remains available via the Persona chooser footer; Chats and Orders tabs are unchanged.
- The intro hero has an explicit **Listen** button, speaks the same localized phrase in the chosen guide's voice; no automatic playback. The existing video presentation remains separately accessible.

## Voice contract

- Exactly four *server-side mapped* existing My Coach voice IDs. Never accept a free-form voice ID or visitor text.
- English, Russian and Spanish greetings are original, fixed editorial content from `aliPersonaGreeting`.
- Guest previews and hero greet use the same URL `/api/ali/voice/{locale}/{persona}` to share CDN cache; existing Google Chirp 3 HD and Fish gates / rate limits apply.
- Never silently activate a paid provider. Browser/device speech is the fallback if cloud synthesis is off, unavailable or slow; available local voices and prosody may vary by phone.
- Selected device voice and rate apply to spoken **AI Messenger replies** when voice playback is opted into. Existing microphone permission and private audio protections are unchanged.
- Switching language changes speech language, not presenter ID. Natural TTS replies beyond fixed greetings require the existing voice consent/availability flow; there is no uncapped or unsanctioned dynamic TTS endpoint.
- Only one greeting preview plays at once; Stop, close, or change presenter stops existing speech.
- Existing data handling, consent, AI modes, source recommendations, authentication and private chat storage are unchanged.

## Mobile layout / acceptance

1. iPhone narrow 320px, standard 375/393px and landscape: **same one-row** toolbar with locale, persona and new-chat actions; no horizontal overflow.
2. Persona modal: safe-area padding, 2x2 portrait grid, full 44px-or-large selection hit targets, clear Listen/Stop actions, scrollable when device height is small.
3. Person change persists on reload and history remains unchanged.
4. EN/RU/ES labels, greeting speech, menu names, keyboard Escape and focus states.
5. Hero Play voices current presenter; video Play still opens former HeyGen introduction.
6. Natural voice endpoint returns audio only with configured provider and existing quota; otherwise client fallback says the same **fixed** greeting locally.
7. Verify budget: no extra Vercel project, storage store, paid plan or manual deployment; merge under existing production throttle.

## Known limitations

- iOS system TTS voices are OS-dependent. The four natural voices are deterministic only when the already-approved Fish/Chirp provider is configured; the browser fallback can offer different pitch/rate if the OS lacks four distinct voices.
- Live AI speech remains governed by the existing opted-in browser speech feature, not a new per-message cloud TTS bill.
