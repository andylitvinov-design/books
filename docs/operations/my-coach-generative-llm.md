# My Coach · generative dialogue release gate

## User journey
- On `/{en,ru,es}/my-coach`, choose a fictional coach and Start Session.
- `/{locale}/coaching/sessions?coach=...` preserves the approved persona introduction.
- **Start conversation** opens an inline, memory-only text chat (not the old lounge).
- A synthetic authenticated `POST /api/app/my-coach/probe` checks a verified zero-cost ZDR free model. It never contains a client's message.
- Only after that probe has verified the model, sign-in and **explicit consent**, user text is sent to authenticated `POST /api/app/my-coach/turn`. Each generative reply is a natural, succinct chat message in the selected persona voice; zero or one question is permitted, never a mandatory reflection-and-question script. Allowed persona policy is compiled on the server.
- If unavailable, the composer remains disabled, displays the explicit reason, and offers the **reviewed guided session** as a separate fallback. No fake AI success state.
- Neither chat history nor editable action suggestions are persisted. Personal Coaching and its confirmed action plan still have their existing private persistence workflow.

## Reused infrastructure, no new paid service
- Server: `lib/app/coaching-brain.js` and `lib/personal-coaching/coaching-brain.mjs`.
- Unified provider gateway: `coachingModelConfig` + `verifiedFreeReply`, reusing the existing Agent Director adapter and Council privacy exclusions. Live text requires `HH_COACHING_BRAIN_ENABLED=true` and `HH_AGENT_OPENROUTER_ENABLED=true`, plus a server-only valid OpenRouter key. Prefer `HH_AGENT_OPENROUTER_API_KEY`; if absent, reuse existing **Vercel Production** `HH_COUNCIL_OPENROUTER_API_KEY`. An invalid primary fails closed. Never copy tokens from GitHub or Supabase secrets into browser code or another environment.
- Never expose credentials through `NEXT_PUBLIC_*`, browser code, git or response bodies.
- Provider must be an OpenRouter **:free** text model with **ZDR** and `data_collection:deny`. Live catalog filtering additionally reuses Council-reviewed ineligible-provider exclusions, avoiding NVIDIA Nemotron even if listed as ZDR. Prefer Gemma 4 31B or 26B *when currently available and verified* before choosing a fallback. Runtime request sets zero-price cap, disables provider fallbacks, verifies reported cost = 0 and validates model reply. A complete single JSON markdown fence can be removed locally without another paid/free completion. No paid automatic fallback. The probe proves readiness without personal data.
- Personal coaching server gate remains opt-in with no implicit migration to new model.
- Account cookies checked by `auth.verified()`, Same-Origin POST guard and database rate-limits: 12 probes/hour and 40 turns/hour per authenticated account; existing app throttle also applies. Before actual model requests (not offline or safety turns), four coaching routes share a conservative PostgreSQL-backed **40 attempts/24h** model budget. It reserves capacity below the unfunded OpenRouter 50/day ceiling; cached successful synthetic probes (at most 60 seconds per warm server instance) use no model call. No automatic model retry on 429.
- Input limits: explicit consent; strict allowlisted persona/locale/style; 1,200 chars current message; at most 10 previous turns; sensitive secrets rejected. No client-supplied model, provider, system instructions, saved session ID or auto-confirmed decision.
- Safety and client boundaries run before model invocation; `skip` is distinct from `stop`. A safety hold disables further composer submissions.

## Release and smoke
1. Review single published PR, confirm Core, Specialist, Guard and exact-HEAD deployment status; no merging on red CI.
2. Verify both flags and at least one supported server-side key (dedicated or Council) **on Vercel Production**; do not infer a missing variable from an environment listing truncated to 100 items. If both absent, the authorized owner must connect a key securely; never fabricate credentials or enable paid usage.
3. In an authenticated, consenting browser, choose Mira, send a goal and a substantive follow-up in RU, then EN and ES. Expect `mode=ai`, stable persona, relevance to user's actual words and no canned questionnaire.
4. Repeat with each persona, verify warm/direct style difference, one question per turn and editable **suggestion**, not a falsely confirmed commitment.
5. On sign-out, observe sign-in-required and **no** model invocation with client text. Verify no keys or raw transcripts in browser storage, server error logs or URL.
6. Disconnect provider and expect synthetic probe to fail closed with offline/guided fallback. Repeat with zero-cost violation, rate-limit, malformed response and no ZDR free models.
7. Check browser on mobile; ensure the inline chat and composer remain visible, keyboard usable, guided fallback accessible. Voice remains out of scope.
8. Mark **Production LIVE generative AI** only after secure key setup, production deploy, successful synthetic probe and real consented test reply. A merged source PR alone is NOT enough.

## Natural persona conversation (owner correction, 11 Nov 2026)
- Main My Coach uses `lib/coaching/conversational-persona.mjs`, not the structured private Coaching Brain reflection/question output; the reviewed guided and personal coaching runners remain unchanged.
- Eight server-owned voices for Mira, Max, Sofia, Alex, Lea, Noah, Iris and Ray, with EN/RU/ES speaking cues. They are examples of cadence, never phrases the model should recite.
- Natural replies may answer, acknowledge, notice, suggest or ask **zero or one** question; no stage heading, serial questionnaire or forced action plan. After two coach questions in a row, the next model prompt encourages a useful non-question turn.
- Result is an ordinary chat bubble, not separate reflection/hypothesis/question blocks. A client-owned action stays optional, editable, and grounded in an exact prior user quote.
- Existing authentication, per-account rates, same-origin, free-only ZDR provider probe, user consent, secret rejection, safety and stop/skip checks are preserved. No new paid provider or transcript persistence.
- No Production LIVE claim until protected CI, production merge and signed-in real-model acceptance; actual naturalness across all eight characters and three locales needs live evaluation, not just unit fixtures.

## Unified runtime delivery
- All changes travel in one coherent PR through the unchanged protected Core, Specialist, Guard and applicable auth/privacy/browser checks. No new workflow, paid model, provider, scheduler or user-login system.
- A true LIVE claim requires a Vercel READY deployment on the exact merged SHA **and** authenticated opt-in probe and real `mode=ai` response on the public domain. HTTP 200 or an unauthenticated 401 alone are not positive provider proof.
- A shared 40/day free-model-call ceiling is a safety limit, not a public production SLA. High-volume access needs an explicit owner plan for additional capacity; the existing guided session remains available when free AI is exhausted.
