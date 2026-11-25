# Holistic House · My Tests → Insights → My Courses — техническое задание

**Версия ТЗ:** 1.0 · **Дата:** 15.10.2026 · **Готовность:** execution-ready проектное ТЗ; не факт реализации/релиза.  
**Приоритет:** P0–P2 · **Языки:** EN / RU полноценно, ES только там, где подтверждена локализация конкретного инструмента и UX.  
**Цель:** превратить тестирование из каталога в понятный, безопасный, измеряемый и возвращающий человека к полезной практике маршрут.  
**Родительская программа:** docs/myspace/HOLISTIC_HOUSE_TESTS_GROWTH_ROADMAP_2026-10-15.md  
**Предшествующее исследование:** docs/myspace/HOLISTIC_HOUSE_TEST_PLATFORM_COMPETITIVE_ANALYSIS_2026-10-15.md  
**Интеграционная ветка:** andylitvinov-design/books:codex/public-book-library; её HEAD, открытые PR, миграции и deployed SHA проверять заново перед разработкой.  
**Ограничение:** работаем **поверх существующего** движка оценивания, OAuth, приватных аккаунтов, Test Explorer, отчётов, My Courses и ОПОРА. Не дублировать формы, scoring, БД или загрузчики.

---

## 0. Scope / источники истины / границы

### Входит
1. Вход в My Tests (гость / аккаунт), выбор темы и правильно разрешённого теста.
2. Компактная карточка и первичный результат с понятной интерпретацией, детальными шкалами и рекомендациями.
3. Гостевой одиночный маршрут без Google там, где это действительно разрешено, и корректное явное сохранение в Google-кабинет.
4. Согласованное предложение образовательных целей и выбор 3–5 параметров наблюдения **до** первого урока.
5. Безопасная интеграция 14-дневного курса/ОПОРА с датированной первичной шкалой и follow-up.
6. История и визуализация **трёх разных типов** прогресса.
7. Права, безопасность, EN/RU mobile UX, QA, consent и дисциплина релизов.

### Не входит
- Создание новой отдельной test-app или второй системы аккаунтов.
- Автоматическая диагностика, clinical triage по авторским шкалам, автоматические лекарства/гомеопатия.
- Независимая «ИИ-психотерапия», интенсивная травма-терапия без специалиста или обещания cure.
- Принудительные платные отчёты, изменение €20/€100 тарифов, предоставление новых скидок, Stripe/PayPal.
- Загрузка private-клиентских медиа/изменение приватных ссылок и слайдов урока, кроме строго необходимой сквозной интеграции.
- Сотни новых методик, новых лицензий, видео/рендеры, SEO-расширение до QA основного пути.

### Авторитетные зависимости (не переписывать)
- Психологический мониторинг и privacy: #117, #626, #342.
- Explorer: #179.
- Персональный рост: #338.
- Курсы ОПОРА: #599 и уже слитый PR #600 (TRAUMA-1.3, шесть учебных маршрутов и clinician-only AS4).
- Открытый PR #620 — практики и follow-up; #617 — точность восстановления; их интеграцию и ancestry сверять.
- PR #633 и #641 уже в каноническом коде; PR #643 ещё открыт. PR #625 уже merged. Не создавать параллельную копию их задач.
- UI: PR #611 и #618 navy / burgundy уже merged. Соответствовать этим решениям.

**Статусы PR приведены на 15.10.2026; в момент исполнения они могут отличаться.** Ни одна спецификация не доказывает, что код уже доступен на https://holistichouse.vercel.app.

## 1. UX / карта экранов

### Экран 1 — Выбор запроса / тестов (public + My Tests)
Цель: человек за 5–10 секунд понимает, куда нажать и зачем.

Mobile-first композиция сверху вниз:
1. Компактный первый блок: «Что хотите лучше понять?» / «What would you like to understand?» + короткое предложение о бесплатном самонаблюдении.
2. 5–8 понятных тем (стресс, настроение, сон, энергия, отношения, внутренняя опора, внимание, смысл) без длинных диагнозообразных описаний.
3. Сразу 1–2 **подходящих доступных сейчас** теста. Не автоподбирать недоступный по правам/возрасту/языку.
4. Для каждого: пиктограмма класса, **название**, 1 предложение цели, количество вопросов, реальное ориентировочное время, язык опросника, не более трёх чипов измеряемых параметров + «ещё N».
5. Действия: бордовая **«Пройти тест»** только для фактического старта; navy **«Изменить выбор / Подробнее / В кабинет / С курсом»**.
6. Скрытый по умолчанию advanced Explorer, фильтры, полная справочная библиотека и методы с ограничениями. Выбор и фильтры не теряются без намерения.
7. До действия явно: «Один подходящий тест можно пройти гостем без Google» **только если это реально обеспечивает runner**; «Для сохранённой батареи/кабинета потребуется Google». По состоянию на документ гостевой выбор в PR #643 не merged, так что не выводить такое обещание как live до проверки.

Карточки типов: **Профессиональная методика (источник/ключ указаны)**, **Авторский мониторинг HH (не валидирован как клиническая шкала)**, **Описательная типология (не диагноз)**. Значок «professional» сам по себе не означает клиническую валидацию; показывать методологию/ссылку на источник по раскрытию, а не огромным текстом.

**Дизайн:** мягкий тёмно-синий для управления выбором, лёгкие светлые поверхности, бордовый только для кнопок реального запуска теста. Дизайн утверждённых иных страниц не затрагивать.

### Экран 2 — Выполнение (reuse existing runner)
- Оба формата **Quick** (вопросы одним списком) и **Guided** (один вопрос на экран) используют **те же** immutable definitions, id пунктов, порядок, варианты и scoring.
- Чёткое время / прогресс; «назад» без потери уже введённого; продолжить при возврате через существующий server-backed resume.
- Результат нельзя завершить с пропущенными mandatory пунктами; N/A, если предусмотрен, — особое значение, не 0.
- Age/necessary processing consent остаются обязательными согласно действующему guest-flow; никогда не подменять согласие кликом старта.
- Нет autoplay видео, непрошенной рассылки, скрытого запроса Google.

### Экран 3 — Результат (компактный report hero)
Переработать на базе **CompactAssessmentReport** + PersonalResultReport, НЕ делать отдельный движок.

На первом мобильном экране показать:
- название теста; что именно измеряет; дата/временное окно;
- **главный осмысленный тезис**, основанный на реальном измерении и его допустимой интерпретации; «не клинический диагноз»;
- 1–3 небольших блока в зависимости от типа: «Что видно сейчас», «На что можно опереться», «Что можно попробовать по желанию». Не объявлять «ваши сильные стороны» на основании одного симптомного показателя;
- один главный **следующий шаг**: «Посмотреть подходящие направления / Выбрать параметры» (navy; это НЕ запуск теста). Отдельно: «Другой тест», «Сохранить в кабинет», «Открыть подробный отчёт».
- Если данных мало, версия не подходит, перевод не валидирован или clinical-only: честная пометка «этого недостаточно для персональной рекомендации».

Раскрывающиеся секции:
A. Каждая подшкала: оригинальное название/вычисленный балл/диапазон min–max, единицы, направление, версия scoring, условия, смысл.  
B. Интерпретация — отдельно исходная/валидированная и авторская образовательная.  
C. Практические необязательные рекомендации.  
D. Ссылки на оригинальный источник/права; ограничения.  
E. Исторические сравнения только с сопоставимым повтором.  
F. Полный HTML-отчёт, где уже доступен; PDF — отдельная явная кнопка, не заменяющая HTML.

**Строго не показывать:** процент психологического здоровья, выдуманный клинический процентиль, «вы больны», причинное «после курса повысилось здоровье», медицинский прогноз или рекомендованные препараты по одной шкале.

### Экран 4 — Предлагаемые цели и шкалы
После результата или старта образовательной программы:
1. Объяснить **1–3 рекомендованных направления навыков** на основании добровольной проблемы и настоящих совместимых шкал.
2. Для направления: «Почему предложено» (название теста, шкала, измерение/дата, user-selected priority), ограничения; пример упражнения/результата как обучение, не гарантия.
3. Отдельный реальный **выбор 3–5 измеряемых шкал** по существующему контракту Course R3 (если подходящих меньше трёх — явно указать и позволить доступное безопасное количество без фальшивых данных). Не путать цели более высокого уровня со шкалами.
4. Человек может снять предложенные варианты, выбрать другие допустимые, изменить добровольную цель, выбрать только наблюдение или отказаться от курса.
5. Обязательное **«Я выбираю эти параметры и хочу начать образовательную программу»**; без этого Lesson 1 в измеряемой программе не запускается.
6. Показать 14 дней и реальные предлагаемые практики, текущие утверждённые условия оплаты/доступа, не обещать успех.

Пользователь уже проходил совместимые тесты? Предлагать reuse при достаточной свежести и согласии; не требовать повторить всё для конверсии. Если медицински/лицензионно неподходящие тесты — можно выбрать neutral skill, но не выдавать это за результат измерения.

### Экран 5 — My Courses / OPORA
- Сначала факт допустимого baseline; если требуется — краткий hh-weekly-pulse (8 вопросов / 7 дней) и отдельный добровольный hh-module-finder F1–F8; GAD-7/Resource Pulse дополнительные по текущей модели.
- Важные различия: **темп по нагрузке** и **выбор учебного направления** — две разные сущности.
- Шесть направлений AS1…AS6 по актуальной версии TRAUMA-1.3, без объявления validated «стадий травмы». AS4 — только при профессиональном сопровождении, самостоятельный запуск запрещён **сервером**, не просто серой кнопкой.
- Перед уроком 1 пользователь подтверждает измеряемые шкалы. Затем запуск существующего Day-1 slide player. Не изменять утверждённое число слайдов; окончание урока — только после достижения конца и серверной фиксации, поздравление после этого.
- Программа — обучение и безопасная самопомощь; не monitored crisis service.
- Поведение free/paid концовки слайдов и текущие тарифы остаются такими, как утверждены отдельными задачами; это ТЗ их не изменяет.

### Экран 6 — Insights / My Profile
Один спокойный обзор с тремя самостоятельными разделами:
1. **Стандартизированные инструменты:** те же валидные шкалы, даты, версии, единицы, интервал, T0 → совместимый T+n, если доступно; обратная ориентация без переворачивания raw данных.
2. **Самонаблюдение HH:** настроение, энергия, нагрузка, восстановление, ресурс, дополнительно comfort; отдельная подпись «личные оценки, не диагностические нормы».
3. **Практики:** дни/уроки/минуты/добровольная обратная связь, **никогда не использовать XP или число слайдов как психометрическое улучшение**.

Даты/фильтры: последняя неделя, месяц, 3 месяца, свой период; только при наличии данных. Нули — настоящие ответы, пропуски — пропуски. При пустой истории показать «Пока нет сопоставимых замеров», а не нулевую линию.

Кнопки: «Пересдать, когда допустимо», «Открыть полный отчёт», «Продолжить курс», «Изменить цели». Любая передача специалисту только через явное разрешение доступа к **конкретному** результату.

## 2. Пользовательские сценарии (истины доступа)

| Flow | Старт | Ожидаемое поведение |
| --- | --- | --- |
| F1 Guest single | Без аккаунта выбирает 1 cleared+guestEligible тест | Consent → существующий server-backed guest runner → temporary result; Google НЕ обязателен; см. PR #643 |
| F2 Guest multi | Без аккаунта выбирает 2+ тестов | Честное приглашение в Google до начала saved battery; короткий TTL intent только из безопасных ID/enum, никаких ответов |
| F3 Guest ineligible | Выбирает account-only/restricted | Clear explanation/alternative, **не** обход access/rights |
| F4 Account battery | Владелец Google-аккаунта выбирает N методик | Сохранение через существующий private /api/app/test-plans с append; owner-scoped, без дублирования, затем запуск |
| F5 OAuth return | Гость согласен сохранить выбранные тесты/результат | Возврат к нужному экрану; **каждый** guest result переносится только по отдельному действию/согласию; никаких silent imports |
| F6 Earlier results | Владелец уже тестировался | Совместимые недавние результаты предлагаются к reuse, несовместимые не используются незаметно |
| F7 Course day 1 | Пользователь выбрал тесты, цели и шкалы | Согласие и server validation → правильный модуль/цикл → существующий slide player; без дубликата start |
| F8 Retest | Прошёл курс, срок измерения наступил | Оригинальный допустимый инструмент/версия/окно; корректное сравнение или объяснение несовместимости |
| F9 Sensitive screen | Высокие клинические сигналы/риск | Не автоматический диагноз, лекарство или интенсивная самостоятельная травма-практика; соответствующий безопасный signposting |
| F10 Historical client | Есть закрытые курсы и старые версии шкал | Точные исторические отчёты доступны своему владельцу, не пересчитаны новой логикой |

## 3. Функциональные требования (FR)

| ID | Требование | Прямой критерий |
| --- | --- | --- |
| FR-01 | Реестр и доступность | Доступная карточка только если есть test definition, registered version, startable, rightsStatus=cleared и подходящий audience |
| FR-02 | Простой подбор | После темы максимум 2 коротких рекомендованных теста на первом экране; опция показать все сохранена |
| FR-03 | Группировка похожих | Big Five дубли не доминируют старт, 27 VIA-форм вложены под полным 96-item профилем без удаления истории |
| FR-04 | Access truth | Точная разница guest single, account batch, inaccessible. Тексты соответствуют фактическому source и live |
| FR-05 | Результат с пользой | Компактный результат без вымышленных выводов, источник и все подшкалы в полном отчёте |
| FR-06 | Сохранение | Temporary guest result и permanent account result различимы; явный item-scoped Save, no implicit claim |
| FR-07 | Рекомендации | 1–3 объяснимые, versioned optional направления, без диагноза по symptom screen |
| FR-08 | Шкалы | 3–5 совместимых измеряемых шкал по действующему контракту, подтверждение до урока 1 |
| FR-09 | Курс | Reuse current 14-day cycle, no duplicate enrollment, no unsupported clinical AS4 |
| FR-10 | Retest | Exact instrument/version/scoring/locale/timeframe, due rules and missingness сохранены |
| FR-11 | История | Три раздельные линии и сохранение каждой завершённой записи без переозначивания |
| FR-12 | Приватность | Только account-owned/guest-scoped результат, data deletion/export policy, ни одного IDOR/implicit sharing |
| FR-13 | EN/RU/ES | EN/RU полные UX и content; ES не объявляется «валидированным переводом» без соответствующего инструмента |
| FR-14 | Accessibility | Поддержка клавиатуры, a11y дерева, focus, контраст, 320/390px, reduced motion |
| FR-15 | Monetization | Все существующие тарифы и публичные бесплатные обещания сохраняются; никаких новых paywalls |
| FR-16 | SEO | Тематические страницы только после рабочего CTA и права-cleared инструмента, canonical/hreflang без конфликтов |
| FR-17 | Analytics | Ни один PII/health signal не передаётся в рекламные события |
| FR-18 | Delivery | Исходная ветка, миграции, tests, preview, deployment SHA/live smoke фиксируются отдельно |

## 4. Детерминированный recommender: точный policy contract

### 4.1. Фильтрация доступных кандидатов
Сначала eligible = тест, который:
- реально зарегистрирован в текущем доступном catalog/definitions и на сервере;
- startable=true, rightsStatus=cleared для данной среды использования;
- имеет допустимый audience и guestEligibility (для guest);
- имеет корректный scorer/version, required locale и реальные вопросы;
- не помечен clinician_only/research_only/permission_required;
- не заблокирован по safety/age/locale.

**Никогда:** не рекламировать ссылкой «Пройти» research-only или «право на коммерцию ещё не подтверждено». Публикация названия и официального текста — разные права; не копировать item wording.

### 4.2. Сортировка и устранение дублей
Использовать **существующие** buildExplorerEntries/rankPublicTestMatches + scale guide, дополнить тонкой политикой:
- приоритет явной теме и добровольному запросу, затем типу/времени теста;
- выбрать один «семейный» основной Big Five в default battery, сохранив остальные в Advanced;
- полный IPIP-VIA-R 96 — опциональный развернутый профиль, не default quick;
- сохранить другие реестры и ранее сделанные выборы;
- max 2 предложения до «Показать ещё». Фактическая карточка может показывать другой язык оригинала с объяснением.

Match percentage — **совпадение с интересами и покрытием шкал**, не диагностическая точность и не процент благополучия. Логику ранжирования фиксировать в versioned тестах.

### 4.3. Маппинг результата → навык
Можно рекомендовать только при наличии:
- собственного результата (проверенный account/guest owner-scope);
- сопоставимой версии и scoring;
- реальной dimension, bounds/direction и semantics;
- действующего reviewed mapping assessment-key + dimension-key → trainable goal;
- user-declared goal/topic; отсутствие данных/отказ от цели обрабатываются без придумывания рекомендаций.

Отдельные категории:
- **symptom screening:** объяснить measured risk/uncertainty и ресурсы поддержки; не автоматически назначать работу над «низким баллом»;
- **resources and self-report current state:** нейтрально предложить подходящий навык (регуляция, опора, восстановление);
- **personality traits/typologies:** описывать, а не исправлять, не обещать улучшения черт за 14 дней;
- **traditional/symbolic scales:** отдельно в своей области, не mixing with medical endpoints.

Никаких внешних неаудируемых LLM решений о диагнозах/курсах на основе приватных анкет; текущий deterministic engine предпочтителен. При неоднозначности выводить «Рекомендация ориентировочная» и позволять ручной выбор.

### 4.4. Договор пользователя с параметрами
Система предлагает **1–3 образовательных направления**, но **3–5 измеряемых шкал** (если хватает действующих). Сохраняются отдельно:
- objective skill goal(s) (например, повседневные упражнения на мягкую саморегуляцию);
- primary metric per course cycle с текущими settings;
- дополнительные выбранные шкалы и источники;
- явное согласие и дата;
- версионированный mapping/recommendation rationale.

Не менять server course state по одному client-side клику; проверять текущий revision и owned results на сервере. Не перезаписывать историю выбранных шкал старых циклов.

## 5. Техническая архитектура и data contracts

### 5.1. Повторно использовать

| Existing area | Файлы/точки входа | Планируемая работа |
| --- | --- | --- |
| Каталог/score | data/assessments/catalog.js; lib/assessments/definitions.js, scoring.js, scale-guides.js | Eligibility/rights/locale и подсказки, не копирование тестов |
| Подбор/UX | components/app/simple-test-picker.jsx; test-explorer.jsx; public-test-explorer.jsx; lib/assessments/test-explorer.js | Первый путь, группировка, честные guest доступы |
| Guest consent/runner | components/app/cabinet-landing.jsx и существующие guest APIs | Продолжение/результат по consent; интеграция после PR #643 |
| Результаты | components/app/personal-result-report.jsx; compact-assessment-report.jsx; test-finish-actions.jsx | Компактный hero, сохранить подробности, честные CTA |
| Аккаунт | действующий Google OAuth и /api/app/test-plans | item-scoped Save, append/revision-safe, return route |
| Goals | components/app/course-r3-steps.jsx; course-focus-picker.jsx; lib/inner-growth/course-strategy.js | Проверка и подтверждение релевантных шкал |
| Курсы | lib/inner-growth/antistress-module-router.js, course-programs.js; lib/app/growth-course.js и growth-daily.js | TRAUMA-1.3, 14 дней, due follow-up, сохранение старых циклов |
| Кабинет/профиль | существующие My Tests/Insights/History компоненты | Правдивый tracking вместо отдельной новой БД |

### 5.2. Минимальный контракт AssessmentCatalogEntry
**Использовать текущую схему и названия полей; не добавлять новое хранилище:** key, version, instrumentLocale, title/description, questionCount/durationMinutes, axis/resultAxes/topics, testStyle/testLength, rightsStatus, startable, guestEligible, access, starterEligible, suggestedRepeatDays/cooldownDays, измеряемые axes.

Дополнительно потребуются **авторитетные метаданные/паспорт**, если ещё не хранятся: exact source/copyright holder, commercial/digital permission evidence, approved translations, locale/scorer/hash, clinician/safety gate, review status/date. Место хранения выбрать после проверки реального реестра (#626); metadata не даёт права начать тест.

### 5.3. Контракт AssessmentResultRef
Результат **в существующей** owner-scoped result storage, не в новом «GrowthResult». Минимальная информация для UI и сравнения:
- server-owned result ID/owner scope;
- definitionKey/version, scoringKey/version или эквивалентная immutable identity;
- instrumentLocale, definition/hash where available;
- measuredAt/completedAt, recall window/time zone if appropriate;
- dimensions[{key,value,min,max,unit,direction}];
- источник согласия и тип (validated/self-monitoring/typology);
- доступность для курса/retest/передачи специалисту.

Названия полей **контракт уровня требований**, не заявление о наличии отдельных колонок с точно такими именами. Перед миграцией проверить действующую схему app.assessment_results, guest ephemeral store, immutable version tables и все legacy данные. Дополнение делать additive; миграция с readback и RLS/tests.

### 5.4. Контракт CourseFocusSelection
Предпочтительно reuse existing app_private.growth_courses.scale_keys / goals / versioned encrypted context и цикл:
- account_id + course/cycle id, revision;
- selected user goals и valid owned scale keys;
- result provenance для обоснования;
- primaryMetric для каждого образовательного модуля;
- согласие и дата выбора;
- reviewed mapping version, когда нужен новый алгоритм;
- retest due rules / pinned baseline.

Не хранить sensitive answers, свободные эмоциональные заметки и диагнозообразные данные в URL/sessionStorage/analytics; временный browser selection intent должен содержать только проверенные test keys/категориальные настройки с коротким TTL, как в существующем lib/app/test-selection-intent.js.

### 5.5. API boundaries (подтверждённые существующие + правила)
- GET /api/app/bootstrap — только допустимые данные о своём аккаунте/сессии.
- POST /api/app/test-plans — checked account-owned selection; appendActive, idempotency operationId, valid versions.
- POST /api/app/auth/start — только безопасное направление OAuth, без результатов в redirect.
- /api/app/course — существующий state machine и revision, server-owned validation, stage/consent.
- Existing guest runner/result API — **проверить по текущей ветке и PR #643**; не предполагать новые публичные endpoints без необходимости.
- Recommendation computation использовать из существующих deterministic modules; новый endpoint — только если приватность/масштаб требуют этого и после API audit.

Нельзя доверять присланным от клиента баллам, selected resultId другой учётной записи, итоговому moduleId или произвольному набору шкал. Сервер сверяет всё с собственным source/scorer и account ownership.

## 6. Измерение прогресса и OPORA

### 6.1. Три независимых шкалы результата
A. **Formal measurement**: тот же инструмент/compatible version, тот же recall window, собственная единица, scorer, direction, дата.  
B. **Subjective self-observation**: авторские HH daily/weekly checks 0–10 или иные чётко подписанные личные оценки.  
C. **Engagement**: completed lessons/time/consented feedback.  

Их нельзя складывать, сравнивать друг с другом или объявлять «эффективностью лечения».

### 6.2. Индивидуальный T0 → T+n
- У каждого course cycle pinned baseline, source result, primary metric, locale, scoring/version, диапазон и due date.
- Повтор допустим не потому, что урок 14 завершён, а когда **методика разрешает** такой интервал; история других интервалов не подменяется.
- Symptom scales: «меньше» иногда лучше; resource scales: «больше» иногда лучше; trait scales вообще не цели коррекции.
- Если ноль — валидный ответ, пропуск — null; no imputation, no fake zeros. Изменение raw представлять с явно указанным направлением, не как «здоровье +30%».
- Если шкала сменила edition, scoring direction или window — выводить две отдельные записи и пояснение «не сравниваем автоматически».
- Не требовать retest вне сроков, не скрывать неулучшение.

### 6.3. OPORA restrictions
Из актуального маршрутизатора: AS1 first safety/support, AS2 stabilization, AS3 everyday emotions, AS4 clinician-supported trauma care, AS5 integration/self-support, AS6 return to daily life. Это **образовательные задачи, не стадии травмы**.

Основные planned metrics из исходного контракта:
- AS1: hh-module-finder::F2
- AS2: hh-weekly-pulse::weekly.load
- AS3: hh-module-finder::F4
- AS4: нет автоматического самостоятельного primary outcome; gate квалифицированного сопровождения.
- AS5: hh-module-finder::F7
- AS6: hh-weekly-pulse::weekly.functioning

Требуются: соблюдение server-side AS4 guard, проверка pin primaryMetric и follow-up сохранения, пользовательский skip/stop и исторические legacy module titles. PR #600 уже в базе, PR #620 требует отдельного QA; **не представлять его открытые изменения как live**. Не вмешиваться в утверждённую структуру 15 слайдов без отдельного решения.

## 7. Защита данных, безопасность и право

**Consent layers**: a) обязательная обработка на конкретный гостевой тест, b) явное permanent Save конкретного результата, c) подтверждённый курс и выбранные параметры, d) отдельное конкретное согласие на обмен отчётом с выбранным специалистом. Нельзя трактовать один Google login как универсальное разрешение читать/сохранять/распространять все данные.

**Data isolation:** actor/owner scoped database operations + RLS/database checks; token/signed selector только с ограниченной областью/TTL; anonymous test result не отображает других account records; logout/re-login/revocation/cross-device должны вести себя предсказуемо.

**Storage and logging:** приватные ответы и свободный текст не помещать в URL, persistent browser storage, system logs, error telemetry, GA4, Meta pixel, рекламные CRM. В OAuth permitted sessionStorage — только whitelist ID/enum with TTL, не ответы или жалобы. Export/delete следуют существующей privacy policy, не обещать нового автоматического срока удаления до проверки БД/закона.

**Licensing:** бесплатная академическая лицензия не является разрешением для коммерческого digital wellness. Для WHO-5, PSS, ISI, GSE, AUDIT/DAST, ECR, SCOFF, MLQ и других ограниченных версий — review_required до достаточных доказательств для заданного использования, языка и scope. CFPB и IPIP-VIA-R проверять согласно документированным source-контрактам, а не просто копировать.

**Safety:** screening/личностные результаты не создают диагноз; клинические красные флаги дают соответствующие безопасные ресурсы и обращение за помощью, не принудительный платный курс, не автоматический подбор препаратов. Для imminent risk — экстренные/кризисные сервисы региона; сайт не emergency monitoring.

## 8. Нефункциональные требования (NFR)

| ID | Contract |
| --- | --- |
| NFR-1 Mobile | iPhone Safari/WebKit и Android Chrome; viewport 320, 390, 768 и desktop 1440 px, нулевой horizontal overflow на новых экранах |
| NFR-2 A11y | WCAG 2.2 AA как целевой стандарт: headings, labels, live validation, keyboard-only, focus ring, semantic expandable controls, ≥44×44 px click target где возможно |
| NFR-3 Visual | Navy для выбора/кабинета/курса, burgundy только для начала теста; не ухудшать читаемость на светлых подложках |
| NFR-4 Performance | Измерить реальный mobile p75; для публичных входных страниц ориентиры LCP ≤2.5s и CLS ≤0.1 при осуществимости, без обещаний при отсутствии замера |
| NFR-5 Resilience | Idempotent submits, revision/CAS, no lost test-selection after OAuth/retry/reload, no duplicate course cycle |
| NFR-6 Source integrity | Не менять ранее опубликованные scoring hash/definition identity задним числом; append-only версии и миграции |
| NFR-7 Privacy | Нет sensitive data/identifiers в third-party marketing analytics/logs/query strings |
| NFR-8 Localization | EN/RU content and controls без truncation; ES fallback честно указывает действительный язык инструмента |
| NFR-9 Compatibility | Сохраняются история, legacy NAV cycles, PDF, account-saved test batteries, Quick/Guided and existing course billing gates |

## 9. Обязательная QA матрица и приёмка

Каждый case выполнить на synthetic data / isolated environment. Для production smoke использовать только тестовые/разрешённые учётные записи; не показывать реальные клиентские результаты разработчикам.

| Case | Проверка | Ожидаемый результат |
| --- | --- | --- |
| QA-01 | Public EN/RU первый экран, темы и CTA, iPhone 390/320 | Нет скролла вбок, действие понятно, кнопка соответствует типу |
| QA-02 | Неавторизованный adult выбирает один guestEligible cleared | Consent → существующий guest runner → результат без Google после релиза PR #643 |
| QA-03 | Guest не принимает обязательное consent | Нет start/persist результата |
| QA-04 | Guest выбирает 2+ / account-only | Честный Google gate; не запускается запрещённый гостевой batch |
| QA-05 | Google OAuth return после ранее сделанного выбора | Правильные test IDs восстановлены, ответы/чувствительные поля в intent отсутствуют |
| QA-06 | Guest Result: отказ сохранять | Никакого implicit claim в аккаунт, временный результат изолирован |
| QA-07 | Guest Result: явный item Save | Сохраняется только выбранный результат, duplicate submit не создаёт дубль |
| QA-08 | Account multi test append | Добавляет выбранные тесты, не стирая старую батарею/историю |
| QA-09 | Quick vs Guided same form | Совпадает score для одинакового набора ответов и версии |
| QA-10 | Реверсивные, N/A, missing, 0 | Никакой подстановки 0 за пропуск, original scorer корректен |
| QA-11 | 96-item IPIP-VIA-R, grouped standalone scales | Правильные 24 dimension, отдельные 27 форм доступны в Advanced/старой истории |
| QA-12 | CFPB 5-item + two qualifiers | Официальная возрастная/режимная lookup scoring, никакой raw sum-as-score |
| QA-13 | Research-only/rights-gated карта | Видна справка, но нет startable / обхода через API |
| QA-14 | Компактный результат 5/8/50/115/96 item разного типа | Главный смысл читаем, все реальные subscales и источники доступны в detail |
| QA-15 | Symptom vs trait vs HH custom guidance | Нет диагноза, pseudo-percentile или рекомендаций «исправить личность» |
| QA-16 | 1–3 suggested skills + 3–5 measured scales | Обоснование, редактирование, согласие persist до урока 1 |
| QA-17 | Свежий и устаревший compatible baseline | Свежий повторно используется с согласием, старый не маскируется под новый |
| QA-18 | OPORA route с полным F1–F8 и явной целью | Стартовый модуль учитывает цель/настоящие измерения, не просто max stress |
| QA-19 | Форсировать AS4 с client-side payload | Сервер отвергает self-guided treatment без профессионального gate |
| QA-20 | Закрытый legacy NAV course и новый TRAUMA-1.3 | Нет переименования старого завершённого курса, новой ошибочной пересборки |
| QA-21 | Урок 1 и финал урока | Только server-confirmed completion после последовательности утверждённых слайдов |
| QA-22 | Тест до и после 14 дней с несовместимой версией/окном | Нет автоматического сравнения или «излечения» |
| QA-23 | T0 / valid T+n / guest history / nil | Даты/версии/zero/missing корректны, три timeline не смешаны |
| QA-24 | Приватный чужой result/course ID | 403/404, нет leakage даже через PDF/Insights/API |
| QA-25 | Analytics/network/log inspection | Никаких test answers, personal concern, score, client identifiers, full private URLs в trackers |
| QA-26 | EN/RU, fallback ES, iPhone/back/refresh | Локализация и возврат без потери прогресса, текст/кнопки не срезаны |
| QA-27 | Разрыв связи / response lost / double tap | Идемпотентность, no duplicate assessment/cycle, безопасный retry |
| QA-28 | Актуальность релиза | GitHub HEAD ancestry → READY Vercel → alias SHA → EN/RU live smoke; фиксируется evidence |

**DoD каждого PR:** сослаться на FR/NFR/QA IDs, приложить altered files + migration status, tests/CI, QA screenshots или replay, rights/content review, release blocker/feature flag status. «Unit tests passed» не является подтверждением live.

## 10. Поэтапное техническое исполнение (Codex contract)

**PR-A — Inventory + release gate / HH-TX-01/06.** Reconcile catalog/scope, права, actual count, feature flags, открытые PR, exact source/live, QA fixtures. Только безопасные fixes; без нового теста ради числа.

**PR-B — Guest + first-step UX / HH-TX-02/03/04.** Сначала review #643; если он mergeable и согласован, интегрировать вместо повторения. E2E EN/RU /client ↔ /app/tests ↔ OAuth, no implicit saving. Reuse navy/burgundy.

**PR-C — Result summary / HH-TX-05.** Локальная надстройка CompactAssessmentReport/PersonalResultReport, separate output for symptom/resource/trait; все legacy подробности/PDF остались. QA минимум 10 representative scores.

**PR-D — Goals/course / HH-TX-07/08/09.** Сверить уже merged #600 и open #620/#617. Измеряемые шкалы до Lesson 1, reviewed source mappings, AS4 server guard, no duplicate cycles.

**PR-E — Insights / HH-TX-10/11.** Timeline and due dates from original stored results/cycles, no new fake overall outcome, no data migration unless justified and tested.

**PR-F — Discovery/SEO / HH-TX-12/13.** Сначала вышеуказанный функционал и privacy review, затем тематические landing pages EN/RU и каталог без дублей.

**Release:** маленькие автономные PR на актуальный codex/public-book-library; не объединять незавершённые feature ветки без сравнения tree/ancestry. App QA + isolated DB + Chromium/WebKit + actual production verification. При Vercel quota/402 **не** создавать бесконечные лишние деплои или молча менять тариф.

## 11. Definition of Ready / Definition of Done для всей программы

### Ready
- Сверены текущие #626/#599/#338/#179, последние PR, существующий источник в MySpace, actual branch head и production deployment.
- Известен baseline критических маршрутов и реальное число доступных методик.
- Нет нерешённого copyright/privacy gate у стартовых тестов.
- Для каждого блока есть маленькое реализуемое изменение, которое не переписывает проект.

### Done (система, а не просто код)
- Любой 18+ гость с согласия проходит один действительно guest-eligible стартовый тест EN/RU и получает корректный временный результат без Google.
- Пользователь, который выбирает multi/account путь, понимает необходимость Google; выбранная батарея не теряется, чужие результаты/guest ответы не импортируются.
- Результат удобочитаем на iPhone, показывает реальные значения/ограничения, подробно раскрываемые шкалы и честные рекомендации.
- Перед измеряемым курсом пользователь видит и редактирует предложенные цели и 3–5 измеряемых шкал и подтверждает их; сервер хранит owner-scoped выбранные значения.
- OPORA и остальные реально доступные курсы не запускают самостоятельный AS4 и не смешивают нагрузку с «клинической фазой»; старые данные не повреждены.
- История показывает отдельно собственно измерения, self-check и практики, корректные окна и due retest.
- Все P0 privacy/security/licensing/scoring/consent regression checks проходят; нет чувствительных событий в маркетинговой аналитике.
- Производственный deployment READY, live alias отдает expected descendant SHA, smoke EN/RU recorded; только после этого отметить Live.

## 12. Шаблон команды Codex для конкретного спринта

> Прочитай оба документа My Space: HOLISTIC_HOUSE_TESTS_GROWTH_ROADMAP_2026-10-15.md и HOLISTIC_HOUSE_TESTS_IMPLEMENTATION_SPEC_2026-10-15.md. Сверь актуальный HEAD codex/public-book-library, доступные AGENTS инструкции, открытые PR #643/#620/#617/#388, текущий Vercel alias и схему assessment/guest/account/course. Выполняй только FR/QA выбранного спринта, НЕ строй дублирующий движок, НЕ переписывай пользовательские результаты/таргеты/тарифы/уроки и не выдумывай лицензии. Используй синтетические данные, additive changes и небольшие PR. Приложи test matrix, CI и readback. Не заявляй Live без READY deployment, alias SHA и EN/RU end-to-end smoke; если blocked, оставь точное описание блокера и не пытайся обходить биллинг без отдельного согласия.

**Конечный результат:** надёжный продуктовый путь, который помогает человеку начать с малого, осмыслить результаты, добровольно выбрать направление и наблюдать свою динамику — без чрезмерных медицинских утверждений, потери приватности или бесконечного увеличения числа тестов.
