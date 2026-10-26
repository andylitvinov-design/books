# Holistic House · One Telegram bot, any approved practitioner's published service

Owner request · 26 October 2026 · implementation / QA gates. Related: books #985, #990.

## Product

Use the already configured @holistichouse_bot. Every **approved published** service has its own nonsecret `hhservice_<locale>_<offering UUID no dashes>` start link, or a directory fallback (`hhmasters_<locale>`). No extra bot/token, no mass messages. For EN, RU, ES:

1. Client taps **Request via Telegram bot** on the actual service page.
2. Signed Telegram webhook validates the bot and public offering, then responds with the actual selected master/service and a single inline first-party URL button. The URL opens a short consent form, normally within Telegram's browser. Bot text itself is not a lead.
3. Client supplies email **or** international phone, optional question, and explicit reply-only consent; submits once using the existing same-origin, rate-limited `/api/service-enquiries`.
4. Within one transaction the server reloads the specific published offering and its approved owner, encrypts a `public_service_enquiries` request for exactly that recipient, and inserts a lead into that owner's existing `crm_contacts`, subject to FORCE RLS. The visitor sees a reference only on a confirmed commit.
5. Assigned practitioner reviews the **existing My Practice requests/CRM**; contact is unverified, reply and booking/payment require subsequent actions. No client medical data is relayed by Telegram.

**Important scope:** The bot does **not** receive a free-form in-chat consultation application. A request is actually submitted through the compact first-party form reached from the bot's inline button. Direct typing after the handoff is explicitly **not forwarded** to Andrey or another master. This avoids pretending a chat message equals a committed enquiry and prevents inter-master data leakage.

## Security and compatibility

- A client cannot choose the master or owner directly. The only public hint is a service UUID; backend resolves `app.service_offerings` and `app.practitioners`, approved/published and active, exact owner.
- The new `service_offering_id` FK in `app.public_service_enquiries` binds each lead to its actual selected service. New narrowly scoped INSERT policy requires matching offering→practitioner→CRM owner. Existing Andrey policy and old request flow stay untouched.
- Signed Telegram webhook and stage storage use a separate service-handoff flag, update-id idempotency, 10/day replies and STOP. Before any consent the bot cannot persist a lead. A service link cannot bypass a previously stopped chat. Re-entering diagnostic with explicit `/start` resets the handoff.
- No chat ID, Telegram username, client contact, test result, report or medical data in links; no new Telegram credential, paid AI or push. The form is consent-based and encrypted at rest.
- Existing CRM public request owner-only RLS prevents cross-master reads. The target master must have an approved profile and active published service.

## Verification gates

- Focused Node regression suites for existing Telegram V1/V2 plus new input/deeplink/privacy rules.
- SQL migration: exact named version, FORCE RLS preserved, policy visibility, no public grants, metadata and FK verified in the **same** Holistic House project.
- CI source tests, lint/type/build, final reviewed PR tree and Vercel READY SHA must be recorded.
- Actual physical client Telegram → in-app form → **two distinct approved practitioner accounts** → recipient-only CRM/contact → owner reply remains a separate authenticated E2E acceptance. As of first read-only audit the production project had **one** approved practitioner (6 published services): do not claim proven two-master isolation or real device receipt.
- Rollout is zero additional marketing/paid provider spend. Existing bot public diagnostic gate must be true. Old FAQ, diagnostic, lead forms and private client cabinets must remain available.
