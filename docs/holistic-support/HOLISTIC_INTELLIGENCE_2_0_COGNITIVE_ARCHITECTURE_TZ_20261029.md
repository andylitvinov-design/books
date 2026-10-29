# HOLISTIC INTELLIGENCE 2.0 — когнитивная архитектура, техническое задание и план внедрения
**Дата:** 29 октября 2026 · **Статус:** проект архитектуры / implementation-ready specification, НЕ внедрено на live  
**Проект:** Holistic House · **Репозиторий:** https://github.com/andylitvinov-design/books  
**Основной эпик:** https://github.com/andylitvinov-design/books/issues/2530  
**Существующий Draft PR с минимальным ядром:** https://github.com/andylitvinov-design/books/pull/2528  
**Старая спецификация ядра v1:** [HOLISTIC_INTELLIGENCE_CORE_V1_20261029.md](./HOLISTIC_INTELLIGENCE_CORE_V1_20261029.md)  
**Сохранение:** новая спецификация является надстройкой над v1, а не второй независимой системой.

> Решение: **BDI-модель намерений + Soar-подобный цикл выбора действий + нейросимвольный policy engine + проверенная предметная онтология/точный поиск + RAG по одобренным источникам при необходимости + ограниченный диалоговый LLM позднее**. Сначала работающий детерминированный агент без платных API; затем опциональная генерация с доказанным улучшением качества, договором обработки данных и лимитом бюджета.

## 1. Продуктовый результат

Единый клиентский агент узнаёт **текущую добровольно выраженную цель**, учитывает **только авторизованные и доказуемые** сведения из профиля и предлагает **один разумный следующий шаг** (уточнение, проверенный материал, упражнение, курс, тест, предложение обратиться к специалисту). Он объясняет основания, спрашивает согласие на действия, допускает исправления, а при добровольной обратной связи уточняет следующие предложения.

**Интеллект в нашем случае** — не имитация сознания и не выдача психологических диагнозов. Это способности:
1. удерживать цель и контекст между разрешёнными шагами;
2. выбирать релевантный инструмент по признакам, ограничениям и доказательствам;
3. отличать достоверный факт от неопределённости и гипотезы;
4. замечать противоречия без приписывания клиенту скрытых мотивов;
5. корректировать план по явно полученному отзыву;
6. объяснять решение и безопасно останавливаться при недостатке данных.

**Строгие границы:** не заменять терапевта и экстренную помощь; не диагностировать; не назначать лекарства, гомеопатию, энергетическое «лечение»; не утверждать причинный эффект медитации по T0/T1; не делать выводы о травме, стыде, сексуальности, мотивах или рисках из косвенных данных. Символические традиции (архетипы, Reiki, Wu Xing, ритуалы) — только добровольные культурно-рефлексивные подходы с обозначением их статуса, а не клинически валидированные методы.

## 2. Проверенная база и технологический долг

База — **фактическая рабочая ветка codex/public-book-library**; GitHub default codex/bootstrap-books НЕ считается production. Перед слиянием перепроверять Vercel alias, SHA и READY.

| Уже имеется в проекте | Источник | Новый вклад |
| --- | --- | --- |
| 4 слоя единого профиля | lib/profile/unified-profile.js | Контекст с provenance и сроками актуальности |
| 4 жизненные сферы + интерфейсные направления/темы | lib/holistic-support/axis-offer-ranker.mjs; lib/profile/profile-scale-selection.js | Одно сопоставление терминов вместо конкурирующих классификаторов |
| 17 лучей портрета, 34 исследовательских facets и 3 добровольные оценки Goal Profile | lib/assessments/psych-portrait.js; lib/profile/goal-profile.js | Не смешивать разные шкалы в общий индекс |
| Настоящие test result IDs, источники, версии и истории | lib/assessments/verified-history.js; interpretation-registry.js | Фильтр происхождения и сопоставимости |
| Детерминированный ranker video/course/service/test | lib/holistic-support/axis-offer-ranker.mjs | Использовать, НЕ писать второй рейтинг |
| Детальные фильтры медитаций и редакторские проверки | lib/holistic-support/meditation-catalog-ranker.mjs | Адаптер к общему контексту |
| Адаптивный локальный коучинг без LLM | lib/personal-coaching/offline-intelligence.js; guided-session.js | Использовать версионированные этапы и вопросы |
| Приватные сессии, история и прогресс | lib/app/personal-coaching.js; lib/app/my-progress.mjs; lib/app/learning-journey-repository.js | Память только с согласия; не выдавать отметку за эффект |
| Начальное ядро и bridge | lib/holistic-support/client-reasoning-core.mjs; client-reasoning-bridge.mjs | Расширить контракт, не нарушая исходный fallback |
| Авторизация и работа с данными | app/api/app/[...path]/route.js; lib/app/session.js; lib/app/repository.js | Только серверные owner/RLS, не доверять auth-флагам тела запроса |
| CRM согласие | lib/crm/consent.js | Это политика маркетинговых каналов; **не переиспользовать её** как согласие на психологическую персонализацию |

**Нерешённые узкие места:** v1 PR — draft, не live; локальный тест bridge использовал stub, а не полный реальный ranker; нет подтверждённого общего API, личной памяти/feedback state и согласованного контентного графа; аудио не разрешено существующим ranker как вид материала; качество защищённого iPhone Google-login E2E не подтверждено. Проверять текущие PR/DB перед каждым изменением.

## 3. Какие научные и инженерные модели взять

| Подход | Механизм | Что используем | Что откладываем |
| --- | --- | --- | --- |
| **Soar (когнитивная архитектура)** | Состояние, предложение операторов, выбор, применение, impasse | Явный цикл выбора следующего действия и ветка уточнения при неопределённости | Полное копирование Soar runtime |
| **BDI (Belief/Desire/Intention)** | Представление сведений, целей, взятых на себя намерений | Три раздельных объекта Evidence / Confirmed Goal / Active Plan | Психологические «желания», выведенные без согласия |
| **ACT-R** | Рабочая, декларативная, процедурная память и выбор правил | Разделение типов памяти и приоритет недавнего контекста | Нейрокогнитивную симуляцию человека |
| **Нейросимвольный подход** | Правила + вероятностное понимание языка | Правила безопасности/доступа/скоринга остаются кодом; LLM предлагает только структурированную гипотезу | Решения о диагнозе и оплате от LLM |
| **RAG** | Генерация с опорой на найденные источники | Разрешённые авторские методические материалы/FAQ и citations | Векторизацию приватного сырого клиентского дневника |
| **Knowledge Graph / GraphRAG** | Узлы и связи методик, целей, контента, ограничений | Небольшой редакторский граф в существующем Postgres/JSON | Дорогой автоматический GraphRAG-index без необходимости |
| **ReAct** | Чередование выбора инструмента, действия и проверки результата | Ограниченный tool-use: прочесть авторизованный профиль/каталог и сверить результаты | Свободный агент, управляющий CRM, оплатами, публикациями |
| **Case-based Reasoning (4R)** | Retrieve → Reuse → Revise → Retain | Сопоставление **собственной** прошлой практики клиента и добровольного отзыва | Перенос чужих индивидуальных клинических кейсов |
| **Контекстные bandits/RL** | Оптимизация выбора по обратной связи | Позже: только офлайн анализ ранжирования безопасного контента при достаточной выборке | Онлайн-эксперименты над уязвимыми людьми и «лечение по награде» |
| **Multi-agent orchestrator** | Специализированные роли, общий управляющий процесс | Логически разделённые модули в одном сервисе | Много LLM агентов, спорящих между собой и тратящих токены |

**Вывод:** не строить AGI и не обучать собственную большую языковую модель с нуля. Для имеющегося продукта быстрее, прозрачнее и экономнее один **hybrid cognitive engine** с жёсткими правилами и проверенными данными. Граф нужен как управляемая модель знаний, а не отдельная тяжёлая инфраструктура; начальный RAG — точный реестр + полнотекстовый поиск, embeddings только если офлайн-оценка покажет прирост качества. LangGraph рассматривается как будущий интерфейс workflow/checkpoint, но не как необходимая зависимость.

## 4. Когнитивная модель Holistic Mind

### 4.1 BDI: три разные сущности

- **Beliefs / рабочие сведения:** только user_stated, user_confirmed, verified_test, source_reviewer_approved и явно маркированные hypotheses. Каждое утверждение имеет источник, временные рамки, область допустимого использования и статус. «Belief» — **состояние данных агента**, а не убеждение или диагноз человека.
- **Desires / желаемые изменения:** *только* то, что клиент сформулировал или подтвердил: «хочу меньше напряжения», «хочу выбрать рабочий путь», «хочу 8-минутный ролик».
- **Intentions / планы:** одно выбранное клиентом действие с ограниченным этапом, временем, правом отмены, статусом выполнения и необязательным критерием полезности. Предложенный AI план НЕ становится принятой целью автоматически.

### 4.2 Soar-подобный цикл (каждый запрос)

~~~text
INPUT: явный запрос клиента и текущие настройки
  → AUTH: scope/auth/RLS и независимые purpose consents
  → SAFETY: preflight (при неизвестном статусе — остановка)
  → PERCEIVE: нормализованный intent, явно сказанное, без домыслов
  → REMEMBER: owner-scoped verified context + approved knowledge
  → ASSESS: оценка пробелов, конфликтов, давности и ограничений
  → PROPOSE: candidate operators {clarify, recommend, continue, reflect, human_handoff}
  → FILTER: безопасность, права контента, язык, чувствительность, бюджет, доступность
  → DECIDE: существующий ranker + выбранные цели, 1 основное действие
  → EXPLAIN: только проверенные причины + ограничения
  → CONFIRM: не совершать внешних/долговременных действий без подтверждения
  → OBSERVE: добровольный отзыв, T0/T1 лишь для идентичных prompts
  → LEARN: запись разрешённых изменений и версия policy; повторить при новом запросе
~~~

**Приоритеты при конфликте:** безопасность и права доступа > текущая явно выбранная цель/отказ > ранее подтверждённый план > проверенная совместимая актуальная шкала > редакторские метаданные контента > непроверенная гипотеза. При конфликте двух валидных источников или внезапной смене цели — не «усреднять», а уточнить ровно одну значимую вещь.

### 4.3 Ограниченные режимы мышления

1. **Orientation:** один вопрос об актуальной цели, если она неизвестна.
2. **Stabilization:** выбор спокойной добровольной практики низкой интенсивности, если клиент её хочет; не интерпретировать это как лечение.
3. **Exploration:** безопасное самонаблюдение, guided imagery или авторские вопросы, без навязанных воспоминаний и «диагнозов».
4. **Action:** микро-шаг и проверка, что план принадлежит клиенту.
5. **Review:** необязательный отзыв; сравнение одинаковых субъективных наблюдений; уточнение плана.
6. **Human support:** предложение связаться со специалистом при недостаточности автономной системы; кризисный сигнал подавляет всякие коммерческие предложения.

«Режим» задаётся явным выбором пользователя, допустимостью контента и ограниченными правилами. Не вычислять тайные психические состояния.

## 5. Архитектура и модули (один сервис, а не независимые боты)

~~~text
Client UI: My Profile | My Tests | Meditation | Video Therapy | Courses | Sessions
                       |
              Request & consent boundary
                       |
              Auth / Owner scope / RLS
                       |
          Mandatory Safety Guardian (input)
                       |
            Intent Interpreter (structured)
                       |
            Evidence Resolver (provenance)
                       |
     ┌───────────────┴─────────────────┐
     │ Verified client context          │ Approved domain knowledge
     │ existing account/test/course DB  │ curated content + method registry
     └───────────────┬─────────────────┘
                     |
              BDI State + Planner
                     |
       Eligibility and deterministic matchers
                     |
        Response Validator / Safety output gate
                     |
       Explain + show one option + ask permission
                     |
   Optional feedback → verified owner-scoped persistence
                     |
       Offline evaluation and versioned improvements
~~~

**Разделение ответственности:**
- **Gateway:** проверяет сессию и owner scope; не принимает client-supplied trusted/auth/consent flags.
- **Safety Guardian:** отдельно действует ДО анализа и ПОСЛЕ генерации; fail-closed; если риск, не показывает офферы.
- **Intent Interpreter:** формирует slots: goal, situation, desiredState, duration, language, intensity, avoid, format. В MVP на основе существующих локальных filters и approved правил.
- **Evidence Resolver:** извлекает только source-verified измерения; добавляет version, sourceId, measuredAt, rights, consent, freshness, measurement type.
- **Memory Manager:** рабочий контекст/подтверждённые предпочтения/история, сроки удаления, проверки противоречий.
- **Method Planner:** выбирает не «лечение», а допустимый маршрут: clarify / practice / test / coaching / specialist offer / pause.
- **Knowledge Resolver:** источники, редакторская связь методика→facet→контент, права и ограничения, проверки языка/длительности.
- **Ranker Adapter:** делегирует действующим rankOffersByClientAxes, rankMeditationCatalog, rankAssessmentDefinitions, проверкам курсов; не сопоставляет произвольные числовые баллы разных scorers.
- **Explainer:** 1–2 проверенные причины, источник или причина отсутствия результата. Никаких сырых баллов в публичном payload.
- **Learning & Quality:** раздельно считает user feedback, starts/completions, экспертное качество и safety failures; по умолчанию локально.

## 6. Семантика данных: что агент может «знать»

Не смешивать следующее:
- **4 канонических life areas** — business, relationships, energy_health, personal_growth. Пятый «Goal» в UI — добровольный отдельный профиль цели, не новая клиническая область.
- **4 слоя единого профиля** — foundation, state, life, development.
- **17 portrait rays**, **34 research facets** и **3 оценки конкретной цели** — разные модели и источники; отсутствующее не достраивать.
- **Validated instrument score** ≠ HH monitoring ≠ user 0–10 check-in ≠ symbolic method ≠ текстовый запрос.
- **Клиент отказался** ≠ «низкая мотивация»; **клиент прошёл видео** ≠ «вылечился»; **клиент кликнул** ≠ «помогло».

### 6.1 Протокол утверждения (Evidence Ledger)

~~~ts
type EvidenceKind =
  | "user_stated" | "user_confirmed"
  | "source_verified_measurement" | "editorial_approved"
  | "voluntary_self_report" | "hypothesis";

type EvidenceRef = {
  id: string; kind: EvidenceKind; scope: "session" | "client" | "catalog";
  subjectRef: string; sourceKey: string; sourceVersion: string;
  observedAt: string; expiresAt?: string | null;
  assertion: "reported" | "confirmed" | "measured" | "editorial" | "tentative";
  isSensitive: boolean; consentPurpose?: string;
};
// Raw scores, notes and free text stay в авторизованных source records;
// response получает только проверенные reason codes.
~~~

Фактическая оценка согласуется **по exact definitionKey + dimensionKey + version + instrumentLocale + resultId**. Если разные редакции/языки не валидированы для сопоставления — динамику не показывать. Психологические сигналы не считаются диагнозами. Все AI-сгенерированные гипотезы являются ephemeral drafts до прямого подтверждения; подтверждение не делает гипотезу клиническим фактом.

### 6.2 Пять видов памяти

| Вид | Содержимое | Хранение | Право на запись |
| --- | --- | --- | --- |
| Working memory | Текущая задача, фильтры, вопрос, контекст ответа | Временная сессия; guest без долговременной записи | Автоматически только на время сессии |
| Episodic memory | Собственные пройденные задания, явно подтверждённые попытки, отзыв | Существующие owner-scoped course/session данные; новый store только после gap audit | Явное сохранение |
| Personal semantic memory | Подтверждённые цели, предпочтения и ограничения | Существующий приватный профиль, revisions | Отдельное согласие, изменение/отзыв |
| Domain semantic memory | Версии методик, правила, каталоги, права, редакторские связи | Git/approved database | Только проверенный редактор |
| Procedural memory | Safety gates, маршруты, ранжирование, validators, feature flags | Version-controlled code | Только проверенный PR/CI |

**Нельзя:** обменивать личную память между клиентами, копировать приватные ответы в векторную базу «для обучения», отправлять свободный текст в аналитику или внешние инструменты, превращать рекомендации в маркетинговые лиды без отдельного согласия.

## 7. Граф знаний: базовая онтология

Начинать с управляемого **relational knowledge graph** (Postgres/JSON/таблицы связей), не устанавливать Neo4j/GraphRAG в MVP.

**Узлы:** LifeArea, Topic, ResearchFacet, InstrumentDimension, UserChosenGoal, InterventionMethod, ContentAsset, ProgramStep, Contraindication/ContentRisk, SourceReference, PractitionerOffer, ConsentPurpose.

**Разрешённые отношения:**
- instrument_dimension **measures** facet (точная версия, направление, rights status);
- authored_method **supports_reflection_on** facet (описательная релевантность, не доказанная эффективность);
- content_asset **targets** facet (relieve/develop/reinforce/explore — editorial intent);
- content_asset **has_constraint** language, duration, intensity, rights, status;
- program_step **precedes** program_step (утверждённая структура курса);
- user_confirmed_goal **prioritizes** facet (только подтверждённое намерение);
- safety_rule **excludes** content_asset/interaction in defined context.

**Обязательные поля для связи:** relationId, sourceId, editorId/approvedAt (для контента), sourceVersion, locale, status, reviewUntil, justification; inactive/revoked edges не используются. Никаких автоматически выдуманных causal edges «проблема → диагноз → средство».

**Retrieval V1:** exact facets + verified structured filters + SQL full text по одобренной библиотеке; **RAG V2** — извлечение выдержек из approved методической библиотеки с явной ссылкой и версией; optional hybrid embeddings только по очищенным публичным методическим текстам после оценки пользы. Отправка приватных запросов внешним embedding API без отдельного разрешения запрещена.

## 8. Контракт API V2 и state machine

**Предлагаемый маршрут** (НЕ создан сейчас): private POST /api/app/intelligence/plan; ориентироваться на текущий catch-all app/api/app/[...path]/route.js, до реализации сверить маршрутизацию, auth middleware и session actor. Отдельная приватная команда POST /api/app/intelligence/feedback после аудита существующего хранилища.

**Клиент передаёт только:**
~~~ts
type ReasoningRequestV2 = {
  requestId: string; // UUID for retry/idempotency, not client account ID
  surface: "cabinet" | "meditation" | "video_therapy" | "academy" | "coaching";
  sessionVersion?: number;
  intent: {
    language: "en" | "ru" | "es";
    lifeAreas?: string[]; selectedTopics?: string[]; selectedFacets?: string[];
    goalText?: string; desiredStates?: string[]; situations?: string[];
    formats?: Array<"video" | "audio" | "course" | "test" | "service">;
    maxDurationMinutes?: number; intensity?: "gentle" | "standard";
    avoidSafetyFlags?: string[];
  };
  clientAction: "request_suggestion" | "change_goal" | "decline" | "continue";
};
~~~

**Сервер самостоятельно устанавливает:** actor/user ID, owner scope, authorized profile projection, per-purpose consent record+version, safety.status, knownFacetRefs, catalogs/rights, feature flags. Никогда не читает auth/ownerScoped/safety/paidGranted из JSON клиента.

**Ответ (санитизированный, без исходных приватных результатов):**
~~~ts
type DecisionResponseV2 = {
  decisionId: string;
  policyVersion: string;
  state: "clarify" | "recommend" | "no_match" | "safety_handoff" | "unavailable";
  nextQuestion?: {key: string; text: string}; // at most ONE
  primary?: {contentId: string; kind: string; title: string;
    safeHref: string; reasons: string[]; needsUserApproval: true};
  alternatives: Array<{contentId: string; kind: string; title: string; safeHref: string}>;
  explanation: string; // only source-backed editorial copy
  limitations: string[];
  canSaveFeedback: boolean;
  expiresAt: string;
};
// NEVER return raw test answers, scores, session notes, access tokens,
// private source IDs, medical labels, arbitrary model tool commands.
~~~

**State transitions:**
- INIT → AUTHORIZED → SAFETY_CLEAR → CONTEXT_READY;
- CONTEXT_READY → CLARIFY | SELECT | NO_MATCH;
- SELECT → RECOMMEND_SHOWN → USER_STARTED | USER_DECLINED | USER_SKIPPED;
- USER_STARTED → OPTIONAL_FEEDBACK → (EXPLICIT_SAVE | DISCARD) → DONE;
- любой этап → SAFE_STOP на экстренный или отсутствующий safety gate;
- старые решения инвалидируются при изменении consent, source version, editorial status, user goal, actor scope.

**Concurrency:** version pin, optimistic revision, requestId idempotency, strict body caps, rate limits, same-origin/CSRF checks для state changes, replay guard, duplicate-save tests. GET с чувствительными параметрами не использовать. Private cache: no-store.

## 9. Алгоритм выбора: hard gates до любых «умных» весов

~~~text
function decide(request, trustedContext):
  requireAuthOwnerScope()
  requireFreshConsentForEachPurpose()
  safety = evaluateSafetyIndependently(request, trustedContext)
  if safety != clear: return SAFE_STOP  // zero offers
  intent = normalizeAndValidateExplicitInputs(request.intent)
  evidence = retrieveOnlyAllowedVerifiedEvidence(trustedContext, intent)
  if not intent.hasConfirmedGoal: return CLARIFY_ONE_QUESTION
  if evidence.conflictsWithExplicitGoal: prioritizeClientGoalOrAskOneQuestion
  planMode = choosePermittedMode(intent, currentStage, evidence)
  candidates = queryRealApprovedSources(planMode, intent)
  eligible = hardFilter(candidates, editorialRightsAudioLanguageDurationRiskPaidSensitiveConsent)
  if eligible.empty: return NO_MATCH_NOT_FABRICATION
  ranked = existingVersionedRankers(eligible, intent, evidence)
  chosen = selectOnePrimaryPlusAtMostTwoAlternatives(ranked)
  explanation = sourceBackedReasons(chosen, intent, evidence)
  response = sanitizeAndSafetyValidate(chosen, explanation)
  return response
~~~

Начальная шкала **45 explicit + 25 measured + 15 self-gap + 10 format + 5 free** уже находится в axis-offer-ranker. Она **сортирует тематическую релевантность, не прогнозирует эффект**. Не вводить сверху второй «психотерапевтический индекс». Разные ранжировщики используют разные типы баллов — нельзя напрямую складывать/сравнивать score из видео, теста и коучинга. Сначала маршрут определяет **вид следующего действия** на основании цели/этапа/пробелов/предпочтений, затем ранжирование происходит внутри соответствующего каталога; межвидовая политика — явно отредактированная таблица правил, а не математическое усреднение.

**Текущая цель пользователя всегда перевешивает сохранённую цель,** за исключением запретов безопасности и прав доступа. Нет подходящего контента → честное no_match. Если пользователь предпочитает бесплатное, дорогой оффер не показывать вместо доступной бесплатной альтернативы. Негативная оценка/отказ при повторе учитывается сильнее популярности. Личные сессии никогда не становятся «следующим шагом по умолчанию», если это навязывание продажи.

## 10. Consent и security: отдельные цели обработки

Согласия не являются общим checkbox. Предусмотреть независимые, отзывные, версионированные purpose:
- personalization_profile;
- personalization_assessment;
- sensitive_relationships_intimacy;
- persist_feedback_and_preferences;
- share_with_practitioner;
- optional_external_model_processing;
- paid_offer_discovery;
- reminders_or_messages (отдельно по каналу).

Existing CRM consent = **product_updates**, поэтому его нельзя считать разрешением на доступ AI к тестам. Anonymous работает с session-local фильтрами. Authenticated доступ получает только свой subset, проверяемый сервером и RLS. Специалист не видит приватный AI-план без подтверждённого handoff. Отзыв согласия инвалидирует будущий доступ, сохранённые персональные записи удаляются в соответствии с запросом и применимой политикой удержания, а не бесконечно копируются.

Защита: prompt injection из YouTube title, owner content, RAG passage, email, чужого диалога; source boundary и allowlist IDs; SSRF/URLs; XSS; cross-tenant IDOR; memory poisoning; ролевая эскалация; data minimization; no raw prompts/notes in telemetry. Нужен human-reviewed crisis playbook для EN/RU/ES и доступных регионов: сервис не проводит мониторинг экстренных сигналов в реальном времени.

**Privacy & medical boundary:** техническая документация не устанавливает юридического соответствия PIPEDA/PHIPA/GDPR; до обработки регулируемых health records необходима отдельная правовая оценка юрисдикции, роли провайдера, residency, retention и пользовательских уведомлений.

## 11. Обучение и развитие агента — безопасный learning loop

**P0, без обучения модели:** не хранить автоматически приватный контент; запоминать только явно сохранённые предпочтения/отзывы и использовать их для исключения отклонённых предложений, порядка просмотра и продолжения выбранного курса. Модель не обновляется из одной субъективной оценки.

**P1, офлайн улучшения:** на синтетических и разрешённых обезличенных кейсах сравнивать v1/v2 алгоритм; править веса/онтологию/правила только через source review и тесты. Клиентская «помогло» = субъективная оценка, а не диагноз, конверсия или клинический исход.

**P2, опциональный персональный адаптер:** хранить только явно разрешённые tastes/constraints: preferred duration, language, technique, feedback dismissals, course progress, when user confirmed a practical goal. Любое чувствительное summary требует отдельного подтверждения; все выводы редактируемы, экспортируемы и удаляемы.

**P3, исследовательское обучение:** ограниченный contextual bandit только на изначально безопасных, редакторски эквивалентных публичных материалах, при достаточной экспертизе/согласии, офлайн-оценке и невозможности ухудшить safety. Никаких RL-экспериментов по психологическим интервенциям и решений о «сильном воздействии» ради engagement.

Использовать review-loop: **Trace (без PII) → Expert annotation → Golden cases → Regression run → PR → Canary → Review/rollback**.

## 12. Опциональная LLM — только после работающего базового ядра

Три разрешённые задачи модели:
1. извлечь *черновик* структуры запроса из пользовательского текста, который клиент может исправить;
2. предложить один бережный вопрос по заранее разрешённым тематическим рамкам;
3. изложить короткое объяснение, используя исключительно список безопасных reason codes и разрешённый контекст.

Не разрешено модели: читать всю CRM, ставить диагноз, вычислять скрытые потребности, назначать терапию, устанавливать цены, создавать визиты, генерировать доказательства/ID контента, писать обратно в профиль, обходить safety, считать user rating клиническим улучшением. Проверка схемы и допустимых IDs после генерации ОБЯЗАТЕЛЬНА; при timeout/JSON error/unsafe output — deterministic fallback.

**Provider adapter:** off by default, kill switch, prompt+schema version, strict timeout, token/cost budget, allowlisted fields and approved vendor, data-processing consent, processor agreement and retention review. Локальная открытая модель (например, через локальный inference server) может быть экспериментом разработчика, но не бесплатным Vercel serverless ресурсом по умолчанию и не даёт автоматически лучшего качества. Оплачиваемые API/credits не активировать без отдельного разрешения владельца.

**Почему не LangGraph/GraphRAG сейчас:** графы агентов полезны для stateful branching, а GraphRAG indexing может быть затратным. Пока контрольный автомат + существующая БД + локальные pure helpers проще проверить. Библиотеки сравнить по реальной экономии кода после MVP.

## 13. Пошаговый UX: одна карточка вместо большого чата

~~~text
┌────────────────────────────────────────────┐
│ ВАША ЦЕЛЬ                        [Изменить] │
│ «Хочу лучше справляться с волнением»        │
│                                            │
│ ПРЕДЛАГАЮ НАЧАТЬ С                         │
│ 8-минутная практика [проверенный источник]  │
│                                            │
│ Почему: вы выбрали спокойный формат,       │
│ русский язык и максимум 10 минут.           │
│                                            │
│ [Начать]  [Другие варианты] [Не подходит]  │
│                                            │
│ Необязательно: [Как вы себя чувствуете?]   │
└────────────────────────────────────────────┘
~~~

На видеотерапии: подтвердить цель → опциональный T0 → выбрать доступное видео по фильтрам → добровольная практика → опциональный T1 с той же шкалой → клиентская оценка полезности → следующий разрешённый шаг существующего восьмисессионного курса. Не делать «эффективность +27%» из 0–10 самоотчёта. Для Reiki показывать только действующие опубликованные уроки и пользовательские опции; никакой автоматической выдачи сертификата или инициации. В кабинете практика handoff только по отдельному выбору клиента.

**Accessibility:** одна задача на экран, крупные кнопки, EN/RU/ES, 320/375/390/430 mobile, keyboard/focus, reduced motion, opt-in audio/TTS, no autoplay, explicit «пропустить», источник и ограничение всегда доступны.

## 14. Схема хранения: сначала reuse, затем migration при необходимости

Сначала **gap audit** существующих:
- app.assessment_results, личные тесты, verified-history;
- existing development goals и personal-coaching encrypted state;
- app_private.academy_course_progress, course state, video-progress;
- approved video/audio source inventories, practitioner materials.

**Если отсутствуют безопасные поля/сущности**, предложить одну owner-scoped таблицу с RLS вместо параллельной психометрической БД:

~~~sql
-- DESIGN PROPOSAL ONLY: migration НЕ выполнена
create table app.ai_recommendation_feedback (
  id uuid primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  recommendation_id text not null,
  policy_version text not null,
  content_kind text not null,
  content_id text not null,
  decision text not null check (decision in ('started','dismissed','completed','useful','not_useful')),
  consent_event_id uuid not null,
  created_at timestamptz not null default now(),
  unique (account_id, recommendation_id, decision)
);
-- SECURITY: RLS enabled, owner-only policies via existing trusted auth pattern.
-- Do not enable grants/policies until reviewed for the exact current schema.
~~~

Не записывать raw prompts, травматические истории, результат теста или health notes в эту таблицу. Проверить, что существующий source of truth не хранит аналогичный факт прежде чем создавать migration. Сохранять user event только после явного Save, retention/version policy и deletion E2E; отделять «начал» от «прошёл», «досмотрел» от user-confirmed mastery.

## 15. Оценка качества: эталонные сценарии и количественные критерии

Собрать **минимум 120 синтетических EN/RU/ES сценариев** (проектный целевой объём, не утверждение о готовых тестах): обычные запросы; неопределённая цель; неверная версия теста; конфликт двух источников; просроченные результаты; нет контента; неверный язык/длительность; неутверждённое видео; отклонённый paid/sensitive материал; несуществующий URL; попытка чтения чужого аккаунта; отказ от запоминания; T0/T1 по разным шкалам; смена цели; prompt injection в заголовке; кризисный ответ после бизнес-запроса; неверный LLM JSON; выключенный AI провайдер; удаление памяти. Отдельно реальные 2-account E2E с разрешёнными тестовыми аккаунтами.

**Go/No-Go метрики (предлагаемые):**
- 0 unauthorized source IDs, raw assessment leaks, cross-user reads, unreviewed content, crisis→sales bypass в обязательном synthetic regression suite;
- не менее 95% правильного выбора статуса (clarify/recommend/no_match/handoff) на expert-labelled holdout — целевой порог, НЕ измеренный факт;
- не менее 90% экспертного согласия по релевантности top-1 при наличии approved eligible match — порог пилота;
- 100% решений показывают reason codes и source eligibility; отсутствие источника отображается честно;
- 100% внешних долгосрочных действий требуют пользователя/права/согласие;
- русские/английские/испанские safety, cancel/skip/decline и мобильный сценарий проходят E2E;
- latency и cost сравниваются с базовой версией без ухудшения release SLO; метрики фактические, не выдуманные.

Отдельно отслеживать: результаты теста, клик, старт, завершение, субъективную полезность, решение клиента обратиться к специалисту, подтверждённую запись — это **разные события**. LLM-judge может помогать при сравнении текстов, но человеческая экспертная оценка обязательна для психологических рекомендаций. Не оптимизировать исключительно CTR, выручку или время на сайте.

## 16. План внедрения — независимые PR без конкурентных коммитов

| PR/этап | Работа | Зависимость | Definition of Done |
| --- | --- | --- | --- |
| **P0 — Foundation** | Проверить и завершить уже открытый #2528; actual ranker integration, тесты, lint, CI | Никакой второй core | Детерминированный contract + safety tests; safe merge в актуальную ветку |
| **P1 — Trust & evidence** | Auth/RLS + per-purpose consent adapter, exact verified source refs, freshness/compatibility | P0 | Блокировка чужих данных; valid/no-opt-in/stale cases |
| **P2 — Knowledge registry** | Редакторский реестр facets, method nodes, content targets, human approval gates | P1 | Ни одна авторазметка не опубликована без review |
| **P3 — Unified catalog routes** | Адаптер video/test/course/service + отдельный утверждённый audio; без смешивания scores | P2 | Реальные ID, locales, duration, safety, zero fake offers |
| **P4 — Client decision card** | Один компактный блок в кабинете и Meditation Finder; later Video Therapy | P3 | EN/RU/ES, mobile E2E, accessibility, source reasons |
| **P5 — Consented feedback/memory** | Revisioned opted-in preferences, no-repeat, voluntary T0/T1, export/delete | P4 + gap audit DB | Сохранение/отзыв/удаление, replay, two-account isolation |
| **P6 — Session intelligence** | Оркестратор существующих 8 видеосессий, authored coaching handoff, optional practitioner share | P5 | Разрешённые этапы, один вопрос, stop/skip/resume, user-approved plan |
| **P7 — Optional neural dialogue** | Off-by-default provider, strict schema, eval/risk/budget gates | Стабильный P0–P6 + отдельное approval | Зафиксирован прирост качества; без PII leakage и платных неожиданностей |

**Порядок внедрения:** сначала авторизация, доказуемость и редакторские источники; затем публикация UI; затем память; и только после этого генеративный диалог. Не объединять в один гигантский PR. Каждая задача имеет отдельные контракты, отрицательные тесты и свой rollback. Избегать merge/commit в #2528 одновременно с работающим PR Sweep без handoff.

## 17. Список исполнимых задач для разработчика

- [ ] Проверить HEAD/current base и CI #2528; запустить тесты против **реального** axis-offer-ranker (не stub).
- [ ] Инвентаризовать scope/consent и полный источник профиля: guest vs signed-in, actor, private records.
- [ ] Написать строгий RequestV2/ResponseV2 validator (например Zod если уже установлен, иначе штатный), лимит размера.
- [ ] Сделать server-owned access/safety preflight adapter, запретить client-set authorization flags.
- [ ] Добавить canonical ontology map (четыре сферы + goal overlay; точные source versions).
- [ ] Реализовать approved-content adapter для video/course/test/service, затем отдельно audio.
- [ ] Включить policy/reason-code invariant checker; разработать read-only endpoint.
- [ ] Подготовить golden fixtures и два авторизованных test actors для IDOR/RLS отрицательных проверок.
- [ ] Подключить первый объяснимый decision card с отказом/корректировкой, не создавая дубли UI.
- [ ] Только после аудита источников добавить минимальное consented feedback сохранение, delete/export.
- [ ] Собрать evidence-based QA dashboard с агрегатными, приватно безопасными метриками, без личных текстов.
- [ ] Провести owner/user acceptance на мобильном, проверить Vercel READY, SHA и alias перед live.
- [ ] Отложить выбор платного LLM/GraphRAG до comparative eval; любое платное действие — отдельное разрешение.

## 18. Риски, открытые решения и критерии отказа

| Риск | Предотвращение |
| --- | --- |
| Фантазия о клиентах, скрытых мотивах и диагнозах | Только explicit/verified ledger; hypotheses не персистируются как факты |
| Грязное объединение разных измерений | Exact test version/locale/scale, source-specific norms; без общего health score |
| Неверный контент по языку, цене, длительности | Rights/audio language/duration/paid/sensitive prefilter |
| Дублирование рекомендации и навязывание продажи | Confirmed feedback, diversity and no-repeat, client-chosen free filters |
| Кризис попадает в воронку продаж | Safety ДО ranker и перед выводом, fail-closed и human support |
| Утечка private profile в внешнюю модель/логи | Purpose consent, allowlisted context, no logs/URLs/embeddings raw text |
| Разрастание архитектуры и затрат | Один core, pure functions, no GraphRAG/multi-agent in MVP |
| «Обучение» на накликанном контенте | Separate engagement/subjective comfort/real outcomes; expert holdout |
| Ложная готовность к live | CI + real account E2E + exact Vercel READY/SHA/alias; no staging claims |

## 19. Связанные задачи, исходные модели и внешние источники

**Репозиторий:** #2530 (эпик intelligence); #2528 (core); #1774 (Coaching Intelligence 2.0); #1881 (unified profile); #1223 (measurement validity); #2480 (media taxonomy). Никаких дублей scorer, consent database, session API и UI.

**Методология:**
- Soar Architecture (University of Michigan): https://soar.eecs.umich.edu/soar_manual/02_TheSoarArchitecture/
- ACT-R (Carnegie Mellon University): https://act-r.psy.cmu.edu/
- Rao & Georgeff, BDI Agents: From Theory to Practice (1995): https://apice.unibo.it/bin/view/Publication/BdiIcmas95
- ReAct (Yao et al., 2022/ICLR 2023): https://arxiv.org/abs/2210.03629
- Retrieval-Augmented Generation (Lewis et al., 2020): https://arxiv.org/abs/2005.11401
- Case-based Reasoning (Aamodt & Plaza 1994): https://www.cs.auckland.ac.nz/research/groups/ai-cbr/classroom/cbr-review.html
- Anthropic, Building Effective Agents (2024; historical pattern guidance, approaches have evolved): https://www.anthropic.com/research/building-effective-agents
- LangGraph persistence/checkpointers/stores: https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/persistence.mdx
- Microsoft GraphRAG (experimental/possible expensive indexing): https://github.com/microsoft/graphrag
- NIST AI RMF 1.0 / GenAI Profile 2024: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- OWASP Top 10 Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- OpenAI agent workflow evaluations (traces/datasets/graders): https://developers.openai.com/api/docs/guides/agent-evals

**Проверка документа:** это подробное ТЗ и план внедрения, НЕ свидетельство того, что описанные API, БД, UI или внешняя AI модель уже реализованы. Любые новые персональные данные, paid inference, external provider или production release требуют отдельного текущего review/consent/security gate.
