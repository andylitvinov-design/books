# AI Council 2.1 · Optional L1 free video metadata classification

This second protected PR introduces **metadata suggestions only**, with no footage rights, viewing, downloading, upload or publication claims. The system still works with **zero inference** when free models or authorisation are unavailable.

## Gating

- Existing `HH_COUNCIL_OPENROUTER_API_KEY` is held only by the server. Never disclose or send to clients.
- `HH_VIDEO_CLASSIFIER_ENABLED=true` is an explicit Production server-side feature gate, **OFF by default**. Set it only after a verified free model/account and owner approval; do not create a paid fallback or activate billing.
- Owner must enable `video-classifier-batch` using the existing protected `/admin/automations` control. Both gates must be true. A disabled task never contacts OpenRouter.
- The shared hourly `17 * * * *` Cron invokes classifier at most once per four-hour UTC boundary (`00,04,08,12,16,20`). There is **no additional Cron** and no additional service.
- Claim is unique by `(task_id,slot_utc)` with a lease; no retry of an ambiguous response; failure is explicit. Never present a model response as an approved clip or legal finding.

## Read-only inputs and outputs

Inputs: at most six public Wikimedia candidate titles, category hints, source search terms, and MIME types, with opaque candidate UUIDs. No account, client, health or personal prompts. The model may return only a bounded JSON array of goal labels, a short summary, confidence and warnings. The existing free-model allowlist checks exact `:free` model ID and zero-valued price fields before POST.

The inference request includes `provider.allow_fallbacks=false`, an explicit all-zero `max_price` for prompt/completion/request/image, and `data_collection=deny`. Output is rejected unless the response model ID is exact, `usage.cost===0`, finish reason is `stop`, and the parsed schema references existing candidate UUIDs. Only after the authoritative claim is still enabled and valid can the suggestions be appended to `app_private.video_candidate_ai_suggestions_v2`, under forced RLS, with `review_required=true`.

## Rollout and acceptance

1. Apply `sql/ai-council-free-classifier-v2-20261106.sql` in the existing Supabase project. Verify all new tables forced RLS, no anon/authenticated grants, no direct public API exposure; existing task definitions still present and disabled.
2. Merge only with exact-head Core, Specialist, `hh-merge-check` and applicable consent/privacy tests. Independently verify Vercel production deployment SHA/alias.
3. Verify provider identity and free quota without retrieving any key value; enable the server feature flag only if no new spending can occur.
4. Enable classifier in the owner dashboard; verify a four-hour eligible slot, factual zero-cost model receipt, annotation rows, and the separate independent hourly Scout counters. Rate-limit and no-change paths must not produce fictitious records.
5. Test revoked task, timed-out lease, malformed AI JSON, swapped model, nonzero usage cost, exhausted free quota, guest/role denial and backwards compatibility with all existing media checks.

This PR does **not** implement the weekly Council planner, daily Telegram digests, nor automatic MP4/Video Vault source admission. Those remain later guarded phases and must not be represented as LIVE.
