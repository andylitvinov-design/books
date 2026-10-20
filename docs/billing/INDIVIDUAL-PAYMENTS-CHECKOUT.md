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
7. The Square option remains **hidden** until the Production account, payee and all three amounts are approved; an unconfigured card button must never pretend to be ready.

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
