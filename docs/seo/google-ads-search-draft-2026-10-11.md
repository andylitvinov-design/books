# Google Ads Search draft — do not launch

This is an offline draft only. It creates no campaign, budget, audience, conversion or billing change.

## Preconditions

- Google Ads account and Keyword Planner access are not connected; keyword volume, CPC, competition and budget remain unknown.
- Validate landing-page availability and conversion completion before any launch.
- Do not use remarketing, Customer Match, health-condition audiences or health inference.
- Keep all personal/free-review answers, handwritten drawings and client data outside Google Ads and analytics payloads.

## Draft campaign structure

| Campaign | Ad group (one intent) | Seed match types | Landing page | Status |
| --- | --- | --- | --- | --- |
| `CA_EN_Search_Constellations_Draft` | Personal / family constellation | `[family constellations toronto]`, `"systemic constellations toronto"` | `/en/services/andy-litvinov/personal-constellation-session` | Landing-page and legal review required |
| `CA_EN_Search_Constellations_Draft` | Business constellation | `[business constellations toronto]`, `"business situation constellation"` | `/en/services/andy-litvinov/business-situation-constellation` | Landing-page and legal review required |
| `CA_EN_Search_FreeReview_Draft` | Written drawing assessment | `"free personal situation assessment"`, `"coaching questionnaire"` | `/en/services/free-situation-review` | Confirm form success event |
| `CA_EN_Search_Reiki_Draft` | Reiki Yggdrasil training | `"reiki yggdrasil"`, `"reiki yggdrasil training"` | `/en/academy/reiki/yggdrasil` | Confirm enrolment availability |
| `CA_RU_Search_Draft` | Расстановки / письменный разбор | Seeds only after live SERP and landing-page review | corresponding RU public page | No launch |
| `CA_ES_Search_Draft` | Constelaciones / Reiki | Seeds only after live SERP and landing-page review | corresponding ES public page | No launch |

Do not advertise a workshop, free initiation or certification unless the actual offer, date, eligibility and enrolment route are public and current.

## Shared negative-keyword review list

Review before launch: `cure`, `treatment`, `diagnosis`, `medication`, `prescription`, `emergency`, `crisis`, `suicide`, `free call`, `job`, `salary`, `degree`, `government`, `PDF free download` and their EN/RU/ES equivalents. Do not add a negative that blocks an owner-approved, truthful offer.

## Conversion specification

| Proposed conversion | Trigger boundary | Allowed fields | Gate |
| --- | --- | --- | --- |
| `free_review_request_completed` | Server-confirmed form acceptance / thank-you state | locale, page path, non-identifying campaign parameters | Must be implemented and tested; no form content |
| `paid_consultation_enquiry_started` | Explicit click to the prefilled messaging handoff | locale, public service slug, CTA placement | Not a booking or revenue conversion |
| `academy_enquiry_started` | Explicit academy contact action | locale, programme route, CTA placement | Confirm programme availability first |

No current event has been claimed as connected to GA4 or Google Ads. Validate in a consent-aware tag preview and GA4 DebugView before marking a conversion primary.

## Compliance gates

The Google Ads [Healthcare and medicines policy](https://support.google.com/adspolicy/answer/176031) requires compliance with applicable laws and industry standards, and Google's [Health in personalized advertising policy](https://support.google.com/adspolicy/answer/16701855) restricts health-based personalization. Ontario's [Regulated Health Professions Act](https://www.ontario.ca/laws/statute/91r18) restricts certain health-profession title use.

Therefore: no medical efficacy, diagnosis, treatment, cure, regulated-title, credential or outcome claim goes into an ad or landing page until the owner supplies the supporting qualification and legal review. Homeopathy-related advertising remains hold-only.
