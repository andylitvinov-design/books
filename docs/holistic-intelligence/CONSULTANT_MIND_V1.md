# Consultant Mind · Holistic Intelligence / Assist v1

Date: 2026-11-12. Status: proposed source integration; LIVE only after protected merge, deployed SHA and functional QA.

## Why
Assist already has mode → channel → budget questions and a relative recommender, but the Messenger's generic Secretary frequently answers "see the card" for a price question. Consultant Mind adds **source-bounded factual service reasoning**, not a second Qwen model, inference gateway or clinical expert.

## Conversation contract
- Understand the requested outcome first; do not repeat information the client already provided.
- Classify explicit service intents: **price, quality/value, comparison, recommendation**. Do not sell to a client who is merely expressing distress, greeting, or refusing services.
- Gather optional constraints one at a time: desired goal and topic, human vs AI vs self-guided vs video, in-person vs video call vs asynchronous, free/≤€50/≤€100/flexible. Respect changes and refusals.
- Recommend early: **one fitting option with a specific reason**, its verified price or honest "unverified", up to two genuinely eligible alternatives, one optional follow-up question. Never pressure for payment.
- Explain quality with the published process, verified practitioner background and account-scoped verified reviews, not success percentages, fabricated ratings, diagnoses or treatment guarantees.
- Make routes real and locale-aware in RU/EN/ES. Clicking a link is exploration, not confirmed booking or checkout.

## Selection grid
Assist scorer (internal relative relevance, **not chance of therapeutic success**): theme **45**, mode **25**, channel **15**, verified budget **10**, low-friction free entry **5**. Stated mode and channel are hard constraints. Free-only excludes all paid/unknown. For €50 or €100 caps, only explicit published tiers at or below the cap qualify; unknown fee never counts as affordable. Topic shortlist is not padded with irrelevant categories. A request specifically for a personal consultation prioritizes a qualifying live session over an asynchronous assessment; free-only selection is honored above that preference.

## Canonical price authority
Published personal service landing source: data/personal-service-pages.ts → servicePageShared.ru / en / es → price. A personal session is **€50 for 30 minutes** or **€100 for 60 minutes** across the four first-party personal landing-page families. The matching catalogue mirrors the two verified tiers; regression tests check source drift.
For Reiki providers, OPORA, Reiki Academy and AI coach, there is **no one approved general published fee** in the catalogue: say unverified and refer to a specific listing. Never transplant €50/€100 tariffs onto third-party providers or full courses. Free written Situation Review and free wellbeing check-ins remain genuine free routes. Any future price change must update source and tests together.

## Technical integration and privacy
- lib/assist/consultant-mind.mjs: pure deterministic advisory skill, no network, storage, analytics or client personal data; no training or extra model copies.
- lib/assist/service-match.mjs: shared catalog pricing and hard affordability filter for local mobile Assist.
- app/api/holistic-agent/turn/route.js: calls Consultant only after existing same-origin, authenticated actor, rate gates, current/history safety preflight, only on explicit service question without private memory/profile reads. Returns approved locale-specific resource links and modelUsed=false.
- Existing single Qwen remains separately gated by the user's consent, server mode and owned gateway; Consultant does not claim to be Qwen or silently invoke paid inference. It is a new server skill within Secretary-style service answering.
- No claim of payment, booking, calendar availability, known therapist credential, patient outcome or completed action.
- Homeopathy has no reliable evidence for treating disease; symbolic/energy practices cannot replace medical or emergency care. Acute risk must follow existing safety handoff, not commercial advice.

## QA and LIVE requirements
Run: node --test tests/assist-service-match.test.mjs tests/consultant-mind.test.mjs.
Require protected exact-HEAD Core + Specialist + hh-merge-check, TypeScript, Next build, privacy and mobile browser regression before native merge.
After merge, independently verify Vercel production READY + exact commit ancestry and actual authenticated RU/EN/ES chat intents, budget, restrictions, quality, no crisis pitches and URLs. A PR or a passing synthetic test is not proof of LIVE.

GLOBAL_PR_ONE_PUBLISH_V1: all code/test/docs pre-staged; single feature HEAD publish; no extra provider, cost, bypass or speculative CI wave.
