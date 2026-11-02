# Holistic House CRM: email sending (18 Oct 2026)

## Delivery scope
One-to-one owner email, with recipient-by-recipient confirmation. The source includes a Resend transport, explicit recorded consent and email address verification, encrypted payload and immutable send request ID, accepted/unknown/blocked history, 20 outgoing emails per owner in 24h, unsubscribe links, signed bounce/complaint webhook, and EN/RU/ES controls.

Automatic or bulk campaigns remain DISABLED. No subscriber imports, course purchase inference, clinical joins, payment or hidden sends.

## Required Vercel production environment
- HH_CRM_EMAIL_ENABLED=true (keep false until ready)
- HH_CRM_EMAIL_PRODUCTION_APPROVED=true (only after end-to-end approval)
- HH_CRM_RESEND_API_KEY: API key from Resend, server-side only
- HH_CRM_FROM_EMAIL: verified sender mailbox on an owned domain
- HH_CRM_VERIFIED_DOMAIN: domain must match the sender mailbox domain
- HH_CRM_SENDER_VERIFIED=true after DNS/SPF/DKIM + provider verify
- HH_CRM_SENDER_NAME: displayed sender
- HH_CRM_REPLY_TO: working sender contact email
- HH_CRM_POSTAL_ADDRESS: complete postal contact address for Canada CASL
- HH_CRM_RESEND_WEBHOOK_SECRET: verified Resend webhook signature key

Resend webhook URL: https://holistichouse.vercel.app/api/app/crm/webhook
Subscribe to email.bounced, email.complained, email.failed. The raw Svix signature is checked before any DB write.

No such Resend key or verified sender domain was present in Holistic House Vercel at the 18 Oct 2026 source audit. A vercel.app subdomain is NOT a sender domain the project can claim.

## Consent and actual sending
1. Owner adds only business-contact information. No marketing consent is assumed from account, invoice, paid plan or tests.
2. Owner records genuine external opt-in evidence (its source and date). A free-text owner assertion alone is not proof; keep the source record.
3. On owner action, a neutral verification email goes to that address. Its high-entropy token is in the URL fragment, hashed at rest. User confirms on the email-preferences page. GET does not mutate.
4. Owner opens that particular contact, composes a plain-text email, reviews and confirms it.
5. Server checks verified address + current recorded grant + non-archived/non-suppressed contact, reserves encrypted job/unsubscribe link and locks again at dispatch. Resend receives a one-recipient request with a stable Idempotency-Key.
6. An HTTP success means provider accepted, NOT that mail was delivered. Timeouts/errors remain status unknown, never automatically retried.
7. Each commercial email contains sender, postal address, reply-to and a no-login unsubscribe. User confirms with POST; suppression is immediate and permanent. Signed bounce/complaint events also suppress.

## QA gates and incomplete external configuration
- Run targeted tests, lint and Next build.
- Apply the migration 20261018131448_hh_crm_email_delivery_20261018.sql only after dry-run and SQL/RLS review.
- Anonymous CRM must remain 401, public unsubscribe must return generic output, and GET must never update consent.
- Verify with authorized synthetic opt-in accounts: address confirmation, one send, duplicate requestId, withdrawal, unsubscribe, bounce, and no cross-account information.
- Without a Resend API key, verified custom sender, postal address, webhook secret and test acceptance, leave HH_CRM_EMAIL_ENABLED off. Do NOT claim live delivery.
- Automated campaign drafts do not send. Subscriber registry still stays gated independently.

Official guidance:
https://crtc.gc.ca/eng/com500/faq500.htm
https://resend.com/changelog/idempotency-keys
https://resend.com/docs/dashboard/webhooks/introduction
\n## Delivery-readback hardening (18 October 2026)
The new email receipt migration expands message status to delivered, delivery_delayed, bounced, complained, failed or suppressed after signature-verified Resend webhooks. Provider acceptance is not delivery. An out-of-order provider event does not replace a terminal failure with a success, and duplicate event IDs are ignored. A missing provider receipt is retried by the webhook with HTTP 503 rather than discarded.
An email-preferences POST that cannot reach the database now returns a generic HTTP 503, and the client retains its fragment token so an unsubscribe may be retried without claiming completion. Configure Resend webhooks for email.delivered, email.delivery_delayed, email.bounced, email.complained, email.failed and email.suppressed before enabling live sends.
