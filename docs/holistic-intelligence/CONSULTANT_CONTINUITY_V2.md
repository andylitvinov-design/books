# Holistic Intelligence · Consultant Mind v2 — continuity and currency-aware fit

## Root problems confirmed
1. A budget phrase such as "до €50" was occasionally routed to a price FAQ instead of continuing the service-selection task.
2. In a 3-turn exchange, an initial relationship goal, an "online" format answer and a later price ceiling could lose the intermediate preference.
3. CAD / USD amounts could be unclassified rather than explicitly clarified, and a generic recommendation shelf might still show paid offers because it did not know that an unresolved currency limit existed.
4. "Мне удобнее онлайн" and "I prefer online" were missed as human consultation formats. Conversely, watching videos online must not be mistaken for a live appointment.
5. Spanish "Busco una consulta…" should be recognized by the existing Telegram Secretary.

## Rules implemented
- **One task, multiple turns.** Read at most six recent **user** turns from the existing request history; collect the original service goal and explicit constraints. Assistant messages have no authority to create a price or agreement. Stop/new-topic/refusal breaks context. An explicit new named service takes precedence over the earlier service.
- **Selection over keyword matching.** Expressions such as "хочу/нужна консультация", "I need an online session", and "Busco una consulta" are purchase-fit intents, not price questions merely because an amount appears.
- **Verified budget.** Existing euro ceilings €50/€100 retain the service matcher. Explicit CAD, USD and dollar ceilings become `otherCurrency`, a non-eligibility state. No paid card qualifies until the user selects an actual EUR limit or free-only. Never silently exchange currencies or treat unknown provider prices as affordable. Mobile Assist asks its existing **budget** question again (no new dialog screen).
- **Specific reasons.** Recommend only a fitting verified offer, with rationale and no more than two alternatives. A published master-specific price wins over first-party general tariffs in Telegram; never fabricate qualifications, testimonials, appointment availability or conversion rates.
- **Locale and privacy.** RU/EN/ES. Pure local/server deterministic code; no new LLM, endpoint, database, history persistence, marketing messaging or payment. Existing authenticated API, provider signature, opt-out, safety and consent checks remain untouched.
- **Safe exceptions.** No commercial response for crisis or refusal. Video viewing online is not an online personal consultation. A mismatch in currency asks one clarification rather than presenting an unrelated product.

## Verification contract
- Focused tests: `tests/assist-consultant-multiturn-currency.test.mjs`, `tests/telegram-consultant-bridge.test.mjs`, `tests/consultant-mind.test.mjs`, `tests/assist-service-match.test.mjs`.
- Synthetic RU/EN/ES three-turn selections, conditional €50 tiers, foreign currency no-match, public links, "online" wording, reset/stop, unsafe state, provider price boundary.
- Protected exact-HEAD Core/Specialist and native merge are required. After merge check Vercel production served SHA and rendered mobile client flow; code/CI alone does not prove real Telegram Business delivery. Real Telegram needs operator-enabled can_reply, signed updates and second-account E2E.
- No changes to existing CI/workflows, production runtime flags or secrets.

GLOBAL_PR_ONE_PUBLISH_V1: staged source/test/docs must be published in one atomic branch HEAD; do not rebase or republish merely because production advanced.
