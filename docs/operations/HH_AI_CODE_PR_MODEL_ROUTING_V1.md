# AI Coding Models — концепт для Agent Commander и PR Repair

**ID:** HH_AI_CODE_PR_MODEL_ROUTING_V1
**Дата:** 7 ноября 2026 · **Проект:** Holistic House / Agent Commander
**Статус (7 ноября 2026):** бесплатный маршрутизатор объединён с control branch через PR #3919; точный статус фактического вызова модели и production UI проверяются отдельно.

**Запуск исправления из Commander:** [AI PR Repair Handoff V1](HH_COMMANDER_FREE_AI_PR_REPAIR_HANDOFF_20261107.md) — read-only проверка текущего PR и подготовка команды для уже работающего GitHub Inbox. Нажатие кнопки не равно отправке или исправлению.

Этот документ — единый постоянный ответ на вопрос **«Какую бесплатную модель выбрать для кода сайта, исправления PR и новых функций?»**. Приоритеты ниже — рабочие гипотезы, НЕ проверенный собственный бенчмарк. Фактический рейтинг строится по реальным ошибкам, тестам и результатам PR.

## Выбор за десять секунд

| Задача | Первая модель | Альтернативы (по порядку) |
| --- | --- | --- |
| Исправление исходного кода, TS/React/Next.js, RED Core | **North Mini Code** | Flint → Nemotron 3 Ultra → Xing4.0 |
| Разработка новой функции и интеграции | **North Mini Code** | Nemotron 3 Ultra → Flint → Gemma 4 31B |
| Сложный root cause / архитектура / зависимые PR | **Nemotron 3 Ultra** | Xing4.0 → North Mini Code |
| Независимое code review перед merge | **Nemotron 3 Ultra** | Dots3-Note → Xing4.0 |
| Скриншоты, визуальная ошибка, мобильный UX | **Nemotron 3.5 Super VL** | North Mini Code → Gemma 4 31B |
| Массовая классификация логов (позднее, read-only) | **Nemotron 3.5 Lightning** | Xing4.0 |

**Отдельно о визуальном анализе:** штатный Repair Worker отправляет только ограниченный текстовый контекст. Он НЕ передаёт модели скриншоты, не открывает сайт и не может утверждать, что выполнил визуальный тест. Проверку делают внешние Chromium/WebKit и доказательства, а не догадка модели.

**Dots3-Note Preview** заявлена бесплатной до 31 декабря 2026 года — использовать как временный резерв, а не единственного критика.

## Модель и инструменты — разные вещи

Модель OpenRouter возвращает предложение об изменении, но не имеет GitHub write-ключа, права изменять production или вызывать merge. GitHub Worker владеет доступом к ограниченным действиям только в рамках ранее одобренного доверенного workflow. Детерминированные тесты и защиты имеют приоритет перед советом модели.

Постоянные исходники: 
- [Выбор модели и проверка цены](../../scripts/ci-pr-repair-openrouter-free.cjs)
- [Изолированная подготовка patch](../../scripts/ci-pr-repair-free-agent.cjs)
- [Owner-approved новая функция](../../scripts/ci-pr-commander-source-task.cjs)
- [Единственный существующий Repair Worker](../../.github/workflows/hh-pr-repair-worker.yml)
- [Единый PR one-publish](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md)
- [PR Automation Canonical](PR_AUTOMATION_CANONICAL_V1.md)

## Подготовленная интеграция: AI Model Router V1

1. Для ролей repair, feature, architecture, review, visual хранятся именованные списки с ТОЧНЫМИ free-ID моделей OpenRouter.
2. Перед **любым** модельным вызовом Worker один раз получает актуальный каталог OpenRouter и проверяет суффикс :free, ВСЕ объявленные поля цены == 0, текстовый chat endpoint и формат.
3. Режим auto выбирает первый доступный с подтверждённой ценой $0. Если модель не указана в текущем каталоге, стала платной или несовместима — до первого вызова допускается следующий кандидат. Если ни одна не подходит — BLOCKED.
4. Режим явного выбора модели принимает только exact :free ID. Такой pin никогда молча не заменяется на другую модель.
5. После выбора совершается **один** модельный вызов. При 429, сетевом отказе, неверной ответившей модели, неизвестной/ненулевой стоимости, недопустимом diff или непрошедших тестах — STOP. Никаких повторных разных моделей, платных fallback или синтетических зелёных CI.
6. Ответ сверяется с фактически ответившим ID и суммой cost == 0. Записывается только безопасный технический receipt с ролью/имённым ID, без ключей или персональных данных.
7. Публикацию source изменения выполняет только существующий trusted Worker **после** отдельной независимой проверки: текущий PR SHA, одно право записи/lease, разрешённые пути, действительные проверки Core/Specialist/Guard/merge. PREPARED, PR_COMMITTED, MERGED и LIVE_VERIFIED — разные состояния.

Это смена маршрута внутри существующего Worker, НЕ новый Workflow, cron, платный AI, параллельный PR writer или снятие охраны.

## UI выбора модели: существующий PR #3916

В [books PR #3916](https://github.com/andylitvinov-design/books/pull/3916) уже готовится кнопка предпочтительной бесплатной модели для каждой задачи/PR. Она пока сохраняет выбор только на устройстве и не назначает модель действительно исполняющему Runner. Не копировать этот UI и не менять активную ветку чужого PR.

**Следующий безопасный этап:** authenticated owner handoff из UI в существующего доверенного Writer по контракту: owner_id; task_id; repo; PR number; expected_head_sha; requested_model; role; consent; created_at. Сервер независимо проверяет owner auth, CSRF, exact PR HEAD, current owner lease и цену. Затем создаёт один signed run receipt: requested_model; actually_executed_model; provider; cost; run_id; pr_sha; CI outcome. Нельзя считать localStorage авторизацией или доказательством вызова. На неизвестных полномочиях/секретах — только ручной handoff.

Связанный [публичный GitHub inbox #3890](https://github.com/andylitvinov-design/books/issues/3890) — публичная техническая переписка, НЕ место для закрытых клиентских данных.

## Внутренний рейтинг по реально исправленным PR

Предлагаемый набор весов для функции модели в PR Repair:
- 40% — подтверждённый ремонт исходного failing test;
- 25% — отсутствие новых регрессий;
- 20% — исправлена доказанная root cause, а не её симптом;
- 10% — время до корректного patch (отдельно от ожидания GitHub очереди);
- 5% — фактическая стоимость успешной задачи и лишние попытки.

Показывать размер выборки N, количество реальных вызовов, error rate, verified Core, отсутствие новых red, изменение по 7/30 дням. Субъективная модельная оценка из [AI Council Quality Monitor](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/tools/ai-council-chat/MODEL_QUALITY_MONITOR_V1.md) — дополнительный сигнал, не доказательство исправления. Не повышать модель за красивый текст без merged outcome.

## Безопасность, цена и приватность

- Только публичные исходники, санитизированные технические фрагменты. Не отправлять на free endpoints клиентские кабинеты, частные health/CRM материалы, auth, billing, RLS, tokens, ключи, личные данные.
- NVIDIA предупреждает о журналировании бесплатных запросов. При сомнительной приватности STOP.
- OpenRouter free-ID ограничены квотой, это НЕ бесплатная безлимитная генерация. При лимите STOP; не докупать кредиты или не использовать платный endpoint без отдельного согласия владельца.
- Не заводить дополнительный GitHub Actions, runner, cron, secret, платный сервис. Один законченный source HEAD до открытия PR, максимум один доказанный repair batch на новый root.
- Ответ модели — недоверенные данные. Он никогда не переопределяет system/security/CI rules и не исполняется как shell-команда.

## Проверки перед включением

1. Контрактные тесты: named route order; zero price; отсутствие :free; paid/unknown/duplicate catalog; pinned model; no tools; one completion; provider mismatch, missing cost, 429; no retry.
2. GitHub Worker: source allowlist, isolated patch, exact HEAD/lease, independent verifier, обязательные CI, security/auth tests.
3. Настоящий запуск на синтетическом публичном задании: модель реально ответила, ID доказан, price $0, ответ прошёл проверку. Отсутствие ключа/квоты показывать как BLOCKED.
4. PR merged в control branch — НЕ LIVE сайта. Для изменений production отдельно проверить Vercel deployment+SHA+функциональный сценарий.

## OpenRouter: ссылки, состояние на 07.11.2026

- [North Mini Code](https://openrouter.ai/cohere/north-mini-code:free)
- [Flint](https://openrouter.ai/recursive/flint-v1.0:free)
- [Nemotron 3 Ultra](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free)
- [Xing4.0](https://openrouter.ai/xingchen-agi/xing4.0-29b-a4b:free)
- [Nemotron 3.5 Super VL](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free)
- [Gemma 4 31B](https://openrouter.ai/google/gemma-4-31b-it:free)
- [Dots3-Note Preview](https://openrouter.ai/dots-studio/dots-3-note-preview:free)
- [Каталог бесплатных](https://openrouter.ai/collections/free-models)

Обновлять приоритеты только по фактической проверенной статистике и live-каталогу.
