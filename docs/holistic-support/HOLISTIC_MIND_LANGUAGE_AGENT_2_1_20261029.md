# Holistic Mind Language Agent 2.1 — implementation & release architecture
**29 October 2026 | Next.js 15 | Source + opt-in browser pilot | NOT asserted live**

## Product target
A single Holistic House guide that understands natural RU/EN/ES conversation, respects changing goals and negative constraints, uses *published* site resources, and can optionally make public safe wording more conversational in a visitor's own browser — without ChatGPT login, OpenAI API keys or model-token billing.

This changes the **existing** Holistic Support Guide via an optional "Free conversation" mode. It deliberately does **not** create a second AI provider, a second CRM, a client profile database, or a new psychotherapy tool. Holistic Intelligence Core / Psychologist Mind remain the authoritative recommended safety and decision layers.

## Layer diagram

```text
HolisticSupportMobile (existing authenticated/public page and approved feeds)
  └─ HolisticSupportInlineGuide (existing guided wizard, untouched by default)
       └─ Free conversation tab
            ├─ language-agent.mjs           [pure, deterministic RU/EN/ES]
            │   ├─ reviewed guide-dialogue safety resolver
            │   ├─ session-local topic + format + negative constraints
            │   └─ validated approved video/test/audio catalog subset
            ├─ HolisticLanguageConversation [React, one mobile panel]
            │   ├─ bounded chat (ephemeral tab state only)
            │   ├─ verified material cards (actual props, no invented IDs)
            │   ├─ clear/reset and user-controlled actions
            │   └─ optional local WebGPU rephrasing (feature flag disabled)
            └─ public/holistic-mind/webllm-worker.mjs
                ├─ explicit loading confirmation
                ├─ fixed 0.2.86 WebLLM runtime + supported Qwen2.5 0.5B model
                ├─ no raw message, private history, profile or health scores sent
                ├─ one editorial response-rephrasing operation only
                └─ abort/terminate + deterministic fallback
```

## New files and exact roles
- `lib/holistic-support/language-agent.mjs`: ephemeral state/intent/risk/constraint/candidate selection.
- `lib/holistic-support/language-agent.d.mts`: stable public contract for TypeScript callers.
- `components/holistic-language-conversation.tsx`: opt-in free-text conversation within the existing guide, including stop/reset and optional WebGPU UI.
- `components/holistic-language-conversation.module.css`: mobile accessible interface.
- `public/holistic-mind/webllm-worker.mjs`: experimental browser-only WebLLM; no tokens or server inference.
- `tests/holistic-language-agent.test.mjs`: multilingual, negative constraints, safety, approved-only behavior.
- `lib/holistic-support/public-reiki-audio-client.{mjs,d.mts}`: locale- and theme-matched, source-validated public Reiki introduction audio only; no new media catalog.
- `tests/holistic-reiki-audio-language-agent.test.mjs`: approved-only audio link and URL rejection.

## Contract and precedence
1. **Input safety**: bounded input length; fail-closed when long, urgent routing using the reviewed Home Guide preflight; no model rephrasing of urgent or long messages.
2. **Consent/access**: this public component NEVER reads private profile information. It gets the published page feeds from the existing server component. No server reads based on untrusted client booleans.
3. **User intent**: current explicit request > active dialog constraints > explicitly selected site filter. Negatives such as "без видео"/"no video"/"sin video" block that format until affirmatively changed.
4. **Topic/context**: energy, money, relationships, meaning, goals; no clinical scoring/psychometrics or inferred diagnoses.
5. **Published content**: candidates must arrive via trusted existing parent props; within the client they are checked for published-type IDs, safe routes, language and available duration. Server publication gates must remain authoritative.
6. **Missing content**: say "no verified result"; do not fabricate Reiki audio, video IDs, tests, time slots, practitioner availability, prices or payment.
7. **Actions**: link to an already present resource or select an existing published video in the existing player; never book, charge, message or modify a profile without confirmation.
8. **Response**: canonical deterministic text and actual cards are always primary. Optional local model may append a brief extra wording but cannot alter IDs, links, permissions or actions.

## Feature controls / costs
- Free conversation: always reachable from the existing guide via its new toggle. It operates without added model packages or API calls.
- `NEXT_PUBLIC_HH_LOCAL_LLM_EXPERIMENTAL`: **unset/false by default**. Do not flip for production until the gates below are satisfied. Only changes client code delivery; does not activate a paid API.
- On model click, the browser imports the pinned CDN WebLLM runtime `@mlc-ai/web-llm@0.2.86`, verifies the selected model ID exists, and downloads the selected prebuilt Qwen2.5-0.5B weights to browser cache. The chosen variant requires roughly 1 GB of usable GPU memory, plus RAM/disk; actual transferred weight size, browser CSP and time must be measured, not assumed. The exact external runtime build/asset integrity is **not yet SRI-attested**. For production, move to a verified and locked NPM/bundled runtime and supply-chain-reviewed model assets.
- Weak devices, missing WebGPU, download failure or model error: deterministic mode is still available.
- API cost target: $0 for P0/P1; device/network cost is real. Never silently switch to paid hosted inference.
- This is a **public text guide**, not an independent licensed therapist, medical chatbot or trauma-processing program.

## MCP / AG-UI / A2A decisions
- MCP: future *server-side* capability registry for trusted functions `getMyVerifiedTestSummaries`, `listApprovedAudio`, `listPublishedVideo`, `viewCourses`, `submitSessionInquiry`; never expose Supabase service role or secrets in browser.
- AG-UI: **candidate** to standardize state/event streaming later. This PR uses the existing React guide instead of introducing a heavyweight second frontend runtime.
- A2A: defer until independent agents genuinely need interoperable cross-agent tasks. No value in pretending existing code already uses A2A.
- Mastra / LangGraph: selective future work orchestration for multi-step video sessions; do not duplicate existing state machines.
- Mem0: optional memory extraction only after user agreement and security review. No copy of third-party client data into outside vendors.
- Dify / Open WebUI: research reference; full product/UI adoption requires license and branding review. No copying their UI into our product.

## Secure personal memory (P2 contract; not activated in this PR)
The current production Supabase project already exposes `app.accounts`, `app.consent_events`, encrypted `app.context_events` and `app_private.development_goals` as distinct data models. **Do not misuse the dated context-event journal as unbounded conversational memory.** Any persistent agent memory needs separate purpose-specific authorization, encryption, limits and owner-scoped policies; no user memory table was created or modified by this PR.
Client memories are separate from raw chat transcripts. Define a future `AgentMemory` with:
```json
{"id":"uuid","user_id":"server-verified","kind":"preferred_name|speech_style|format_preference|confirmed_goal|user_note","value":"validated minimal text","source":"explicit_user_request","confirmed_at":"ISO UTC","expires_at":null,"scope":"recommendations","consent_version":"v1","revoked_at":null}
```
Store only with authenticated owner/RLS + explicit, revocable purpose-specific consent. Use existing Unified Profile service, not a duplicate summary scorer; filter out implicit private or medical information. Client needs list/edit/delete/export; removal must cover derived context, not just UI labels. Never set authenticated/ownerScoped from request JSON. Profile memory integration requires independent migrations and two-account IDOR/RLS tests; do not fake completion now.

## P2 validated catalogue adapters
Implement a server-owned factory that passes only approved items to the browser. Recommended source interfaces:
- `getApprovedVideos(locale, topic, duration, rights)`;
- `getApprovedAudio(locale, topic, duration, manifest)` (Reiki course intros only when verified);
- `getGuestTests(locale, topic)`;
- `getConfirmedSessions(locale, practice)` (offers != reservations);
- `getPublishedCourses(locale, topic)`.
All must reuse existing rankers and published-content gates; no independent catalog or arbitrary URL constructed by the language model. Audio is not silently replaced by a video soundtrack.

## P3 personalized journeys and client sessions
For an authenticated session: explicit purpose-specific profile consent → reviewed source summary → one voluntary question → existing meditation/test/course/session option → optional T0 check-in → practice/video with actual player → optional same-scale T1 → client-owned edit/save feedback → next step. Never turn an optional self-rating into a medical effect claim. Human clinician retains clinical authority and crisis pathways.

## Required QA before release or merge
- node --test tests/holistic-language-agent.test.mjs tests/holistic-reiki-audio-language-agent.test.mjs + existing holistic-support guided regression tests.
- Node 22 JS syntax checks, npx tsc --noEmit, scoped lint, Next production build **at exact HEAD**.
- Real mobile Playwright (320/390/430), Safari/WebKit, Chrome; keyboard/screenreader, no scroll trap, text zoom 200%.
- Red-team: long prompt and late crisis string; prompt injection in user text and catalog title; negative format constraints across turns and language switches; cross-language audio mismatch; blank catalog; user change of mind.
- Auth A/B with consent off/on if P2 gets built; no PII in public telemetry, URLs, query, model prompt or worker messages.
- Optional WebGPU controlled pilot: measure model weight download, cache, init, memory, CSP, cancellations, GPU errors on iOS/Android/desktop; stable 200-dialogue RU/EN/ES evaluation. Check model + code licensing and artifact hashes.
- A feature flag stays off until all model pilot gates are green. No claim of model/live availability from source code alone.
- Controlled merge order: PR #2528 → PR #2532 → this stacked language PR. Verify actual protected production base, Vercel READY, alias/SHA and smoke before claiming live.

## User-visible behavior
- Guest: click guide → Free conversation → type naturally → immediate deterministic multilingual reply → real resource card if eligible → user click opens actual item. "No video" never yields a video.
- Visitor may manually choose a model experiment **only** when enabled by staff flag and device compatible; the site explains a large model download and data boundaries.
- Returning account holder: **not yet** allowed to assume these public messages are synced with My House profile.
- Audio: for explicit EN/RU requests, a bounded read-only adapter queries existing public `/api/reiki-intro-audio` (at most two matched lessons); only currently published manifest-backed URLs are offered, clearly labeled **course introductions**. No reported duration is invented; when a maximum duration is requested, the audio option abstains. If no published intro exists, it says "not available here yet". Spanish is not silently given Russian or English audio.

## Implementation follow-up priorities
1. Fix any actual CI/type errors at exact head before declaring mergeable.
2. DONE (public-scope adapter): validate existing `/api/reiki-intro-audio` publication output via `public-reiki-audio-client.mjs`, offer only published course introductions with explicit EN/RU and no duration claims. Future: unify this adapter with the server `publishedReikiAudioRecommendations` via source-validated canonical IDs.
3. Add owner-consented memory within existing profile/RLS (requires migration + consent UI).
4. Replace remote CDN worker import with locked, SRI-attested/bundled WebLLM runtime, CSP review and mobile performance metrics.
5. Extend NLU with annotated 200+ test conversations, corrections, speech personalization, and confidence calibration.
6. Expose internal **server** tool adapters through MCP only if multiple agents need them.
