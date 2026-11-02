# Holistic House service landings — conversion & QA acceptance (2026-10-18)

## Scope of this release
Direct EN/RU/ES entry immediately above the optional Services discovery finder:
- free written situation review (questionnaire + drawing; **not** a free live session);
- personal Alchemy session (express 30 min €50 / personal 60 min €100; booking and payment require separate confirmation).

The core Services hero, existing tests, five editorial service cards, free insights, original video/testimonials, moderated practitioner directory, privacy disclosures and academy routes remain in place.

Standard personal service pages (imagery and systemic constellations) share:
- one benefit-led hero, approved photograph and truthful price/formats;
- paid primary request and clearly separate free written entry;
- real existing WhatsApp/Telegram selection with a prepared message, **not** a sent message;
- consultation selector above the long-form reading on mobile;
- an accessible bottom paid/free choice, no unsupported outcome promises;
- desktop request panel can remain visible only on sufficiently tall screens, never overlays phone UI.

## Conversion definition — do not conflate events
| Stage | What it means | Can be counted now? |
| --- | --- | --- |
| Landing page viewed | A page request, not an interested client | HTTP/page logs; not person-level attribution |
| Quick-start click | Visitor clicked a route toward free or paid information | Link has an explicit safe data marker; no new server counter |
| Service catalogue impression | A **published practitioner service** card entered the viewport | Existing first-party daily aggregate only when its backend is configured |
| Service order/handoff click | Clicked a published service request / opened prepared messenger link | Existing first-party marketplace aggregate (source-specific attribution not guaranteed) |
| Prepared WhatsApp/Telegram message | Browser opened a messenger draft | **Not proof that any message was sent** |
| Qualified lead | A real inquiry accepted and attributed in CRM | Owner review/manual source attribution, not auto-verified by URL clicks |
| Confirmed booking/payment | Service actually accepted/paid | Requires separate verified CRM/payment status; never infer from clicks |

The public GA4 client is **intentionally disabled** in `lib/public-analytics.ts` pending privacy verification. Do not turn it on merely to report marketing lift. Consent is denied by default. The new quick links reuse existing consent-gated event link infrastructure, but **do not claim GA4 conversions from this release**.

The CRM follow-up/source-label work in #986 is owner-entered attribution; its migration and release gates are separate. Do not pass client health details, search queries, message drafts, emails, names or private cabinet paths as campaign-event parameters.

## Automated acceptance
Production-mode Next app is run locally on isolated loopback; browser tests inspect public pages only:
1. Services quick-start link destinations in EN/RU/ES, first-screen tap targets, prices and unchanged catalogue discovery.
2. Six real hydrated personal-service journeys (guided imagery and systemic constellations × EN/RU/ES) at 390px, plus three separate Business Strategy & Founder Coaching journeys from PR #993; screenshots per journey.
3. One visible H1, approved image loads, no horizontal overflow, ≥44px primary CTA, correct anchor to the existing consultation selector; business uses its own distinct free / €50 / €100 offer cards rather than the generic form.
4. Express selection or business €50 offer prepares matching WhatsApp **and** Telegram drafts. Both links are only inspected; no external URL is followed.
5. Existing Alchemy, Wu Xing and free written-review regression suite remains active, with source-backed videos/reviews unmodified.
6. Dedicated source contract asserts analytics privacy hold, never bypassed by conversion optimization.

Evidence: GitHub Actions workflow `.github/workflows/hh-public-services-production.yml`, `scripts/verify-public-services-production.mjs`, `tests/services-quickstart-conversion.test.mjs`. Browser screenshots and diagnostic JSON are uploaded to an Actions artifact (7-day retention).

## Live deployment gate
Do not mark a release Live until:
- exact GitHub squash SHA is in the correct `codex/public-book-library` Vercel Production deployment;
- Vercel reports READY;
- `holistichouse.vercel.app` alias points to that exact deployment;
- read-only anonymous checks open EN/RU/ES landing URLs;
- public-service QA passes (or an explicitly scoped, documented non-landing blocker is isolated).

This suite does not prove receipt of a real inquiry, physical iPhone rendering, actual payment capture or campaign profitability. Those require consented real-world acceptance and business outcomes.
