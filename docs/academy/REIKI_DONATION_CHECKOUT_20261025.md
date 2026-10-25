# Holistic House · Reiki Practitioner voluntary donation checkout (25 Oct 2026)

Production integration target: `codex/public-book-library`, `holistichouse.vercel.app`. Canonical Academy course and existing opt-in CRM are reused. This is **not** the personal 30-minute €50 / 60-minute €100 session checkout.

## User contract

1. End-01: a student selects their **one free Level 1 chat initiation**. Optional second/third Reiki traditions have checkboxes. Selecting either opens an accessible native **course donation cart** within the current lesson (EN/RU, mobile 320–430px). The student chooses a **voluntary EUR amount (whole euros, €1–€250)**. Unselecting extras removes the optional cart; nothing is charged.
2. The preview is not an invoice. Student completes five lessons and **explicitly** submits the existing consented application on end-02. Do not collect money before the student has a saved application.
3. End-02 with a confirmed application and optional donation choice: inline checkout creates one private, account-scoped order (idempotent `operationId` and unique `application_lead_id`), deriving donation traditions **exclusively from the encrypted application**, never user-supplied product IDs. Preview amount is checked by server. The free initiation and course access do not depend on payment.
4. Only after independent merchant approval flags are enabled, the checkout offers the **existing** personal `paypal.me/psitrends/<amount>EUR` for Goods & Services (PayPal account may be required). No name, report, illness, email, application ID or order reference is sent in the provider URL or pixels. Do **not** enable Friends & Family for services. PayPal.Me does not authenticate an order, capture, or return a signed receipt.
5. Student completes an **actual** provider transfer, copies its transaction ID from PayPal, and submits the ID securely. Server encrypts the reference (AES-GCM with user/record context) and stores a keyed HMAC digest, state `review`. The student sees **waiting for verification**, not paid.
6. Owner's existing protected `/admin/reiki-leads` CRM shows the same account/course application, requested amount, traditions and claimed transaction ID. An independent PayPal account readback/check of recipient, **exact EUR amount**, unique ID and actual completed status is needed. Owner re-enters ID, confirms verification, and performs the CAS transition `review → paid`. Unique digests reject reused transfer IDs. This action **records a verified receipt**; it does not charge PayPal and is not a provider webhook.
7. Then CRM displays **received €X EUR, verified timestamp**, and student end-02 shows the same authoritative paid receipt on refresh. A clicked link, copied transaction ID, screenshot, returned page, or request acknowledgement must never show as `paid`. No unsolicited external SMS/WhatsApp/Telegram containing private course data.

## Architecture

- Pure validation: `data/academy/reiki-donation-model.js`.
- New **separate financial ledger**, not duplicate CRM contact: `app_private.reiki_donation_orders`, schema `supabase/migrations/20261025130000_hh_reiki_donation_manual_receipts.sql`.
- Strict `ENABLE/FORCE RLS`; student backend can insert own pending and submit own claim, **cannot update paid columns**. `hh_app_inbox` has read and specific paid columns only under practitioner-id scope. No public, anon, authenticated or service-role access.
- Service: `lib/academy/reiki-donation-orders.js`, using existing `transaction`, verified Google account context, opt-in application encryption and PayPal.Me payee.
- Learner private API: `/api/app/reiki-donations` GET status, POST `create|claim`; same-origin CSRF, verified authentication, rate limits, private no-store response.
- Owner admin action: existing `/admin/reiki-leads/data` with `verify-donation`, same admin PIN and origin boundary.
- UI: `ReikiDonationPreview` / `ReikiDonationCheckout`; no separate signup, no new billing entitlement or initiation-award automation.
- New source test: `tests/reiki-donation-receipts.test.mjs`.

## Fail-closed release approvals (Production Vercel server-only environment)

- `HH_REIKI_DONATION_SCHEMA_APPROVED=true`: only after applied schema and RLS/security readback.
- `HH_REIKI_DONATION_PAYEE_APPROVED=true`: only after owner confirms PayPal account/legal right to receive one-time payments for the course, recipient display and refund/tax terms.
- `HH_REIKI_DONATIONS_ENABLED=true`: enable **last**, after a successful real minimal EUR receipt and independent customer↔owner CRM verification. `HH_PAYPAL_PERSONAL_DISABLED=true` remains a global immediate kill switch.
- With missing approvals, show honest “not activated” status and **no payable link**. Existing free application remains usable.
- PayPal.Me cannot provide **automatic instant settlement**. That requires a **separately approved** merchant Orders v2 integration and signed/readback-verified PSP webhooks; merely adding a client-side “I paid” button is prohibited.

## Acceptance checklist — do not call live before these pass

- [ ] Source unit tests plus pre-existing Reiki forms/CRM tests, lint/typecheck/build.
- [ ] Private DB migration applied to production only after security review; verify no unwanted open grants, forced RLS and one order per application.
- [ ] iPhone 320, 375, 390, 430px EN/RU: check native modal, presets/custom amount, VoiceOver/keyboard/Escape, lesson navigation, no horizontal overflow.
- [ ] Unsigned guest, wrong owner/account, missing opted-in application, free-only request, tampered amount, repeated click/operation and transaction-ID reuse rejected.
- [ ] Authentic **PayPal** transfer of an agreed EUR amount verified in merchant account; client submits ID; reviewer independently verifies exact ID and amount; client and CRM readback show same EUR and timestamp. No test charge without owner authorization.
- [ ] Refund/chargeback procedure or follow-up hold documented before enabling high-volume payments. Automatically marking refunded or delivering initiation is out of scope.
- [ ] CI passed; protected production branch merged; Vercel READY SHA and `holistichouse.vercel.app` alias identical; real E2E checked.
