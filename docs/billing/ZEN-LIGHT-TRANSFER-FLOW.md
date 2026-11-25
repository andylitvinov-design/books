# ZEN.COM one-step transfer inquiry — Holistic House

Prepared 18 October 2026. This is an **enquiry workflow**, not a claim that
ZEN.COM accepts personal-account commercial payments.

## Rationale

Existing `lib/commerce/zen-provider.js` and the ZEN IPN endpoint remain
strictly merchant-gated. The currently connected ZEN account is Personal;
merchant Terminal UUID / Paywall Secret / Terminal API Key / IPN secret were
not found in production Vercel configuration. The live database does not yet
contain the provider-aware `billing_private.service_orders` structure.

ZEN's own 2026 help articles distinguish:

- **Payment Gateway / Payment Links** for ZEN Business/e-commerce and
  approved merchants.
- **ZEN Personal** bank account transfers / IBAN for personal receiving.
- **Top-up Pay-By-Link is not a receipt mechanism for third-party customers**.
  ZEN states funds used to top up must belong to the account holder.

Do NOT use a personal account top-up link as a customer checkout button.
Do NOT imply the personal account may receive commercial income without
explicit confirmation from ZEN.COM.

Official references:
- https://ask.zen.com/hc/en-us/articles/14525243260188-How-to-apply-for-a-ZEN-Payment-Gateway-for-your-e-commerce-store
- https://ask.zen.com/hc/en-us/articles/28585778460572-How-to-top-up-your-ZEN-account-with-Instant-Bank-Transfer
- https://ask.zen.com/hc/en-us/articles/4886356522396-How-to-transfer-money-to-ZEN-account-number-IBAN
- https://ask.zen.com/hc/en-us/articles/360017407100-How-to-contact-ZEN-Customer-Support

## New low-friction visitor flow (EN/RU/ES)

On the existing personal payment landing `/[locale]/payments` and the
Services cart:

1. Visitor chooses €50 / 30 minutes or €100 / 60 minutes (or the cart sum).
2. Visitor taps **ZEN.COM — request transfer details**; WhatsApp opens with
   an accurate, localised EUR amount and service description. No login needed.
3. Andrey confirms appointment availability, ZEN's approval to receive
   commercial payments on the intended account, verified recipient details,
   fees/tax/terms and transfer reference **before** any payment.
4. Client may send the bank transfer only after agreement. The merchant manually
   checks the actual credited transaction, amount and reference.
5. No cart/order, paid benefit, confirmation or appointment is created by the
   enquiry, chat, screenshot, transfer initiation or return URL.

Payment provider details and card data are never placed in website source,
URLs or the WhatsApp request. No payments were initiated during this change.

Existing personal PayPal.Me checkout stays available as the separate, already
implemented mechanism (subject to its own Goods & Services instructions).

## Path to real ZEN payments with almost no engineering

The owner only needs a positive response from ZEN that a ZEN Business
Payment Link is available for these services. Where the provider supplies
fixed-amount, approved hosted links, those can be added through a separately
verified allowlisted redirect with manual merchant reconciliation. **No live
merchant link or account capability is assumed today.**

The existing four-secret API Checkout can remain dormant until a merchant
account and provider-aware billing database are ready.

Do not turn on `HH_COMMERCE_PROVIDER=zen`, any ZEN merchant flags or a direct
recipient link on the strength of an old personal-account screenshot alone.

## QA

`node --test tests/service-zen-transfer-inquiry.test.mjs`
and other service/billing regression suites; three locale service cards and
the cart must remain responsive; PayPal paid-status must not be impacted.

External dependency: ZEN Support must explicitly confirm whether this
recipient is eligible for business payment collection and which
payment-link/account onboarding is required.
