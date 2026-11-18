# Holistic House — human-first Telegram Business / AI-secretary business service
16 November 2026. Follow-up to #4576 and #4768; no separate bot login, appointment, payment or new provider.

## Visitor journey
1. On /ru|en|es/services/business-consulting, select **AI secretary for business → Request**.
2. Telegram opens the existing human @holistichouse personal chat. Only a public service code, title and language enter the prefilled message. The customer must press Telegram **Send** (opening a URL is not an enquiry).
3. The **existing** @holistichouse_bot attached through Telegram **Business Chat Automation** receives an official signed private business_message, verifies enabled @holistichouse with can_reply and sender==chat. No separate /start or login.
4. The assistant identifies itself clearly as Ali, a nonhuman auto-assistant, and asks five short questions, one per customer reply: business/offer; customer channels; desired secretary tasks; approximate traffic/languages; human handoff/integrations. Answers are encrypted under the verified practitioner operation. No OpenRouter/Qwen or external AI processes these business answers, no invented price, appointment or subscription. Credentials and sensitive documents are discouraged.
5. Once the customer voluntarily answers question five, the same signed session and advisory STOP lock finalize exactly one CRM public service enquiry and one stable verified Telegram Business CRM contact through #4576. The already-linked @Andydotbot booking outbox sends a neutral HH reference only after committed DB status. Customer sees a receipt; practitioner may reply directly in the human @holistichouse chat.
6. The personal Cabinet remains optional, separate verified Telegram OIDC login and explicit account link (never inferred from a chat). A second click can start a new distinct enquiry only after a terminal prior request. /stop is terminal and suppresses future automation; Cancel while in progress discards pending request.

## Privacy, safety and idempotency
- This is customer-requested **business-service intake**, not arbitrary interception of old personal chats, mass messaging, an actual booked/paid order or marketing consent.
- External model processing of sensitive health/personal content requires an informed opt-in; this pathway **does not** send answers to external AI.
- The existing official webhook signature, getBusinessConnection, can_reply, provider event freshness, HMAC identities, encrypted context, private FORCE RLS, session advisory lock, STOP opt-out and dedupe are mandatory. A message from an unrelated chat cannot create a lead.
- The 5-question Business conversation has a separate bounded rate allowance within the *existing* global 100/day cap; no new workflow, queue, bot, API key or billable model.
- The normal five legacy service workflows still use format→typed Confirm; this feature does not silently change their provider consent or CRM behavior.
- The optional explicit free-situation review bot remains distinct from the human-first paid service CTA in #4768.

## Production activation — NOT YET PROVEN
- Apply the additive migration `20261116223411_hh_tg_business_ai_secretary_intake_v1.sql` exactly once only after protected source merge and owner security review; verify new check constraints, FORCE RLS, no anon/auth grants and existing signed roles. Do not reapply #4576 migration.
- Owner must enable BotFather Secretary Mode and attach the existing @holistichouse_bot to **human** @holistichouse under Telegram Settings → Chat Automation: **new chats only**, only **can_reply**, exclude existing contacts/chats, then verify connection from a second consenting Telegram account. This must not be enabled for untrusted existing conversations.
- Only after successful proof, set `HH_CRM_TG_CHAT_AUTOMATION_ENABLED=true` in Vercel Production (server-only), then publish using **only** already-existing scheduled `hh-hourly-vercel-production.yml`, not a direct manual deploy.
- Acceptance: RU/EN/ES web CTA → correct human chat → real signed Telegram Business Send → 5 questions → encrypted session → exactly one CRM/contact/HH reference → @Andydotbot real receipt → owner manual response → STOP/replay and unsubscribe tests → compare canonical production serving SHA. No LIVE claim from mock tests, code merge, READY or webhook 200 alone.

No new paid plans, providers, bots, queue, schedule or Vercel previews.
