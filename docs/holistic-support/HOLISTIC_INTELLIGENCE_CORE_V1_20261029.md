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

---

## Оркестратор опубликованных материалов (PR #2532; stacked on PR #2528)

**Канонический decision/safety/feedback policy:** `lib/holistic-support/client-reasoning-core.mjs` из PR #2528; `holistic-intelligence.mjs` из PR #2532 — только слой подбора/агрегации опубликованных ресурсов, не ещё один независимый decision engine. Клиентский результат и хранение истории должны всегда уважать P0 owner scope и purpose-specific consent. До реальной интеграции, CI, E2E и Vercel READY персональные сессии остаются проектом, не опубликованной функцией.

**Дата:** 29 октября 2026. **Статус:** отдельный PR; production и реальное воспроизведение ещё не подтверждены.

## Зачем

Сделать единую объяснимую логику для профиля клиента, результатов тестов, диалогового проводника, персональных видео, аудио, курсов и сессий. Это **оркестратор существующих механизмов**, не новая медицинская модель, новая база данных или платный внешний AI.

~~~mermaid
flowchart TD
  A[Явный запрос: цель, ситуация, желаемое состояние, формат] --> F{Разрешения и ограничения}
  P[My Profile: 4 слоя и 34 оси] --> C{Авторизован владелец и есть согласие?}
  C -- Нет --> E[Только ручные предпочтения]
  C -- Да --> D[Только проверенные и датированные измерения]
  D --> F
  E --> F
  F -- Экстренно / не разрешено --> Z[Не предлагать, направить к человеку]
  F --> G[Holistic Intelligence]
  G --> H1[Опубликованные видеомедитации]
  G --> H2[Реальные услуги и консультации]
  G --> H3[Видео, тесты, курсы по осям профиля]
  G --> H4[Одобренные public Reiki audio]
  G --> H5[Оригинальные звуковые пресеты видеоредактора]
  H1 --> I[Объяснение и первый шаг в выбранном формате]
  H2 --> I
  H3 --> I
  H4 --> I
  H5 --> I
  I --> J[Добровольная обратная связь и следующий шаг]
~~~

### Строгий приоритет логики

1. **Безопасность, доступ и источник:** emergency/stop, только разрешённые опубликованные материалы, клиентские права, фактический язык аудио, длительность и риски. Непроверенная публикация не становится публикацией из-за удачного совпадения темы.
2. **Явная воля клиента:** выбранная тема из Деньги/Энергия/Отношения/Цели/Смыслы, 1–3 оси профиля, ситуация, желаемое состояние, метод, формат, ограничения. Отказ и hard filter всегда имеют приоритет.
3. **Контекст с подтверждением:** оригинальные source-scored результаты конкретного теста с датой, версией, языком и единицами; собственные добровольные цели и самооценки остаются отдельно от тестов. Нельзя из низкого балла вывести нужду в терапии, диагноз или потребность в платной услуге.
4. **Выбор материала:** тематическая релевантность считается только старыми проверенными алгоритмами. Их независимые числа НЕ складываются в общий процент «подходит/поможет».
5. **Результат:** релевантный реально существующий первый шаг и альтернативы. Никаких фиктивных аудиофайлов, несуществующих 8 фильмов, броней, оплат и обещаний эффективности.

## Source-of-truth и границы интеграции

| Источник | Что берём | Что НЕ копируем |
|---|---|---|
| lib/profile/unified-profile.js и portrait-recommendations.js | 4 слоя Foundation/State/Life/Development, проверенные измерения | Нормализация чужих шкал в общий health % |
| lib/profile/profile-scale-selection.js | 34 оси и 10 тем | Новый тестовый scoring engine |
| lib/holistic-support/axis-offer-matcher.mjs | Только опубликованные осевые связи с видео/тестами/курсами/услугами | Неутверждённые каталоги |
| lib/holistic-support/client-intent-model.mjs | Goal/situation/state/technique и реальные опубликованные услуги | Автоматическая запись клиента или фальшивые цены |
| lib/holistic-support/meditation-catalog-ranker.mjs | Видеокаталог с проверками прав и медиа | Private/rejected YouTube candidates |
| app/api/reiki-intro-audio/route.js | Только опубликованные манифестом EN/RU аудиоуроки | Личные и owner-draft записи |
| lib/mandala/audio-recommendations.mjs | 13 оригинальных звуков **для видеомонтажа** | Называть звуки готовыми ведомыми медитациями |
| lib/clients/material-library.js | Закрытые материалы только для их законного recipient | Публичный общий каталог из закрытых сессий |
| lib/holistic-support/guide-dialogue.mjs | Локальная интерпретация вопроса и риск-маркеров | Внешний AI без согласия |
| andylitvinov-design/alchemy-method | Каноническая **методология** Dao/Wu Xing/ресурсной работы | Медицинский вывод без утверждения практика |
| andylitvinov-design/ai-projects-brain | Память проектов и диспетчер агентов | Личные клиентские данные |
| andylitvinov-design/report | Отдельный PsiTherapy portal | Автоматическая склейка баз и аккаунтов |

Вся глубокая методологическая интерпретация (Dao, Wu Xing, психодинамика, Bach/homeopathy) должна быть **опциональной практической гипотезой специалиста**, не автоматизированной доказательной диагностикой. Логика «запрос → ресурсы → следующий осторожный шаг» применяется с согласием; она не означает доказанный медицинский эффект.

## Что сделано в этом PR

- Создан чистый модуль lib/holistic-support/holistic-intelligence.mjs с типами .d.mts. Один вход: locale + intent + consented owner profile + **готовые** разрешённые каталоги. Один выход: status, context, meditations, services, axisOffers, audio, primary. Не содержит сетевых вызовов, записи в Supabase, client ID и исходного текста в ответе.
- Публичный components/holistic-meditation-finder.tsx теперь получает подбор медитаций и опубликованных услуг через общий оркестратор, но продолжает использовать все прежние фильтры и реальный playback.
- Приватный components/app/personal-axis-matches.jsx продолжает ручной выбор оси, но подключён к общему ядру. **Галочка «Учесть результаты моих тестов» исходно выключена.** Входящий тестовый балл используется только после включения и в контексте уже авторизованной страницы.
- Новая категория «Аудио»: редакторские предложения оригинальных звуков ведут в действующий видеоредактор; они честно обозначены как soundtrack, не как готовое MP3. По отдельному нажатию проверяются пять **публичных** слотов Reiki intros по фиксированным lesson и locale, без передачи данных клиента. Реально опубликованная запись воспроизводится через нативный audio controls; отсутствующая показывается как отсутствующая. На ES нет фиктивной озвучки RU/EN.
- Тесты tests/holistic-intelligence.test.mjs защищают consent, safety, rights, языки, free-only, hard opt-outs, формат, собственно реальную публикацию аудио, отсутствие leakage.

## Когда нужна именно личная сессия

**v1 рекомендует существующую услугу**, а не автоматически выбирает клиническую программу. Следующий слой должен:
1. Уточнить выбранный клиентом запрос и предпочтения; проверить безопасность.
2. Показать, что из Foundation/State/Life/Development измерено, когда и чем, а что неизвестно.
3. Предложить последовательность «короткая практика/видео/аудио/тест/добровольная сессия» из источников с правами, с объяснением причин.
4. Перед индивидуальной интерпретацией/назначением попросить явное утверждение практика. Приватные practitioner session notes и media должны передаваться только правильному владельцу через существующий защищённый механизм.
5. По желанию собрать T0 → упражнение → T1 → T2 и субъективную реакцию на практике, отдельно от валидированных опросников и без причинных заявлений.
6. Сохранять только после отдельного согласия, прав владельца, retention/deletion review и RLS-тестов.

Восьмисессионная видеотерапия из docs/videos/PERSONAL_VIDEO_THERAPY_SESSION_ENGINE_V3_20261029.md — **SPEC ONLY**. Нельзя утверждать наличие восьми готовых видео, озвучки, сохранения всех контрольных точек или результатов терапии на live.

## Доработки следующих этапов

**P1:** HolisticSupportInlineGuide, кабинет и Today AI Assistant сделать клиентами этого же ядра; без второго чата/тестового движка. «Почему мне это предложено?» показывает только конкретные совпавшие флаги и источники.

**P2:** расширить единые editorial metadata для **опубликованного** аудио: тип (фон/учебное/ведомое), оригинальный язык, длительность, голос/музыка, интенсивность, права, owner approval. Любой неподтверждённый слот пустой, а не пример.

**P3:** session planner с редактируемым practitioner review, owner-scoped access, opt-in secure session notes, development goals и history. Запрет сторонних provider/API вызовов по умолчанию.

**P4:** LLM только для формулирования текста и диалога при отдельном согласии. Источник истины, безопасность, права, рекомендации и одобрение — у детерминированного ядра. По умолчанию без дополнительных расходов.

**P5:** добровольные hide/не подошло/helpful. Никакой продажи услуг на основании интимных/чувствительных психологических показателей. Метрические критерии: source verified, no-match honesty, filter correctness, private/public isolation, доступность и фактический переход по материалам.

## Проверки и Definition of Done

- [x] Новый единый контракт, типы, программная интеграция в два существующих UI, тестовый набор.
- [ ] Реальное выполнение node --test tests/holistic-intelligence.test.mjs tests/axis-offer-matcher.test.mjs tests/client-request-relevance-v2.test.mjs.
- [ ] TypeScript noEmit, ESLint, Next build, CI exact SHA.
- [ ] Authenticated owner A/B, согласие, private RLS, отсутствие PII в network/pixels.
- [ ] EN/RU/ES, мобильные 320/390/430, WebKit/Chromium, реальный публичный аудиофайл и его воспроизведение.
- [ ] Vercel READY, источник ветки, точный production SHA, live check и только после этого merge.

**Ограничение:** создание PR, чтение кода или успешный HTTP ответ не являются доказательством публикации и настоящего end-to-end клиента.


## P1 реализовано в stacked PR #2532: единый guide decision contract (source-only)

`lib/holistic-support/holistic-guide-adapter.mjs` вызывает `buildHolisticIntelligencePlan` только после **явного safety preflight status=clear**, превращает результаты утверждённых ranker-ов в безопасные кандидаты и передаёт их **каноническому** `planClientNextStep` из PR #2528. Отдельный второй decision engine не создаётся.

- При отсутствии preflight — `safety_check_required`; urgent/human_review — остановка и human handoff.
- Бесплатные предложения по умолчанию. Платные услуги, чувствительные темы, тестовые измерения и сохранённая история имеют **независимые purpose-specific opt-in**.
- Текущие добровольные `dismissedIds` / `completedIds` немедленно влияют на очередь; ранее сохранённая история используется только с отдельным согласием и серверно проверенным owner scope. **Запись истории пока не реализована**.
- Объяснения и ответы RU/EN/ES формируются шаблонами на основе конкретных опубликованных материалов; в переносимом результате отсутствуют raw scores, тексты запроса и ID клиента.
- Текущий API статeless: никаких новых таблиц, платных LLM, автоматического назначения сессии, сохранений или обещаний результата.

**Gate для server route:** `access.authenticated` / `access.ownerScoped` устанавливаются исключительно после реального server-side auth + RLS. Нельзя получать эти флаги, `catalogs` или `history` из тела браузерного запроса как источник доверия. Для внешнего текстового диалога нужен отдельный risk preflight; UI-браузер опубликованных материалов сам по себе не считается такой проверкой.

**Тесты:** `node --test tests/client-reasoning-core.test.mjs tests/client-reasoning-bridge.test.mjs tests/holistic-intelligence.test.mjs tests/holistic-guide-adapter.test.mjs`. Реальный owner A/B, mobile, CI и Vercel ещё не подтверждены.


### P1 Client UX · приватный подбор по осям

В `PersonalAxisMatches` добавлены добровольные действия **«Уже попробовал(а)»** и **«Не подходит»** с временной перестановкой/исключением карточек, а также восстановление скрытых предложений. Это **только локальное состояние страницы**, без записи отзывов в CRM, profile storage или analytics. Сведения о выполнении не являются доказательством эффективности.

Показ платных сессий теперь выключен по умолчанию и включается отдельно. Процент ranker-соответствия убран из интерфейса, чтобы не воспринимался как вероятность пользы. Если `showMeasurements=false`, повторное отображение test evidence в карточке оси отключено. В UI есть RU/EN/ES и touch targets минимум 44px. Реальный browser owner A/B и mobile E2E ещё необходимы.


### Контракт типов и malformed-input hardening

Добавлен `holistic-guide-adapter.d.mts`; входы со значением null или массив вместо объекта не вызывают исключение и не обходят fail-closed preflight. Подписи типов не заменяют server-side auth/RLS. Параллельно на ветке появился `psychologist-mind.mjs`, который следует рассматривать как отдельный self-guided program planner, не как замещение канонического `planClientNextStep`. Его публикация/объединение требует самостоятельных тестов и согласования safety gate.


## Psychologist Mind v1 — source-only update, 29 октября 2026

Отдельный алгоритм `lib/holistic-support/psychologist-mind.mjs` и контракт в `psychologist-mind.d.mts` доступны через экспорт общего `holistic-intelligence.mjs`: `consultPsychologistMind({task:'program'|'dialogue', ...})`. План строится из 8 последовательных психологически поддерживающих шагов; диалоговый ход использует те же focus, методы и порядок сессий. Для специалиста есть отдельные `clinicianDiscussionIds` (KIP/психодинамика), которые НЕ выполняются AI. Trauma-specific options только для рассмотрения специалистом и не назначаются автономно. Входной triage обязателен, raw-данные не сохраняются. Полное ТЗ, протоколы согласия, виды проверок и ограничения: `docs/holistic-support/PSYCHOLOGIST_MIND_V1_20261029.md`.

**Разница с предыдущим статусом SPEC ONLY:** исходный алгоритм восьмисессионного плана теперь существует, но опубликованный видеокурс/видеотерапия, реальные сессии, авторизованное сохранение и live-принятие пользователем по-прежнему НЕ реализованы данным PR. Это не доказательство клинической эффективности. Тесты: `tests/psychologist-mind.test.mjs`.
