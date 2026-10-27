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
