# Holistic House · owner-only provider key validation (20 October 2026)

## Purpose
When the owner has just stored `HH_COUNCIL_GEMINI_API_KEY` and `HH_COUNCIL_OPENROUTER_API_KEY` in Vercel Production, independently check **the deployed server can authenticate to the actual providers**, without exposing secrets or spending inference credits. This verifies provider metadata and a current free Mistral catalog candidate; it **does not** claim that a Telegram question was answered.

## Access and lifecycle
- Read-only endpoint: `GET /api/internal/council-provider-readiness`, protected by separate random 64–96 character URL-safe `HH_COUNCIL_PROBE_SECRET` stored only as Vercel Production **Sensitive** variable. One query parameter `proof`, exact canonical origin and pathname, no fragments/extras.
- `HH_COUNCIL_PROBE_EXPIRES`: UTC Unix **milliseconds**, deadline in at most 90 minutes, validate against runtime clock. `VERCEL_ENV=production` required. Without exact strong proof + unexpired TTL, 404.
- After operator receives the fixed-shape status, set `HH_COUNCIL_PROBE_EXPIRES=0` and redeploy or let TTL expire on previously READY images. Remove the temporary secret in provider UI when practical. No key/chat ID/provider response text is written into GitHub, browser, logs or PRs.
- No new Telegram webhook, token, chat recipient, public backend permissions or DB migration. No client data. No payments or AI inference.

## Real read-only provider API checks
- Google: `GET https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash`, authorized by `x-goog-api-key` header; return booleans for authentication and exact model metadata, not raw JSON.
- OpenRouter: `GET https://openrouter.ai/api/v1/key` with Bearer header; return only `authenticated`, never account usage/balance/userID. Catalog `GET https://openrouter.ai/api/v1/models` and existing `chooseFreeMistral` ensures id is `mistralai/...:free` with all listed pricing fields literally numeric zero.
- Gemini requests still **disabled** while `HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED` is absent or not `true`. Metadata response does not prove account billing tier. Owner must check the project Billing Tier in Google AI Studio and only confirm Free Tier if it is actually Free.
- OpenRouter API key authentication plus a listed :free Mistral is readiness, not a guarantee that a generation completes. Existing generation adapter must separately enforce `allow_fallbacks:false`, `max_price:{prompt:0,completion:0,request:0,image:0}`, exact returned model ID and `usage.cost===0`.

## Acceptance and limits
- Targeted tests cover wrong origin/TTL/secret, 404 fail-closed, missing keys, valid and invalid provider responses, paid-only Mistral catalog, strict GET-only traffic, nonleakage, no Telegram sends.
- A real `/ai` entered by the owner in the verified @Andydotbot chat is still necessary for end-to-end Telegram message ingestion and receipt. Do not fabricate it with a synthetic webhook.
