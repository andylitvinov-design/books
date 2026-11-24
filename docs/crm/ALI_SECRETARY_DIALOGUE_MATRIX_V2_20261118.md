# Ali Secretary Mind — route and dialogue matrix v2 (2026-11-18)

## Scope and evidence
Source-of-truth first-party offer IDs: `lib/assist/telegram-service-options.mjs` (30).
Per-offer short RU/EN/ES question pairs + grounded public destinations/prices:
`lib/assist/ali-secretary-offer-journeys.mjs`.
General category fallback: `lib/assist/ali-service-scenario.mjs` (7 service types).
Signed Telegram V3: `lib/crm/telegram-ai-diagnostic-v3-service.js`.
Photos: `lib/crm/telegram-welcome-photo-catalog.mjs` (all 30, 4 Support topics and safe general modes).
Support quiz: `lib/crm/telegram-support-quiz.mjs` and
`lib/assist/ali-secretary-support-journeys.mjs` (4 topics × 4 needs, RU/EN).
These are source-checkable capabilities; real user-to-owner Telegram delivery needs an
independent live Telegram test and is not inferred from CI.

## Decision and stages
1. **Entrypoint and service**: signed `/start hhitem_<offer>_<locale>` (exact
   selected offer), `/start hhservice_<service>_<locale>` (category),
   `/start hhsupport_<locale>_<choices>` (four-topic quiz),
   `/start hhreview_<locale>` (separate free diagnostic), or highly
   confident first written service mention in a *new* bot session.
   Do not hijack an existing chat, a declined service or ambiguous multi-topic text.
2. **Photo and hello**: one fixed first-party photo chosen by exact offer
   before category. The signed first service welcome is a single short Telegram
   caption with one consent button. No media repeats on later answers. An image
   transport failure retains text-only continuity.
3. **Understanding goal**: offer-specific first prompt; keep client-authored
   facts, avoid inferred health, identity or diagnoses. Full answers can skip
   already-covered slots.
4. **Obstacle / desired support**: one short relevant question (second prompt).
   Answer questions about price or a published resource immediately without
   consuming the current slot. Client can pause/refuse or jump to booking request.
5. **Review and action**: after two meaningful replies or clear booking intent,
   show a factual summary for correction; *Send* requires separate client
   confirmation. A confirmed request is recorded to existing owner CRM, not
   booked or charged automatically. Course/test/content URLs may be shared as
   informational links on request without creating CRM leads.

## Published offer coverage (30)
- Reiki: `reiki_remote`, `reiki_tantra`, `reiki_yggdrasil`.
- Browse: `browse_tests`, `browse_situation`, `browse_wuxing`.
- Readings: `reading_iching`, `reading_tao`, `reading_tarot`.
- Consultations: `consultation_free`, `consultation_express`, `consultation_full`.
- Services: `services_imagery`, `services_constellations`, `services_business`.
- Video: `video_intention`, `video_meditation`, `video_message`.
- Courses: `courses_opora`, `courses_practitioner`, `courses_yggdrasil`.
- Coaching: `coach_diagnostic`, `coach_ai`, `coach_human`.
- Magical: `magical_wellbeing`, `magical_money`, `magical_talisman`.
- Homeopathy/symbolic services: `homeopathy_free`, `homeopathy_express`,
  `homeopathy_full`.

## Parallel scenarios kept separate
- Free Diagnostic is an independent consented conversation and has a longer
  opt-in materials/Google Form/CRM follow-through tracked by PR #4918.
- Secretary Psychologist is voluntary, deeper and must never activate because
  of a guessed emotion or a service title.
- General chat and Coach are not silently switched into Secretary by user text.
- Support quiz mode 0 uses native Secretary; modes 1/2 remain their explicit
  independent modes.

## QA acceptance
- Every offer, RU/EN/ES, must have an exact greeting, first/second question,
  local image and verified site path (allowlisted).
- Four Support topics × four needs × RU/EN retain user selections after quiz.
- One explicit opt-in, no OpenRouter for ordinary Secretary service text,
  no extra mandatory third question, no second photo.
- STOP, refusal, safety handling, early explicit booking, corrections,
  idempotent signed updates, and user-reviewed CRM Send remain enforced.
- Source CI + Vercel READY/alias SHA is **not** proof of delivery and speed
  from a real Telegram account. Final real-device E2E is still required.
