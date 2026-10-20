# Organic-event conversion reporting: truthful first-party scope

Issue: [books #801](https://github.com/andylitvinov-design/books/issues/801), work package D of [TorontoTantra #74](https://github.com/andylitvinov-design/torontotantra/issues/74).

## Existing pipeline audit

- `FreeReviewQuickRequest`, `FreeDrawingIntake` and the shared `ContactChannelChooser` prepare visitor-controlled messenger handoffs. The visitor reviews the message and presses Send in WhatsApp/Telegram. The site does not receive a delivery receipt or create a paid order from these actions.
- `lib/organic-event-referrals.js` from PR #806 preserves a public allowlisted event source/campaign in that voluntary handoff. It is not storage, tracking or proof of an inquiry.
- A separate authenticated consultation-request pipeline exists in `lib/app/repository.js` and the practitioner inbox. It handles consented private information. This report does not read, decrypt or join it to platform attendees or public campaign labels.
- `components/service-funnel-tracking.tsx` and `/api/marketplace/service-event` write the existing `app_private.service_funnel_daily` counts by public service and Toronto calendar day. Its `order_clicks` field means button clicks, not orders. Existing same-origin validation, request-key allowlisting and short-lived hashed rate limiting are unchanged. Counts may include repeat interactions and are not unique visitors.
- That table has no source, campaign or language dimensions. No receipt, completed-session or payment attribution contract is available here. Source/campaign/language visits, confirmed inquiries, paid orders, completed paid sessions, revenue and conversion rates remain **not measured**.

## Implemented admin surface

`/admin/acquisition` uses the existing signed owner-admin session. Authentication is checked before the server reader and again inside its injected authorization boundary. An unsigned browser is redirected to `/admin/login`; there is no new public reporting API. It is dynamic, non-indexable and uses `no-referrer` metadata.

Yesterday / previous 7 / previous 30 completed calendar dates use `America/Toronto`, including DST changes. The server executes one parameterized aggregate-only SELECT against the existing table through the existing least-privilege transaction/RLS path. No client, contact, assessment, payment or attendee table is selected. No new table, role, permission, migration or counter writer is introduced.

The dashboard presents recorded impressions and Order/WhatsApp/Telegram clicks separately from every unmeasured stage. Stored zero counters display zero. A successful empty read displays no recorded observations and unknown coverage. Missing table, offline configuration, permission failure and invalid aggregate rows display unavailable, never a fabricated zero. The number of observed days makes incomplete recording visible. Recommendations use actual observed counter values only and make no causal or conversion claims.

The EN/RU/ES link builder reuses the existing first-party landing helper. It runs entirely in browser memory, accepts only public campaign slugs and known sources, and emits the two existing localized service destinations. It does not publish an event, persist source labels, send messages, or claim that a generated link is an approved live event. A syntactic slug validator cannot prove that a human name is non-personal: the UI explicitly prohibits personal or health information.

## Still gated / not implemented by this patch

1. Source/campaign/language persistence and actual received-lead/payment attribution require a separately reviewed consent, storage and receipt contract. The analytics privacy hold stays in force; `PUBLIC_ANALYTICS_AVAILABLE=false` is unchanged.
2. Do not revive the old Meta-pilot receipt migration or enable GA4, pixels or private-page tracking through this report.
3. No upcoming event is added without an owner-approved real event and provider ID, organizer, date/time/timezone and anonymous public URL readback. Draft campaigns are not site inventory.
4. No production client or lead records were queried during implementation. Local tests use clearly isolated aggregate fixtures only. This is code-level reporting support until exact-head CI, production alias and authenticated admin behavior are verified.

## Verification and rollback

Run `node --test tests/acquisition-report.test.mjs tests/organic-event-referrals.test.mjs tests/practitioner-service-analytics.test.mjs tests/ga4-analytics.test.mjs`, `npx tsc --noEmit`, targeted ESLint and the repository build/CI. Check unsigned access, signed admin, EN/RU/ES, 320/390/1280px, source/campaign validation, repeated generation and period navigation without writing a real inquiry.

Rollback is the isolated code revert. No database, environment, billing, access or external event change needs reversal. Additional operating cost: no new paid service.
