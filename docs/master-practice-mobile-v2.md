# Holistic House — My Practice mobile v2

Approved: 2026-10-16. Design-of-record: https://docs.google.com/presentation/d/1tvsdcz0_CSZu8YjxBm3U46Mo0VvJdkYGCMsYNT8pOeA/edit (second slide). Source: real account \`/{locale}/app/practice\` on the existing Next.js/Supabase application. Do not create a second master account or publish private client information.

## UX contract

- Warm cream, brown and burgundy mobile-first UI, compact 2-column practitioner tools, three live overview metrics (new requests, published offerings, in review).
- New practitioners see setup steps drawn from **real** profile, service, and approval state. No fake ratings, bookings, contacts, earnings or availability.
- Primary action: add a service. Secondary actions: private owner reports (only with authorization) or enquiries, and share/prepare public practitioner profile.
- Services: compact rows, actual price or "Free"/"Price on request", delivery format, published/review/draft/paused status; preserve existing editing and moderation API.
- Platform share: only an approved public profile may be shared. 20% fee information stays accurate and collapsed initially. No checkout or payout claims.
- Clients: for ordinary practitioners, only contacts from their own consultation requests, served by the existing private practice API. For the authorized legacy owner, a separate opted-in business CRM panel can appear on demand only when configured. The CRM is **not** a new universal per-master patient system.
- Clinical records and test results must never be automatically copied into practitioner contacts; do not bypass allowlists, enable email marketing, or permit unrestricted notes or subscriber imports.
- EN/RU localized text and keyboard-visible focus. Maintain responsive 390px layout and no auto-scroll to hidden panels.

## Further verified follow-up

A true general-purpose master CRM needs separately approved schema, per-owner encrypted storage, permission/RLS model, consent handling, production rollout and privacy testing. Paid marketplace orders/payouts similarly require a separate approved release.

## Test and release

Run \`node --test tests/practice-mobile-v2.test.mjs tests/practice-approved-dashboard.test.mjs tests/master-network-v3.test.mjs tests/crm-security-contract.test.mjs\`, Next build, deploy to the connected Vercel production branch, and verify a newly created non-owner master on a real phone.
