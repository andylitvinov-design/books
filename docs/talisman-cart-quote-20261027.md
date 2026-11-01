# Holistic House — Daoist talisman basket · staged quote-first checkout (27 October 2026)

## Authorised user journey and current implementation

- Existing three illustrated Fu-style items in the public Holistic Support catalog, no fabricated products or duplicated personal-upload gallery.
- On each card, the first click adds **one** catalog ID to a short-lived *tab-local* basket and changes the button from **Add to cart** to **Order**. Subsequent click opens a dedicated localized \`/{en,ru,es}/talismans/cart\` page. Shared basket banner opens all selected items. Remove action supported.
- The basket shows photographs, descriptions, pending quote per item and overall pending total. Payment-method radio choices Square, PayPal and Wise are **preferences only**, not links/transactions. Product prices, taxes, shipping and master availability are not yet published or approved.
- A consented one-time quote request captures name/email/phone and optional wishes (max 500 characters) via the **existing** \`POST /api/service-enquiries\`, existing encrypted practitioner request and transactional CRM lead, and a neutral owner-only Telegram notice if that existing notification pilot is enabled. No duplicate CRM, public client data, direct third-party wishes transmission, payment or booking.
- A saved quote is explicitly labeled as a quote, **never** as “payment accepted.” Client is shown the non-secret enquiry reference. No checkout link is enabled at this stage.

## Hard payment and post-payment Telegram gate

The requested full sequence remains: **server-approved per-item price+currency, tax/shipping policy → immutable authenticated order → provider checkout amount and order ID → signed provider webhook AND provider readback → settled/paid status → “Payment received” confirmation → consented Telegram follow-up about master wishes**.

Necessary before enabling:
1. Owner/master approves a real selling price (not consultation prices) and delivery policy for each published item, seller currency, payee, taxes, refunds and availability.
2. Confirm a product-capable, live, merchant-approved payment provider. Existing Square links/checkout are only for separately approved session SKUs (CA$40/50 session links or €50/€100 consult) and may **not** be repurposed for physical/personalized talismans.
3. Scope an existing customer-facing Telegram bot to verified paid **talisman orders** with start payload containing only a nonsecret lookup key; signed-in ownership + consent + provider-paid receipt must guard messages. Telegram deep-link alone cannot prove a customer sent or a bot received a message. Never send health details, test results, contacts or personal text in deep-link URLs/pixels.

## Verification status

Source code and unit/source contracts to be checked on the exact branch head in PR. Must separately check TypeScript, ESLint, Next build, real iPhone Safari 320–430, public EN/RU/ES routes, consented real CRM arrival, and neutral Telegram provider acknowledgement. Do not report quote saved as a confirmed payment or fulfilled shipment. No DB migration/payment mutation in this PR.

Related: issues #2020 #990; PRs #2291 #2296 #2265.
