# Holistic House → Google Ads: staging configuration (2026-10-11)

**Status: DRAFT / PAUSED / NOT CONNECTED.** This document and `data/google-ads-pilot-draft.json` are planning and validation artefacts, **not** active Google Ads campaigns or evidence that conversion tracking is configured. Work order: GitHub #323, dependent on #306 and #223.

## Verified site & account boundary
- Live site: https://holistichouse.vercel.app ; Vercel `codex-public-book-library` on `codex/public-book-library`, not the repository's default `codex/bootstrap-books`.
- Ads account not visible in linked marketing app; GA4 property not found there; GSC Wizard Holistic House property not connected. Tooling plan blocks marketing-intelligence keyword volume/CPC. No actual keywords, CPC, spend, GA4 conversions or site E2E were measured.
- Current free offer: a short **coaching form + handwritten ME / GOAL / PROBLEM drawing + personal written situation review**. NOT a free live consultation. The form currently copies responses locally; visitor independently opens WhatsApp, pastes text and attaches a photo. We cannot count the WhatsApp link opening as an actual received lead.
- Before Ads, confirm professional qualifications and permitted titles, remove unsupported medical promises from ads (not automatically from author text), review testimonials and page policy compatibility.

## Public ad routes and compliance gates
| Intent | Public landing (verify HTTP 200 before importing) | Decision |
|---|---|---|
| Personal systemic constellations | `/en/services/systemic-constellations` | Candidate, legal + E2E gate |
| Free symbolic drawing review | `/en/services/free-situation-review` | Candidate, verified WhatsApp receipt gate |
| Reiki Yggdrasil | `/en/academy/reiki/yggdrasil` | Candidate, training-enquiry gate |
| Tantra Reiki | `/en/academy/reiki/tantra-reiki` | Candidate, training-enquiry gate |
| Kundalini Reiki | `/en/academy/reiki/kundalini-reiki` | Candidate, training-enquiry gate |
| Hypnotherapy / homeopathy | Existing service pages | **HOLD** pending regulated-title, claims and policy review |

Campaigns in the JSON have `PAUSED` state, **null budget**, location presence-only Toronto, Search partners off, Display expansion off, no sensitive remarketing audiences. Keywords are unmeasured **research seeds**; obtain actual Search Console/Keyword Planner data before spending.

## Measurement and privacy specification
1. Confirm a single owned GA4 property, a Google Ads Customer ID, GTM/Google tag setup and correct domain scope; link Ads ↔ GA4 in accounts only after ownership verification. Keep user permissions minimal.
2. Existing `AcquisitionEventLink` is gated by `document.documentElement.dataset.analyticsConsent === "granted"`. This is **not evidence** of an installed tag or consent mechanism. Check CSP in `middleware.ts` before enabling external tags. Consent must actually work and marketing must remain off when absent/declined.
3. Distinguish `free_review_cta_click`, `assessment_prepared`, `whatsapp_handoff_click` (all secondary) from `lead_received_verified`, `academy_enquiry_received_verified` (primary **only when receipt is confirmed**). Do not send coaching answers, drawing content, test scores, conditions, names, emails or client data to Google/Meta. No enhanced conversions or Customer Match for health-related leads without independent legal/privacy review.
4. Use innocuous UTMs such as `utm_source=google&utm_medium=cpc&utm_campaign=hh_reiki_yggdrasil_en`, keeping GBP as `utm_medium=organic`. Make sure locale redirects preserve allowed parameters; no personal/medical data in URLs.
5. Test with a new unauthenticated mobile visitor, actual owner's inbox/WhatsApp receipt, GA4 DebugView and a *test* Ads conversion. Only then choose primary conversions and a budget with express owner consent.

## Launch checklist
- [ ] Owner-connected Ads customer, GA4 and GSC.
- [ ] Legal/policy compliance, practitioner titles, copy and testimonial review.
- [ ] Public EN destination mobile QA + true lead acknowledgement; free-review promise matches written format.
- [ ] Consent works in all states; no vendor tags/private data on cabinet, tests or report pages.
- [ ] Primary/secondary conversion tests and deduplication documented.
- [ ] Keyword Planner CPC and actual search intent confirmed; negatives reviewed.
- [ ] User explicitly approves geography, account, budgets, launch; only then import as **PAUSED**, review and potentially enable.
- [ ] No production launch claims without deployed revision and actual Ads evidence.

References: https://support.google.com/adspolicy/answer/176031 ; https://support.google.com/adspolicy/answer/16701855 ; https://www.ontario.ca/laws/statute/07h10

---

## 2026-10-20 — Verified Google Ads staging

HYPD Google Ads account list: EMPTY. No live Customer ID, campaign, approved spend, or Google Ads conversion. HYPD GA4 can read Holistic House property properties/558442343. This property identifier is NOT a G-... web Measurement ID; the latter remains unverified. PUBLIC_ANALYTICS_AVAILABLE=false remains in code. No Google/Meta ad tag was detected in the live public landing HTML.

HTTP 200 / canonical checked: EN/RU/ES /services/free-situation-review; EN /services/systemic-constellations; EN /academy/reiki/yggdrasil; EN /toronto. These checks do not verify a human messenger Send, verified received lead, ad policy approval or successful booking.

Paid Google draft has a proposed first-party landing path /en/services/free-situation-review with source=google, medium=cpc, a neutral public-safe campaign code and creative=search_a. It remains entirely paused/unconnected. New paid-ad attribution is a human-readable source label in a voluntary messenger draft, not a GA4 event or an advertiser conversion.

NEXT: connect a verified Holistic House Google Ads Customer ID with actual CAD currency and Toronto time zone, check actual keyword volumes/costs, conduct regulated-title and policy review, prove real receiving of leads, verify consent and conversions. Do NOT import/enabled campaigns, buy subscriptions, retarget sensitive data or spend before separate owner budget approval. Official Ads account: https://ads.google.com/. Google health targeting policy: https://support.google.com/adspolicy/answer/16701855
