# Holistic House CRM: bounded implementation contract

Requested 13 October 2026. The code in `lib/crm` is a tested policy layer, not a running mail delivery service.

## Data and authorization

Keep contacts separate from clinical records. Minimal contact fields: opaque contact UUID, owning practitioner/account UUID, display name, encrypted email/channel destination, locale, lead/client/archived lifecycle, verified-address flag and source. Never import existing clients automatically or read their responses/results to populate CRM. Reference billing through the authenticated internal account UUID; payment-provider metadata must not include contact email, medical data or course-topic information.

Consent ledger: immutable event UUID, contact UUID, channel, fixed purpose `product_updates`, granted/withdrawn decision, occurred timestamp, source, consent-copy version and recording actor. An owner-recorded grant requires actual evidence; its label does not prove consent. Paid subscription, account creation and purchases do not grant marketing consent. Existing/unknown contacts default to no marketing permission. Messenger opt-in must independently establish the destination belongs to the contact.

Database proposals remain unapplied. Every read/write must authenticate the actor and enforce ownership server-side. No public role receives CRM table access. Encrypted destination storage must use the existing reviewed encryption pattern. CRM editors must not be able to grant paid entitlements or alter provider-verified billing state. Only minimal operational projections may be shown in the owner CRM; no clinical joins.

The unapplied proposal cascades an approved account deletion to that owner's CRM contacts, consent events and drafts, and to the account's own communication preferences. These records do not contain billing receipts. This avoids permanently blocking the existing deletion workflow. Before activation the owner must approve this retention/deletion behavior; any required audit retention must be explicitly designed, bounded and disclosed rather than silently keeping personal contacts forever. No deletion has been executed.

## Campaign lifecycle

Draft → preview → recipient-list review/approval → queued → sent/failed/suppressed. Fixed general-information templates and business-status segments only. No psychological-score, diagnosis or health-based targeting. Sending requires configured verified sender/domain/provider, explicit approval of the specific campaign/audience and current per-channel consent. Approval must be bound to the exact content/version/recipient scope, expire if those change, and be invalidated by withdrawal. Use durable idempotent recipient jobs; recheck consent immediately before dispatch; never duplicate after uncertain provider response without readback. No campaigns are sent by this implementation.

Every promotional email must include sender identification/contact details and a working no-login unsubscribe action. Implement immediate suppression on unsubscribe, bounce or complaint. Link tokens must be high-entropy, purpose-bound and stored only as hashes; a GET may show confirmation to avoid mail-scanner accidental changes, while an appropriate one-click POST can unsubscribe. Expired/malformed links must not expose contact existence. Transactional billing receipts must stay separate from marketing.

## Current references checked 13 October 2026

- CRTC consent/identification/unsubscribe requirements: https://crtc.gc.ca/eng/com500/guide.htm
- CRTC FAQ: https://crtc.gc.ca/eng/com500/faq500.htm
- CRTC consent evidence: https://web.crtc.gc.ca/eng/com500/guide.htm

These sources require honoring opt-out without delay, at the latest within ten business days; the implementation target is immediate. Provider onboarding, verified sender identity, postal/contact details, messenger-specific approvals, production schema/security approval and explicit campaign approval are launch gates. This is engineering guidance, not a legal compliance certification.

## Verification

Run `node --test tests/crm-consent.test.mjs`. Synthetic contacts only. Passing policy tests does not establish database/RLS integration, live email delivery, messenger approval or end-to-end unsubscribe behavior.

## Owner contact-management polish — 18 October 2026

Source implementation adds lead/client/archived filters, a privacy-first one-way **Do not contact** action that writes a withdrawal event and sets global suppression in one owner-scoped transaction, and a safe duplicate-email error. An attempted repeat suppression is idempotent. Neither this action nor draft creation sends any messages, verifies an email address, changes subscription status or authorizes marketing.

**Release gate remains in force:** on 18 October the live Holistic House Supabase project had no `app.crm_*` tables or `hh_crm_backend` role, and Vercel did not have `HH_CRM_ENABLED` / `HH_CRM_PRODUCTION_APPROVED`. The source UI alone is **not** a working production CRM. The guarded schema proposal must receive explicit owner security/deletion approval and be tested with the exact existing restricted runtime LOGIN before enabling these flags. Never grant broad CRM table rights to authenticated/anon or enable campaign dispatch by default. No CRM production schema, environment or customer data was changed by this source update.
