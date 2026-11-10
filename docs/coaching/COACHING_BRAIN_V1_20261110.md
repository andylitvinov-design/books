# Holistic House · Coaching Brain v1 (10 November 2026)

Related: #4018, #4016, #1774. Production source: `codex/public-book-library`.

## Outcome

Add a true optional multi-turn AI dialogue to the existing authenticated Personal Coaching
screen without replacing the self-guided runner, modifying the coaching catalog,
creating a separate client cabinet, or introducing a second account/history database.

* Client starts a normal existing private session, then explicitly taps **AI dialogue**.
* One accessible, user-opened mobile dialog supports free-text conversation in EN/RU/ES.
* Each turn is sent only after an independent, unchecked-by-default consent checkbox.
* Server checks verified Supabase identity, active account/session ownership, same-origin,
  rate limits (40/hour), bounded messages and refusal of embedded credentials.
* Adaptive controller chooses a reviewed method from GROW, motivational interviewing,
  WOOP, solution-focused, OSKAR, values clarification and decision options. Dialogue
  stages go from clarification through examples, options, client choice and review.
* Model reflects actual user words, offers a correctable hypothesis when warranted,
  and asks **one** contextual question. No coercive diagnosis or invented progress.
* A proposed action must cite a verbatim excerpt of client words to be displayed.
  Suggestions are never treated as decisions, commitments, completed tasks or treatment.
* A visible, editable **My next step** field requires a separate user click to confirm
  and save a maximum 300-character step in `current.brainDecision` in the existing
  owner-encrypted `app_private.personal_coaching_sessions` record.
  Existing revision/CAS protection, user edits, session history, delete,
  completed report and PDF remain authoritative; the approved step can seed the
  existing action-plan editor after completion.
* User and AI messages live only in React memory for the open page; there is
  no transcript persistence, automatic cross-session context, CRM export,
  analytics payload, reminders or practitioner sharing.

## Provider controls / feature enablement

Uses the **existing** server-side Agent Director OpenRouter `:free` verification
gateway, not a new API provider. The runtime checks live model-catalog pricing,
text modality, free model ID, caps both prompt/completion maximum price at zero
in the request, rejects model mismatches and any response without verified
`usage.cost === 0`. It never accepts a browser-selected provider/model.

The user-facing AI feature requires **both**:

* `HH_COACHING_BRAIN_ENABLED=true` — separate coaching-specific owner approval
  for transmitting *only explicitly submitted* chat messages.
* Existing `HH_AGENT_OPENROUTER_ENABLED=true` and server-only
  `HH_AGENT_OPENROUTER_API_KEY` (optional preferred `:free` model).
  Do not put these values in code, chat, client variables or telemetry.

If either feature gate is off, the provider fails, rate limits apply, a response
is malformed, or zero-price cannot be established, the UI clearly labels
an **offline authored question**, never a successful model response. Network
timeouts have an 18-second cap. Crisis keywords interrupt before any model
request and encourage local emergency/human support.

**Data handling caveat:** Explicitly submitted text is processed by OpenRouter
and its selected free-model provider. Provider retention/privacy terms should
be reviewed and approved before enabling in production, especially for personal
or potentially health-related material. The existing saved answer set, reports
and Life Plan are NOT automatically attached to the provider request.

## Testing and release gates

`npm run test:coaching:release` includes `tests/coaching-brain.test.mjs`:
consent and schema negative tests, method selection, stages, grounded action
suggestion, safety interrupts in EN/RU/ES, offline fallback, secure route,
provider zero-cost contract and user-confirmed save integration.

Before release require exact-head GitHub Core + Coaching Specialist + applicable
auth/privacy/browser gates; lint, typecheck, Next build and review; verified
Vercel production READY SHA/alias. A real signed-in two-account ownership
negative test and iPhone Safari 320/390/430px flow must prove:
open dialog → refuse consent → grant consent → natural multi-turn model reply →
edit/confirm chosen step → reload → only the step retained → complete session →
review action plan/PDF. No LIVE claim based only on a PR or HTTP 200.

## Explicitly out of scope

Automatic therapist advice, provider billing change, stored transcripts,
silent Life Plan imports, provider-funded voice/video/avatar generation,
cross-session memory, AI-written diagnoses, autonomous actions or human bookings.
Follow-on work for historical context and report v2 remains under #4014/#4067
with its own explicit user consent and acceptance gates.


## Adaptive five-phase protocol v2

The deterministic controller no longer advances by counting messages. It derives a routing
hint from bounded, explicitly submitted client turns and chooses one next-best action:
**Contract** (clarify desired outcome), **Discovery** (obtain a concrete recent example),
**Exploration** (investigate an obstacle or repeated pattern), **Possibilities** (explore
alternatives only after enough context), and **Action & integration** (shape a client-chosen
step). Review is a closeout state, not an extra coaching phase.

The 20-minute timeboxes are advisory. Elapsed time never means a milestone is complete.
A step moves to review only when client-authored wording contains both a chosen action and
a time anchor. Lexical patterns are routing hints, not psychological facts; the AI must
invite correction. A partial or unresolved outcome is valid.

The protocol adds one Next Best Action instruction to the existing Brain model prompt.
It creates no second runtime, persistence layer, provider, consent path or data store.


## Production privacy hardening and honest AI status (10 November 2026)

The optional real-model branch requests OpenRouter `provider.zdr=true` and lists only `zdr=true` zero-price `:free` text models before trying inference. No non-ZDR, paid or unverifiable-cost fallback is permitted for Coaching Brain. This may result in an offline authored question when no eligible provider/model is available. Request-time per-turn consent remains required and the client can stop/skip without a provider call. The original Agent Director route is unchanged. Provider account-level policies (including any permitted safety retention) still require owner review before switching the production feature flag on.

The encrypted session stores only a separately confirmed step, never the transient dialogue. The UI now displays one of these bounded reasons without exposing client text or upstream secrets: `feature_disabled`, `server_not_configured`, `privacy_model_unavailable`, `rate_limited`, `cost_unverified`, `response_unverified`, `model_unavailable`.

A protected PR merge and Vercel READY are code-release proof, **not** signed-in AI inference proof. To call generative Coaching Brain VERIFIED LIVE, require the Vercel coaching feature flag, a valid Vercel server-only OpenRouter key, an actually available free ZDR endpoint, an authenticated active-session two-turn smoke, and a separate confirmed-step save/reload check. Unavailable steps are recorded as blockers, not assumed green.
