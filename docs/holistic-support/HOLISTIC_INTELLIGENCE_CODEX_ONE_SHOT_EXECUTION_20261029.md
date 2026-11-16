# Holistic Intelligence — one-shot Codex delivery pack
**29 October 2026 · Implementation package v3**
**Status:** implementation instruction, not executed or live. Source: PR #2528, issue #2530. Repo production target: codex/public-book-library (reverify).

## Practical definition of “one prompt”

**One self-contained instruction to Codex, one autonomous work session, but 4–6 small sequential PRs.** One prompt does not mean one monolithic PR or one unlimited agent run. The agent should complete all independent engineering work, integrate it with actual site, test, and release only after verifiable gates; if a dependency blocks, deliver partial working pieces with exact evidence and blockers.

### Deliverable truth table

| Level | Required observable evidence | Claim |
|---|---|---|
| Source-only | Commit with policy, unit tests | “Foundational code exists”, **not** “works on site” |
| API-integrated | Verified server owner/RLS path + real catalog source + auth/security tests | “Backend integrated”, **not** “full client UX” |
| User-flow | Existing real cabinet + Meditation Finder component, buttons and verified destinations; guest fallback | “MVP UI integrated in branch” |
| Deployed | Green scoped CI, successful safe merges and exact Vercel READY SHA/alias, browser journey | “Live available” |
| Verified personalized | Real Google sign-in, independent second account, consent, source-verified profile, no leak | “Personal profile integration verified” |
| Full natural LLM | Approved provider/processing/budget and eval lift, no hallucinations | Separate milestone; **not included** in no-cost MVP |

### Stage deliverables (small PRs, one Codex session)

| Stage | Owner scope/target | Expected changes (adapt after source audit) | Mandatory output |
|---|---|---|---|
| A — finish foundation | PR #2528 or owned successor | real ranker bridge, failed tests, workflow path-scope | actual integration test / CI proof |
| B — trusted API | lib/app and app/api/app | server-owned auth, per-purpose opt-in, safety, typed request/response | POST endpoint + denial tests |
| C — source adapters | lib/holistic-support, genuine catalog sources | approved video, test, course, service; protected audio adapter only if verified | proof for each eligible ID / honest unavailable |
| D — UI vertical | existing cabinet + Meditation Finder | one primary suggestion + up to 2 alternatives, EN/RU/ES, real start, no duplicate | screenshots/E2E + manual UX |
| E — feedback | existing owner scoped storage or gated migration | explicit save, decline, edit, optional T0/T1 | owner isolation, deletion/revocation or session-only caveat |
| F — release + evidence | CI/Vercel | safe merge + production readback, no red CI bypass | actual READY SHA + browser user flow or blocker |

### Engineering decisions already resolved

- **Cognitive model:** BDI goals/intentions plus Soar-like action loop; procedural guards, not a new LLM. Personal claims linked to provenance; unknown ≠ inferred. Content scoring stays in published existing rankers.
- **Risk:** safety checked before offers and again after response; on missing preflight no recommendations. A regex is not certified clinical risk screening.
- **Authorization:** server establishes actor and RLS, never caller booleans. OAuth/guest scenarios remain separate.
- **Consent:** user may opt in to local profile personalization separately from measurement, intimacy, paid offers, persistence, practitioner sharing and external AI. CRM product_updates consent not reusable.
- **Media:** existing meditations have reviewed-only and link-only states; audio kind is NOT in axis ranker; do not fake support. No source IDs invented by LLM.
- **Relevance:** select action kind first, rank within kind; never compare dissimilar score scales across video/tests/courses/services.
- **English/Russian/Spanish:** all new copy, but private Spanish auth gate currently blocks (/es/app notFound); mark either targeted, verified parity or honest limitation.
- **Learning:** voluntary feedback, not autonomous reinforcement learning on vulnerable users.
- **Deployment:** no external inference charges or personal data transmission; production claims require CI, READY, alias, SHA, browser and logged-in two-account tests where applicable.
- **PR concurrency:** current PR Sweep owns other branches and can touch #2528; no concurrent force pushes, branch overwrite or merge gate bypass.

### Existing canonical files to inspect before coding

`AGENTS.md`; `lib/holistic-support/{client-reasoning-core.mjs,client-reasoning-bridge.mjs,axis-offer-ranker.mjs,meditation-catalog-ranker.mjs,meditation-discovery-server.ts}`; `lib/profile/{unified-profile.js,goal-profile.js,development-program.js,profile-scale-selection.js}`; `lib/assessments/{verified-history.js,test-recommendations.js}`; `app/api/app/[...path]/route.js`; `lib/app/{session.js,config.js,http.js,repository.js,my-progress.mjs}`; `components/app/{app-workspace.jsx,portrait-recommendations.jsx,personal-axis-matches.jsx}`; `components/{holistic-meditation-finder.tsx,holistic-support-inline-guide.tsx}`; `app/[locale]/app/[[...path]]/page.jsx`; `tests/{client-reasoning-core.test.mjs,client-reasoning-bridge.test.mjs,axis-offer-ranker.test.mjs}`.

### One-shot prompt: COPY THE ENTIRE BLOCK BELOW INTO CODEX

---

Ты — Codex, ведущий инженер Holistic House с доступом к репозиторию и тестам. **Выполни реализацию, не ограничивайся ТЗ, анализом, заглушками или описанием следующего шага.** Это одна автономная задача: выполнить последовательно все безопасные этапы до подтверждаемого рабочего MVP. Не задавай необязательных уточняющих вопросов, не оставляй прототип вместо рабочей интеграции. Если внешний доступ/CI/авторизация блокируют часть работ — закончи все независимые задачи, предъяви проверяемые результаты и конкретный blocker; ничего не выдавай за live без доказательств.

## 0. Репозиторий, исходное состояние и предотвращение конфликтов

- Production site: https://holistichouse.vercel.app. Repo: https://github.com/andylitvinov-design/books.
- **Реальная целевая ветка — `codex/public-book-library`**, GitHub default `codex/bootstrap-books` не считать production. В начале перепроверь Vercel project/source branch, READY SHA, alias и head перед любым merge/deploy.
- Текущий foundational PR: https://github.com/andylitvinov-design/books/pull/2528 (на момент написания OPEN/DRAFT, head `feat/holistic-intelligence-core-20261029`); epic https://github.com/andylitvinov-design/books/issues/2530.
- Обязательное чтение: `AGENTS.md`, `docs/holistic-support/HOLISTIC_INTELLIGENCE_CORE_V1_20261029.md`, `docs/holistic-support/HOLISTIC_INTELLIGENCE_2_0_COGNITIVE_ARCHITECTURE_TZ_20261029.md` и **этот execution pack**. Сначала `git status`, `git branch`, актуальные PR и CI, затем карта вызовов и тестов.
- Существующие четыре PR Sweep могут работать параллельно: прочитай последние комментарии/commit timestamps PR #2528 и ownership других задач, объяви выбранный рабочий PR в комментарии, НЕ вноси конкурентные коммиты в ветку с активным владельцем. Если #2528 уже merged — продолжай от проверенного actual production head; если он свободен — приведи его к зелёному состоянию; иначе создай узкий зависимый PR без переписывания чужих изменений. При каждой операции re-fetch head, no force-push, no bypass protections; не редактируй #2526 и прочие чужие release-gate ветки.
- **Одна команда Codex ≠ один гигантский PR**: последовательно выполняй P0→P4(+P5 при безопасной возможности) через небольшие интегрируемые PR. Крупные незаконченные файлы, дублирующиеся сервисы и бессрочные draft не считаются выполнением.

## 1. Цель готового продукта (Definition of Product MVP)

Один единый «разум» `Holistic Intelligence Core`, который после запроса клиента:
1. распознаёт только явно указанные цель/ситуацию/желательный опыт/длительность/язык/формат либо задаёт **ровно один** безопасный уточняющий вопрос;
2. по отдельному согласию проверяет **только свои** подтверждённые цели, актуальные результаты валидных шкал и историю уже начатых курсов; незаполненное не «угадывает»;
3. выполняет обязательный safety preflight **до** любых предложений;
4. выбирает вид следующего действия (видео/медитация, допустимое аудио, тест, урок, рефлексивный вопрос или добровольное предложение сессии), затем проверяет реальные доступные опубликованные источники;
5. показывает **одну основную рекомендацию и максимум две альтернативы**, 1–2 проверенные причины, реальный переход и кнопки «Начать / Другое / Уточнить / Не подходит»;
6. различает статус `clarify | recommend | no_match | safety_handoff | unavailable`, не подменяет отсутствие материала ссылкой на выдуманное видео;
7. по явному действию позволяет оценить полезность/комфорт и скорректировать фильтры; при разрешённом хранении использует только подтверждённую историю без клинических выводов;
8. интегрирован хотя бы в **реальный кабинет профиля и существующий Meditation Finder**; другие поверхности (видеотерапия, Academy, coaching) используют тот же общий policy/adapter и компактный handoff, без второго AI-движка.

Нужен реальный вертикальный сценарий с API, актуальным каталогом и UI; не «код без подключений» и не мок. Бесплатный детерминированный режим должен полностью работать без токенов OpenAI/Gemini и без нового платного сервиса. Optional LLM — выключенный адаптер с валидируемым ответом и fallback, НО не условие готовности.

## 2. Обязательное повторное использование реального проекта

- `lib/holistic-support/client-reasoning-core.mjs` и `client-reasoning-bridge.mjs` — начальный контракт; исправь и расширь, **не дублируй**.
- `lib/holistic-support/axis-offer-ranker.mjs`, `axis-offer-matcher.mjs`, `client-intent-model.mjs` — eligibility + существующий score; никаких новых универсальных клинических «% соответствия».
- `lib/holistic-support/meditation-catalog-ranker.mjs`, `meditation-discovery-server.ts`, `components/holistic-meditation-finder.tsx`, `components/holistic-meditation-gallery.tsx` — public video/meditation candidate status, язык реальной дорожки и verified/approx duration.
- `lib/profile/unified-profile.js`, `goal-profile.js`, `development-program.js`, `profile-scale-selection.js`, `lib/assessments/verified-history.js`, `psych-portrait.js`, `interpretation-registry.js` — source-specific измерения, актуальность, статус доказательств.
- `lib/assessments/test-recommendations.js`, `data/assessments/catalog.js` — реальные опубликованные и разрешённые тесты.
- `lib/personal-coaching/offline-intelligence.js`, `guided-session.js` — исходные методы и одобренные вопросы, максимум один шаг на экран.
- `lib/app/session.js`, `config.js`, `http.js`, `database.js`, `repository.js`, `app/api/app/[...path]/route.js` — verified actor, `requireSameOrigin`, `readBody`, `PRIVATE_HEADERS`, `consumeRate`, `createAppRepository(config).bootstrap(actor, ...)`; не клонируй auth.
- `components/app/app-workspace.jsx`, `components/app/portrait-recommendations.jsx`, `components/app/personal-axis-matches.jsx`, `app/[locale]/app/[[...path]]/page.jsx` — один существующий personal dashboard; не порти Google OAuth.
- `lib/app/my-progress.mjs` и существующие session/course records — честная история (не путать «загружено/открыто» и «просмотрено/помогло»).
- `lib/crm/consent.js` — **ТОЛЬКО маркетинговое `product_updates`**, не принимать как согласие на AI и психологические результаты.
- Авторские культурно-символические практики: можно показывать по добровольному интересу; отделять их от научно обоснованных/клинических методов.
- Дополнительно обнаруженный факт: в `app/[locale]/app/[[...path]]/page.jsx` private Cabinet currently gates `locale` to `en,ru` with `notFound()`. Новый UI локализовать EN/RU/ES, но испанский **signed-in** путь считать неготовым до реальной безопасной правки и E2E. Не менять весь кабинет на ES вслепую.

## 3. Точный дизайн системы: BDI + Soar-like cycle, не мультиагентный хаос

Создай/переиспользуй минимальные модули (имена адаптируй под стиль репо, один source-of-truth):
- `intent-parser`: принимает краткий свободный текст и/или фильтры; возвращает типизированные `explicitGoal, lifeArea, situations, desiredStates, languages, duration, formats, modality, limits, uncertainty`. Непонятное — `clarify`, не угадывай психиатрические состояния. Язык общения EN/RU/ES соответствует пользовательскому выбору, не притворяйся человеком.
- `evidence-reader`: извлекает только authenticated+authorized owner-scoped bootstrap projection с версиями тестов/источников и consent. Раздельно `user_said`, `user_confirmed`, `source_verified`, `editorial_approved`, `hypothesis`. Hypothesis не записывай как факт.
- `policy-planner`: `S0_SAFETY → S1_AUTH/CONSENT → S2_INTENT → S3_EVIDENCE → S4_AVAILABLE_OPERATORS → S5_ELIGIBLE → S6_RANK → S7_EXPLAIN → S8_USER_CONFIRMATION → S9_OPTIONAL_FEEDBACK`. Направления: 4 canonical life areas `business, relationships, energy_health, personal_growth`; goal overlay отдельный; 17 portrait rays/34 facets не превращать в новые scores.
- `catalog-adapters`: по *реальным* данным приводят только допущенные published entities к единым `{id, kind, title, safeHref, language, availability, editorialStatus, rights, safety, verifiedDuration, facets}`, но **не повышают статус source**, не генерируют URL. Для видео external `link_only` не делать вид, что он embedded/reviewed; original playlist whitelists остаются.
- `explainer`: локализует approved reason codes, показывает «на основании вашего выбора» / «на основании подтверждённых данных с согласия», без сырых баллов, диагнозов и навязанных причин.
- `safety-gate`: независимый до и после; missing preflight fail-closed, EN/RU/ES кризис после business запросов не попадает в продажи. Учитывать ограниченность правил, не заявлять клиническую безопасность на основе regex.
- `feedback`: изменения цели/dismissed/completed относятся к владельцу и только добровольно, без автоматического «обучения» клиническим выводам.

Приоритет: safety+scope > текущий выбор/отказ > ранее подтверждённая цель > совместимая свежая проверенная шкала > утверждённый metadata > гипотеза. `missing` не равно 5/10, 50% или 0. No cross-instrument averaging.

**Важный инженерный нюанс:** существующие video/test/service rankers используют разные score. **Сначала выбери допустимую категорию действия на основании intent и шага процесса, потом ранжируй ВНУТРИ неё. Никогда не складывай scores этих категорий напрямую.**

## 4. Рабочий API и доверенная граница

Создай приватный `POST /api/app/intelligence/plan` в корректной реальной маршрутизации (можно безопасный явный route или ветку существующего catch-all, проверить конфликт с `app/api/app/[...path]/route.js`). Базовый контракт:

```ts
type PlanRequest = {
  requestId: string; // UUID, safe idempotency
  surface: 'cabinet'|'meditation'|'video_therapy'|'academy'|'coaching';
  intent: {
    language:'en'|'ru'|'es'; goalText?: string;
    selectedFacets?: string[]; selectedTopics?: string[]; lifeAreas?: string[];
    situations?: string[]; desiredStates?: string[]; techniques?: string[];
    formats?: ('video'|'audio'|'course'|'test'|'service')[];
    maxDurationMinutes?: number; intensity?: 'gentle'|'standard';
    avoidSafetyFlags?: string[];
  };
  clientAction?: 'request_suggestion'|'change_goal'|'decline'|'continue';
};
type PlanResponse = {
  decisionId: string; policyVersion: string;
  status:'clarify'|'recommend'|'no_match'|'safety_handoff'|'unavailable';
  question?: {key:string,text:string}; // максимум один
  primary?: {id:string,kind:string,title:string,href:string,reasons:string[],requiresUserConfirmation:true};
  alternatives: Array<{id:string,kind:string,title:string,href:string}>;
  explanation:string; limitations:string[];
  consentRequired?: string[];
  feedbackRecording:'explicit_save_only'|'session_only';
};
```

Backend **САМ** выводит `actor.id`, scope/RLS, confirmed goals, authorized resultIDs, knownFacetRefs, source dates, consent and safety. Запретить `authenticated/ownerScoped/trusted/safety.status/consentGiven` из неподписанного тела клиента. Не включать account IDs, original scores, raw answers, free-text notes, private IDs, auth, token, hidden practitioner reports в результат/URL/logs/телеметрию. Схема request строгая, unknown keys reject, `goalText` ограничен и трактуется как данные (prompt-injection не команды), body cap 8–16KB, rate limit, same-origin/CSRF, POST private/no-store, deny unauthenticated private access, avoid cross-user cache. Не нужно делать GET для чувствительных фильтров.

**Guest публичный режим** работает только на существующих общедоступных каталогах и локальных фильтрах; не притворяться авторизованным и не отсылать приватные данные. Если signed-in пользователь явно не согласился на измерения — персонализация по тестам выключена даже после входа.

**Consent:** отдельные purpose для просмотра профиля, измерений, intimacy/sexuality, записи feedback, передачи специалисту, внешнего LLM, рекламных/paid recommendations. Default OFF. Для текущего сеанса можно использовать однозначный одноразовый opt-in UI с серверной проверкой источника; долгоживущие согласия только по проверенному durable store и version/revoke. Не приравнивать «поставил галочку» к разрешению отправлять данные третьим лицам. Никакой передачи внешнему AI без дополнительного разрешения.

## 5. Каталоги — точное поведение

1. **Meditation/videos:** использовать `loadMeditationDiscovery` + `rankMeditationCatalog`, preserving approved owners, `external link_only`, creator destinations and verified language/duration; unavailable/unknown durations не выдавать за точные. Не добавляй стоковые/придуманные видео.
2. **Tests:** существующий published rights-cleared каталог и `rankAssessmentDefinitions`; тест рекомендовать для измерения, не для диагноза; уже пройденное не предлагать как непройденное.
3. **Courses:** только реально опубликованные/доступные lesson URLs и user entitlements; использовать существующий course/cabinet flow; Reiki certificate/initiation/payment не выдавать автоматически.
4. **Services:** только реальные published services и valid routes; опционально, paid контент только после соответствующего выбора; цена/наличие/бронь лишь из проверенных источников, не из guess.
5. **Audio:** существующий `axis-offer-ranker` **не** поддерживает `audio` как допущенный kind. Реализуй отдельный reviewed audio adapter к существующим аудиоматериалам с проверкой auth/visibility/rights/playability/language/duration. Если подтверждённых источников нет — явное `no_match`, не «audio ready» на основе лишь наличия типа в enum. Не нарушай защищённую аудиораздачу.
6. **Videotherapy:** найди фактический живой маршрут и существующие авторские видео/видеокурс. Дай переход в тот же policy (запрос → добровольный T0 → approved video → практика → добровольный T1 идентичной шкалы → следующий шаг), не создавая вторую платформу, генератор видео или обещание терапевтической эффективности. Если полный 8-session bridge не выполним безопасно в первом релизе, подключи хотя бы проверяемый переход в существующий маршрут, а остальное явно отметь как gated.
7. **Coaching:** использовать уже подтверждённые авторские модели; не добавлять бесконечный невалидируемый LLM-диалог.

Отсутствуют editorial links topic::facet → content? Не создавай «псевдоэкспертную» автоматическую разметку: используй существующие точные проверенные связи и набор допущенных user-chosen filters; новую метку дай только как draft для owner review. No hard fail of entire feature if one source type lacks approved records: UI предлагает реально доступное другое разрешённое действие, корректно обозначает ограничения.

## 6. Интерфейс без дублирования текущих экранов

- Встрой **один переиспользуемый компактный компонент** рядом с существующими рекомендациями кабинета (`components/app/portrait-recommendations.jsx`, `personal-axis-matches.jsx`; не выводить две одинаковые ленты) и в `components/holistic-meditation-finder.tsx`.
- Мобильный экран: «Я понял вашу цель: [редактировать]» → «Предлагаю [реальное название]» → «Почему: [до 2 причин]» → кнопки «Начать / Другой вариант / Уточнить / Не подходит». Дополнительные настройки — accordion, не 20 фильтров на экране. Один ключевой вопрос на экран, large tap targets, skip/stop, focus/keyboard, alt/no-autoplay. EN/RU/ES text + source audio language separately.
- Приватный ES: явно обработай существующий `notFound()` gate. Safe option A: targeted authenticated ES support с полным auth E2E; option B: оставить приватный ES закрытым, обеспечить ES public и сообщить незавершённость. Нельзя утверждать 3/3 signed-in parity по переводам.
- Сохрани current CSS/brand, OAuth redirect, CLS, CSP, aria, existing screenshots and route intent. `AGENTS.md` обязателен; при наличии reference screenshot следуй visual-to-code-pro skill.
- Действия «Начать» используют только настоящие router links/player actions. Никаких фиктивных кнопок, фальшивых session IDs и client logins.

## 7. Память и persistence

В пределах одного сеанса: no-repeat/declined сохранять только в React state без лишнего backend, пока клиент не выберет «Сохранить». Для authenticated пациента при **явном отдельном Save** сохранять согласованные preference/feedback в существующей owner-scoped модели и обеспечивать edit/revoke/export/delete. Сначала audit реально существующую таблицу; если без новой migration безопасно невозможно, подготовь минимальную строгую миграцию с `account_id`, RLS, constraints, идемпотентностью, consent-version, retention/deletion и отрицательным second-account тестом; не создавать параллельную CRM/medical DB. Миграцию выкатывать только с доказательным DB gating. Если DB/approval нет, сделать полный работающий session-only вариант, feature-flag persistent save, честно отметить блокер, не симулировать сохранение.

T0/T1: сравнивать только один и тот же promptKey, 0–10, порядок времени; пометить self-report, no clinical outcome/causality. Нет T1 → отсутствие результата, а не 0%. Ни один feedback event не обновляет clinical scoring.

## 8. Инкрементальная реализация в рамках ОДНОГО запуска Codex

**Шаг A (P0):** принять и довести #2528: реальные `node --test tests/client-reasoning-core.test.mjs tests/client-reasoning-bridge.test.mjs tests/axis-offer-ranker.test.mjs` (не test stub), eslint/TS/build + actual CI. Подправить если нужно; если есть чужой владелец, isolated successor branch. Документацию не считать finished deliverable.

**Шаг B (P1):** trusted context adapter + strict request schema, consent/safety, direct authenticated private `plan` endpoint (или корректное подключение к существующему API), anonymous fallback и owner isolation. Негативный тест, где клиент присылает forged `ownerScoped=true`, должен **провалить** доступ к чужим данным.

**Шаг C (P2):** typed catalog projection for video/test/course/service + separately reviewed audio; подключить существующие rankers, без смешения scores. Зафиксировать content IDs и статусы, не копировать в client приватные тесты. Проверить no-result, wrong-language, link-only, rights, expired media, sensitive and paid restrictions.

**Шаг D (P3/P4):** клиентская карточка и реальный action в signed-in Profile + Meditation Finder с EN/RU/ES UI; existing videotherapy/coaching handoff, минимум один полностью проверенный путь и пустое состояние. Не переделывать весь кабинет.

**Шаг E (P5):** optional feedback, confirmation, edit/decline, consented persistence при безопасной DB готовности; sinon session-only feature with explicit limitation; tests + edit/revoke/delete.

**Шаг F (release/QA):** только после каждого маленького PR green CI сделать safe merge по принятой процедуре; проверить production READY/alias/точный SHA и браузерное прохождение реального сценария. Не «готово» по одному HTTP 200.

Не прерывайся после A или после очередного плана. Каждый этап приводит к настоящим файлам, тестам и commits. Если зависимые PR требуют очередности, дождись подтверждения merge/CI, а не параллельных PR на одну часть файлов. Используй PR Sweeps для существующих несвязанных задач без concurrent cherry-picks.

## 9. Acceptance test matrix и release gates (обязательно)

Добавь focused tests к реально запускающемуся workflow path-scope:
- Unit: intent EN/RU/ES, false assumptions, current goal overrides profile, missing consent, missing safety, one question, safe URLs, unsupported reason rejection, old/incompatible source, unknown + conflicting measurements, no matching catalog, declined recommendation no-repeat, no invented output, provider-free deterministic fallback.
- Security: forged actor, SQL RLS/owner scope, second-account negative, guest cannot read profile, wrong csrf/origin, IDOR, browser-to-API PII leak, sensitive opt-in and paid opt-in default OFF, prompt injection from untrusted video title, source link and goalText.
- Catalog: reviewed source with correct audio language/length; unapproved/private video skipped; link-only opens creator URL without iframe; audio protected; course available and student entitled; test key real; no fabricated service price.
- Session: T0/T1 same prompt, chronological, voluntary; no self-report => no metric; feedback explicit save and duplicate request idempotency; revoke/delete/export if persisted.
- Browser: exact canonical routes, Google login, logout/relogin, one synthetic test actor + second distinct authenticated actor; iPhone-like 320/375/390/430px Chromium/WebKit, keyboard/focus/scroll, no overflow; EN/RU/ES where actually supported; failure and empty states.
- Performance: no repeated full bootstrap fetching per keystroke, lazy request/cancellation, stable no-store; document measured basic response latency, not invented.
- Tooling: `npm ci`, targeted Node suites, scoped ESLint, `npx tsc --noEmit`, Next build; CI must finish (not merely queued) and show actual pass of new checks. Do not bypass release-gate, skip browser with fabricated pass or force a red merge.

**GO:** real authorized profile option correctly respects consent + safety; at least one eligible existing content selection and action works end-to-end; no fabricated media; all relevant CI green; production ready SHA and browser confirmation. **NO-GO:** safety bypass, data leakage, unpublished content, anonymous private data, missing source/consent, red CI, unknown live SHA, unsupported EN/RU/ES assertions. If NO-GO, keep gated and report blockers with reproducible evidence.

## 10. Required final handoff format

In final Codex response report:
1. links to actual PR(s)/merged SHAs, which branch and files, and what shipped;
2. explicit delivered journey: entry URL → choose goal → opt-in profile → recommendations → real Start → optional feedback;
3. authentic output of targeted/CI/browser checks with run IDs, pass/fail numbers, 2-account E2E status, locale coverage and screen sizes;
4. Vercel production deployment ID, exact READY/alias/SHA (or clearly **NOT LIVE**);
5. what remains blocked, next exact action and why; no «требуется просто подключить» if there is independent work left;
6. cost/privacy: confirm zero unapproved AI API calls, paid media, billing changes, external transfer of raw client data and no accidental new CRM leads.

## 11. Absolute prohibitions

NO invented client facts/diagnoses/psycho-homeopathic prescriptions; NO personal data to external model, analytics, URL, CRM, logs, YouTube query, embeddings; NO AI-generated “approved” media/links, fake audio or playback. NO unapproved external AI calls, API purchases, credits, subscriptions, spend. NO unrelated refactors of media, payments, user auth, large CSS rewrites. NO destructive force-push, CI/release-gate bypass or broad branch merges. NO promises that one tool/test proves a live deployment. NO pretending Codex may run in background if you cannot verify task execution.

**Start by checking GitHub PR #2528 and real source files now. Then edit, test, submit and safely ship the actual working integration.**

Ссылки архитектуры:
- https://github.com/andylitvinov-design/books/blob/feat/holistic-intelligence-core-20261029/docs/holistic-support/HOLISTIC_INTELLIGENCE_2_0_COGNITIVE_ARCHITECTURE_TZ_20261029.md
- https://github.com/andylitvinov-design/books/pull/2528
- https://github.com/andylitvinov-design/books/issues/2530
