# Holistic House — individual payments (without a registered corporation)
Updated: 2026-10-20
Source: codex/public-book-library, Holistic House.

## Current approved default: personal PayPal.Me
- Site uses the existing owner-verified PayPal.Me profile at paypal.me/psitrends.
- Website catalog only allows €50 / €100 / €150 combinations of one-time sessions.
- PayPal Canada User Agreement: a personal account **can receive Goods & Services payments**, although PayPal recommends a business account if the account primarily sells goods/services.
- PayPal Canada Help clarifies that **PayPal.Me requires the payer to have a PayPal account**. A card added to their PayPal account may fund the payment; it is NOT guest card checkout. Never market it as card payment without PayPal login.
- Tell the payer to select **Goods & Services**; NEVER request Friends & Family for services. Exact external payment methods depend on buyer eligibility and PayPal restrictions.
- Official PayPal Canada payer-help: https://securepayments.paypal.com/ca/cshelp/article/how-do-i-send-money-help293
- After payment: request only the transaction reference, then manually verify incoming funds inside the PayPal account before confirming an appointment or marking an order paid. No automatic entitlement/fulfillment.
- Optional: PayPal Seller Profile is offered to eligible Canadian personal-account sellers, not a guaranteed account feature.
- Official PayPal Canada agreement: https://www.paypal.com/ca/legalhub/paypal/useragreement-full
- Official help: https://www.paypal.com/ca/cshelp/article/what-is-a-seller-profile-and-how-do-i-sign-up-help510

## Canada: Interac e-Transfer
- Available as a **manual request** through WhatsApp. It is not a one-click card charge.
- Before sending: personally confirm session, authorized recipient, purpose/reference and a **specific CAD amount**. EUR list prices are not automatically converted.
- Confirm personal bank-account terms for receiving professional services payments; no credentials or banking details in client web URLs.
- Do not grant service access based on a screenshot or the website redirect; confirm actual deposit.

## Optional card acceptance: Square Individual / sole proprietor, not Stripe
Square Canada's official onboarding instructions support individual / sole proprietor applicants. The provider still must verify identity, business activity and a Canadian CAD bank account and has sole discretion to approve the merchant. It is not guaranteed to work without any information about the activity.
Sources:
- https://squareup.com/help/ca/en/article/8329-onboard-your-sole-proprietorship-to-square
- https://squareup.com/ca/en/payment-links
- https://squareup.com/help/ca/en/article/5085-accepted-cards

Square Canada charges **CAD only**. Do not copy EUR amounts to Square or silently do FX.

To enable Square payment links after owner verification:
1. Owner registers as individual/sole proprietor if eligible and confirms name, identity, Canadian settlement bank and exact seller display name; no claim of corporation.
2. Set up **three distinct** Square fixed-price one-time links for the **CAD** amounts the owner chooses for the existing €50, €100 and €150 catalog totals. Verify price, recipient, product description, cancellation/refund policy and any applicable tax handling. Do not allow user-entered price, add-ons or repeat billing.
3. Use these Production Vercel non-secret public link / CAD minor-unit pairs:
   - HH_SQUARE_CAD_50_LINK and HH_SQUARE_CAD_50_MINOR
   - HH_SQUARE_CAD_100_LINK and HH_SQUARE_CAD_100_MINOR
   - HH_SQUARE_CAD_150_LINK and HH_SQUARE_CAD_150_MINOR
   Example CAD minor units: 7500 means CAD $75.00. This is **only an example**, NOT a recommended exchange rate or actual pricing.
4. After confirming link ownership and **exact CAD amounts** on Square, set HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED=true and HH_SQUARE_CAD_AMOUNTS_APPROVED=true. Set HH_SQUARE_CAD_LINKS_ENABLED=true **last**. Turning any flag off is a kill switch.
5. Provider URLs must be exact HTTPS square.link/u/… or checkout.square.site/… with no query, fragments, credentials or redirects supplied by users. All three links must be distinct, with increasing prices. The site fails closed if any mapping is missing or malformed.
6. Verify a legitimate paid test/real charge with Square, check balance and refund reconciliation independently. Square links do **not** automatically settle the app's internal service-order ledger, so continue manual verification.
7. The **EUR-catalog Square cart option** remains **hidden** until the Production account, payee and all three amounts are approved; an unconfigured cart button must never pretend to be ready. A separately verified single-session CA$50 link is documented below and never mapped to EUR products.

## Legacy integrations
- Existing Stripe Checkout / Stripe Payment Links remain unconfigured and are NOT displayed in the personal public cart. Never present Stripe signup as a prerequisite for personal PayPal.
- PayPal Business Orders v2 PR #923 is still not activated: it requires a verified PayPal Business merchant account, approved private ledger, signed webhooks and sandbox evidence. Never merge it solely to create a "PayPal" button.
- ZEN.COM and merchant-verified Wise remain existing optional/manual paths. Do not send client health information or bank/card credentials to payment-provider links.

## Legal boundary
- "No corporation" is distinct from "no business activity". In Ontario, operating under a trade name different from your personal legal name may require registering that business name; confirm the actual public-facing arrangement before taking further merchant steps.
  https://www.ontario.ca/page/business/start/decide-ownership-structure
- Verify the individual's right to perform remunerated services in Canada, taxes/GST-HST if applicable, payment account restrictions, and professional-service advertising rules. The site itself cannot waive these conditions.

## Payment UX and verification
- Supported locales EN/RU/ES. SKU selection amounts come only from the fixed catalog, no user-entered price or invoice IDs.
- PayPal.Me shows exact EUR totals; Square only shows its separately approved CAD charge.
- Interac requires a personally confirmed CAD quote. No automatic conversion and no "payment succeeded" state based on a click, query string or screenshot.
- No tokens, names, diagnoses, symptoms, answers or billing bank/card data are exposed in payment URLs or WhatsApp scripts.

## Link handoff for the owner — 2026-10-20

### PayPal: links already exist, do not recreate
- 30 min EUR 50: https://paypal.me/psitrends/50EUR
- 60 min EUR 100: https://paypal.me/psitrends/100EUR
- Both consultations EUR 150: https://paypal.me/psitrends/150EUR
- The /en/payments, /ru/payments and /es/payments pages now have direct PayPal links; the combined amount comes only from the fixed catalog.
- Owner must verify the public payee is their PayPal account and that a real Goods & Services transaction reaches that account. Successful redirect does not mean a payment arrived.

### Owner-supplied standalone Square session link — 27 October 2026

- On 27 Oct the owner supplied a Square Buy Button / public URL `https://square.link/u/Kv0TfvaP`. Independent live page readback: `Session - Holistic House`, seller display `Holistic House`, **CA$50.00**, Square-hosted checkout at `checkout.square.site/merchant/.../checkout/...`. Do not copy the Square-supplied pop-up script: its click binding relies on an unspecified DOM id; opening the canonical clean URL directly is sufficient.
- The public `/{en,ru,es}/payments` page offers this **separate explicitly labelled CA$50 session payment** only on Vercel Production, with an optional emergency flag `HH_SQUARE_CAD_50_SESSION_DISABLED=true`. It does **not** mean the established **EUR €50/30min** price is now CAD $50, does **not** compute an FX quote and does **not** assign or settle any cart SKU or CRM order. Show the card in a distinct section with EN/RU/ES warnings: client must first agree a specific CA$50 amount/session with Andrey and inspect the exact recipient/final total on Square.
- The clean public link is not a secret. It is intentionally reused in existing `lib/commerce/square-payment-links.js` via `configuredStandaloneSquareSessionCad50`, rather than activating the **three-link EUR-cart Square mode**. Other individual `HH_SQUARE_CAD_*_LINK` mappings remain fail-closed until separately approved.
- After payment, client sends only transaction ID by WhatsApp. Owner must independently check the transaction inside their Square Dashboard, gross amount/currency/refund state, and match it to the agreed consultation before any `paid` or fulfilment update. A click, return URL or WhatsApp claim is not settlement. No provider-side charge, refund or settlement was initiated during integration.
- Before treating this as a business-complete payment flow, confirm actual Square payout/KYC, any tax or refund terms, and a consented small real payment + refund or reconciliation. If the dashboard changes the live link's amount/payee, **disable the public link immediately** until it is re-verified. The single link should not be reused for a different price without updating the verified public label.

### Interac: do not create a web link
- Customers click Request Interac for one consultation or ask via the validated cart for combined services.
- Reply personally on WhatsApp with the verified AutoDeposit recipient (email/phone), agreed CAD total, payment reference and availability. Do not advertise unknown CAD conversion on site.
- Check that the transfer has actually arrived in the bank before confirming an appointment. Do not share bank account numbers, login/password, or card information.

### Square card links: only after identity approval
- Square's Individual / sole-proprietor onboarding still requires provider KYC and a Canadian bank; no registered corporation is universally required, but Square decides eligibility.
- Open Square Dashboard > Payments & orders > Payment links > Create link > Collect a payment. Make fixed one-time CAD links (not subscriptions, donations, tips or editable amounts).
- Create THREE independent links with title/service and independently chosen verified CAD prices: 30-minute session (website €50), 60-minute session (€100), and both (€150). These are catalog references; Square itself charges only CAD.
- Copy the THREE public Square checkout URLs and THREE exact CAD totals. Send those six items to the assistant to connect; never send dashboard login, passwords, customer data, API secrets or bank credentials.
- The existing implementation uses Vercel Production variables HH_SQUARE_CAD_50_LINK / HH_SQUARE_CAD_50_MINOR, HH_SQUARE_CAD_100_LINK / HH_SQUARE_CAD_100_MINOR, HH_SQUARE_CAD_150_LINK / HH_SQUARE_CAD_150_MINOR, plus the merchant/price reviewed flags HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED, HH_SQUARE_CAD_AMOUNTS_APPROVED, HH_SQUARE_CAD_LINKS_ENABLED.
- Agent must verify each URL and amount, enable flags last, redeploy and test production. With no Square account/links, the customer must not see a fake Square button.
- Square dashboard guidance: https://squareup.com/help/ca/en/article/8364-customize-square-payment-links

### What is automated and what is not
- Automated: fixed-price selection, PayPal EUR links, direct Interac enquiry, optional guarded Square CAD links and mobile EN/RU/ES navigation.
- Not automated: provider identity onboarding, bank/card payout setup, proof of incoming funds, CRM paid settlement or appointment booking. Never treat a redirect, reference or user message as proof of payment.

## Square-first audit — 2026-10-24

**Merchant decision:** Square is the preferred card-payment provider for Holistic House;
do not point new card checkout to Stripe. An individual/sole-proprietor Square account
still requires Square's independent identity, activity and payout verification.
Existing PayPal/Interac/Wise alternatives are not automatic Square receipts.

**Verified production configuration:** the current Vercel Production environment
has none of the `HH_SQUARE_*` names listed above. Consequently all three Square
buttons safely remain hidden; a merchant signup or login email alone does not
prove checkout eligibility. No active Square orders or payments have been
verified in this audit.

**Source UX correction:** when all three Square CAD links and payee/amount flags
are independently verified, Square comes first in the existing EN/RU/ES cart
and the payments page. Individual and combined-card CTA show *CAD* totals;
Square receipt requests carry Square and the correct CAD amount, not PayPal/EUR.
PayPal receipt requests remain separately labeled. This is provider handoff
only, **not** a claim of capture, CRM paid status, booking or fulfilment.

**Production handoff (owner dashboard; no secrets in chat):**
1. Open [Square Payment Links](https://squareup.com/dashboard/payment-links) and
   verify card acceptance/payout eligibility. If the precise dashboard path
   redirects, use Payments & orders → Payment links in the Square Dashboard.
2. Create or verify fixed one-time CAD links for the canonical site totals
   €50, €100, and €150; turn *off* customer-entered price and tipping. Review
   merchant name, tax/refund wording, and exact CAD amounts.
3. Configure the nine `HH_SQUARE_*` Production variables listed above in
   [Vercel project settings](https://vercel.com/super10/codex-public-book-library/settings/environment-variables),
   enabling flags last only after validation. Do not put Square API tokens
   or webhook signature keys into public `NEXT_PUBLIC_*` variables.
4. Execute an owner-approved small real charge, verify the Square transaction
   and payout readback, and test cancellation/refund. Until then, keep the
   feature flags OFF.

**Dynamic Square Checkout API (source implemented; not activated as of 2026-10-24):** reusable static
Square Payment Links do not identify a verified Holistic House buyer/order.
Automatic `paid` status and CRM/entitlements require authenticated, server-created
per-order Square Checkout API sessions with Square order/reference ID, a
private owner-bound idempotent payment ledger, signature-verified webhook using
the *raw request body*, an independent Square API payment readback (merchant,
CAD amount, order, completed state), and refund/dispute reconciliation.
Never set `paid` from a return URL, browser parameter or customer-supplied
transaction reference. Keep the separate billing entitlement migration/approval
gate closed until security/RLS, sandbox and genuine provider E2E pass.

## Real per-order Square cart integration — 24 October 2026

A separate, **feature-gated Square Checkout API** path now exists in the existing
`/en|ru|es/cart` pages. Unlike generic Dashboard Payment Links, it creates a
**single-use** Square checkout for each authenticated account's immutable cart,
with a fixed CAD price and stable operation ID. Source is deliberately dormant
in production while merchant credentials and acceptance checks are absent.

Flow: account sign-in → session + origin + rate limit → RLS-owned private order
(`app_private.square_service_orders`) → Square CreatePaymentLink with same
idempotency key on retry → Square-hosted CAD card payment → return to cart →
read-only authenticated order status / provider order+payment readback →
signed raw-body Square webhook → verified merchant, Square order/location, CAD
amount and COMPLETED receipt → append protected paid state. Refund/dispute
holds are sticky; **no checkout redirect or user-provided transaction reference
can mark a payment paid**. No clinical text or test scores are sent to Square.

Production server-only environment keys:
- `HH_SQUARE_API_ENABLED=true`, `HH_SQUARE_API_MODE=production`
- `HH_SQUARE_API_TOKEN` (Square Developer production access token; never expose)
- `HH_SQUARE_MERCHANT_ID`, `HH_SQUARE_LOCATION_ID`
- `HH_SQUARE_WEBHOOK_SIGNATURE_KEY` and
  `HH_SQUARE_WEBHOOK_URL=https://holistichouse.vercel.app/api/payments/square/webhook`
- CAD price pairs `HH_SQUARE_CAD_50_MINOR`, `HH_SQUARE_CAD_100_MINOR`,
  `HH_SQUARE_CAD_150_MINOR` **separately approved by owner**.
- Security approvals: `HH_SQUARE_API_SCHEMA_APPROVED`,
  `HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED`,
  `HH_SQUARE_CAD_AMOUNTS_APPROVED`,
  `HH_SQUARE_TAX_REVIEW_APPROVED`,
  `HH_SQUARE_REFUND_TERMS_APPROVED`,
  `HH_SQUARE_API_PRODUCTION_APPROVED`.
- All gates are required; turn on `HH_SQUARE_API_ENABLED` **last**.

Square developer permissions for Checkout API: ORDERS_READ, ORDERS_WRITE,
PAYMENTS_WRITE; include PAYMENTS_READ for independent payment readback.
Subscribe the exact production URL to `payment.created`, `payment.updated`,
`refund.created` and `refund.updated`; copy the subscription-specific webhook
signature key into Vercel **secret** settings. Sandbox uses a separate app token
and explicit HTTPS sandbox webhook URL, never production keys.

Do not configure until Square account/Canadian payout setup, business activity,
CAD prices, tax and refund terms are approved by Square/owner. Additive private
SQL file `supabase/migrations/20261025190309_hh_square_cart_one_time_20261024.sql`
requires isolated PostgreSQL 17 RLS tests and a reviewed Supabase migration
application before setting `HH_SQUARE_API_SCHEMA_APPROVED`.
Keep static checkout links optional and PayPal/Interac/Wise manual alternatives.
No transaction fee, real charge, refund, booking, marketing campaign or
entitlement has been initiated by this source change.

**Limitations:** only existing one-time fixed-price 30/60 minute sessions and their
combination; programmes and subscriptions remain excluded. New checkout requires
an authenticated, activated Holistic House account. 'Paid' means a verified
Square receipt in the private payment ledger, **not** booked/attended nor an
automatic CRM lead/contact or course entitlement. Owner fulfilment and CRM
invoice/booking association need separate authorized E2E after sandbox and first
legitimate received funds. A failed/unknown provider checkout must be reconciled;
never force-create another payment with a different idempotency key.
