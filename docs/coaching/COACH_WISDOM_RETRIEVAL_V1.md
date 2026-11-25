# Holistic House · Coaching Wisdom Retrieval v1 (source-prepared, release hold)

Date: 2026-11-12. Task: https://github.com/andylitvinov-design/books/issues/4387

## Existing source of truth
- Original published library: public.hh_ideas_aphorisms (142).
- Additions: public.hh_coach_wisdom_additions_v1 (104; 102 curated, 2 held).
- Unified protected view: public.hh_coach_wisdom_catalog_v1 (244 curated entries).
- Google Drive editorial guide: https://docs.google.com/document/d/1UKBlU82ANtHSRHFGrb4oqikvpPMDRI2s5Uc1HSMt3J0/edit
- Do not clone these records into prompts, static bundles or browser storage.

## Integration
- Pure/side-effect-free intent, locale and topic selection: lib/coaching/wisdom-retrieval.mjs.
- Server-only bounded RLS DB query: lib/app/coaching-wisdom.js.
- Three first-party authenticated paths:
  1. My Coach conversation -> existing my-coach/turn -> lib/app/coaching-brain.js
  2. Personal Coaching Brain -> existing personal-coaching/brain -> same service
  3. Messenger rules -> existing app/api/holistic-agent/turn/route.js
- The wisdom route is **only invoked after explicit client request**, verified auth + rate limits and risk/boundary checks; no automated unsought quote injection. Read-only query is limited to topic enum, not raw text.
- One paragraph + provenance and at most one question; no provider call, paid model, new credentials or client tracking. Existing model channel remains unchanged otherwise.
- Two held archive items never selected; RU-only koans never shown in EN/ES. Prefer modern original and label classical paraphrases transparently.
- Fallback when theme absent: a single open topic question. Fallback on DB outage: a local no-citation reply.

## Database access
Applied in live Supabase project shervdixkaxurnaecioe on 2026-11-12:
- GRANT SELECT on both underlying tables and the invoker view to NOLOGIN hh_app_backend.
- RLS additions: SELECT only when coach_enabled AND review_status='curated'.
- RLS base: SELECT only when is_published.
- anon/authenticated still lack SELECT on additions/view. No public route or service-role key exposed.
- Important: connector cannot SET ROLE hh_app_backend; app-level authenticated E2E readback must verify RLS role permissions when rollout is authorized.

## Tests and remaining
- New focused test: tests/coaching-wisdom-retrieval.test.mjs (intent, RU/EN/ES, refusal, risk, continuation, provenance, duplicates, hold, source path).
- Prepared source is **not merged and not LIVE**; do not claim implementation from a Git object.
- Before first remote branch update: verify production HEAD/active PR ownership lease; run node --test, ESLint, TS, Next build and applicable protected gates. Verify Vercel paid usage/preview risk first; the current billing charges endpoint returns 404 Plan not found.
- Publish one atomically prepared HEAD only, then READY PR; do not update branch repeatedly. After verified merge confirm production READY exact/descendant SHA and real browser My Coach + Messenger + private Coaching Brain on RU/EN/ES.
- Do not claim automatic topic-based coaching enrichment beyond explicit user request; that is a separate opt-in product decision and evaluation.
