# My Coach · generative dialogue release gate

## User journey
- On `/{en,ru,es}/my-coach`, choose a fictional coach and Start Session.
- `/{locale}/coaching/sessions?coach=...` preserves the approved persona introduction.
- **Start conversation** opens an inline, memory-only text chat (not the old lounge).
- A synthetic authenticated `POST /api/app/my-coach/probe` checks a verified zero-cost ZDR free model. It never contains a client's message.
- Only after that probe has verified the model, sign-in and **explicit consent**, user text is sent to authenticated `POST /api/app/my-coach/turn`. Each reply reflects the user's message and asks one context-aware question. Allowed persona policy is compiled on the server.
- If unavailable, the composer remains disabled, displays the explicit reason, and offers the **reviewed guided session** as a separate fallback. No fake AI success state.
- Neither chat history nor editable action suggestions are persisted. Personal Coaching and its confirmed action plan still have their existing private persistence workflow.

## Reused infrastructure, no new paid service
- Server: `lib/app/coaching-brain.js` and `lib/personal-coaching/coaching-brain.mjs`.
- Provider gateway: `ownedModelConfig` + `verifiedFreeReply`. Live text requires `HH_COACHING_BRAIN_ENABLED=true`, `HH_AGENT_OPENROUTER_ENABLED=true` and **server-side** `HH_AGENT_OPENROUTER_API_KEY` with the expected format.
- Never expose credentials through `NEXT_PUBLIC_*`, browser code, git or response bodies.
- Provider must be an OpenRouter **:free** text model with **ZDR**. Runtime request sets zero-price cap, disables provider fallbacks, verifies reported cost = 0 and validates model reply. No paid automatic fallback. The probe proves readiness without personal data.
- Personal coaching server gate remains opt-in with no implicit migration to new model.
- Account cookies checked by `auth.verified()`, Same-Origin POST guard and database rate-limits: 12 probes/hour and 40 turns/hour per authenticated account; existing app throttle also applies.
- Input limits: explicit consent; strict allowlisted persona/locale/style; 1,200 chars current message; at most 10 previous turns; sensitive secrets rejected. No client-supplied model, provider, system instructions, saved session ID or auto-confirmed decision.
- Safety and client boundaries run before model invocation; `skip` is distinct from `stop`. A safety hold disables further composer submissions.

## Release and smoke
1. Review single published PR, confirm Core, Specialist, Guard and exact-HEAD deployment status; no merging on red CI.
2. Verify **all three** production env requirements (flag/flag/key) on Vercel; never assume a key exists from enabled flags alone. If absent, owner must securely add a secret by the Vercel UI. Do not fabricate credentials or enable paid usage.
3. In an authenticated, consenting browser, choose Mira, send a goal and a substantive follow-up in RU, then EN and ES. Expect `mode=ai`, stable persona, relevance to user's actual words and no canned questionnaire.
4. Repeat with each persona, verify warm/direct style difference, one question per turn and editable **suggestion**, not a falsely confirmed commitment.
5. On sign-out, observe sign-in-required and **no** model invocation with client text. Verify no keys or raw transcripts in browser storage, server error logs or URL.
6. Disconnect provider and expect synthetic probe to fail closed with offline/guided fallback. Repeat with zero-cost violation, rate-limit, malformed response and no ZDR free models.
7. Check browser on mobile; ensure the inline chat and composer remain visible, keyboard usable, guided fallback accessible. Voice remains out of scope.
8. Mark **Production LIVE generative AI** only after secure key setup, production deploy, successful synthetic probe and real consented test reply. A merged source PR alone is NOT enough.
