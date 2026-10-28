# Holistic House — «Обсудить этот тест» / Discuss this test
Owner concept 2026-10-28 · implementation branch: codex/test-result-discussion-20261028

## Goal and boundaries
After any completed account-scoped questionnaire, the user can open a conversation
about that **particular** saved result, not a generic AI chat or a second score.
The same action is linked from My Tests, the result page and the successful
non-course test submission. A guest sees a separate voluntary "Discuss in my
Google Cabinet" action: it creates the existing item-scoped, HttpOnly-proven
save intent and, after Google OAuth and confirmation, resumes on the saved
result. Neither a visit nor a chat is a CRM lead, booking or sale.

## Conversation UX
1. Show the existing girl's portrait from
   /images/holistic-house/support-reference-avatar.webp on the left, and
   ascending, WhatsApp-style source-bound dialogue on the right.
2. Show up to three verified recorded **scales** with their literal score and
   source range. Prioritize published professional-review flags, then the
   source's signed difficulty/resource direction; never call descriptive or
   neutral traits above/below a population mean. All interpretive text comes
   from buildAssessmentResultReport, including instrument-specific caveats.
3. Ask which measured scale the user wishes to discuss. Reflect its score
   and source explanation, without diagnosing or inferring causation.
4. Ask what format they prefer, then show at most three actual destinations:
   published video gallery, existing course/practice, another available test,
   personal consultation enquiry. Prioritize the explicitly chosen format;
   a link is **not** a completed video, lead, reservation or payment.
5. Let the user choose another measured scale, ask a bounded text question or
   close/reopen the dialogue. No automatic enrolment, score change, media
   playback, CRM contact, notifications or paid API calls.
6. Where the source recommends professional review, present the original
   medical follow-up warning and **no commercial recommendation**. Crisis
   expressions suppress all recommendation controls in that dialogue.
   Missing/invalid provenance suppresses all personal interpretations.

## Data model and ranking
Input is the existing owner-verified result + its versioned source report,
never arbitrary client-supplied percentages. Rank the scale preview using
assessmentResultOverview's source-defined ordering, then classify the chosen
scale by its explicit source key/domain into one of: stress, energy, focus,
relationships, work, meaning or general. Explicit user choice of format
determines recommendation order; a topic only selects the relevant existing
course landing page. No false clinical severity, normative comparison or
made-up video matching. This is a first safe implementation to extend later
with confirmed My Profile axes and a rights-cleared offer registry, not an
unverified AI cross-profile diagnosis.

## Privacy and implementation
- Reuse current secure GET /api/app/results/:id and existing saved-result
  ownership/auth checks; no new API, DB tables, policies, external AI, CRM or
  tracking events.
- Short chat state is client-memory only (per tab). Guest handoff stores only
  a single opaque server-issued save-intent UUID in sessionStorage, never
  answers, scores, topic preferences or private IDs. HttpOnly capability and
  explicit server confirmation remain mandatory.
- The site labels this as an **automated local guide**, not a generative AI
  model. User-entered text only matches bounded known intents.
- EN/RU/ES interface copy. Public questionnaire/source localization status
  is unchanged; report source language and validated score boundaries remain
  authoritative.

## Acceptance
- Tests: model verification/missingness, source score and direction, clinical
  warning suppressing commerce, local intent/crisis, EN/RU/ES and guest OAuth
  route contracts; repo lint/typecheck/build plus 320/390/430px Chromium/WebKit
  visual and keyboard checks on real PR SHA.
- Production: verify canonical branch, CI, deployment READY/SHA and live
  alias, then actual anonymous result -> explicit Google save -> account-owned
  result -> discussion; signed-in completion and previously completed test;
  logout/other-account IDOR. Real Google OAuth E2E requires an owner account.
- Do not mark this **LIVE VERIFIED** before the checks. A build, HTTP 200 or
  PR merge is not user-level end-to-end success.

Related existing work: #646 (My Tests roadmap), #1519 (conversational advisor),
#1223 (test validity), #990 (lead funnel). No duplicate application.
