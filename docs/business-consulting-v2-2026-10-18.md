# Business Consulting & Archetypal Coaching — Holistic House v2
**Date:** 2026-10-18 · **Canonical route:** \`/{locale}/services/business-consulting\` · EN / RU / ES

## Positioning
A focused service for founders, independent professionals and small business owners:
**business strategy and decision clarity first; optional archetypal coaching, symbolic business constellations and goal activation as the differentiator**.

Do not sell mystical guarantees or promise financial outcomes. Data-driven management questions and reflective symbolic insight must be visibly separated. Preserve the existing Business Consulting concept (free archetypal diagnostics, SWOT-style questions, Goals Mentoring, business constellations and goal activation).

## Customer problems
- Launch / pivot / prioritization and growth decisions.
- Offer positioning, customer fit, sales and pricing questions.
- Confusing founder / partner / team roles.
- Goals that stall due to internal uncertainty or execution problems.

## Offer ladder
| Offer | What it is | Fee | Expected output | Next step |
|---|---|---|---|---|
| Free Business Snapshot | Existing free situation-review questionnaire plus handwritten I–Goal–Obstacle drawing; personal written review, **not** a call | Free | A first written perspective on question/obstacles | Invite a paid session only if helpful |
| Strategy Clarity | One live business question | €50 / 30 min | One priority and an action to attempt within 72 h | Optional full session |
| Business Mapping & Goal Activation | Practical business map + optional symbolic business constellation and goal imagery | €100 / 60 min | Hypotheses to verify and a 14-day action/checkpoint | Optional coaching |
| Goals Mentoring | Individually agreed follow-up sessions | Fee/schedule by agreement; **no implied subscription** | Review actions and refine decisions | Return when needed |

These are proposed **working outputs**, not guaranteed business outcomes or financial advice.

## Session protocol
1. Define one business goal, baseline and what progress means.
2. Explore options and a light SWOT-style map of strengths/weaknesses/opportunities/risks.
3. If wanted, map the entrepreneur, product, customers, partners and resources symbolically (subjective hypotheses only).
4. Choose one concrete action within 72 hours and one observation metric for a 14-day review.

## Website and conversion UX
- Keep the previously approved four homepage service cards.
- Make the fifth Services card a distinct **Business Strategy & Founder Coaching** service.
- EN/RU/ES landing with navy/burgundy business visual language, real Andrey portrait, succinct pains, 3 offers, process, ethics, FAQs and clear CTA.
- Only truthful video: **do not reuse a systemic-constellations video as a business-specific explainer**. Separate business hero video can be drafted later, must not render without explicit approval.
- Primary cold-traffic CTA opens the existing free written review at \`/{locale}/services/free-situation-review?topic=business\`.
- Paid offer buttons invoke the existing opt-in WhatsApp/Telegram chooser with format & fee, with a manually confirmed message. **Click/open ≠ persisted CRM lead or confirmed booking.**
- EN/RU/ES SEO metadata, hreflang and Service structured data; avoid fabricated reviews or outcomes.
- Existing pricing: €50/30 min, €100/60 min.

## Funnel instrumentation (next integration)
**Target CRM stages**:
1. \`business_landing_view\` with safe UTM metadata.
2. \`business_free_start\` → actual submitted free-review lead.
3. \`business_paid_request_start\` for express/full/mentoring → actual submitted contact/booking request.
4. \`business_qualified\`, \`business_booked\`, \`business_paid\`, \`business_completed\`, \`business_follow_up\`.

Current site uses click attribution and an outbound messaging handoff. Do **not** label a WhatsApp click as a confirmed lead, payment, completed appointment or captured customer identity. If the CRM schema supports service lead types, map intake to \`business_free_review\` / \`business_express\` / \`business_full\` / \`business_mentoring\`, with consent, deduplication, per-stage timestamps and owner access only. Otherwise create a safe migration in a separate PR and test before activation.

**Metrics** (by source / campaign / language / format): landing→free-start, free-start→submission, request-start→confirmed contact, contacted→booked, booked→paid, and revenue per paid lead; only compute where event definitions and data are actually reliable.

## Acquisition / SEO
- Separate high-intent business audience from homeopathy and wellness ad traffic.
- Page content clusters: business coaching Toronto/online, founder decision clarity, business constellations (explained without unproven claims), goal-setting and small-business strategy.
- Real customer testimonials/cases only with permission and documented source; never fabricate.
- Recheck mobile contrast and layout, form/message availability, schema, indexing and Vercel production after merge.
- Optional business-intro AI video: draft a 20–45 second personal script in EN and RU, **do not generate/publish without approval**.

## Delivery status and remaining gates
- This PR delivers landing copy, UI, route metadata, Services card updates and static contract tests.
- Actual form submission to owner CRM (not just outbound messaging) and full revenue attribution are independent production integrations requiring audit of current CRM endpoints/schema. No false claim of completion.
- Confirm Vercel build/production deployment and manual mobile QA after merging.
