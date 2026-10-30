# Holistic House: prepaid wallet, custom top-ups and CA$40/50 vouchers
Implementation date: 2026-10-30. Production branch: codex/public-book-library.

## Product contract
- One authenticated, verified Google cabinet account owns its own private CAD wallet.
- Store cents as immutable integers, never floating prices, self-reported balances, or customer-provided payment status. Min CA$1.00, max CA$1,000.00 per top-up. Presets CA$40/CA$50 are suggestions, not exchange rates or a separate cash instrument.
- Non-transferable prepaid Holistic House service/digital-material credits, no cash-out, interest or peer transfers. Charge/redemption/debit integration for specific services/media is NOT part of this release; do not advertise it as already active.
- Failed/cancelled/unverified payments never produce wallet entries. Balance is the sum of append-only CAD entries (verified credits and verified reversals).
- New signed-in cabinet destination: /ru/app/wallet or /en/app/wallet. The wallet link appears in the existing cabinet menu. /admin/wallet is the protected owner reconciliation desk.

## Immediate PayPal.Me route (arbitrary CAD amount)
1. Customer enters a decimal CAD amount or selects 40/50, creates a pending top-up with an opaque operation UUID.
2. Server returns only https://paypal.me/psitrends/{fixed CAD amount}, not a URL, invoice or price supplied by the browser. PayPal.Me requests a PayPal account and Goods & Services. Exact currency and recipient displayed by PayPal must be verified.
3. Customer returns to wallet and reports the real PayPal transaction ID for that pending top-up. This creates reported, never credited.
4. /admin/wallet owner has two independent checks: legacy private admin login + active Google practitioner identity. The owner verifies transaction, merchant, CAD amount and uniqueness against the actual PayPal account activity; only then explicitly approves it. Receipt-digest uniqueness and one ledger credit per top-up prevent reusing proof across orders. Reject unverified claims.
5. Refund/chargeback on a credited PayPal transaction requires owner provider evidence and explicit reverse: append equal negative entry; status reversed.

No PayPal Business API exists in Vercel production currently. PayPal.Me is not an automatic merchant webhook; do not claim an instant credit or immediate confirmation. A payment provider's hosted link opening is not a test transaction.

## Prepared automatic Square card route (feature-gated)
- Reuse EXISTING authenticated, merchant-checked Square API gateway, its CAD location, signed webhook, sandbox/production checks and readback. HH_WALLET_SQUARE_ENABLED=true is not sufficient unless the already-gated Square merchant API is available.
- Create a UNIQUE payment link per order through Square API for an exact CAD amount and a wallet credit item, instead of misusing the existing CA$40/CA$50 consultation links. Persist immutable operation before calling Square and reuse same idempotency key on retry; ambiguous old creations require reconciliation.
- Square checkout redirects to cabinet with opaque top-up ID. Neither browser redirect nor payment.updated alone is proof. A valid signed webhook plus independently fetched matching merchant payment/order/location/amount/currency and completed/refund status is required. Authenticated refresh also performs provider readback. Duplicate webhook or return cannot double-credit.
- On any provider-reported refund, reverse all credit for safety pending manual case review; no negative cash withdrawal. Existing Square consultation checkout remains unchanged.

## Required owner activation
- Production schema migration applied and verified in the exact existing Supabase Holistic House project. No public/anon/authenticated table grants; FORCE RLS on private tables; transaction uses restricted hh_app_backend role with active session.
- HH_WALLET_SCHEMA_APPROVED=true and HH_WALLET_ENABLED=true only after migration and separate real browser/auth checks.
- HH_WALLET_PAYPAL_ENABLED=true after confirming receipt of CAD Goods & Services top-ups is supported by the owner's PayPal account, with refund and prepaid-credit terms approved.
- Square requires previous merchant-credential production flags plus HH_WALLET_SQUARE_ENABLED=true; do not enable until provider confirms prepaid credit is an accepted item and a complete safe paid/refund/duplicate/chargeback E2E passes.
- Confirm tax treatment, user disclosures, chargebacks, unused balance on account deletion, provider rules for prepaid credits and refund policy with owner. No credit for just clicking an external link.
- Never log payment tokens, write a privileged Supabase key to client, or store diagnoses in checkout metadata.

## Testing / operational status
- Model tests cover exact cents, invalid amounts, PayPal CAD URL, presets, independent kill switches and source security contracts.
- Database must be checked with read-only introspection and controlled transaction tests.
- Browser should test signed-in client creation, manual report, admin claim approval and balance refresh WITHOUT fabricating actual financial receipt. Provider settlement needs a real authorised small payment/refund.
- To keep production safe, do not activate wallet/card flags before the back-end and migration are deployed and verified.
