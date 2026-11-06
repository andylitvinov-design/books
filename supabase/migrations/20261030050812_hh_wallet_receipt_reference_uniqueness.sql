-- Deduplicate buyer-reported PayPal transaction references even across HMAC key rotation.
-- Rejected/fraudulent claims do not block future legitimate submissions.
create unique index if not exists wallet_topups_paypal_reference_once
 on app_private.wallet_topups(provider,receipt_reference)
 where provider='paypal_personal' and status in ('reported','credited','reversed') and receipt_reference is not null;
