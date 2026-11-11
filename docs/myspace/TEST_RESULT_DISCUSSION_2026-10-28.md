# Holistic House · «Обсудить этот тест» / Discuss this test
Owner-approved concept: 28 October 2026 · canonical implementation PR #2485

## Purpose
Any completed test in My Tests should open a private, source-grounded dialogue.
The existing female support portrait remains on the left; the message thread
on the right rises as the user chooses a measured scale or types a short question.
The consultant acknowledges actual reported scores, asks what matters most,
and then offers a relevant published video, self-paced programme, next eligible
questionnaire or an optional practitioner consultation. This is a transparent,
local rule-based guide (not paid/generative AI, not a physician).

## Three entrypoints, one stored result
1. My Tests: a saved row has **Discuss this test**, opening its own owner-scoped
   /app/results/{id}?discuss=1#hh-test-result-discussion.
2. Signed-in completion: a third **Discuss this test** action submits the same
   completed run idempotently then opens its source report and expanded guide.
   Course-managed test sequences retain their existing single next-course action.
3. Guest completion: original scores-only view stays unchanged. An additional
   **Discuss in Google Cabinet** action deliberately creates one existing,
   browser-proven, item-scoped save-intent; OAuth/confirmation commits that
   exact result and opens discussion. A browser-session marker holds ONLY the
   server-issued opaque intent UUID; no scores, answers, names, diagnoses,
   goals or health data are stored client-side or placed in links.

## Interpretation and ranking rules
- Scales and score ranges are selected from buildAssessmentResultReport and
  assessmentResultOverview. Reuse source provenance, version, direction,
  normative/screening distinctions and existing interpretation text. Only
  source-verifiable numeric rows may lead to personal recommendations.
- Display 1–3 recorded scales (professional-review flags first) and the exact
  instrument score. No invented health percentages, normative means, causes,
  diagnoses, treatment recommendations or pseudo-clinical labels.
- The user selects a measure or explicitly supplies a short preference.
  Topic is bounded to existing editorial themes (energy, work, relationships,
  meaning) using reviewed source metadata. Never send raw test answers or
  personal health data to a recommendation URL.
- After the dialogue, at most three *existing* offer cards and optional
  available-test link: published video gallery pre-filtered by a public
  allowlisted topic; actual Academy/business course page; relevant rights-cleared
  test catalogue; personal-services enquiry. The first available materials
  are preferable to upsell. A click is not a played video, lead, booking,
  payment, enrolment or course completion.
- If any verified instrument scale flags professional review, show the source
  warning and suppress **all** commercial recommendations. Urgent self-harm
  expressions stop the dialogue's recommendations and cannot be reset into
  selling in the same conversation. Unverified/missing scores receive no
  personal interpretation.

## Privacy and technical boundaries
No additional AI/API/paid credits, provider calls, new database or RLS tables,
analytics/CRM writes, notifications, chat persistence, payment activation,
or automatic medical disclosure. Existing server-side result ownership,
Google consent/save proof, report methodology and restrictions remain mandatory.
Result text stays in the current browser tab. EN/RU/ES copy is supported;
underlying instrument language/evidence is not claimed to change with UI locale.

## Acceptance gates
Scoped Node tests and source-contract tests; Next lint, TypeScript, build;
Chromium/WebKit 320/390/430px interactive keyboard / responsive regression;
correct source version and severity flags; guest save → OAuth → exact saved
account result; logout and cross-account IDOR; Vercel SHA READY and live alias,
then actual on-device iPhone QA. Do not mark LIVE_VERIFIED from a PR, green build,
HTTP 200, mocked Google login or merge alone. Requires a real authenticated
Google browser session for end-to-end sign-in verification.

Related tickets: #646 (My Tests), #1519 (conversational guide), #1223
(test validity), #990 (consent and lead funnel). No second assessment engine.


## Professional interpretation model · v1.1 (28 October 2026)

### Exactly what the consultant reads

| Order | Canonical source | Permitted conclusion | Prohibited conclusion |
| --- | --- | --- | --- |
| 0 | Owner-scoped GET /api/app/results/:id, immutable instrument identity, buildAssessmentResultReport, verifiedHistoryResult | Identify this exact saved test and whether its source interpretations are usable | Analyze a query-string ID, unsaved guest answer, or unverified numerical value |
| 1 | report.sections keys, construct, value, min, max, bandBasis, presentationDirection | Show literal score and the scale's defined direction; explain whether a published screening/reference band exists | Say "above the population average", "80% healthy" or "weak personality" from a descriptive fraction |
| 2 | assessmentResultOverview and original recommendedReview | Select 1–3 source-based starting points, with a professional-review flag first; explain why each appears | Rank people, diagnose, or claim all high scores are bad |
| 3 | verifiedPreviousResult plus scoreChangeReading, only identical source/version/scale/range/unit/timeframe and account | "Previous: 4 → now 6" as a difference in answers, with a measurement-error caveat | Claim reliable psychological progress, worsening or a cause without validated meaningful-change evidence |
| 4 | report.sections summary, meaning, primarySupport, steps, followUp | Repeat a bounded, source-tied explanation and at most one optional everyday reflection step | Invent psychological causes, treatment or prognosis |
| 5 | The visitor's voluntary "relevant / not sure / different measure" response, followed by an explicit chosen media format | The client confirms whether the finding matters today | Infer goals, diagnosis, marketing consent or commercial readiness from a score |
| 6 | Existing catalog topic keys and published first-party EN/RU/ES routes | Rank video gallery, existing course, available next test, optional personal consultation by explicit format choice | Fabricate an exact verified video match, enrolment, lead, booking, payment or outcome |

The current model examines **one opened test**; it does NOT silently scan or merge all previous tests, private client profiles, practitioner CRM records or goals. It may show a *single previous compatible measurement* from the same authenticated account. Multi-test cross-axis and goal-gap matching belongs to separate P1 integration only after source-backed axis matching, informed client consent and verified content/access metadata; see #2486. Never promote an older result over a rejected latest measurement.

### Exact conversation state machine

Choose a scale → read its source explanation → confirm relevance → choose format → at most three existing actions.

After a selected scale the guide displays:
1. **Fact:** name, exact test score and original scale range; reference/screening label only when source-backed.
2. **Meaning:** short original report interpretation, and whether it represents a difficulty, resource or neutral trait.
3. **Trend:** exact past/current values only when source/version/account compatibility is verified; otherwise state that there is no comparable earlier test.
4. **One question:** "Does this reflect your recent experience, or would you rather explore another measure?"
5. **Human confirmation:** Yes → optionally one report-backed step and a format chooser; Unsure/No → another measure or free question, without inferred sales intent.
6. **Explicit format:** Video / Course or practice / Another test / Consultation → up to three first-party offer cards, with the user's chosen format first. Every card states what exists, not a promised clinical outcome. No click is recorded as a lead/booking/payment.

Unrecognized question → courteously explain source limitations and invite clarification, not invent a cause. Crisis phrase → safety/support mode, no offers and no same-session reset into marketing. Professional-review flag anywhere in the original report → preserve professional follow-up and hide all commercial cards. Missing/invalid source evidence → source-review message only, no interpretations. Language switch changes explanatory UI copy but not instrument language, provenance or scoring.

### Wireframe in words

Desktop: warm beige card, purple **Discuss this test** toggle, fixed woman consultant portrait on left, scrolling short message bubbles on right. First bubble shows test title and 1–3 literal scores, then scale-choice chips. After tap: source-backed score, explanation, trend and a contextual question. Three 44px+ response chips ("Yes", "Not sure", "Another measure"), then four format choices. Only the chosen format produces up to three compact cards. Sources/limitations in the collapsed, accessible "How this guide reads the test" disclosure. No autoplay or artificial wellness-percentage gauge.

Mobile 320–430px: portrait 62–82px, single-column offer cards, no horizontal overflow or fixed chat overlay covering the report; keyboard-focusable controls, role=log, polite announcements and reduced-motion support. Full source report remains immediately after the discussion.

### Example wording (SYNTHETIC ONLY — not user data)

Assume a hypothetical source-verified self-reflection test with descriptive 0–10 response ranges and two scales, "Tension" = 8 and "Rest" = 3, with NO published clinical norms. These are **fictional testing fixtures**, not statements about a client.

**Guide:** "In this questionnaire there are two measures we can discuss. 'Tension' — 8 on a 0–10 response scale; 'Rest' — 3 on its own 0–10 scale. These are your recorded answers, not a diagnosis or a comparison with other people. Which would you like to explore?"

**Visitor:** "Tension."

**Guide:** "The source scale describes reported tension; it does not establish why it happens. Its original report explains [actual scale-specific reviewed summary]. There is no comparable earlier test, so we cannot describe a trend. Does this match your experience recently?"

**Visitor:** "Yes."

**Guide:** "Thank you. Your experience matters more than a single number. Would you prefer a video, an existing practice/course, another test or a personal consultation? The report also offers this small optional next step: [actual source action, where available]."

**Visitor:** "Video."

**Guide:** "You can browse verified published recordings for the topic you chose. These are self-directed resources, not a treatment recommendation." → opens the existing Holistic Support gallery with an editorial topic filter only.

**If "No":** "Then we should not label this score as a problem. Would you prefer to look at another measured scale?"

**If source professional follow-up is flagged:** "The original assessment includes a recommendation to seek professional evaluation. This automated guide cannot diagnose or recommend a paid service from this score." No cards appear.

### Validation and status semantics

Acceptance includes: unit tests for descriptive/directional/screening/neutral source language, source-matched comparison and account mismatch, language parity EN/RU/ES, preference order, clinical/crisis gates, exact active/guest result routes, safe links; browser Chromium and WebKit 320/390/430; Google OAuth, saved result and another-account denial; Vercel READY + exact production SHA + physical iPhone. Local model tests do not establish real authenticated production E2E. This document is implementation design, not proof that the feature is already LIVE.
