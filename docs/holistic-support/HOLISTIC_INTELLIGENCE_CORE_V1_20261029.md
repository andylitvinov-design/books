# Holistic Intelligence Core — единое мышление клиентского агента
**29 октября 2026 · v1 · Source-only architecture + executable policy. Не подключено к production UI/API.**

## 0. Задача и критерий успеха

Не строить отдельный бот для каждого раздела. Построить **единую объяснимую систему принятия следующего решения** поверх существующего приватного профиля, тестов, цифровой библиотеки и программы личного развития. Клиент сообщает цель, подтверждает контекст и получает **одно наиболее уместное добровольное действие** (практика, видео, курс, тест или предложенная сессия), 1–2 альтернативы и объяснение. По его добровольной обратной связи путь корректируется. При неопределённости — один уточняющий вопрос. При высоком риске — маршрут безопасности, без коммерческой рекомендации.

**MVP работает бесплатно:** Node.js/Next.js + существующие локальные детерминированные matchers. Никаких новых LLM подписок, SQL-таблиц, внешней отправки личных данных, автономной терапии, оплаты, сообщений, публикации или фоновой записи. Генеративная модель — поздний, *опциональный* слой естественной речи с явным opt-in и отдельным бюджетом.

## 1. Существующая инфраструктура: reuse, not rewrite

| Сфера | Канонический источник / алгоритм | Роль для Core |
| --- | --- | --- |
| Приватный профиль | `lib/profile/unified-profile.js`, `lib/profile/goal-profile.js`, `lib/profile/development-program.js` | Авторизованный, разделённый на четыре слоя контекст; подтверждённые цели; НЕ новый «индекс человека» |
| Измерения | `lib/assessments/verified-history.js`, `lib/assessments/psych-portrait.js`, `lib/assessments/interpretation-registry.js` | Только настоящие источник, edition/version, scale, timestamp, права, направление |
| 34 исследовательских facets | `lib/profile/profile-scale-selection.js`, `docs/assessments/HOLISTIC_HOUSE_PROFILE_RESEARCH_AXES_2026-10-26.md` | Общая онтология `topic::facet`, НЕ 34 новых теста |
| Подбор тестов | `lib/assessments/test-recommendations.js`, `lib/profile/portrait-test-suggestions.js` | Недостающие измерения только по запросу; не вынуждать повторять уже пройденное |
| Разумное сопоставление материалов | `lib/holistic-support/axis-offer-ranker.mjs`, `axis-offer-matcher.mjs`, `client-intent-model.mjs` | Детерминированное ранжирование 4 видов `video/course/service/test` по подтверждённым сигналам |
| Медитации | `lib/holistic-support/meditation-catalog-ranker.mjs`, curator-reviewed YouTube/Supabase catalog | Подбирать по языку реальной аудиодорожки, длительности, safety/rights/редакторскому статусу |
| Коучинговые сессии | `lib/personal-coaching/offline-intelligence.js`, `guided-session.js`, `docs/coaching/COACHING_INTELLIGENCE_2_0_IMPLEMENTATION_SPEC_2026-10-24.md` | Одно авторское уточнение на шаг, сценарии вопросов, редактируемый план |
| Безопасность | `lib/assessments/safety.js`, существующие home-guide crisis gates | Триаж ДО любого оффера и независимый контроль выходного текста |

Важное различие: **4 жизненные сферы** (business, relationships, energy_health, personal_growth), **4 слоя профиля**, **17 визуальных лучей портрета**, **34 исследовательских фасета** и **3 добровольные оценки Goal Profile** — разные системы координат, их нельзя суммировать или выдавать за клиническую норму.

Релевантные существующие спецификации: `docs/holistic-support/AXIS_AWARE_MATCHING_MODEL_V1_20261028.md`, `docs/holistic-support-client-relevance-v2-20261028.md`, `docs/holistic-support-meditation-catalog-v1-20261028.md`; связанные issues #1774, #1881, #2480, #1223. Не дублировать таблицы, scoring, курс и клиентский кабинет.

## 2. Модель мышления: 9 последовательных шагов

```
0. Safety preflight (обязателен, fail closed)
1. Access & consent gate (server-owned scope, раздельные согласия)
2. Read explicit intent (тема, желаемый опыт, время, язык, предпочтения)
3. Retrieve verified context (подтверждённая цель → измерения → история)
4. Detect uncertainty (конфликт, недостаток сведений, нет контента)
5. Query approved catalog (exact version/language/rights/content review)
6. Rank with existing deterministic matchers (никакого invented clinical score)
7. Decide: clarify | recommend | no_match | safety_handoff
8. Explain one next action, ask permission, collect optional feedback T0/T1
9. Save ONLY by explicit authorized action, evaluate later and re-plan
```

Приоритет свидетельств: **текущий добровольный выбор клиента > ранее подтверждённая цель > проверенные недавние результаты конкретных шкал > метаданные утверждённого контента > гипотеза**. Больше данных не означает больше уверенности. Нормативный референс, внутриперсональная динамика, 0–10 субъективная оценка и «нравится» — разные типы данных. Отсутствие данных = неизвестно; при несовместимости измерений не создавать сводный балл. Старый результат не подставлять за актуальный.

Для каждого утверждения хранить происхождение (provenance) как отдельный ledger: `user_stated | user_confirmed | source_verified_measurement | editorial_metadata | hypothesis`. Гипотеза допускается только с модальностью «возможно» и вопросом на подтверждение, но **никогда не записывается обратно в профиль как факт** без подтверждения.

## 3. Контракт контекста (без нового клиентского хранилища)

```ts
interface MindContextV1 {
  intent: {
    language: 'en'|'ru'|'es';
    selectedFacets?: string[];       // exact allowed topic::facet
    selectedTopics?: string[];
    lifeAreas?: string[];            // 4 canonical areas
    formats?: string[];              // optional user choices
    maxDurationMinutes?: number;
    selfGoals?: UserConfirmedGoal[];
  };
  profile: {
    authenticated: boolean;        // ASSERTED BY SERVER, never by client JSON
    ownerScoped: boolean;          // verified owner check / RLS
    confirmedFacets?: string[];
    confirmedTopics?: string[];
    confirmedLifeAreas?: string[];
    confirmedSelfGoals?: UserConfirmedGoal[];
    measurements?: VerifiedSignal[];// exact source IDs, only opt-in
  };
  consent: {
    profilePersonalization?: boolean;
    measuredPersonalization?: boolean;
    paidSuggestions?: boolean;
    sensitiveContent?: boolean;    // distinct intimacy/sexuality opt-in
  };
  safety: {status: 'clear'|'urgent'|'human_review'|'unknown'};
  catalogItems: EditorialApprovedOffer[]; // from approved source, not generated
  knownFacetRefs: string[];       // server authoritative registry
  feedback?: { dismissedIds?: string[]; completedIds?: string[] };
}
```

**Allowed output:** `status`, `primary`, 0–4 alternatives, one `question`, reason codes, model/version markers, requiresUserConfirmation. **Forbidden output:** raw test answers, assessment scores, access tokens, client identifiers, model confidence as clinical probability, diagnosis, inferred trauma, unverified booking/price, invented video/audio. Feedback prompts do not automatically save anything.

**Consent matrix:** profile personalization, measured scoring, sensitive themes, paid offers, persistence, handoff to practitioner, outside AI provider, reminders/messages — separate, revocable purposes. No implicit opt-in from reading a page or clicking a video. Private source refs never go in URLs, analytics, logs, CRM, YouTube queries or external AI. The server must authorize owner scope on every retrieval; booleans in this contract are not security controls.

## 4. Decision policy, actual v1 code

- `lib/holistic-support/client-reasoning-core.mjs` exports `prepareReasoningContext`, `planClientNextStep`, `compareVoluntaryCheckins`.
- `lib/holistic-support/client-reasoning-bridge.mjs` connects the decision policy to the **already existing** `rankOffersByClientAxes` source-scoped ranker; no new scoring formula.
- Default on missing preflight = `safety_check_required`; urgent/human review => **zero offers**.
- Absent explicit/previously confirmed intent => one `clarify` question.
- Without trusted matcher or editorially eligible catalog => unavailable/no_match, **not fabricated content**.
- Existing ranker enforces paid/sensitive/rights/review/audio-language/verified-source gates before sorting. This policy only collapses to a next action, avoids declined offers, delays completed items and emits non-sensitive reason codes.
- `audio` reserved in the contract, but existing axis ranker does not approve `audio` yet. Do not falsely claim audio recommendations work until an owner-approved audio adapter shares the same gates.
- Confirmed T0/T1 check-ins compare identical 0–10 prompts and chronological times, labelled **voluntary_self_report**. No inferred causality/effectiveness, no automatic database write.

Example (synthetic only): user selects *emotions::stress*, Russian audio, up to 10 minutes, no paid or sensitive content; owner-approved matching practice with confirmed audio language and verified duration is recommended **only after** safety preflight and rights review. If none exists, ask whether they want to expand the search; never invent a suitable recording. A recorded client preference for an earlier video does not establish that it clinically worked.

## 5. будущие AI-подсистемы — роли, не отдельные конкурирующие боты

1. **Listener:** parses intent into user-editable structured slots (one clarification when ambiguity affects choice); never turns guess into profile fact.
2. **Evidence Reader:** retrieves only owner-authorized, opted-in, source-verified records; source citations/date/version; missing evidence is explicit.
3. **Hypothesis Builder:** offers a small number of tentative alternatives based on actual observations, without diagnosing; confirmation first.
4. **Planner:** selects focus and next step by existing rankers, constraints and feedback. One primary action, at most two alternatives in compact mobile UI.
5. **Curator:** matches only approved, playable, rights-cleared, language/duration-verified video, audio, meditations, tests and courses; links to real published items.
6. **Safety Guardian:** independently checks input and output; urgent cases bypass all sales/engagement prompts; user controls intensity and can stop.
7. **Explainer:** writes warm EN/RU/ES explanations limited to evidence ledger and selected action IDs; must pass rule-check and factual validation.
8. **Learning Loop:** captures the user's own helpfulness/comfort ratings only with consent, surfaces progress vs same compatible scale, suggests adjustment rather than diagnosing.

**Neural AI is optional.** First implement roles 1,2,4,5,6,8 locally; let 3 and 7 use approved templates. Later, if the owner separately approves budgets and transmission scopes, an LLM may propose a *draft* intent/reflective question/explanation. Its output is structured and validated against canonical source IDs; it cannot modify the catalog, compute questionnaire scores, authorize access, skip safety, persist private content, send messages or accept payment. Unsupported model output => deterministic fallback.

## 6. Product UX (one screen, one choice)

After user asks something: **"Я понял вашу цель так: [editable]" → "На основании вашего выбора и [confirmed source] предлагаю [one action]" → "Почему: [1–2 verified reasons]" → buttons "Начать / Другая практика / Уточнить"**. Other services never dominate the reply just because they are paid. At the end optionally ask "Что оказалось полезным?" and show a saved action only after the client confirms. Choice of time/intensity/audio language/cost remains explicit. EN/RU/ES parity, mobile no tiny type, one key question per screen.

For **personal video therapy**: confirmed request → optional T0 self-rating → assigned existing approved video with user filters → practice → optional T1 → editable observation → offer to continue an existing 8-session pathway. No statements of treatment success. For **sessions**: assistant may propose a relevant practitioner, but availability, request, confirmed booking and payment are separate verified states. For **free Reiki Academy**: agent may suggest the appropriate existing lesson, never automatically grant initiation or certificate.

## 7. Implementation sequence (isolated safe PRs)

- **P0 · Base**: pure policy, bridge, tests, document (this change); no new routes, DB, PII, payments, deployment assertion.
- **P1 · Server read adapter**: authenticated owner+RLS+consent, reuse `/api/app/bootstrap` profile/verified scales, content feed; create a minimal private advisory endpoint or client-only orchestration where server reads are unnecessary. Real two-account negative authorization tests and clean opt-out.
- **P2 · Media adapters**: map published catalog metadata to exact `topic::facet` via human editorial review, add reviewed audio adapter, map test/course/service sources without mixing ranker scores. Verify original-language audio, availability, duration, risk and rights. No paid API.
- **P3 · Client UI**: single compact explanation card on Profile / Meditation Finder / Videotherapy; multilingual and mobile E2E; show `no_match` honestly.
- **P4 · Session loop**: approved 8-session videotherapy path, opt-in baseline T0/T1, optional feedback/recommendation history, client edit/export/delete, practitioner review. Reuse existing course and CRM states, never duplicate.
- **P5 · Optional generative layer**: structured request/response schema, privacy-preserving provider adapter, budget cap, authored fallback, red-teaming and clinical specialist review before pilot. No external model/API without separate owner approval.

## 8. Quality and evaluation gates

Automated fixtures: urgent after a commercial query; profile not authorized; missing consent; edited/disputed scales; stale or incompatible result; no published video; wrong audio language; denied sensitive topic; denied paid offer; unsafe href; duplicate/dismissed content; contradictory user intent; empty catalog; EN/RU/ES; T0/T1 different question; retry/double submit; no data in URL/logs.

Human review: psychology/clinical safety boundary, consent language, authorial method fidelity, rights and video/audio QA. Verify real Google login and second account negative; local tests are not owner-login proof. No production claims until exact Vercel READY/SHA, end-to-end path and user-visible screen are checked.

KPIs separate: eligible recommendations accuracy in *expert-labelled* fixture set; number of unsupported/invented content IDs (**target 0**); source/consent leakage (**target 0**); safety bypass (**target 0**); percentage of cases with a meaningful explanation; user-reported relevance/comfort; "start" vs "complete" vs user-confirmed benefit. No conflation of clicks with clinical outcome or of lead with booking/payment.

## 9. Release status, constraints and known blockers

This source-only PR contributes a tested foundation and adapter; **it does not put an autonomous AI agent into live sessions**. No new schema, external LLM, confidential client extraction, audio approval or public UI. The current `axis-offer-ranker` supports video, courses, services and tests, not audio. The broader generative Coaching Intelligence 2.0 remains an independently gated effort (issue #1774). PR #1531 for urgent home-guide intent ordering was still draft at inspection; a production integration must ensure urgent replies cannot fall through to offers before that safety route is tested.

Prioritize this core as the **single future policy contract** rather than a second psychological scorer or a new parallel CRM. Keep separate release ownership and do not bypass required red/pending CI. Source branch `codex/public-book-library`, not GitHub default `codex/bootstrap-books`.