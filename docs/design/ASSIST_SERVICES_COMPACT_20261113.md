# Assist / Services — approved compact lower-page mobile layout (13 November 2026)

## Reference and target
- Owner reference: approved generated mobile "Recommended support" mock in this conversation, after original iPhone screenshots of the oversized Services lower sections.
- Original screenshots: guest mobile `/en/services` after selecting an Assist concern, followed by personal consultation, Reiki, Spiritual Reading, personal video and course shelves.
- Reference/target page identity: **PASS** — public guest `/{en,ru,es}/services`, same route and Services Assistant view; no editor, protected cabinet, auth transition or separate landing.
- Explicit owner scope: **KEEP** the top Assist dialog, chat turns, questions, preferences, safety state, composer and recommendation algorithm unmodified. Only redesign the content below it.
- Production baseline during staging: `codex/public-book-library` at `959b6eb06787eb49b95c0a259c2fc15b56388392`; Vercel `dpl_Hz2TyCdN3v14ykcQZFaKXFBEJdAs` READY at canonical `holistichouse.vercel.app`. This is **baseline**, not proof of this PR's deployment.
- Owner components: `app/[locale]/services/page.tsx`, `components/services-unified-catalog.{tsx,module.css}`, original `ServicesStudioOffers`, `ServicesPersonalConsultationMobile`, `ServicesAssistMobile`.

## Geometry and visual block map
| Region | Reference intention | Existing source | Change |
| --- | --- | --- | --- |
| Global shell / bottom dock | Same approved navigation; no new overlay | PublicSiteHeader, unified dock | KEEP |
| Assist conversation | Original compact messenger on top | ServicesAssistMobile | KEEP, neither source nor state touched |
| Recommended services | 3 concise photo-left/service-right offers, 44px actions | AssistTopRecommendations | RESTYLE within page scope only |
| Featured consultations | Three media-left compact offers and the same real enquiry actions | ServicesPersonalConsultationMobile | RESTYLE wrapper; preserve images when messenger choices open |
| Other service directions | Warm ivory two-column icon tiles with pastel accents; one expanded panel at a time | 14 existing service blocks | MOVE into unified expandable catalogue |
| Detailed forms | User-invoked, full-width below selected tile; no duplicate form / fake booking | Existing Reiki/Course/Coach/Contact/Video components | KEEP underlying actions, filters and service IDs |
| Footer / disclaimers | Small legible supporting text and original global dock | Existing medical limits and navigation | KEEP |

Reference dimensions are an illustrative generated screen rather than a pixel-calibrated browser capture. CSS targets mobile 320/354/390/430 px, 12px outside margins, 9px tile gaps, 19px tile radius, 44px minimum service actions. No unsupported exact-pixel match claim.

## Preserved behavior contracts
- Services AI: same `ServicesAssistMobile`, local recommendation matching, crisis messaging, preference questions and opt-in button to scroll.
- All fourteen blocks present once: Reiki; topic filter; Spiritual Reading; personal booking; personal/free services; personal video; learning courses; coach/therapist; magical help; psycho-homeopathy; about; testimonials; method videos; practitioners/contact.
- Telegram / WhatsApp requests: original `ContactChannelChooser` and current CRM/deep-link behavior; expansion affects layout only.
- Reiki: published practitioner API, preferred date/time, durations, real fee and availability-disclaimer behavior intact.
- Courses, video, coach and spiritual: original routes, course filters, video editor and practitioner navigation remain active.
- `ServicesStudioOffers splitExtras` prevents duplicate rendering when its existing courses/coach/video sub-blocks are independently displayed; default unchanged on other callers.
- Desktop >=761px: CSS passthrough; original sections remain visible. EN/RU/ES label parity.
- Privacy, tests, payment, authentication and service IDs unchanged. A request is not an actual booking or payment.

## Required acceptance / evidence state
| View | Layout / UI | Clicks | Status |
| --- | --- | --- | --- |
| 320, 354, 390, 430 Chromium | CI or real browser capture needed | Open/close tiles, request choices, no overflow | **PENDING** |
| 390 WebKit / real iPhone | Safari safe-area, iHelp and dock non-overlap | Expand forms, Telegram/WhatsApp links | **PENDING** |
| 768 / 1440 desktop | Original Services sections remain visible | Same functioning existing desktop flows | **PENDING** |
| EN/RU/ES guest | Distinct localized titles, no content truncation | Same 14 blocks / first-panel focus | **PENDING** |

Screenshot overlay/diff: **NOT RUN** (no route-matched deployed candidate yet). Full typecheck/lint/build, exact-HEAD Core/Specialist, native merge, production READY ancestor SHA and real LIVE visual E2E: **PENDING**. Do not label complete until independently verified.
