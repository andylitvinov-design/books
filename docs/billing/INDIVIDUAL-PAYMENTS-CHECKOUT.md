# Holistic House — individual (unincorporated) checkout

Updated: 2026-10-20. Production source branch: codex/public-book-library.
Scope: published, fixed-price 30-min EUR 50 and 60-min EUR 100 consultations (both EUR 150). No memberships, taxes, customer records, appointment inventory or private health data are added to these payment URLs.

## Available before a merchant account

- Personal PayPal.Me: existing verified recipient Andrii Litvinov. Manual confirmation only. Use Goods & Services when available; never request Friends & Family for paid professional services.
- Interac e-Transfer (Canada): cart generates WhatsApp enquiry, not a payment. Owner first quotes a CAD amount and verified recipient/reference. Do not assume the EUR amount equals a CAD amount.
- ZEN.COM: manual transfer-details enquiry; Wise: only when an existing merchant-verified flag allows it.
- Card: if merchant-approved hosted links are absent, the cart requests a secure card payment link via WhatsApp. NEVER ask clients to send card information through WhatsApp.

## Activate hosted credit/debit card payments without incorporation

1. Register with Stripe in Canada as **Individual / sole proprietorship** if eligible, using real identity, business activity, settlement account and contact details. Stripe approval, tax or registration obligations and any permit restrictions are merchant decisions; do not fake a corporation. See https://support.stripe.com/questions/types-of-business-and-structure-guidelines-in-canada .
2. In the provider's dashboard create **three distinct, one-time EUR Payment Links** for the exact existing catalog totals: EUR 50, EUR 100 and EUR 150. Disable quantity editing, customer-chosen amount, tips, coupons and automatic recurring charges. Use clear consultation descriptions and review public cancellation/refund policy and tax treatment.
3. Verify the live payee/merchant, currency, exact total, customer-facing name, payment methods, and final settlement in the Stripe dashboard. A redirect or screenshot is not payment evidence. Note: payment links do not automatically write to the private Holistic House order ledger.
4. Put the three public, non-secret Stripe checkout URLs in the existing Holistic House Vercel project for Production: HH_CARD_PAYMENT_LINK_50_EUR, HH_CARD_PAYMENT_LINK_100_EUR, HH_CARD_PAYMENT_LINK_150_EUR. Must each be https://buy.stripe.com/... with no query or fragment. Test links may be used only in Preview and must never be mixed with live.
5. After verification set HH_CARD_PAYMENT_LINKS_PAYEE_VERIFIED=true and HH_CARD_PAYMENT_LINKS_PRICES_VERIFIED=true. Set HH_CARD_PAYMENT_LINKS_ENABLED=true **last**. Omit/false any approval to disable instantly. Partial amounts fall back to requesting a link; duplicate merchant links disable all direct card links.
6. Test a real low-risk checkout with the intended merchant (or a test checkout only in Preview), then reconcile transaction status, exact EUR amount, payee, disputes/refunds, and appointment availability. A client must send a reference for human verification. Never grant services automatically based on returning to the site.

## Important safeguards

- Website prices come from fixed SERVICE_PRODUCTS, never a URL amount supplied by the browser.
- Card links are allowlisted to buy.stripe.com and must have explicit owner approval; only public URLs go to client, no API keys.
- No health questionnaire responses, client identifiers, symptoms or diagnosis appear in provider links, queries, or WhatsApp templates.
- The existing authenticated Stripe Checkout and PayPal Orders-v2 PR #923 remain separately gated by approved schemas, account matching, signed webhook verification, idempotency and settlement reconciliation. Do not conflate them with this manual-ref hosted payment path.
- Do not add PayPal Business keys or run production migrations on behalf of an unverified seller.
- Individual/sole proprietor != registered corporation; eligibility, taxes and banking terms still apply. For Interac, use your bank's permitted account/payment terms.
