# Holistic House · Media Credit Wallet · 2026-10-30

## Goal
One USD-equivalent balance for video and audio generation on /[locale]/holistic-support/mandala in EN/RU/ES. Verified member gets $2 welcome bonus once. Keep the existing on-device Basic creator free. Paid jobs spend credits only when real provider generation exists; errors restore reserved funds. Top up through verified Stripe card or PayPal merchant checkout.

Not a loan, bank wallet or cash balance. Credits cannot be withdrawn or sent to other accounts. Bonus and purchased credit are tracked separately. Merchant must review consumer terms, purchased credit refunds, tax and expiry policy before activation.

## Proposed prices (USD)

| Item | Basic | Smart | Pro |
| --- | ---: | ---: | ---: |
| Video | $0 | $2.00 | $9.90 |
| Audio | $0 | $0.50 | $1.50 |

Basic video uses existing free on-device rendering; basic audio uses device TTS/ambient sound. AI Smart and Pro prices are provisional and marked coming soon until a real successful provider render exists. Top-up packs: $5 / $10 / $20.

## Architecture
Private RLS tables in app_private: media_credit_wallets, media_credit_ledger, media_credit_topups, media_credit_jobs. No public Data API access. Integer minor units; bonus-first spend; only-one welcome insert, row locks and idempotent operation IDs. Verified server handles payment proof; a browser callback is not proof. No public debit endpoint.

GET /api/app/media-credits returns current user balance + available merchant methods, or guest/pending state.
POST /api/app/media-credits/checkout creates authenticated same-origin idempotent merchant checkout.
POST /api/app/media-credits/paypal-capture completes an authenticated approved merchant order only after Orders v2 readback.
POST /api/app/media-credits/reconcile checks a Stripe Checkout Session + PaymentIntent after return using merchant readback, independent of webhook delivery.
POST /api/app/media-credits/stripe-webhook validates Stripe signature and real paid Checkout/PaymentIntent.
POST /api/app/media-credits/paypal-webhook verifies PayPal signature and Orders v2 capture.
Refund/dispute webhooks freeze or reverse balances; ambiguous partial refunds require merchant reconciliation. Never automatically add purchased credit from a return URL or activate generation without a real file.

Internal reserveMediaCreditJob / finishMediaCreditJob hooks are prepared for future AI providers and are disabled until HH_MEDIA_CREDITS_PAID_GENERATION_ENABLED=true; only trusted server provider execution may call them. Successful delivery must be verified, and failed/abandoned jobs must refund. Do not charge for local video or a creative draft.

## Rollout and activation gates
1. Merge reviewed PR to canonical production branch codex/public-book-library, after exact-head Node, ESLint, TypeScript, Next build, billing and E2E. Coordinate with video-tiers PR #2625. Do not alter default codex/bootstrap-books.
2. Apply private SQL migration and verify own-account RLS, one-time $2 bonus, parallel reservations, retry deduplication, failed-job restoration and refund/chargeback in Supabase project holistichouse. Do not deploy payment UI before migration.
3. Activate wallet-only setting HH_MEDIA_CREDITS_ENABLED=true.
4. Before receiving money, merchant approvals: HH_MEDIA_CREDITS_ENVIRONMENT=live, HH_MEDIA_CREDITS_PAYMENTS_ENABLED=true, HH_MEDIA_CREDITS_PRODUCTION_APPROVED=true, HH_MEDIA_CREDITS_TAX_REVIEW_APPROVED=true, HH_MEDIA_CREDITS_REFUND_REVIEW_APPROVED=true.
5. For card: HH_MEDIA_STRIPE_SECRET_KEY, HH_MEDIA_STRIPE_ACCOUNT_ID, HH_MEDIA_STRIPE_WEBHOOK_SECRET. For PayPal: HH_MEDIA_PAYPAL_CLIENT_ID, HH_MEDIA_PAYPAL_CLIENT_SECRET, HH_MEDIA_PAYPAL_MERCHANT_ID, HH_MEDIA_PAYPAL_WEBHOOK_ID. Set merchant webhook subscriptions separately for:
https://holistichouse.vercel.app/api/app/media-credits/stripe-webhook
https://holistichouse.vercel.app/api/app/media-credits/paypal-webhook
Do not reuse unrelated subscriptions or personal-session webhooks. Only launch a provider after merchant sandbox/live readback and webhook E2E, with privacy and tax sign-off.
6. Independently verify Vercel READY for exact merged SHA, canonical domain, actual bonus, safe real top-up, and full refund.

## Status at preparation
As of 2026-10-30 Vercel production env names showed no Stripe/PayPal merchant credentials. Existing local video is free; Smart/Pro real paid video delivery and generated voice API are not yet available for public paid use. So real money charging must remain off. This code is a reviewable implementation, not proof of live payment acceptance.
