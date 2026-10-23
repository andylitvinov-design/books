# Holistic House — service/course thank-you and confirmed-registration statistics
_Date: 2026-10-21; tracks #990 and #988._

## Release architecture
- Shared service/course request form posts to existing same-origin POST /api/service-enquiries. Server persists one idempotent, encrypted enquiry and consented, unverified CRM contact in one database transaction. This is a **received enquiry**, not a qualified lead, appointment, delivered message or payment.
- On successful 201/saved=true and valid opaque HH reference, the browser saves only a short-lived tab-local reference and navigates to /en|ru|es/thank-you. No email, phone, note, symptoms or UTM in browser storage or the URL. If session storage is blocked, the existing inline success message stays usable. Direct visits and expired receipts do not claim a received enquiry.
- Video placement is configured through existing /admin/videos → “Registration — thank you”, individually for EN/RU/ES. This release adds an **empty** slot. Only manually QA-reviewed and explicitly published videos appear through the existing lazy SiteVideoPlayer. Do not produce/publish video as a side effect of deployment.
- Server owner-only My Practice stats calculate counts from app.public_service_enquiries where contact_ciphertext IS NOT NULL and recipient_practitioner_id equals the authenticated practitioner's id. One committed operation counts once; revisits do not write, and historical unconsented/incomplete requests are excluded. Last 7/30 elapsed days and 7-day academy split. No new schema or public stats endpoint; existing FORCE RLS enforced.
- UI deliberately keeps marketplace click totals distinct from saved registrations, and manual CRM marketing opportunity totals distinct from server-verified enquiries. Booking/payment stats remain unmeasured until authoritative provider events exist.
- GA4/Meta remains OFF: PUBLIC_ANALYTICS_AVAILABLE=false and /thank-you excluded from public analytics paths. No ad pixels/identifiers or sensitive exports.

## Acceptance checks before marking end-to-end complete
1. Run focused test: node --experimental-strip-types --test tests/service-thank-you.test.mjs tests/site-videos.test.mjs tests/compact-google-lead-entry.test.mjs tests/crm-public-registration.test.mjs (CI may use node --conditions=react-server).
2. Build and typecheck, review merge and exact canonical production SHA/READY alias.
3. With consented test contact, submit actual public form, confirm HH reference and redirect, log in as practice owner and confirm exactly one encrypted request and one new server-counted enquiry. Retry idempotent same operation; reject unsupported/direct/expired receipt. Repeat EN/RU/ES and 320/390/430px mobile.
4. Owner explicitly adds public/Unlisted QA-approved video through /admin/videos after checking audio, lip-sync and anonymous YouTube playback.
5. Keep external provider delivery/booking/payment, GA4 and Meta declared **not verified** until real provider + privacy gates are passed.

## Follow-up · 2026-10-23 · Unified confirmations from consented public forms
- Google in `ContactChannelChooser`: explicit reply-only opt-in is required before OAuth. Only after the verified profile returns, the existing idempotent encrypted enquiry+CRM API creates a lead and the site navigates to the existing EN/RU/ES confirmation. Ordinary Google sign-ins outside enquiry forms never create leads; failures or missing continuation do not show success. In the special one-screen quick mode Google only prefills; the visitor must press **Send** to register, avoiding an implicit auto-submission. Browser OAuth storage contains only a public service identity and consent marker, no contact details or notes.
- Email and phone forms in `ContactChannelChooser`, `CompactLeadCapture`, the service hero and the Business consulting website form now navigate to `/{locale}/thank-you` after an actual accepted server response and opaque HH reference. When tab-local session storage is blocked, the confirmed inline result remains visible.
- Business consulting intake returns an opaque `HH-` label derived from its existing stored HMAC operation hash; identical retries produce the same reference. The honeypot response has no reference and cannot cause a client-side success redirect. No schema or access policy changes were made.
- Thank-you offers optional client-initiated WhatsApp / Telegram contact with a generic, privacy-safe message; no autosend, advertising pixel, medical text, or payment claim.
- **Still outstanding until verified:** Actions checks/typecheck/build, exact READY production SHA + alias and consented human Google/mobile → CRM readback E2E. A source contract or HTTP 200 alone does not prove delivery or booking.
