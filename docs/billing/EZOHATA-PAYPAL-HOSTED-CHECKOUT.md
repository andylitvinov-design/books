# Ezohata-style PayPal hosted payments for Holistic House

Updated 2026-10-20. Production: andylitvinov-design/books, branch codex/public-book-library.

## What the old shop confirms

The public https://ezohata.com/payments advertises a shopping cart with PayPal
in EUR/USD, PrivatBank in UAH, and historical RUB methods. This does not expose
the old private merchant/order API or prove that its transaction can settle a
Holistic House service. The independent https://ezohata.vercel.app is a different
rebuild; do not treat its incomplete PayPal integration as the live old shop.
Ezohata Finance has PayPal transaction-import credentials, not independently
verified permissions to create/capture payments for Holistic House.

We use the SAME CUSTOMER PRINCIPLE (fixed-price service > cart > chosen gateway >
hosted payment page > independently verified receipt), NOT old Magento code,
legacy surcharges, banking credentials, unknown exchange rates, or restricted
regional gateways.

## PayPal Payment Links, minimal merchant setup

This provider-hosted method avoids a new in-house card processor or extra
payment API credentials. PayPal's own official feature documentation:
https://developer.paypal.com/payment-links-buttons/create-payment-link/

The owner can use the EXISTING VERIFIED PAYPAL SELLER ACCOUNT from Ezohata,
provided the legal payee is authorized to receive money for Holistic House.
PayPal still requires a Business-account merchant profile for Payment Links.
PayPal Canada permits eligible unincorporated individual sellers to use a
Business account; it is not automatically a requirement to incorporate:
https://www.paypal.com/ca/legalhub/paypal/useragreement-full

Steps:
1. Log into the existing authorized PayPal business account (do NOT register a
   second corporation merely for this checkout). In the PayPal Business menu
   navigate to Sales > Payment Links and Buttons, or Pay & Get Paid > Create
   Payment Links and Buttons.
2. Create one-time fixed EUR links for 30-minute consultation EUR 50, 60-minute
   consultation EUR 100, and combined consultations EUR 150. Distinct links;
   disable customer-entered amount, adjustable quantity, tips, recurring
   payments, coupons, discounts and extra surcharges.
3. Open each published PayPal link and confirm the customer-visible merchant,
   currency, exact final EUR amount, tax treatment, cancellation/refund terms
   and payee ownership. Inspect the PayPal account activity after a test
   transaction; URL/HTTP status or a return page alone is not proof of receipt.
4. Put only the PUBLIC PayPal links (never password/API secret) into production
   Vercel project codex-public-book-library:
   HH_PAYPAL_HOSTED_50_EUR_LINK
   HH_PAYPAL_HOSTED_100_EUR_LINK
   HH_PAYPAL_HOSTED_150_EUR_LINK
5. AFTER successful merchant/payee/price validation set:
   HH_PAYPAL_HOSTED_PAYEE_APPROVED=true
   HH_PAYPAL_HOSTED_EUR_AMOUNTS_VERIFIED=true
   HH_PAYPAL_HOSTED_LINKS_ENABLED=true  (set LAST).
   Remove/disable any approval flag to stop new hosted links.
6. Confirm production READY, exact commit, aliases and user journey on EN/RU/ES
   payment and cart pages. Square is a separately approved CAD option.
   Invalid/duplicate destinations are all disabled and absent links fall
   back to existing PayPal.Me (no silent EUR->CAD conversion).

Only approved https://www.paypal.com/ncp/payment/<id> links without query,
fragment or credentials are accepted. No payment tokens, customer names,
medical information, tracking IDs or results are sent in the URL.

IMPORTANT: A reusable Payment Link doesn't identify a unique Holistic House
order, so hosted payments require payment-reference / provider statement
reconciliation before CRM paid status or fulfilment. They are NOT equivalent to
the separately guarded PayPal Orders v2 capture and webhook service ledger,
which can automatically record paid after readback. Do not claim verified
settlement or unlock service/course access based on the redirect.

For the full automatic order-confirmation path, first approve the existing
PayPal Orders v2 financial schema, provider merchant app and signed webhook:
docs/billing/paypal-commerce-setup.md .

## Holistic House shop storefront (2026-10-20)

The public storefront is now served at /en/shop, /ru/shop and /es/shop.
Visitors can filter Consultations, Programs and Free resources, search and sort,
add canonical fixed-price sessions to the shared cart, then select an existing
approved payment provider. The identical catalog totals are EUR 50 / 30 minutes
and EUR 100 / 60 minutes (EUR 150 combined).

Other offers (Alchemy, Guided Imagery, Business) are priced by agreement and
link to the existing service pages; free Situation Review and Wu Xing resources
remain free and cannot enter a paid checkout. The website does not invent prices
for courses or automatically book availability.

Shop navigation is in the desktop header and mobile menu and Services hero;
the empty cart links to Shop. It reuses SERVICE_CART_STORAGE_KEY and
SERVICE_CART_UPDATED_EVENT, existing PayPal.Me, guarded merchant Orders v2,
merchant-approved hosted PayPal links, Square, Interac, Wise and ZEN routes.

Isolated WebKit/Chromium browser tests at 320, 390, 430 and 1024 pixels assert
catalog, filters, safe add/remove, canonical checkout, guarded providers and
no horizontal overflow. They do not send any financial requests.

PayPal.Me and generic Payment Links still need independently verified funds;
an external payment redirect does not prove booking, bank deposit, or a
CRM paid state. Full automatic settlement requires approved provider E2E and
the protected Orders v2 ledger documented in paypal-commerce-setup.md.
