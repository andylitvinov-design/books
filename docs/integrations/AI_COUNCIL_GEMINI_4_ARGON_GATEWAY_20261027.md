# Holistic House · AI Council · Gemini 4 Argon via Vercel Gateway


## 2026-10-27 · Совместимость с live AI Council 4+1

Новая production реализация **PR #2104 уже смёржена** и использует `lib/practitioners/owner-ai-five.mjs` в обработчике приватного владельца `/all`. Старая точка `aggregateOwnerCouncil` сохранена для совместимости с legacy-тестами, но не вызывает рабочий Telegram `/all`. Этот документ отражает обновлённый путь через **новый PR интеграции**:

`owner Telegram /all → four confirmed $0 OpenRouter reviewers → fifth synthesizer: Gemini 4 Argon (only verified included free credits) OR Gemma 4 ($0)`.

- Четыре независимых слота сохраняют закреплённые бесплатные Qwen / Dots3 Note / Cohere / Xing4; пятый бесплатный по умолчанию — `google/gemma-4-31b-it:free`. В новом маршруте вызов Argon может **заменить** пятый запрос, но никогда не становится шестым запросом.
- Вызов Argon возможен **только** при уже имеющихся подтверждённых бесплатных AI Gateway Credits **и** отдельном project OIDC/API key бюджете, без пополнений или платных fallback, в Production, с обезличенным техническим вопросом. Дефолт: выключено. Реальный `GET /v1/credits` проверяет баланс, но **не отличает подарок от купленных кредитов** — не включать флаг `FREE_CREDITS_CONFIRMED` без проверки источника средств.
- При отключённых флагах **нет вообще никаких вызовов AI Gateway**, работает прежний $0 Gemma 4. Если проверка credits/доступа отклоняет запрос **до генерации**, fallback на проверенную бесплатную Gemma. После попытки генерации Argon **нет повторного Argon или скрытого дополнительного запроса**, вывод/ошибки маркируются точной моделью.
- Telegram-отчёт показывает **фактическую** пятую модель и private ledger сохраняет `synthesis.model`, без подмены Gemma/Argon. Личные/клиентские данные, диагнозы, результаты тестов и секреты не передаются на Argon. Отчёт о реальной доставке не заявлять без Bot API receipt и чтения владельцем.
- Оригинальная интеграция Argon [PR #2232](https://github.com/andylitvinov-design/books/pull/2232) была уже merged, Vercel READY, но старая точка вызова больше не вызывается новым Council. Новый PR устраняет этот разрыв без дополнительного бота, провайдера, миграции или ежедневного cron.

**Критерий завершения:** новый PR → профильный CI зеленый на exact SHA → safe merge в `codex/public-book-library` → Vercel READY + канонический домен на том же SHA, отдельное подтверждение бесплатного баланса и отсутствие top-up → владелец запускает настоящий обезличенный /all → Telegram и AI Gateway receipts. При невыполненных условиях **код в production, функция Argon OFF**.

---

Date: 2026-10-27 · Issue: [#2228](https://github.com/andylitvinov-design/books/issues/2228) · **CODE RELEASED; ARGON USAGE DISABLED BY DEFAULT**

## Design decisions

This is an **optional synthesizer in the existing private Telegram `/all` pipeline**, not a new AI Council, chat endpoint, cron, paid subscription, or automatic call. Keep free Gemini Flash and zero-priced OpenRouter replies as the two or more **independent sources**. Only after two authentic reviews, owner-initiated `/all` and all budget/privacy preflight gates, one `google/gemini-4-argon` call can replace the usual one free synthesis. No extra automatic model calls. `/verify`, `/gemini`, public daily audit, CRM and customer messenger **never use Argon**.

Model adapter: `lib/practitioners/council-argon-gateway.mjs` → `aggregateOwnerCouncil` in `lib/practitioners/owner-ai-ensemble.mjs`. Same verified owner, signed Telegram webhook, private Supabase update ledger, rate limit (4 /all/day), answer/usage receipt, existing JSON attribution validation and Telegram sender. No schema changes or additional Telegram bot.

## Financial reality: do not confuse Google chat, direct API and Gateway

- Google AI Pro enables Gemini chat capabilities, **not a free Gemini 4 Argon API quota**. Direct `gemini-4-argon` Gemini API is paid; Google AI Studio credits from any subscription are not an automatic unconditional free allowance.
- As of 2026-10-27, Vercel AI Gateway `google/gemini-4-argon` is listed at **$2 / 1M input tokens, $10 / 1M output tokens** promotional rates. Its model page says **$5 free credits per 30 days** for eligible accounts that have not paid for credits; purchasing Gateway credits forfeits periodic free credits.
- Those rates are metered in credits, even in the Free plan. **The team `super10` free credits/balance and whether it has bought credits were not verified.** Presence of a valid key/OIDC is not free-tier proof. There is no promise of unlimited free Argon.
- Vercel may require a verified payment method, and budgets are soft caps. Never purchase credits, enable auto-topup, change Stripe billing, introduce BYOK or paid provider fallback without separate owner approval.
- Alternatives Devin, Cursor, Factory Droid and Amp are separate coding-agent interfaces and are **not** server API credentials for this site; their installation/subscription is out of scope. A later direct Google Flex route is a separate paid change requiring approval.

Official source: https://vercel.com/ai-gateway/models/gemini-4-argon ; https://vercel.com/docs/ai-gateway/pricing ; https://vercel.com/docs/ai-gateway/observability-and-spend/budgets

## Flags — default is fail closed

None of these are configured by this PR. The whole feature stays **OFF by default** until independent owner approval, in **Vercel Production only**.

| Server-only environment variable | Required for Argon inference | Operator verification |
|---|---|---|
| `HH_COUNCIL_ARGON_GATEWAY_ENABLED=true` | YES | Owner authorized first live credit usage |
| `HH_COUNCIL_ARGON_FREE_CREDITS_CONFIRMED=true` | YES | `super10` Gateway balance is included FREE credits, no purchased balance |
| `HH_COUNCIL_ARGON_PROJECT_BUDGET_CONFIRMED=true` | YES | Confirm project-specific monthly budget that guards production OIDC |
| `HH_COUNCIL_ARGON_NO_TOPUP_CONFIRMED=true` | YES | Confirm zero auto-topup, no manual credit purchase and no paid fallback |
| `HH_COUNCIL_ARGON_PUBLIC_ONLY_CONFIRMED=true` | YES | Only non-client, nonmedical, public technical questions; review provider privacy |
| `VERCEL_OIDC_TOKEN` | Preferred | Auto-issued to authorized Vercel Project; project budget applies to OIDC |
| `AI_GATEWAY_API_KEY` | Alternative | Dedicated encrypted key scoped to `super10`; never in client, GitHub or Telegram |
| `HH_COUNCIL_ARGON_API_KEY_BUDGET_CONFIRMED=true` | YES if using API key | **API key-specific budget**, as project budget does not apply to key usage |

**Do not enable the feature merely by copying these flags.** Inspect credit status and team/provider billing first. Keep `HH_COUNCIL_ARGON_GATEWAY_ENABLED` unset/false until final owner authorization; don't use a fake key to satisfy the gate.

Vercel pages: https://vercel.com/super10/codex-public-book-library/settings/environment-variables ; https://vercel.com/dashboard ; https://vercel.com/docs/ai-gateway/observability-and-spend/usage ; https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc .

## Runtime contract and abuse prevention

1. Caller has already established the same exact verified Telegram owner ID, client-shared bot signature, event-id deduplication, rate limit and **>=2 successful independent free answers**.
2. Only owner `/all` synthesis; technical/public questions only. Heuristic privacy checks reject emails, phones, credentials and clinical narratives in **both** original question and assembled model replies. These regexes are defense in depth, **not proof** a prompt is safe. No direct CRM, private reports, customer messages or database records fetched.
3. Check all flags and Production before any external call. Use OIDC project token first; API key only with independently verified API-key budget.
4. `GET https://ai-gateway.vercel.sh/v1/credits` (authenticated metadata only). The official response has decimal **strings** like `{"balance":"5.00","total_used":"0.00"}`. Strictly parse balance; if unparseable, below $0.10 or above $5.001, **no inference**. Numeric bounds are only a preflight guard, not entitlement proof.
5. One bounded `POST /v1/chat/completions`: exact model `google/gemini-4-argon`, reasoning effort low, 1536 max output tokens (including reasoning), prompt <=10,000 characters, hard 50s request timeout, no tools, no provider/model paid fallback and **no retries after any 402/429/timeout/5xx**.
6. Only accept `finish_reason=stop`, matching exact model, nonempty text and positive usage tokens; existing strict JSON schema parser checks attributed consensus and actions. Preserve sanitized model/status/reason in existing private update ledger, **not model text**. On error, report failure without fabricated answer or extra charge.
7. With Argon OFF, leave existing free synthesizer exactly as before. If Argon is ON but question is outside public technical scope, continue free synthesizer without ever reaching Gateway. Daily audit/other modes remain unchanged.
8. $5 monthly credit allowance and a minimum $0.10 reserve do not constitute a full spending guarantee: budgets are soft caps and live credit balance is race-prone across requests. Do not use if other agents or team projects may spend the same credits without coordination.

## Acceptance test plan

| Gate | Test | Status |
|---|---|---|
| Budget/privacy | OFF by default, preview blocked, absent credentials, missing flag, API-key budget, PII in question or synthesis, malformed credits | Offline regression added; CI pending |
| Gateway errors | 402/429/5xx, provider wrong model, bad JSON, no usage, partial output, missing balance → no false success or retry | Offline regression added; CI pending |
| Existing Council | 1 free response → no Argon, 2 real free responses → optional exact Argon JSON, disabled → unchanged fallback | Offline regression added; CI pending |
| CI | Node22 syntax + targeted existing owner Telegram suite, lint, typecheck/Next.js build | To verify against exact SHA |
| PR | clean diff, no client code, no secrets/billing, safe merge in `codex/public-book-library` | Pending |
| Deployment | production Vercel READY exact merged SHA + `https://holistichouse.vercel.app` alias, functional smoke | Pending |
| Provider & owner delivery | GET free credits + real Argon generation receipt + model/usage/cost in Gateway Logs + true owner Telegram delivery and phone readback | **Blocked until verified credit eligibility, budget, privacy and explicit owner enablement** |

## Operator runbook — only after safe merge and credit confirmation

1. Inspect `super10` AI Gateway dashboard and verify free/no-purchase status, auto-topup disabled, token/provider privacy. Avoid buying credits just for this integration.
2. Configure dedicated **project monthly budget** on OIDC scope (recommended example <=$1, adjustable on approval); confirm that changes may take minutes, and the crossing request can exceed a soft cap. If OIDC unavailable, use an API-key budget with a separate encrypted key; never substitute a project budget.
3. In Vercel Production env only, enable the five required flags (plus API-key-budget flag if relevant), redeploy once. Private owner sends an anonymized site engineering question using `/all` in @Andydotbot; record two independent provider completions, Argon exact model/usage, receipt in Vercel AI Gateway Logs, and physical Telegram display. Do not generate a test charge automatically from CI.
4. Check no Argon call in `/verify`, daily audit, or customer webhook. On any unexpected usage, budget or privacy issue, set `HH_COUNCIL_ARGON_GATEWAY_ENABLED=false` and redeploy. Existing Free Council keeps working.
5. Only after real provider call and owner Telegram readback mark Issue #2228 `E2E VERIFIED`, with masked receipts and exact production deployment SHA.

## Related work

- Existing Holistic House owner AI console specification: `docs/integrations/OWNER_AI_CONSOLE_TELEGRAM_20261020.md`.
- Existing free-first UX improvement [PR #2104](https://github.com/andylitvinov-design/books/pull/2104) also changes `owner-ai-ensemble.mjs` and is **unmerged**; reconcile before merging either PR. Do not overwrite its free-tier and Telegram UX corrections.
- AI Council daily audit and archive https://github.com/andylitvinov-design/ai-projects-brain/issues/242 ; no new cron or secrets added there.

**Status: code implementation proposed, default OFF, no paid inference or delivery performed by this change.**
