# Ezohata-inspired manual payment inquiry for Holistic House (2026-10-15)

## Source and scope

The older public https://ezohata.com/payments describes a per-currency selection:
PayPal (EUR/USD), PrivatBank (UAH), and Yoomoney/Interkassa/card (RUB), with an
e-commerce cart. The newer independent Ezohata Vite project stages a Telegram-first
manual order; its README explicitly says PayPal capture/webhooks are NOT implemented.

Holistic House **does not inherit** Ezohata's seller account, bank recipient,
legacy extra fees, checkout credentials, or any claim that those services are
approved to process Holistic House subscriptions.

## Implemented customer experience

- Free remains free. Advanced is €20/month (conditional €10 first month for
  eligible new subscribers). Premium is €100/month. No recurring €10 tier.
- When card subscription checkout is unavailable, customers can select a
  **requested** channel/currency: PayPal EUR, PayPal USD, Canadian Interac CAD,
  or Ukrainian bank/PrivatBank UAH, and copy a bounded, non-health-specific
  payment inquiry to the owner's publicly listed Telegram contact.
- The selected channel is NOT a live payment button. No bank details, unverified
  exchange-rate quotes, recipient URLs or surcharge are published.
- Manual payment is for **one month only**, with **no automatic renewal**. The
  customer must receive actual verified merchant instructions and approve the
  total before paying. No receipt screenshot or Telegram message grants access.
- Stripe's separately guarded billing checkout and server entitlement gate are
  unchanged; this UX cannot issue a Stripe payment, write to the ledger, or
  set a paid-through date.

## Required before declaring paid manual memberships operational

1. Confirm legal payee and authorized collection methods/currencies for Holistic
   House (not merely Ezohata), verification/KYC, tax registration obligations
   and exact invoice/receipts/consumer-renewal terms.
2. Implement and approve a separate owner-scoped pending-manual-order ledger
   and authenticated client invoice/status view; never trust user-provided amounts
   or payment screenshots as proof.
3. Reconcile the bank/PayPal provider transaction with reference, currency,
   net amount, payer and period on the server/admin side; record a non-reusable
   receipt and only then grant exactly one paid month. Do not mark as a Stripe
   subscription or use Stripe's existing webhook event ownership claims.
4. Add expiry, refund/dispute reversal, duplicate-proof reconciliation,
   renewal reminders and administrative audit logs before offering such access.
5. To enable genuine automatic renewal, complete the separately approved live
   Stripe Billing/PayPal Subscriptions onboarding, mandates, provider callbacks,
   cancellation and paid-through reconciliation. A manual inquiry does not
   authorize future debits.

No bank transfer, actual payment, secrets, database migration, or entitlement
change is performed by this feature. No RUB channel is enabled, and the old
Ezohata percentage surcharges are not copied: legal/platform fee rules and
regional restrictions must be reviewed separately.
