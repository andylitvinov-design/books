# Holistic Support — inline energy support and talisman enquiry (27 October 2026)

## Entry and routing
- On /{en,ru,es}/holistic-support, the "Symbols" and "Energy Support" theme cards expand the existing order wizard on the same page. No off-site navigation. One panel offers talisman or energy support and a real published-master selector.
- The existing RemoteEnergySupportBooking remains the only scheduling/offer wizard. The original service page reuses the extracted public master listing, now exposed through a public GET for lazy inline loading.
- Focus is preselected by Business/Love/Health. Free text stays in ephemeral same-tab memory. No personal goal or health condition in URL, sessionStorage, public API, analytics or notification.

## Server contract
- Energy support: existing approved durations/prices and preferred time => secure Cabinet validation => CRM request and transactional master inbox arrival. Time is not a confirmed booking. Payment unavailable.
- Talisman: choose a master from published remote energy support profiles. Willingness to make a talisman is unverified, explicitly shown. Master separately confirms availability, item price, design and delivery. Draft carries only controlled theme and public master/service identity, resulting in authenticated ordinary encrypted service enquiry with no remoteBooking or fake product price.
- Server validates talismanRequest, disallows extra fields, disallows shared test results or simultaneous remote booking. Both types trigger one neutral participant inbox arrival transactionally; external opt-in delivery requires independent provider verification.
- Directory unavailable returns 503 + retry; real zero results shows empty offers.

## Verification
- Automated targeted tests cover locale UI, privacy, validation, transactional idempotency and neutral master arrival.
- Typecheck and scoped ESLint. Vercel preview/production CI required before claiming release; browser at 320–430 px EN/RU/ES and real provider delivery must be tested separately.

## Compact full-width mobile search — owner change, 27 October 2026
- Same in-page finder at `/{en,ru,es}/holistic-support`: first-screen compact theme (business & money / relationships / energy & health), service (energy support / talisman / consultation), budget (Any / Free / up to €20 / up to €100) and one Find button. 44px controls, responsive near-viewport panel down to 320px.
- Results, practitioner cards, appointment preference and optional private personal words appear **only after Find**, reducing the first screen from five focus sectors + hero + free-text form to three selectable rows and CTA. The standalone `/{locale}/services/remote-energy-support` retains its existing full wizard.
- Currency safety: a €20/€100 cap checks **only published EUR amounts**, never invents an FX conversion or drops unknown-price offers into budget ranges. Free only when catalog price is zero/explicitly free. Talisman cost is unpublished: a specific budget returns an honest no-priced-offers message and reset, not a fake talisman listing.
- Consultation choice reuses only **published + active** personal session/assessment/intro service entries and links to their existing approved service details/request routes. No new booking, catalog replica, payment, DB migration or CRM channel.
- Controlled public topic only reaches existing authenticated booking draft; optional private words are added **after** a practitioner selection and are never placed in a URL, public lookup, analytics or persistent client storage. No medical treatment or guaranteed benefit claims.
- Regression: `tests/holistic-compact-search.test.mjs`, plus adapted original source contracts. CI, actual phone WebKit/Chromium and authenticated real E2E are separate gates; do **not** mark live before exact production SHA + Vercel READY + domain readback.
