# Fu talismans · payment-provider audit (2026-10-28)

**Production branch:** \`codex/public-book-library\`
**Scope:** Existing 3 illustrated Fu designs. **No prices approved; no stock/fulfilment or payment receipt verified.** Do not activate a provider solely because a public payee URL works.

## Customer-facing behaviour

1. Existing Fu gallery → same cart (EN/RU/ES), photo and selected items → Google PKCE login/create Holistic House account, verified email auto-filled; guest can request an owner-approved price with one email or phone.
2. The read-only server \`/api/public/talisman-checkout\` returns an exact fixed-price catalog total **only if** all selected designs and fulfilment are approved. Guest/Google tap is not an order, reservation or charge.
3. The authenticated \`/api/payments/talismans/checkout\` rechecks allowlisted items, owner-approved server price, reply-only consent, exact provider link, and saves encrypted CRM order **pending payment** before allowing a hosted checkout.
4. The provider redirect is not settlement. Only provider transaction readback and owner confirmation may mark the payment as received; there is **no Fu order provider webhook/ledger** yet. Do not call this automatic paid conversion.

## Provider matrix and enablement

| Provider | Customer action | Guard / owner action | Verified production status |
| --- | --- | --- | --- |
| **PayPal.Me EUR** | Hosted external payment for a published fixed amount. Funds manually reconciled as goods/services, **never** Friends & Family. | \`HH_TALISMAN_PRODUCT_PRICES_APPROVED=true\`, \`HH_TALISMAN_DELIVERY_TERMS_APPROVED=true\`, item EUR minor keys, \`HH_TALISMAN_PAYPAL_PERSONAL_APPROVED=true\`, and existing \`HH_PAYPAL_PERSONAL_DISABLED\` must not be true. Verify account can accept commercial goods; no automatic receipt. | **Not enabled for talismans**. Existing recipient \`https://paypal.me/psitrends\` is not a product approval. |
| **Square CAD** | Square-hosted card checkout, Apple Pay and Google Pay only if enabled in Square Dashboard. | Dedicated exact Fu **basket-specific** \`HH_TALISMAN_SQUARE_..._URL\`, approved CAD minor amount, \`HH_TALISMAN_SQUARE_LINKS_APPROVED=true\`; do not use consultation CA$40/50 links or implicit FX. | **Not enabled**; merchant link and product CAD price not verified. |
| **Wise Business OPEN** | Wise-hosted fixed EUR open link, with exact server-prefilled amount and public Fu IDs. | Existing \`HH_WISE_PAYMENTS_ENABLED=true\`, \`HH_WISE_PAYEE_APPROVED=true\`, \`HH_WISE_PAYMENT_OPEN_LINK\` must be a verified Business OPEN link, plus \`HH_TALISMAN_WISE_BUSINESS_APPROVED=true\`. | **Not enabled**; current WiseTag exists but is not a verified Business OPEN link. |
| **Personal WiseTag** | Customer may request a transfer instruction; not a fixed-price ecommerce checkout. | Require owner confirmation of recipient, exact EUR amount and reference. | Inquiry only. |
| **Interac e-Transfer** | Customer may request verified recipient and exact **CAD** amount. | Canada-only; manual bank recipient verification and transfer receipt reconciliation; never convert EUR using an assumed FX rate. | Inquiry only, not an integrated charge. |
| **ZEN.COM** | Customer may request verified bank-transfer details and EUR payment reference. | Never use a personal account top-up link to collect third-party funds; verify availability and owner payout/recipient. | Inquiry only; no merchant checkout. |

## Current approvals required

Owner publishes an approved EUR fixed price for each *enabled* Fu item (\`fu-prosperity\`, \`fu-harmony\`, \`fu-balance\`); agrees whether the deliverable is digital/physical, lead time, shipping/delivery country and refund conditions; then independently approves the exact provider recipient/link and payment-rail status. Set production variables only through authenticated Vercel settings, never chat or repository. **Do not add speculative SKUs, VAT, FX, payee banking data, card details or automated paid flags.**

## Verification status

- Source-level tests test price fail-closed, WiseTag exclusion, exact Square CAD link, Google return, consent and browser-side provider checks.
- Isolated WebKit 320/390/430 uses synthetic identity, CRM and provider; no real purchase.
- RLS + FORCE RLS remain enabled on \`app.crm_contacts\` and \`app.public_service_enquiries\`.
- Real owner Google sign-in, CRM record readback, settlement, refunds and actual delivery still require authorized E2E evidence before claiming completion.
- Official sources:
  - https://www.paypal.com/ca/legalhub/paypal/useragreement-full
  - https://squareup.com/help/ca/en/article/6692-get-started-with-square-checkout-links
  - https://wise.com/help/articles/5qGvWQuTiX0RSSvxWvKcBC/how-to-use-your-open-link-to-get-paid-through-your-website
  - https://www.interac.ca/en/how-to-use/interac-e-transfer/how-to-receive-money-with-interac-e-transfer/
  - https://ask.zen.com/hc/en-us/articles/28585778460572-How-to-top-up-your-ZEN-account-with-Instant-Bank-Transfer
