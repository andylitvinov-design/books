# Holistic House — Judgment Mind 1.1 integration
Date: 2026-11-06. Production target: codex/public-book-library.
Release authority: AGENTS.md, docs/operations/CI_RELEASE_POLICY.md,
https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md

## Delivered scope
- One pure, rule-driven, no-cost Judgment Mind integrated with the existing protected
  /api/holistic-agent/turn handler and HolisticAgentChat/iHelp UI. No second bot.
- Eight explicit non-clinical situation classes: overload, starting, conflict,
  loneliness, self_criticism, uncertainty, fatigue, stress.
- E1 = observation, up to two tentative explanations, one brief clarification.
  E2 = user-selected alternative and one optional, reversible small step.
  E3 = voluntary user feedback. Corrections, refusal and topic switches supersede
  prior hypotheses. No diagnosis, hidden motives or automatic purchases.
- RU/EN/ES; two short choice buttons, a skip action, mobile 44px touch targets.
  Guest state remains local/ephemeral. Authenticated choices use short-lived HMAC
  tokens derived from the existing server secret, bound to verified account,
  session and preceding assistant reply. Tampered/expired/foreign choices fail.
  Retries are harmless and side-effect free; stateless tokens are not a claim
  of durable distributed one-time-use enforcement.
- Existing same-origin, auth, rate limiting, safety, private headers,
  consented catalogue and fallback route remain authoritative. Direct video,
  order and technical questions keep their current product handling.

## Deliberately excluded
- Sixteen further situation codes are editorial candidates, disabled.
- Draft memory PR #2557 is not live. No persistent hypotheses, psychological
  profile, raw chat storage or new Supabase tables. Long-term memory requires
  separately ready opt-in/RLS/revocation/erasure with real two-account QA.
- No invented published resources, autonomous video/meditation generation,
  payments, bookings, messaging, prescribing, hypnosis or trauma exercises.
  Existing professional/copyright/availability contracts must authorize any
  future cross-mind/resource routing.
- Lexical preflight is not a clinical screen. Human safety review and
  escalations remain required before any expansion of psychological scope.

## QA and evidence
Run: node --test tests/judgment-mind.test.mjs
Fixture: tests/fixtures/judgment-mind-58.json
Contains 24 explicit recognition, 18 guard/abstain/handoff and 16 choice cases,
plus separate token, refusal, correction, feedback and integration assertions.

Provenance limitation: the original historical 58-QA ZIP referenced in the
Word/Google Docs specification was not accessible as raw bytes in this session.
The new fixture is an independently reconstructed 58-case regression corpus,
not an assertion that the exact historical cases were executed.

## Release gate
Prepare and review the whole patch before the FIRST remote write. Publish one
atomic branch HEAD and Ready PR. Freeze HEAD while real Core, applicable
Specialist/Guard and hh-merge-check run. Never bypass branch protection.
Production LIVE requires independent Vercel READY serving SHA proof and genuine
iPhone RU/EN/ES / guest / signed-in / two-account end-to-end interactions.
Green CI, merge or HTTP 200 alone are not LIVE evidence.
Rollback only through a normal protected revert; no new services/workflows.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
