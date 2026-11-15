# My Coach Director v5 — authenticated session authority (2026-11-15)

## Existing system, not a new coach

This revision extends the existing Director v4 and the single authenticated
`/api/app/my-coach/turn` route. The registered persona retains its own
method-specific GROW, TGROW, WOOP, OSKAR, solution-focused or appreciative
inquiry sequence. The voice engine and its single Play / mic gesture remain.

## Authority and privacy

The same Play gesture also POSTs to `/api/app/my-coach/session`. The existing
authenticated app emits a 2-hour, HttpOnly, AEAD-encrypted, SameSite cookie.
Key derivation via HKDF is domain-separated from the existing app encryption
key. It is scoped to the Supabase account/session and selected coach.

The cookie holds **only** approved boolean milestones (18 fields), an issued
time and a bounded turn counter, not text transcripts, diagnoses, private
answers, audio or raw user statements. This is still a stateless browser cookie,
not server database persistence: it can be cleared/replayed by someone
controlling browser storage, and does not synchronize devices.

Each newest user message actually received by the server updates the
milestones. Client-submitted previous turns and earlier AI messages are
CONTEXT for wording, never authority for milestone progression or prior
consent. Explicit correction/topic change clears old milestones. The
no-advice preference remains server-authoritative until a later explicit
client invitation to offer advice.

## Voice and twenty minutes

The server calculates elapsed wall-clock seconds since signed session start,
ignoring user-supplied `elapsedSeconds` for the authorized path. The
17-minute Director integration guidance remains. At the first eligible
client turn after the 20-minute target, it speaks a provider-free, reviewed,
non-prescriptive reflective closing invitation once. Direct client questions,
corrections, explicit refusal, stop and safety win; the customer may say
«Давайте продолжим» / «Let's continue» / «Sigamos» to start a new episode
without another microphone tap. There is no forced interruption of speech,
no guarantee of an utterance exactly at 20:00 while the customer is silent,
and the browser display may drift in a backgrounded tab until server sync.

## Semantic output gate

For a signed-in server session, if the generated question does not belong
to the allowed broad multilingual semantic family of the selected move,
the server replaces that question with an authored, approved method-specific
one, preserving an otherwise useful natural model reflection. Obvious
unsolicited actions, coercion, unsupported completion claims and multiple
questions remain disallowed. This is a bounded deterministic classifier, not
formal proof that **all** arbitrary free-text statements are semantically
correct. No separate paid model or second provider request is used.

## Release gates and remaining proof

- Existing `tests/coaching-brain.test.mjs` imports the Director suite.
  Five tests now cover cryptographic account binding, tamper/replay expiry,
  cross-turn evidence, correction reset, wall-clock close/continue and the
  full unchanged iPhone Play-to-API integration source.
- Require exact-HEAD Core, private Coaching Specialist, Guard and
  protected merge, followed by Vercel READY+exact SHA on canonical domain.
- A real signed-in physical iPhone Safari voice E2E (10+ turns in RU/EN,
  audible Chirp/Fish, interruptions, mic permissions, voice/text parity,
  17-to-20-minute session and opt-in continuation) remains independent
  of synthetic tests; it cannot be claimed from successful Node CI alone.
- No new DB migration, provider credentials, paid model, recordings,
  audio upload, external tracker or additional GitHub workflow.
