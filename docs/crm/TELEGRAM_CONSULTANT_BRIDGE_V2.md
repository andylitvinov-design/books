# Holistic House · Consultant Mind v2: Telegram Business grounding

Owner goal: the same service consultant should answer actual price, value, comparison and matching requests in the website, authenticated AI chat and the existing official Telegram Business account, not just list diagnostic links.

## Verified source baseline
- PR #4481 is merged: price-aware first-party Consultant Mind on /api/holistic-agent/turn.
- PR #4559 is merged: mobile Services Assist uses that same pure Consultant.
- PR #4549 is merged: signed Telegram Business Secretary imports Consultant Mind and the common matcher, BUT previously kept only sourceConsultant:Boolean(consultant); its answer composer did not use the explanation.
- Open PR #4577 owns the separate @holistichouse_bot general conversational/diagnostic route. This fix intentionally does NOT change its files or consent.
- Telegram Business chat automation remains a separate provider-side activation: changing GitHub code cannot grant can_reply or configure BotFather.

## This patch
1. In the existing signed Telegram Business Secretary, honor Consultant Mind's answer for explicit price, quality, comparison and recommendation intents. Preserve ordinary catalogue navigation, video/course/test links, /stop, signed getBusinessConnection check, rate limits and no unsolicited sales.
2. For first-party services, show exact locale-specific, allowlisted site pages, and published personal-session €50/30 min and €100/60 min pricing. A general Reiki price remains unknown unless a specific published practitioner's database record supplies it.
3. For dynamic practitioner offers, surface only active published listings with approved active masters, existing verified titles and currencies; dynamic live price display overrides a conflicting generalized first-party tariff. No fabricated reviews or clinical effectiveness rates.
4. A hard €50 or €100 budget requires a verified **fixed** EUR price <= ceiling or an actually free offer. “From €50” and unknown/contact-priced records are NOT evidence that the final bill fits within €50. CAD/USD budgets cannot be silently treated as EUR: ask one clarification with no offers.
5. An explicitly named Reiki/constellation/therapy goal is never silently substituted by an unrelated cheaper video, test or service. Unmatched constraints produce one honest clarification instead.
6. Real multi-turn, general-purpose Telegram bot dialogue is owned by separate PR #4577. This patch is source-bounded factual service consultation for @holistichouse Telegram Business only; it does not create fake state or unconsented storage.

## Safeguards
No new AI model, provider, secret, marketing campaign, CRM lead, booking, payment, free-text analytics, webhook or DB migration. Existing signed business webhook and STOP/permission gates stay authoritative. Any future read of client private data still requires separate consent. The “quality” answer explains how to evaluate a service and its limitations, never guarantees cure or success. Private messages are not forwarded to an LLM here.

## Acceptance and deployment
Focused regression: node --test tests/telegram-consultant-bridge.test.mjs tests/telegram-secretary-business.test.mjs tests/consultant-mind.test.mjs tests/assist-service-match.test.mjs.
Before PR: 13/13 new synthetic callback assertions passed in isolated V8 using the exact staged JS source and mocked published listings; NOT a real Node/Next/browser run.
Protected exact-HEAD Core, applicable CRM/Services Specialist, privacy and hh-merge-check MUST pass before merge. After merge separately verify Vercel production READY/commit ancestry and actual consenting second-account Telegram Business Send → answer → service URL/confirmed price/STOP, plus app RU/EN/ES service matcher. If the existing Telegram provider Chat Automation is disconnected or OFF, state that honestly; a deployed handler is not a functioning bot.

GLOBAL_PR_ONE_PUBLISH_V1: stage coherent 4-file source/test/docs tree and publish once; no post-open HEAD updates unless a verified real failure; no extra workflow or paid service.
