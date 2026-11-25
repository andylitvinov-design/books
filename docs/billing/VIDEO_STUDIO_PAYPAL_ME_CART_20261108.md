# Holistic House Video Studio · Extra / PRO → shared cart → PayPal.Me
Date: 2026-11-08 · Owner-selected payment method

## Real existing implementation
- Page: `/{en,ru,es}/holistic-support/mandala`, guest Video Studio PRO; separate existing shared cart `/{locale}/cart`. Keep the original standard free renderer and account-bound credit guard.
- Payee: pre-existing owner-verified PayPal.Me profile `https://paypal.me/psitrends` (`Andrii Litvinov`) from `lib/commerce/paypal-personal.js`, not an imagined PayPal Business merchant.
- The site has a separate merchant Orders v2 implementation under `lib/commerce/paypal-provider.js`, but it is not approved/configured to accept real Video Studio purchases. Do not introduce client-side PayPal secret or claim PayPal JS SDK merchant popup.
- Source of the new fixed prices: `lib/commerce/cart.js` Video SKU catalogue, `video-extra` **EUR 3.00**, `video-pro` **EUR 5.00**; never accept price from client/URL. Do not add video goods to `SERVICE_PRODUCTS` (consultations) or mix their checkout ledgers.

## Implementation
- On PRO Standard: original `createQuickVideo` only; existing free-first/XP safeguards unchanged.
- On Extra/PRO: one `Add to cart` action. In the current browser session save the fixed SKU and up to 800 characters of local instructions; DO NOT transmit the brief/photo/test/health data to PayPal, URL, marketing pixels or Messenger. Navigate to the **existing** cart, with a SKU-only recovery query for browser storage-denial.
- The cart nav badge counts one video SKU plus existing consultation SKUs; the consultation subtotal/CRM intake/PayPal/Square/Stripe/Wise links remain independent.
- The video cart line displays the SKU and exact EUR amount. Only an explicit **Pay** click opens a local modal; this is a user-invoked payment modal, not an unsolicited popup. Require an acknowledgement of PayPal.Me manual receipt/fulfillment limitations.
- **Continue to PayPal** opens a real popup/tab through `/api/payments/paypal/video/[productId]`. The server validates two allowed SKUs, honors existing `HH_PAYPAL_PERSONAL_DISABLED` kill-switch, redirects 303 to `https://paypal.me/psitrends/3EUR` or `/5EUR`, strips referrer and caches nothing. iPhone Safari may open a new tab instead of a separate popup. A visible retry link appears if blocked.
- After return, optionally copy a short **transaction-reference-only** message and open the existing master Telegram contact. Do NOT send private request text through that messenger. Site never creates fake invoices, marks paid, grants credits, schedules generation, stores PayPal receipts or credits an account from a redirect.

## Important product limitations and consent
- **PAYPAL.ME IS MANUAL SETTLEMENT.** It does not report verified capture to Holistic House. PayPal.Me checkout is separate from PayPal Orders v2; buyer may need to sign in and select **Goods & Services**, never Friends & Family for services. Verify the payee and exact EUR amount in PayPal. A real payment is only verified by the owner in PayPal activity.
- **PAID VIDEO GENERATION IS NOT AUTOMATIC.** No guaranteed premium HeyGen, Kling, Veo or photo-animation API job, no automatic paid MP4, no confirmed private media delivery or refund automation. For a customer purchase, video production must be agreed/accepted and receipt verified manually. The UI says this plainly before payment.
- To turn on **automatic** €3/€5 rendering later: owner-approved provider costs, sustainable pricing, privacy consent/rights, server-confirmed provider payment (merchant SDK or provider-hosted payment order with verified receipt), idempotent job, private final MP4, refunds/error path and actual E2E. Existing global `HH_VIDEO_PAID_ENABLED` remains OFF. No new paid service, secret or migration in this PR.

## Verification / release
- Source: `components/mandala-pro-enhance.tsx`, current `components/commerce/personal-cart.tsx`, `components/commerce/cart-nav-link.tsx` and existing commerce helpers; one additive `VideoCartPayment` child component, not a new store route or second payment account.
- Fast tests: `tests/mandala-pro-enhance.test.mjs`, `tests/paypal-personal-payments.test.mjs`, `tests/consultation-cart-experience.test.mjs`, plus existing `tests/service-commerce-paypal.test.mjs` and mandatory security checks; CI must run real TypeScript, lint, Next build.
- Browser acceptance: guest phone 320/354/390/430 on EN/RU/ES, select Extra/PRO, add, cart count and exact amount, open/close user-invoked dialog, disabled PayPal until checkbox, securely open exact whitelisted PayPal.Me in actual Safari/Chrome without fake paid state, copy transaction reference without brief, remove item without resurrecting from URL; existing consultation checkout still functions.
- After exact-head `hh-merge-check` protected merge, independently verify Vercel READY SHA and public alias. HTTPS 200 or PayPal popup are **not proof of money received**. Provider payment E2E requires the owner's actual PayPal account and cannot be simulated.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=source static only; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
