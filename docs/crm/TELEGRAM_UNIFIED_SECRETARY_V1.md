# Holistic House · Unified Telegram Secretary / Published Offers v1

Owner directive: one intelligent secretary on the existing @holistichouse_bot, attached only to @holistichouse by Telegram Chat Automation; no second model, bot or CRM.

## Customer-visible scope

1. The visitor taps a Services Request, opens a human @holistichouse Telegram chat with the selected service already drafted, and presses Send. This click is not consent, confirmed order, payment or identity linkage.
2. After a signed business_message and exact active connection proof for @holistichouse + can_reply, the existing #4522 intake handles the selected service, format, typed Confirm, HH reference and STOP. Consent and RLS continue to control all mutations.
3. Explicit product/service catalogue queries, and only those, use the same native secretary role router and Consultant Mind/ranking. No unconsented external LLM. The response contains up to three links or buttons for active published services and already verified public programme index pages.
4. Prices and service descriptions must come from current DB published app.service_offerings with an approved active practitioner. Null/unknown prices are not free. The course catalogue app.practitioner_courses has zero published rows as audited; OPORA and Reiki Academy are approved first-party index links, not individual verified paid course products. MyTube is also an index, not a generated MP4.
5. The bot does not generate medical diagnoses, custom health treatments, unrequested sales, payments, marketing, fabricated bookings, or arbitrary URL sends. It ignores bot/outgoing/forwarded/edited/group messages and handles emergency cues without product upsell.
6. Reply markup is restricted to first-party HTTPS URLs with exact locale/allowed paths, max three buttons; provider-origin signed updates have 7-day replay idempotency plus per-chat and global rate limits. No automatic replay on uncertain Telegram result.

## Owner-only activation and LIVE proof

- The private business-session migration in PR #4522 must be applied under FORCE RLS after protected merge. No anon/authenticated grants and no second CRM.
- Enable Secretary Mode for existing @holistichouse_bot in @BotFather and connect it from the separate human @holistichouse account, Settings → Chat Automation: new chats only, reply right can_reply only, exclude existing personal conversations.
- HH_CRM_TG_CHAT_AUTOMATION_ENABLED stays OFF until real consenting second-account messages prove getBusinessConnection, replies, encrypted CRM HH reference, STOP and disconnect. The bot cannot control private Telegram settings via GitHub/Vercel. Catalogue matching is deterministic and local by default. Explicit per-message /ai may use the SAME owned Qwen already supported by the website only when HH_TG_SECRETARY_OWNED_ENABLED and HH_AGENT_OWNED_ENABLED are true and the actual owned Qwen endpoint is verified. The model receives only public catalogue titles and coarse topic, NEVER raw client text, private history, chat IDs, diagnoses, prices or reports; failure returns the reviewed deterministic reply. This optional Qwen path is not assumed active or tested on LIVE.
- Protected GitHub exact-head Core/Specialist/hh-merge-check, Vercel READY served SHA and public HTTPS pages are independent from actual Telegram provider delivery proof. The latter cannot be replaced by HTTP 200, mocked Playwright or an unset flag.

## CRM architectural boundary

Current existing CRM messaging account has unique owner_id+channel; an ordinary bot chat and a personal Business-account chat use different provider identities. This first release places confirmed requests in existing app.public_service_enquiries. It does NOT falsely claim the account's personal chat has been linked to bot crm_msg_threads or that owner replies can be sent through the bot's ordinary identity. Full two-way Sales CRM Business inbox needs a future owner-approved scoped identity/RLS extension and real Telegram E2E.

Acceptance: RU/EN/ES explicit 6 published-service records and index pages, correct contact/from price, no clinical data in URLs/logs, no draft product, stopped/concurrent user safe, no provider spend or new scheduled job.
