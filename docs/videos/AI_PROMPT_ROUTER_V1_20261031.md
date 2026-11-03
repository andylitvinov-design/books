# Free AI Prompt Router v1 — Video Studio

## Outcome
The existing production `POST /api/holistic-support/first-video-prompt` continues
to generate **text-only** localized visual storyboards for the one real Video Studio.
This release makes the free-provider order configurable, and supplies a third
independent optional OpenAI-compatible provider (Groq). It does **not** trigger
video generation, premium API billing, XP debit or new public routes.

## Provider inventory / route
- `gemini_free`: Gemini 3.5 Flash-Lite, then 3.1 Flash-Lite only for eligible
  model/network/invalid-text errors; same Google account 401/403/402/429 skips
  secondary Google and continues to the independent next provider.
- `openrouter_free`: fixed `openrouter/free` free routing model.
- `groq_free`: fixed `openai/gpt-oss-20b` chat-completion model at the
  official `api.groq.com` endpoint. **Disabled until credential AND
  verified free-plan attestation exist.** No assumed free access, no automatic
  project/account creation and no arbitrary custom endpoint.

The client cannot choose a provider, model, endpoint, credentials or flags.
Server-side `HH_FIRST_VIDEO_PROVIDER_ORDER` optionally lists only known IDs,
for example `groq_free,gemini_free,openrouter_free`. Unrecognized, duplicate,
inactive or unverified IDs never enable a provider. If unset, default is
Gemini → OpenRouter → Groq (optional). Existing daily/minute limits, explicit
visitor consent, response acceptance, safe local fallback, same-origin
protection and bounded timeouts are retained.

## Configuration, verification and activation
- Existing `HH_FIRST_VIDEO_AI_ENABLED=true` remains required.
- Google and OpenRouter continue to require their existing separate
  confirmed-free flags and server-side credentials.
- Groq requires `HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED=true` AND
  `HH_FIRST_VIDEO_GROQ_API_KEY` on the production project, **only after**
  owner-verified account plan/quotas, provider data terms and cost controls.
  Key and attestation must be provisioned through authorized secret management.
  Never put real keys in logs, PRs, issues, tests or chats.
- The Groq model is pinned to `openai/gpt-oss-20b` as listed by provider;
  validate model access/price on the actual account immediately before turning
  on the integration. A model's public listing never proves account free usage.
- Paid fallback, model auto-discovery, dynamic URL, HTTP 3xx redirects, private
  tests/profile/photo/voice inputs, bulk jobs and analytics payload logging
  are forbidden in v1.

## Release acceptance
1. Run `node --test tests/first-video-director.test.mjs` on exact HEAD.
2. Run Core, applicable security and Mandala checks, then merge protected
   production branch; do not bypass legitimate failures.
3. Confirm Vercel READY SHA and `holistichouse.vercel.app` alias.
4. With unchanged production flags, confirm RU/EN/ES consented synthetic
   requests still produce non-empty appropriate text or an honest local
   fallback. Do not call optional Groq without verified free-plan attestation.
5. If opt-in Groq is enabled later, test forced Groq 200, 429/5xx/invalid
   response fallbacks, quotas, STOP/invalid-consent denial, and zero paid events
   and secrets in logs.

## Next stage (separate review)
Generalized provider health windows, structured storyboard JSON validated
against actual published scene catalog, and optional Vercel AI Gateway BYOK
adapter after separate budget/cost/data-policy review. No Vercel Gateway
credentials/paid credits are enabled by this PR.
