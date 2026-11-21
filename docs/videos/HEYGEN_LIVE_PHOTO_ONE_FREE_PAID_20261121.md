# Holistic House — HeyGen Live Photos, one free and additional paid

**Depends on PR #5337** for private HeyGen image animation and My Materials.

## Client product
Every active Google account gets exactly one complimentary five-second HeyGen Video 1 (768p) render. Subsequent renders are €2.50 EUR each. Viewing and reusing existing live-photo MP4 clips is always free.

A permanent database UNIQUE index on (account_id) WHERE billing_kind='free' includes all statuses, even failed or deleted. Deleting a clip, logging out, refreshing, or opening two browser tabs cannot recreate the entitlement. Ambiguous vendor submissions do not trigger free repeated provider calls; customer support must review billing status before a replacement.

## Secure manual payment bridge (not card Checkout)
The existing Holistic House owner manual billing workflow uses PayPal EUR by request. The client receives a fixed price and order ID, contacts the owner through the existing verified Telegram support contact, and waits for independent operator verification of a real incoming payment. Only after verification does the backend allow *one* additional paid render. The receipt ID is HMAC-digested, unique across orders. A payment checkbox, screenshot or browser redirect does NOT prove payment. No automatic charges or subscriptions.

API:
- POST /api/app/live-photos/orders — idempotent owner-scoped payment request.
- GET/POST /api/admin/videos/live-photo-orders — protected admin review and confirmed receipt.
- Existing POST /api/app/live-photos — optional paidOrderId, validated server-side; invoice status must be verified and consumed in the same database transaction as the new job.
- Existing callback/status retrieval — completion and storage of an already submitted result; never another paid submission.

Migration: supabase/migrations/20261121221900_hh_client_live_photo_first_free_paid_v1.sql. Owner RLS is forced, public client roles have no direct SQL grants. Paid order FK includes account_id; unique order use protects concurrency. Existing private storage only.

## Provider and production
HeyGen Creator and HeyGen REST API wallet credits are separate. The REST API requires an independently purchased API wallet (minimum $5) and purpose-scoped API key with assets:write, videos:write, videos:read, in Vercel Production Sensitive variable HH_LIVE_PHOTO_HEYGEN_API_KEY. Never paste key in GitHub, chat, logs or NEXT_PUBLIC_ variables.

All flags initially false:
- HH_LIVE_PHOTOS_ENABLED
- HH_LIVE_PHOTOS_SPEND_APPROVED
- HH_LIVE_PHOTO_PAID_ORDERS_ENABLED
- HH_LIVE_PHOTO_RECEIPT_REVIEW_ENABLED
- HH_MANUAL_BILLING_PAYEE_APPROVED (existing independent payee approval)
Daily cap HH_LIVE_PHOTOS_MAX_DAILY_JOBS=5.

Do not enable billing from a source merge alone, do not create a Vercel production deployment manually, and do not weaken CI. The existing protected hourly publisher owns normal LIVE release.

## Acceptance
Verify actual signed-in user #1 first render, HTTP 402 for repeated free request (including after delete), verified €2.50 receipt grants one new render, second use of same invoice rejected, two simultaneous requests cannot double charge, another account denied, provider ambiguity never resubmitted, and original/final MP4 visible only in the account. Perform real mobile Safari rendering, provider response, and Vercel canonical SHA checks. No real payment or generation has been made by this changeset.

No Stripe integration claimed: this release provides manual PayPal invoice/verification only. A processor-connected automatic checkout is a separate integration requiring authorized Stripe or PayPal merchant access.