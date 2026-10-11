# Holistic House Google measurement inventory — 2026-10-11

## Reused safely

- The existing owner Google Analytics account is reused, but Holistic House has its own GA4 property and production-only web stream.
- The production Vercel project is `codex-public-book-library`; `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists only in its production environment, so Preview and development visits are not collected in the production property.
- Existing CSP nonces, public WhatsApp handoffs, canonical URLs, sitemap generation and private-route `noindex` headers remain the source of truth.

## Created or changed

- Created GA4 property **Holistic House** (America/Toronto, CAD) and web stream for `https://holistichouse.vercel.app`.
- Enhanced measurement is disabled. The application sends only consented, allowlisted public page and secondary funnel events; it never sends answers, drawings, names, emails, scores, reports, condition data or client identifiers.
- The public Google tag uses Consent Mode v2 with analytics storage granted only after the visitor accepts; all Ads storage, ad user data and ad personalization stay denied.
- Added a Search Console URL-prefix property and its root verification meta tag. Submit `/sitemap.xml` only after the deployed tag is visible and ownership is verified.
- Added robots disallow rules for Cabinet, app, reports, prescriptions, API, admin and document-preview paths.

## Ads and Search Console launch boundary

- The connected marketing app currently exposes no selected Google Ads, GA4 or Search Console account. No Ezohata account was read or changed there.
- PR #324's draft is included as a **paused, zero-budget** Search structure. It keeps regulated/sensitive Campaign C blocked, uses only public landing paths, and treats clicks/prepared questionnaires as secondary events.
- Do not create a primary Google Ads conversion from a WhatsApp click. `lead_received_verified`, paid enquiry and confirmed booking require an owner-verified operational receipt; they are deliberately not emitted by browser code.
- No Ads ↔ GA4 link, active campaign, billing change, Customer Match, enhanced conversion or sensitive audience has been created.
