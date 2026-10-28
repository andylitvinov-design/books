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
