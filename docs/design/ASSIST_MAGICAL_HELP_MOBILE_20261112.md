# Assist Services · Magical Help mobile shelf (12 November 2026)

## Page identity and owner reference
- Canonical routes: /ru/services, /en/services, /es/services.
- Guest-facing mobile Services/Assist view, 320–760 CSS px; the existing page header and desktop Services remain.
- Approved screenshot intent: warm ivory Holistic House, navy serif heading, gold botanical accent, left-side artwork on each card, short right-side text, emerald rounded CTA and a final "more masters" action.
- The owner-approved mock is illustrative; its generated faces and visual imagery are not claims about actual published professionals or medical outcomes.

## Component to visual-region map
- Keep: PublicSiteHeader, ServicesAssistMobile, Consultation, existing Studio Offers, existing service routes and all public CRM protections.
- Add: ServicesMagicalHelpMobile after ServicesStudioOffers within the existing ServicesExplorerProvider.
- Header: gold icon, large heading, compact service categories; no duplicated main navigation or marketing pop-up.
- Three cards in order: wellbeing mandala, money mandala, remote energy support. Left photos reuse repository-owned existing assets. Right-side title/icon/description, details link and one large CTA.
- Order actions: both mandalas open the existing consented ContactChannelChooser and create a service-specific enquiry only after consent and confirmation; no fabricated checkout, receipt or price. Energy opens the existing remote-energy-support practitioner selection and scheduling enquiry. More masters opens the existing /masters directory (not synthetic portraits).
- No new backend, payment, upload, tracking, third-party dependency or scheduled workflow; symbolic and energy methods are explicitly presented as complementary.

## Geometry and QA contract
- Mobile shelf max width 540px; outer gutters 10–12px; warm ivory card #fffcf7 and thin gold-beige borders.
- Cards have one artwork column ~35%, text on the right, full-width CTA below to keep the existing consent form readable even at 320px. Touch targets >=48px. Narrow type scaling at <=350px; desktop hidden.
- Target 320/354/390/430px Chromium + WebKit, EN/RU/ES labels, CTA enquiry open/consent/error, live energy support and /masters navigation, no horizontal overflow.
- Local verification: source contracts pre-publication; full browser, TypeScript, Next build and same-view screenshot overlays are CI / browser acceptance tasks. Do not claim screenshot pixel fidelity without rendered comparison.
- Release: production branch codex/public-book-library, exact-head protected Core + Specialist + hh-merge-check, native protected merge, Vercel READY + matching SHA and real route checks required before LIVE claim.
