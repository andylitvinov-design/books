# HOLISTIC HOUSE COMMAND CENTER 3.2
## Strategy-to-Execution OS — единая система целей, проектов, задач и автономных AI-исполнителей

**Дата:** 6 ноября 2026 года. **Редакция:** RFC 3.2 / расширенное техническое задание / программа реализации.  
**Проект:** Holistic House, основной репозиторий `andylitvinov-design/books`.  
**Production-ветка:** `codex/public-book-library`; **default branch при проверке:** `codex/bootstrap-books`.  
**Архитектурный статус:** целевая конструкция. Настоящий документ **не подтверждает**, что новые компоненты реализованы, соединены с провайдерами либо выпущены в LIVE.  
**Экономическое ограничение:** не подключать новые платные сервисы, тарифы, фоновые контейнеры и API без отдельного подтверждения владельца. Использование уже существующих платных ресурсов тоже учитывается как потребление, а не как «бесплатное».  
**Ключевое требование:** цель ставится один раз; система сама составляет и ведёт план, назначает допустимых исполнителей, запускает реальные процессы, проверяет доказательства результата, исправляет сбои в заданных пределах и уведомляет владельца о решениях, требующих его участия.

---

## 0. Управленческое решение / Executive summary

**Решение:** развиваем существующий `/admin/automations` в **единый приватный Command Center**, соединяющий линейное стратегическое планирование (идеи Linear), долговечное делегирование (идеи Hermes) и защищённые событийно-плановые запуски (идеи OpenClaw). Собственный модуль `Proof & Release` связывает работу с GitHub, CI и реальным production.

**Точка сборки — стратегический результат**, а не AI-чат и не отдельный cron: `Mission → Objective → Key Result → Initiative → Project → Milestone → Task → Assignment → Execution Run → Evidence → Outcome`. Задачи и агенты рассматриваются как средство достижения измеряемых результатов.

**Что видит владелец:** один обзор «главное сегодня», портфель проектов, приоритетную очередь, карту агентных ролей и конкретных исполнителей, ожидаемые решения, достоверные доказательства результата, доступные бюджетные лимиты, предупреждения о stalled/blocked задачах и ежедневный управленческий брифинг.

**Что делает система:** обнаруживает новое событие/проблему; сопоставляет с целью; предотвращает дубли; выбирает приоритет; проверяет разрешения/ресурсы; резервирует и действительно запускает worker; получает структурированный результат; передаёт независимому верификатору; повторяет работу или эскалирует, не создавая бесконечных циклов.

**Свойства, без которых система не принимается:** настоящие автоматические запуски; сохранение состояния между запусками; атомарные claims; отсутствие дублирующих правок и PR; подтверждение source-of-truth; безопасный budget gate; право owner на `Pause all`; отсутствие ложных статусов «готово» или «LIVE».

### 0.1 Что НЕ строим

- Не устанавливаем Linear как обязательную платную зависимость. Заимствуем модели инициатив, ключевых этапов, triage, agent delegation, health и регулярных updates, реализуя их в своей базе и интерфейсе.
- Не создаём второй независимый CI/merge-автомат, поскольку PR Control Tower уже управляет этой областью.
- Не считаем обычную беседу ChatGPT программно запускаемым 24/7 worker. ChatGPT может участвовать через доступные управляемые интерфейсы/человеко-ориентированные handoff, но автономный запуск требует подтверждённого API/CLI/SDK или сервиса.
- Не доверяем агентному сообщению «готово» без внешних проверок; не выдаём запланированные автоматизации за работающие.
- Не копируем SQLite/таблицы Linear/Hermes/OpenClaw, их внутреннюю реализацию или закрытые интерфейсы; используем открыто описанные паттерны и свои схемы.

## 1. Текущая база: что подтверждено и что только планируется

Проверены файлы production-ветки `codex/public-book-library` в GitHub. Это **аудит файлов**, а не проверка их реального runtime-статуса в production.

| Существующая часть | Подтверждённая реализация | Что недостаёт для Command Center |
|---|---|---|
| `/admin/automations` | Owner-страница задач Video Scout, Council, классификатора и журналов | Общий портфель целей, Kanban, реестр агентов, мониторинг любых проектов |
| `/api/admin/automations` | Проверка владельца, фиксированный whitelist четырёх задач, pause/resume/run | Универсальная, но строго policy-gated команда task/agent/approval |
| `lib/automations/scout-db.mjs` | Приватные записи, идемпотентный slot, lease, generation, receipt | Общая БД стратегических объектов, task graph, provider runs, outbox/inbox |
| `lib/automations/weekly-council-runner.js` | Ограниченные предложения Совета, требующие owner review | Постановка задач из утверждённых решений, измерение ценности, связь с целями |
| `lib/automations/worker-adapters.mjs` | Внешние Hermes/OpenClaw отключены; причина `NO_APPROVED_EXTERNAL_RUNTIME` | Реальный broker и запуск после проверки sandbox, auth, квот и полномочий |
| `scripts/owned-agent-gateway.mjs` | Локальный узкий gateway к Ollama `/api/chat`, без инструментов Git | Tool-capable headless runtime, если разрешён и доступен |
| GitHub PR/CI | Текущие gate `hh-pr-core-release.yml`, `hh-pr-sweep-guard.yml`, `scripts/pr-sweep-guard.mjs` | Интеграция Task→PR→CI→Release без второго merge-owner |
| `vercel.json` | Существуют cron paths (включая `/api/internal/video-scout-hourly`) | Единый reconciler без спонтанного размножения cron-заданий |
| `ai-projects-brain` | `GLOBAL_PR_ONE_PUBLISH_V1` задаёт режим publish/repair | Прямая проверка policy перед каждым агентным кодовым действием |

**Критическое ограничение веток:** GitHub `schedule` исполняется из default branch, а production находится на другой ветке. Любое решение о 10-минутном tick должно отдельно проходить тест наличия доверенного bootstrap на правильной ветке и проверки исполняемого SHA.

### 1.1 Граница между данным RFC и LIVE

Для каждого компонента вводим три независимых атрибута: `spec_status` (описан / approved), `implementation_status` (код/тесты/merged), `runtime_status` (enabled/healthy/observed). Пока реальный запуск или событие не подтверждены, status = `unknown` или `not_activated`, а не `green`.

## 2. Реинжиниринг инструментов — что берём и как переосмысляем

| Источник | Подтверждённый принцип | Наша реализация | Что не переносим |
|---|---|---|---|
| Linear Initiatives | Цели объединяют проекты, у каждой инициативы priority, owner, health и update | Objectives/Initiatives/Portfolio Health, единый executive dashboard | Привязку всего к Linear workspace и тарифу |
| Linear Milestones/Project Graph | Этапы, timeline, график прогресса и изменений scope | Milestone board, forecast с confidence, scope-change журнал | «Прогноз» до накопления достаточных данных |
| Linear Triage Intelligence | Связанные/дублирующиеся задачи и рекомендации assignee/label | Разбор входящих задач, дедупликация, объяснимые назначения | Автоприменение AI-решения без проверки правил |
| Linear Agent/Loops | Агент использует контекст задач, работает по событиям/расписанию | Task-context bundle + event reactor + policy-bound run | Предположение, что Loops бесплатны по вычислению |
| Hermes Kanban | Durable queue, named profiles, dependencies, handoff и reviews | task_graph, lease, reviewer checkpoint, retry contract | Зависимость от одного процесса Hermes и его SQLite |
| OpenClaw Automation | Gateway, isolated jobs, webhooks, hooks и execution history | Gateway adapters с capability allowlists и durable event log | Публичный unrestricted shell или общую сессию для всех задач |
| Codex harness | `codex exec`/SDK/app-server для программно управляемых coding runs | Опциональный `codex_cli` adapter в ограниченном execution environment | Путаницу ChatGPT subscription с бесплатным API доступом |
| GitHub | Issues, PR, checks, Actions, branch protection, merge & deploy | Авторитетный источник кода и release evidence | Дублирование самого GitHub в Supabase |

**Реализационный вывод:** строим свой управленческий слой, а Linear/Hermes/OpenClaw/Codex — опциональные инструменты или источники инженерных паттернов. Владелец может однажды подключить Linear двусторонним адаптером, но ядро системы продолжит работать без него.

## 3. Иерархия Strategy-to-Execution

### 3.1 Основная модель

1. **Mission / миссия:** общее предназначение Holistic House. Меняется владельцем, не агентами.
2. **Objective / стратегическая цель:** конечный желаемый эффект (например: «пользователь получает готовый ролик на мобильном»), срок обзора, owner и измеряемые Key Results.
3. **Key Result / результат:** конкретная метрика, `baseline → target`, правило измерения, окно данных, provider/source и степень доверия. Не заменяется числом выполненных PR.
4. **Initiative / инициатива:** согласованная стратегическая программа нескольких проектов — аналог Linear Initiatives.
5. **Project / проект:** самостоятельный продукт/поток, может входить в несколько инициатив через таблицу связей, но имеет одного владельца исполнения.
6. **Milestone / этап:** проверяемый промежуточный результат; нужна конкретная acceptance, а не дата ради даты.
7. **Task / задача:** атомарная единица со scope, acceptance, зависимостями, риском, допуском автоматизации и оценкой усилий.
8. **Assignment / назначение:** выбранная роль и реальный provider/worker с обязательными permissions, лимитами и объяснением выбора.
9. **Run / попытка:** подтверждённое исполнение с внешним ID, heartbeat, протоколом и cost record.
10. **Evidence / доказательство:** независимая проверка, привязанная к исполнению и целевой метрике.

Между сущностями есть зависимости, но это **не** одна бесконечная иерархия: `Objective ↔ Initiative`, `Initiative ↔ Project`, `Project ↔ Task`, `Task → prerequisites`, `Task → multiple attempts`. Для связей используются явные join-таблицы, а не зашитый JSON.

### 3.2 Стартовый портфель (только названия и структура)

| Стратегическое направление | Продуктовые проекты | Примеры допустимых KR | Статус до чтения источников |
|---|---|---|---|
| Клиентский продукт | Video Studio, Auto Video Director, AI Companion, Client Cabinet | E2E completion, успешный playback, конверсия в завершение | `unknown` |
| Практики и образование | Academy, Reiki, ОПОРА, Tests | Завершение уроков, успешные проверки, активность | `unknown` |
| Привлечение и развитие | SEO, аналитика, Telegram, контент | Посещения, переходы, заявки с проверенным источником | `unknown` |
| Технологическая надёжность | CI/PR, PWA, Billing, Security | p95 merge lead time, ошибки релиза, cost per verified result | `unknown` |

Никаких придуманных процентов прогресса на первой загрузке. Прогресс доступен только после привязки к реальным данным или подтверждённой ручной оценке, помеченной как `manual_estimate`.

### 3.3 Стратегическая карточка инициативы

Поля: `title`, `mission`, `owner_id`, `priority`, `state`, `horizon`, `risk_level`, `budget_policy_id`, `objective_ids`, `project_ids`, `success_definition`, `expected_customer_value`, `review_cadence`, `last_review_at`, `health`, `health_reason`, `evidence_sources`, `confidence`, `approved_scope_revision`.

Инициатива получает health `on_track/at_risk/off_track/unknown`. Health определяется **не цветом по интуиции AI**, а комбинацией: verified KR signal + milestone lateness + dependency blockers + aging + бюджет + stale evidence. Совет может дать объяснение, но не публикует сомнительную оценку как факт.

### 3.4 Контур еженедельного стратегического пересмотра

`Observe KPI → Compare target/baseline → Detect gap → Generate proposal → Rank initiatives → Owner approves strategic changes → Planner creates bounded task graph → Dispatcher executes`. Так система постепенно действует не только по найденным багам, но и по измеряемым целям. AI не меняет миссию, платные бюджеты и scope инициатив без утверждения.

## 4. Информационная архитектура dashboard

### 4.1 Навигация

| Раздел | Основная функция | Что можно сделать |
|---|---|---|
| **Обзор** | 3 приоритета сегодня, health портфеля, активные работы, блокировки | Открыть важную задачу, запустить разрешённый диагностический анализ |
| **Стратегия** | Objectives/KRs, Initiatives, roadmap, прогноз | Изменить владельца/приоритет/цель с аудитом и подтверждением |
| **Проекты** | Список продуктов, Milestones, зависимости, timeline | Перейти к этапу, выбрать следующую поставку |
| **Задачи** | Kanban, очередь, фильтры, подробная карточка | Approve/reprioritize/pause, назначить роль/runner, увидеть историю |
| **Агенты** | Registry, capabilities, online/disabled, нагрузка, результаты | Запросить диагностику адаптера, отключить/разрешить конкретную роль |
| **Автоматизации** | Событийные правила, cron, last run, dead letters | Enable/disable разрешённое правило, посмотреть receipts |
| **Отчёты** | Daily brief, weekly review, release evidence, budget | Посмотреть изменения и объяснения показателей |
| **Управление** | Policies, лимиты, credentials metadata, audit, kill switches | Блокировать провайдера, изменить согласованный бюджет |

Существующая страница `/admin/automations` остаётся обратно совместимой; целевая верхняя страница `/admin/command-center` даёт доступ к её специфическим данным, не ломая Scout/Council. В мобильном кабинете навигацию можно показывать как компактные вкладки / bottom sheet, а не восемь постоянных иконок.

### 4.2 Верхняя панель «Главное сегодня»

Обязательный блок без прокрутки: заголовок текущей инициативы; **первые три решения/приоритета**, количество реальных активных runs, verified releases за выбранное окно, blocked tasks, бюджет и время последнего обновления. Все показатели должны открывать исходную выборку.

```
HOLISTIC HOUSE / COMMAND CENTER                      Обновлено: [время]
[Стратегия] [Задачи] [Агенты] [Автоматизации] [Отчёты]

Цель недели: [конкретный результат + проверяемая метрика]
[1. СРОЧНО] [2. СЕГОДНЯ] [3. СЛЕДУЮЩЕЕ]

Агенты: [RUNNING]   Ожидают проверки: [COUNT]   Нужно решение: [COUNT]
Расход периода: [VERIFIED / UNKNOWN]     Emergency Stop [только owner]

Проекты                 Статус       Прогресс          Следующее действие
Video Studio            [health]     [verified]        [task]
AI Companion            [health]     [verified]        [task]
PR Control Tower        [health]     [verified]        [task]
...
```

Скобки — намеренные placeholders; они не допускаются как фиктивные данные в production. Фронтенд отображает `нет данных`, если timestamp/source отсутствует.

### 4.3 Доска задач: 3 режима

**Executive:** 5–10 критических задач, не весь backlog. **Kanban:** `Inbox → Triaged → Planned → Ready → Assigned → Running → Verify → Release → Done`, отдельно `Blocked/Paused`. **Timeline:** milestones, dependencies, critical path, forecast.

Перетаскивание задачи меняет только разрешённое состояние; drag в `Running` не обходит approval, provider health, budget и claim. Действительный запуск подтверждается отдельным `run_id`, а не UI-анимацией.

### 4.4 Карточка задачи (базовый экран)

Заголовок, цель и project breadcrumb; `Priority / Why now / Customer impact`; scope, acceptance criteria и constraints; источник и автор; связанные issues/PR; зависимости; выбранная роль; конкретный provider и разрешённые capabilities; deadline, retries, бюджет; отдельная лента `Decision / Attempt / Receipt / Verification`; `next automated action`; одна кнопка owner action (`Approve` либо `Pause`, по ситуации).

На мобильном сначала показываются название, статус, следующий шаг и решение; длинные CI-логи и JSON — в раскрывающихся деталях. RU/EN/ES должны использовать один backend-словарь enum статусов, локализованный только в UI.

### 4.5 Экран «Агенты»

Для каждого: имя роли, реальный runtime, `connected/disabled/unavailable/unknown`, последнее healthcheck, поддерживаемые задачи, разрешённый scope, очередь, количество запущенных задач, завершённые доказанные работы, budget, failure rate. Имя «ChatGPT» само по себе не означает `connected` или `headless`.

### 4.6 Обратная связь пользователя

Команды на интерфейсе: `Создать цель`, `Поставить задачу`, `Попросить план`, `Одобрить`, `Запустить разрешённого агента`, `Остановить`, `Повторить с диагностикой`, `Посмотреть доказательство`. Действия, изменяющие целевой результат или полномочия, подписываются owner actor и записываются в audit trail.

## 5. Единая модель задач — жизненный цикл, приоритет и зависимости

### 5.1 Обязательные поля Task

`id`, `project_id`, `objective_ids`, `milestone_id`, `task_type`, `origin_kind`, `origin_id`, `dedupe_key`, `title`, `problem_statement`, `desired_outcome`, `scope`, `acceptance_json`, `priority_class`, `priority_score`, `priority_rationale`, `estimated_effort`, `risk`, `security_class`, `sensitivity`, `required_capabilities`, `allowed_automations`, `owner_id`, `deadline_at`, `state`, `state_reason`, `blocked_by_ids`, `budget_policy_id`, `max_attempts`, `current_run_id`, `created_at`, `updated_at`, `last_observed_at`, `source_ref`, `source_revision`, `policy_version`.

**Типы задач:** `code_change`, `bug_repair`, `ci_diagnosis`, `release_verify`, `research`, `content_draft`, `design_review`, `product_spec`, `analytics_insight`, `data_maintenance`, `rights_review`, `human_decision`. Движок не должен назначать `rights_review` автономному publisher или `human_decision` AI-worker.

### 5.2 Состояния

- `inbox`, `triage`, `needs_spec`, `planned`, `ready`, `assigned`, `leased`, `running`, `awaiting_evidence`, `verifying`, `ready_for_release`.
- Финальные: `completed_verified`, `completed_live`, `canceled`, `rejected`; `completed_live` — только для задач, требующих фактический релиз.
- Негативные: `retry_wait`, `blocked_dependency`, `blocked_approval`, `blocked_auth`, `blocked_no_runner`, `blocked_budget`, `blocked_policy`, `blocked_external`, `paused`, `dead_letter`.

Отдельно вести `project.health`, `task.state` и `run.status`, не считать их взаимозаменяемыми. Любая смена состояния — через сервис state-machine с `allowed_transition`, `actor`, `reason`, `event_id`, `policy_revision`.

### 5.3 Зависимости и critical path

Task dependency — направленная связь `task A blocks task B`; создание циклов запрещено транзакционно. Различать `hard blocker`, `soft relation`, `shares resource`, `duplicates`. После `completed_verified` одной задачи пересчитывается очередь зависимых. `critical_path` — вычисляемое свойство только при наличии оценок длительности, а не художественный прогноз AI.

### 5.4 Защита от разрастания backlog

Дедупликация по `project + task intent + source entity + target head`, embedding/AI similarity — только рекомендация. В одном агентном запуске допускается не более 3 предлагаемых follow-up задач; автоматическое создание только с policy preapproval; deep-nesting ограничено. Для одной реализации сохраняется один issue/PR root, пока нет доказанного основания разделить scope.

## 6. Strategy Intelligence: выбор следующей задачи

### 6.1 Две независимые очереди

**Portfolio backlog** — все возможные инициативы, предложения и проекты, включая отложенные и непроверенные. **Execution queue** — только задачи, прошедшие acceptance/preflight и реально готовые для конкретного исполнителя. Система не пытается запустить весь backlog одновременно.

**Decision loop:** `Signal → Gap analysis → Task proposal → Policy classification → Ranking → Capacity check → Assignment → Execution → Evidence → Reprioritization`. AI может подготовить гипотезу, но окончательное право на реальный запуск определяется серверным кодом.

### 6.2 Модель приоритета

Вместо безусловного «самое новое — первым» применяем прозрачное правило. Начальный рекомендованный score (калибруется после baseline, не научный прогноз):

`score = 5*severity + 4*strategic_alignment + 3*user_impact + 2*dependency_unblock + 2*deadline_pressure + aging - 2*effort - 3*security_risk - 2*resource_cost`.

Каждая шкала нормирована 0–5; `security_risk` и `resource_cost` не подменяют hard policy. Для P0 production incident порядок всегда имеет приоритет над баллами. При равном score используется oldest-ready first. Исключения логируются.

| Признак | Реальный сигнал | Обязательная защита |
|---|---|---|
| Severity | Продакшен-падение, критическая поломка клиентского сценария | Только подтверждённая диагностика |
| Strategic alignment | Привязка к активному Objective/KR | У цели должен быть approved owner |
| Customer impact | Проверенный клиентский сценарий, аналитика, заявки | Нет доступа к PII для обычных агентов |
| Dependency leverage | Сколько approved задач блокирует этот этап | Только ациклический граф |
| Deadline pressure | Явная дата исполнения или релиза | Дата не создаётся моделью произвольно |
| Effort/risk/cost | История аналогичных задач, статический sizing | Неизвестно ≠ ноль; hard caps отдельно |
| Aging | Длительность ожидания с потолком | Предотвращает постоянное вытеснение P3 |

### 6.3 Портфельное распределение ресурсов

Вариант пилотных WIP-ограничений: 2 реальных AI coding runs одновременно во всей системе, 1 writer на PR и 1 owner PR-merge, 1 heavy CI wave на соответствующую группу, 3 активные задачи на инициативу. Это policy-default, а не обещание доступной вычислительной квоты. При P0 инциденте допускается вытеснение низкоприоритетных задач **до** их внешнего запуска или штатное прерывание provider; нельзя отменять уже работающие проверки без evidence.

Планировщик должен поддерживать `max_parallel_by_provider`, `max_parallel_by_repository`, `max_parallel_by_environment`, `max_parallel_by_sensitivity`, `max_daily_invocations`, `hold_until`, `quiet_hours` для отчётов (не для критических security incidents), `blocked_budget` и резерв на восстановление производства.

### 6.4 Планирование цикла (идея Linear Cycles)

Каждые 1–2 недели формируется **Execution Cycle** из approved задач: цель цикла, planned capacity, критерии завершения, реальная delivered value, rejected/changed scope, уроки. Командный «спринт» не блокирует непрерывные критические исправления. Цикл — аналитическая рамка, а не отдельный источник истины о PR.

### 6.5 Прогноз и ограничения

Вероятная дата завершения может показываться только при достаточном числе завершённых сопоставимых задач и стабильном scope. Иначе UI пишет `insufficient history` / `недостаточно данных`. Для прогнозов сохраняются `model_version`, `observed_window`, `sample_size`, `confidence_interval`, а не одна «уверенная» дата без контекста.

## 7. Автоматический приём новых задач / Intake & Triage

### 7.1 Источники событий

| Источник | Вход | Пример результата triage |
|---|---|---|
| GitHub Issues/PR/Check Runs | Доверенный webhook + authoritative API readback | «CI failed for exact HEAD», прикрепить к существующему task |
| Vercel deployment & smoke | Защищённый webhook + provider readback | «release pending» / «production verified» |
| Админ-панель | Owner-authenticated create/edit | Новая approved product task |
| Telegram owner assistant | Авторизованная owner-команда / сообщение | Только proposal, затем owner policy action |
| Analytics/SEO | Агрегированная метрика и valid source timestamp | Product opportunity, требующая review |
| AI Council | Structured suggestion with `source` | `proposed`; без немедленного исполнения при L2 |
| Scheduled reconciliation | Проверка stale/pending/runs | Повторное исследование причины, не duplicate action |
| External agent callback | Подписанный receipt | `awaiting_evidence` и verification job |

**Доверенные факты:** GitHub API и CI/check contexts, deployments provider, private database receipts, агрегированная аналитика. **Недоверенный контент:** issue text, PR comments, README из внешнего репозитория, тексты сайта, Telegram-пересылки и вывод модели. Недоверенный текст не может стать shell-командой, URL для произвольного fetch или разрешением на действие.

### 7.2 Нормализация и dedupe

`source_event → validate signature → store inbox (event id unique) → read actual state → canonicalize subject → dedupe → classify → enrich safe context → create or update task`. Пример `canonical_subject = github:repo_id:pr_number:head_sha:failed_context_family`. При повторном failure на другом HEAD заводится новая evidence/retry для прежней задачи, а не новый хаотический Issue.

**AI triage допустим только как дополнение:** классификация типа/темы, предложение capability и duplicate candidates, confidence, объяснение. Наличие LLM не должно быть условием работы детерминированного GitHub repair path.

### 7.3 Результат triage

```json
{
  "triage_version": "hh-cc-triage-v1",
  "task_type": "bug_repair",
  "project_id": "video-studio",
  "impact": "client_journey_regression",
  "priority_suggestion": "P1",
  "required_capabilities": ["repository.read", "patch.prepare", "tests.run"],
  "source_refs": [{"kind":"github_pr","number":1234,"head_sha":"<verified 40-hex>"}],
  "related_existing_task_id": null,
  "confidence": "medium",
  "needs_owner_approval": false,
  "reason": "Verified CI failure on existing issue; policy pre-approved"
}
```

Пример иллюстративный, номер PR и SHA не являются фактическими данными. **Triage не выполняет кодовые операции.**

## 8. Паспорта AI-агентов и сервисов

### 8.1 Роль ≠ Исполнитель ≠ Модель

- **Role:** функциональная специализация `developer`, `test_reviewer`, `release_verifier`, `researcher`, `marketer`, `seo_analyst`, `strategy_analyst`, `product_planner`, `ux_reviewer`, `content_editor`, `security_reviewer`, `data_analyst`.
- **Runtime/adapter:** технология запуска `github_deterministic`, `codex_cli`, `hermes`, `openclaw`, `owned_ollama`, `manual_handoff`, `provider_api`.
- **Model:** конкретный model endpoint с отдельными cost/availability/auth/quota, на который опирается runtime. Его можно менять независимо от роли.
- **Instance:** конкретный живой агентный процесс, `external_run_id`, ephemeral workspace, audit и permissions.

Это разделение предотвращает архитектуру «у каждого агента собственный API и собственная бесконтрольная очередь».

### 8.2 Паспорта ролей

| Роль | Работа | Минимальные capabilities | Разрешение по умолчанию |
|---|---|---|---|
| Strategic Analyst | KR gap, анализ портфеля, предложения приоритетов | `metrics.read`, `plans.propose` | L0 proposal only |
| Product Planner | Разложить approved цель на этапы и задачи | `spec.read`, `tasks.propose` | L0/L1 policy bounded |
| Engineering Implementer | Подготовить patch и тесты | `repository.read`, `patch.prepare`, `tests.run`, optional `pr.write` | L1 строго ограниченный |
| CI Diagnostician | Классифицировать ошибки checks | `ci.read`, `logs.summarize` | L0 |
| Reviewer / QA | Независимая проверка patch и acceptance | `diff.read`, `tests.read`, `evidence.propose` | L0; не self-approve |
| Release Controller | Передать approved PR существующему merge owner | `release.handoff`, `deployment.read` | Не имеет самостоятельного merge.write |
| SEO & Analytics | Анализ публичных агрегированных KPI | `analytics.aggregate.read`, `seo.read` | L0 recommendation |
| Video Scout | Источники metadata-only и каталог кандидатов | Existing closed-source whitelist | L0, rights unverified |
| Content Designer | Черновики текстов и материалов | `content.draft`, safe library reads | Draft only |
| Security Auditor | Риски и конфигурации | `repository.read`, `policy.read` | Read-only + escalation |

Один agent profile может пользоваться разными provider routes, но только после тестирования runtime. Provider не должен получать больше полномочий, чем требует его роль.

### 8.3 Registry / manifest

```yaml
agent_id: engineering-implementer-v1
role: developer
runtime_route: codex_cli
status: disabled_until_runtime_verified
capabilities:
  - repository.read
  - patch.prepare
  - tests.run
  - pr.update_existing_branch
repo_allowlist:
  - andylitvinov-design/books
risk_tier: L1
max_concurrency: 1
hard_timeout_minutes: 25
max_code_attempts: 2
requires_policy:
  - GLOBAL_PR_ONE_PUBLISH_V1
  - HH_CC_CODE_GUARD_V1
write_scope: task_worktree_only
credentials_ref: secret_alias_not_value
readiness_test: can_execute_bounded_noop_in_sandbox
result_schema: hh-agent-result-v1
```

`status` не становится enabled автоматически от наличия конфигурационного файла. Нужны доступность provider, проверенные permissions, successful healthcheck, поддерживаемая модель, известный budget и ручное одноразовое включение маршрута.

### 8.4 Подбор исполнителя

Решение двухступенчатое. **Hard eligibility:** capability match, approved policy, data residency/privacy, role permissions, healthy adapter, доступный budget, nonce/run quota, repo scope. **Soft ranking** для допустимых кандидатов: надёжность verified completion, пропускная способность, latency, фактическая средняя стоимость, skill fit. AI советует, но не отменяет hard eligibility.

Формально: `eligible = ∩ capabilities ∩ permissions ∩ resource_health ∩ policy ∩ cost_budget`. Если множество пусто, задача `blocked_no_runner`, owner видит причину и доступные варианты — например, ручной запуск ChatGPT Work без ложного автоматического статуса.

### 8.5 Автозамена и fallback

`deterministic GitHub script → checked existing coding runtime → alternate approved coding runtime → manual_handoff`. Замена допускается только при совместимости capabilities и доверия и **после проверки**, что предыдущий run действительно остановлен либо не создал внешних эффектов. Нельзя мгновенно запустить второго code writer на ту же ветку из-за временного сетевого таймаута.

## 9. Реалистичность подключений ChatGPT, Codex, Hermes и OpenClaw

| Канал | Способ запуска | Можно ли автономно активировать из серверного dispatcher? | Вывод |
|---|---|---|---|
| Обычный ChatGPT-чат | Пользователь открывает беседу | Не как произвольный headless remote worker | `manual_handoff`, для диалога и принятия решений |
| ChatGPT Work / интерфейс | Пользовательская управляемая сессия | Только если появится подтверждённая программная интеграция с нужными разрешениями | Не заложен как гарантированный автоматический backend |
| Codex CLI / SDK | Неинтерактивный CLI или SDK в подготовленной среде | Да, при подтверждённых credentials, runtime, правах и бюджете | Главный кандидат на coding worker |
| GitHub Actions | Workflow dispatch с доверенным script и токеном | Да, при корректной ветке, permissions, quota | Базовый deterministic runner |
| Hermes Agent | CLI/daemon/cron, Kanban и profiles | Да, если имеется реальный host и pre-approved adapter | Опция, после sandbox/protocol audit |
| OpenClaw | Gateway automations/webhooks/isolated runs | Да, если Gateway запущен и имеет разрешённый agent | Опция, после host/security/cost audit |
| Собственный Ollama | Локальный `owned-agent-gateway` | Ограниченный ответ модели, если host доступен | Для planning/routing без GitHub writes, пока не расширен |
| Платные AI APIs | Provider adapter | Технически возможен | Выключено до согласования budget |

**Экономическая оговорка:** возможности Codex harness не равны бесплатной модельной инфраструктуре; токены, sandbox, хост, API и GitHub/Vercel usage могут стоить денег. Регистрация ChatGPT-плана не доказывает возможность бесплатного headless API. Для каждого route вводим test-mode и cost gate.

### 9.1 Контракт capability broker

Каждый внешний вызов имеет `requested_capability`, `principal`, `agent_id`, `task_id`, `run_id`, `policy_version`, `resource_scope`, `expiry`, `cost_ceiling` и `idempotency_key`. Broker сравнивает запрос с сохранённым allowlist и возвращает permit на **одно действие**, а не общий shell. Для read-only маршрутов write-полномочия технически отсутствуют.

### 9.2 Исполнительные окружения

**Ephemeral GitHub runner:** хорошо подходит для изолированного изменения/тестирования; filesystem исчезает после job, состояние — только через GitHub, Supabase и artifacts. **Owned local host:** возможно запускать Hermes/OpenClaw/Ollama, но нужен подтверждённый безопасный канал обратной связи и uptime; локальный ноутбук без работающего процесса не даёт 24/7. **Vercel Functions:** orchestration/read APIs короткие; не предназначены для бесконечной агентной сессии.

## 10. Целевая техническая архитектура

```
                    Owner / Telegram / Dashboard
                              |
                  Strategy API / Portfolio DB
                              |
 GitHub Webhooks ---+----------+---- Analytics snapshots (aggregate only)
                    |
         Event Inbox + Auth + Dedupe
                    |
           Triage / Priority Engine
                    |
         Durable Tasks + Dependency DAG
                    |
          Scheduler / Dispatcher / Lease
                    |
        Capability Broker + Budget Gate
                    |
               Transactional Outbox
                    |
       +------------+------------+-----------------+
       |            |            |                 |
 GitHub Scripts  Codex CLI    Hermes/OpenClaw   Manual handoff
    (L0)          (L1)      (disabled until test)  (no auto)
       +------------+------------+-----------------+
                    |
           Signed Run Receipts
                    |
          Independent Verification
                    |
     GitHub/CI/PR owner + Vercel + E2E smoke
                    |
     Portfolio Health / Briefing / Audit
```

### 10.1 Control Plane / Data Plane / Evidence Plane

**Control Plane:** Next.js admin UI, server policy, task DB, scheduler, approvals, budgets. **Execution Plane:** изолированные scripts/agents в GitHub-hosted runners или разрешённых hosts. **Evidence Plane:** независимые GitHub/Vercel/analytics readbacks, tamper-evident links, immutable run receipts, выпуск/отчёты.

Системы физически могут использовать существующий Supabase/Vercel, но их логические роли и полномочия разделены. Отказ Execution Plane не должен уничтожать очередь или изменять `completed_live`.

### 10.2 Репозитории и владение истиной

- GitHub: canonical repo, branch, PR, commit SHA, CI, merge, protected policy.
- Supabase `app_private`: strategy/tasks/leases/runs/agent registry/approvals/logs.
- Vercel: current production release, deployment metadata, короткие приватные APIs.
- Google Docs/Drive: документы, брифинги и решения (ссылки и snapshots), не источник разрешения на исполнение.
- Linear (необязательно): внешний sync adapter; внутренняя очередь и budget policy сохраняют авторитет.

### 10.3 Технические компоненты

| Модуль | Server package | Ответственность |
|---|---|---|
| Portfolio Service | `lib/command-center/portfolio/` | Objectives/KRs, initiatives/projects, snapshot health |
| Task Planner | `lib/command-center/planning/` | DAG, milestones, roadmap, deterministic ranking |
| Intake/Triage | `lib/command-center/intake/` | Webhook verify, normalization, dedupe, queue |
| Scheduler | `lib/command-center/orchestration/` | Event wake, batch tick, fair scheduling |
| Registry/Broker | `lib/command-center/agents/` | Agent manifests, capabilities, health, assignment |
| Runtime Adapters | `lib/command-center/adapters/` | GitHub, Codex, Hermes, OpenClaw, manual handoff |
| Outbox/Reconciler | `lib/command-center/reliability/` | Atomic claim, idempotency, ACK/unknown recovery |
| Verification | `lib/command-center/evidence/` | Exact SHA, release proof, test result adapters |
| FinOps/Policy | `lib/command-center/governance/` | Hard budgets, access, approvals, policy versions |
| Reports | `lib/command-center/reporting/` | Daily/weekly briefs, KPI/materialized summaries |

**Правило единственности:** `PR Control Tower` остаётся владельцем `merge`, канонический scout — владельцем своего источника кандидатов, GitHub — владельцем статуса check. Command Center синхронизирует и координирует эти системы, но не создаёт конкурирующих owners.

## 11. Модель данных Supabase / PostgreSQL

### 11.1 Схемы и границы доступа

Новые внутренние таблицы размещаем в `app_private` (либо выделенном приватном schema с эквивалентными controls). `anon` и `authenticated` не получают прямых grant; server-only gateway использует минимальный `hh_app_backend` с forced RLS/owner context. Проектные и клиентские данные остаются в своих существующих доменных хранилищах; исполнительская БД не дублирует персональные разговоры/медицинские данные.

| Таблица | Основные поля и ограничения | Источник истины |
|---|---|---|
| `cc_objectives` | id, title, owner, horizon, policy, status, approved_revision | owner/strategy |
| `cc_key_results` | objective_id, metric_key, baseline, target, unit, source, confidence, observed_at | verified aggregates |
| `cc_initiatives` | id, objective links, priority, health, owner, review cadence | owner+rollup |
| `cc_projects` | id, repo_id, lifecycle, program, lead, health_snapshot | strategy |
| `cc_initiative_projects` | unique initiative_id/project_id | strategy |
| `cc_milestones` | project_id, target date, acceptance, verified_at | project |
| `cc_execution_cycles` | cycle name, start/end, approved_scope, review | owner planner |
| `cc_tasks` | task identity, origin, canonical intent, state, priority, acceptance, allowed capabilities, policy revision | control plane |
| `cc_task_dependencies` | blocker_id, blocked_id, relationship; unique pair, cycle detection | task graph |
| `cc_task_external_refs` | source provider/type/external ID/URI, unique scoped key | mapping |
| `cc_agents` | agent role, adapter key, capability profile, health, enabled | registry |
| `cc_agent_capabilities` | capability allowlist, allowed repos/environments/risk tier | policy |
| `cc_provider_routes` | provider, auth alias, availability, cost unit, daily allowance, permitted models | broker |
| `cc_assignments` | task_id, agent_id, rank/evidence, approved scope, state | dispatcher |
| `cc_runs` | task_id, attempt, generation, lease, external_run_id, status, last heartbeat | orchestration |
| `cc_inbox` | unique event key, source, timestamp, payload hash, processed_at | event ingestion |
| `cc_outbox` | planned side effect, idempotency key, delivery/ack/external ref | orchestration |
| `cc_run_evidence` | type, canonical URL/ref, observed SHA, verifier status, expiry, source timestamp | evidence |
| `cc_policy_versions` | immutable policy definition, approved by/at, hash | governance |
| `cc_approvals` | actor, action, scope, task/run target, expiry, revocation | owner |
| `cc_budget_ledgers` | provider/project, usage unit, confirmed cost, reserved amount, confidence | FinOps |
| `cc_portfolio_snapshots` | daily/weekly denormalized health and histograms | reporting |
| `cc_notifications` | owner-only messages, delivery policy, receipts, dedupe | notification |
| `cc_audit_events` | append-only event log, redacted details, actor, reason, row version | audit |

**Миграции:** новые имена не означают существующие таблицы. Сначала подготовить explicit SQL PR, прогнать rollback/up/down где допустимо, проверить grants, RLS, lock/contention, роли и production schema readback. Для seeded tasks по умолчанию `enabled=false`.

### 11.2 Уникальности и индексы

- `UNIQUE(source,source_event_id)` — повтор webhook не создаёт новый event.
- `UNIQUE(project_id,dedupe_key) WHERE archived_at IS NULL` — один canonical task на намерение.
- `UNIQUE(task_id,attempt_no)`, `UNIQUE(adapter,external_run_id)` WHERE external ID not null.
- Только один active writing run per `effect_scope`, например repo/pr/branch; отдельный DB lock/fencing на writer resource.
- Индексы ready queue `(state, priority_class, priority_score DESC, created_at)`, runs `(lease_until,status)`, inbox `(processed_at,created_at)`, outbox `(ack_state,next_attempt_at)`.
- Foreign keys с RESTRICT для неудаляемого audit; retention и PII redaction по policy.

### 11.3 Пример критического фрагмента SQL

```sql
-- Схематичный фрагмент, НЕ готовая миграция.
create table app_private.cc_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references app_private.cc_tasks(id),
  attempt_no integer not null check (attempt_no > 0),
  generation bigint not null check (generation > 0),
  state text not null check (state in
    ('claimed','launching','running','reconciling','finished',
     'failed','cancelled','unconfirmed')),
  lease_until timestamptz,
  external_run_id text,
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  unique(task_id, attempt_no)
);
-- Real deployment needs policies, grants, indexes, triggers,
-- owner-context verification and a complete migration review.
```

Псевдо-SQL специально не назначает `public` или `authenticated` права. Конкретный RLS и доступ `hh_app_backend` необходимо согласовать с существующей схемой. Для стратегии можно создать отдельный owner-readable API, но браузер не читает `app_private` напрямую.

### 11.4 Data provenance & staleness

Каждый KPI или внешний статус имеет `source_kind`, `source_ref`, `observed_at`, `verification_method`, `confidence`, `snapshot_hash`, `stale_after`. Если источник недоступен, показываем **«не подтверждено»**, а не последний зелёный статус без отметки. Дашборд делает raw-source drilldown и исправляет семантику `unknown ≠ 0`.

## 12. Событийный цикл и расписание

### 12.1 Реакции и reconciliation

1. GitHub/Vercel/owner/analytics event приходит в приватный endpoint. Подписи и принадлежность проверяются до десериализации опасных данных.
2. Сервис сохраняет краткий normalised event и origin hash в durable `cc_inbox`.
3. Event handler (короткий запрос) немедленно помечает задачи `needs_reconcile` и вызывает bounded dispatcher либо записывает wake request.
4. Периодическая проверка **планируется каждые 10 минут** как резервный reconciliation, а не тяжёлый запуск всех checks.
5. Reconciler проверяет queued events, потерянные webhooks, expired leases, unknown launch ACK, completed provider runs, stale metrics и разблокированные зависимости.
6. Dispatcher за один проход делает ограниченное число claims, outbox deliveries и verifier requests; не вызывает рекурсивно себя без границ.

**Событийный путь должен быть предпочтительнее cron.** Каждые 10 минут происходит недорогой контроль статуса и очереди; тяжёлые процессы запускаются только при проверенной необходимости и свободной квоте.

### 12.2 GitHub Actions и несовпадающие ветки

GitHub schedule срабатывает на default branch; в данном репозитории при проверке `codex/bootstrap-books`. Если bootstrap использует эту ветку, он должен вызывать только trusted/pinned control endpoint или заранее проверенный production SHA, а не произвольно выполнять stale код. `workflow_dispatch` требует соответствующего файла на default branch и разрешённого target ref; проверить это до выпуска.

**Не создавать 6 параллельных расписаний** для разных ролей. Один `hh-cc-reconcile.yml` либо переиспользованный согласованный cron owner делает краткий tick; задачи агентов запускаются только через broker/outbox. Schedule best-effort: возможны задержки/пропуски, поэтому hard SLA «каждые 10 минут гарантированно» без постоянно работающего host обещать нельзя.

### 12.3 Ownership rules

| Resource / side effect | Единственный writer/owner | Разрешение Command Center |
|---|---|---|
| PR merge и очередность CI | Existing PR Control Tower | Только read, propose repair, handoff |
| PR branch HEAD при repair | Один claim одного task/PR | Один coherent publish после проверки |
| Video Scout candidate import | Existing Scout | Read/monitor; не создавать второй crawler |
| Rights/publishing | Editor/approved existing service | Escalate, не автоодобрять лицензии |
| Vercel prod config | Explicit owner-controlled ops | No autonomous mutation |
| Portfolio priority | Owner policy + deterministic score | AI proposal, audit, owner overrides |
| Client-specific private data | Existing domain services | No generic agents; least-privilege only |

### 12.4 Control-plane tick — псевдокод

```ts
async function commandCenterTick(trigger) {
  await verifyTriggerAndConfig(trigger);
  await reconcileUnknownExternalEffects({limit: 20});
  await retireExpiredLeasesWithFencing({limit: 20});
  await classifyInboxAndAttachToTasks({limit: 50});
  await refreshCriticalEvidence({limit: 20});
  const candidates = await selectReadyTasks({limit: 15});
  for (const task of candidates) {
    if (await hardPolicyRejects(task)) continue;
    if (await hasActiveWriterOrDependency(task)) continue;
    const route = await chooseEligibleHealthyRoute(task);
    if (!route) { await blockWithReason(task, 'NO_RUNNER'); continue; }
    await atomicClaimAndEnqueueOutbox(task, route); // one DB transaction
  }
  await deliverOutboxWithIdempotency({limit: 4});
  await scheduleIndependentVerification({limit: 10});
  await aggregateOwnerBriefingChanges();
}
```

Указанные лимиты — ориентиры для pilot policy, не готовая производственная конфигурация.

## 13. Надёжный запуск: lease, transactional outbox и side-effect fencing

### 13.1 Зачем не хватает `setInterval` или ChatGPT automation

Agent run переживает исчезновение веб-запроса, смену контейнера, рестарт gateway и временную ошибку provider. Необходима долговечная связь: `task_id`, `attempt_no`, `claim_generation`, `launch_intent_id`, `external_run_id`, `receipt`, `verified_result`.

Схема транзакционного запуска: `BEGIN → lock task row → validate policy/budget/dependencies → increment generation → INSERT run claimed → INSERT outbox launch command → COMMIT`. Изменение внешней системы вне транзакции БД, поэтому применяется **idempotency + reconciliation**, а не ложное exactly-once обещание.

### 13.2 Переходы одного запуска

`claimed → launching → admitted → running → finished → verifying → verified`; альтернативы `launch_unknown`, `reconciling`, `cancel_requested`, `timed_out`, `failed`, `dead_letter`. `admitted` ставится **только** после фактического provider ACK или readback существующего run.

**Fencing:** каждый heartbeat и result принимаются, лишь если `task_id/run_id/generation` совпадает с текущими и policy разрешает действие. Истёкший worker не может закрыть задачу или overwrite outcome.

### 13.3 Неопределённая доставка

Если webhook/outbox POST мог сработать, но ACK потерян, нельзя вслепую повторять `launch`/`commit`/`send`. Состояние `launch_unknown` требует `getRunByIdempotencyKey` или безопасного provider/list query. Если API не поддерживает идемпотентное создание или обнаружение прежнего запуска, автоматический retry **выключен** до ручного reconciliation.

### 13.4 Heartbeat и самовосстановление

При heartbeat timeout: перевести `running → reconciling`, проверить внешний run, проверить PR branch/commit и artifacts, убедиться, что другой writer не активен; после доказанного прекращения прежней попытки допускается safe reclaim с новой generation и единым effect lock. Отсутствие heartbeat ≠ доказательство смерти процесса.

### 13.5 Эскалация и circuit breaker

Circuit breaker на provider открывается при серии failures/429/5xx, quota pause или authentication errors. Блокируется **маршрут**, а не весь портфель. Если один агент не подходит, task возвращается в ready и может быть предложен другому approved provider только с сохранением write lock и без двойного выполнения.

## 14. Контракт агента, рабочий пакет и отчёт

### 14.1 Contract: запуск задачи

```json
{
  "schema": "hh-cc-run-v1",
  "task_id": "uuid",
  "assignment_id": "uuid",
  "run_id": "uuid",
  "attempt_no": 1,
  "generation": 3,
  "idempotency_key": "hash(task_id:attempt:generation:effect)",
  "role": "engineering_implementer",
  "runtime_route": "codex_cli",
  "repository": "andylitvinov-design/books",
  "base_ref": "codex/public-book-library",
  "head_sha": "<verified SHA or null>",
  "scope": {"paths_allowlist": ["components/", "tests/"], "forbid": [".github/workflows/"]},
  "capabilities": ["repository.read", "patch.prepare", "tests.run"],
  "acceptance": ["correct_bug", "focused_tests_pass", "no_new_paid_provider"],
  "max_runtime_seconds": 1500,
  "max_attempts": 2,
  "cost_ceiling_usd": 0,
  "policy_version": "HH_CC_CODE_GUARD_V1",
  "callback_url_alias": "configured_server_only"
}
```

Это контракт для тестового sandbox, не реальный выполненный запрос и не допустимый способ передать секреты через task payload. `cost_ceiling_usd: 0` подразумевает отсутствие новых модельных списаний; измеряемые runner-minutes existing infrastructure должны учитываться отдельно.

### 14.2 Контекст задания / Context Bundle

`task intent`, подтверждённый scope, `AGENTS.md` и `GLOBAL_PR_ONE_PUBLISH_V1`, затрагиваемые файлы и индекс связей, exact HEAD, связанные issue/PR, прошлые verifier failures, нужные тесты, output schema, policy manifest, budget. **Не включать** весь журнал пользовательских разговоров, клиентские оценки/диагнозы, платежные данные, чужие проекты или secret values.

Agent может запрашивать дополнительный контекст через scope-limited read gateway; ответ возвращается как данные с provenance и trust label, не как исполняемые инструкции.

### 14.3 Result Receipt

```json
{
  "schema": "hh-cc-result-v1",
  "run_id": "uuid",
  "generation": 3,
  "provider_run_id": "opaque-provider-id",
  "state": "finished",
  "reported_outcome": "patch_prepared",
  "artifacts": [{"kind":"git_commit","sha":"<40-hex>","url":"https://github.com/..."}],
  "tests_claimed": [{"name":"focused-unit","outcome":"passed","log_ref":"artifact-id"}],
  "observed_failure": null,
  "recommended_next_step": "independent_verification",
  "usage": {"ai_requests": 1,"runner_seconds": 450,"cost_usd": null},
  "policy_version": "HH_CC_CODE_GUARD_V1"
}
```

`tests_claimed` — именно **заявление worker**, не доказательство. Verifier читает provider artifact или фактический CI и принимает/отвергает. `cost_usd=null` значит неизвестно, а не бесплатно.

### 14.4 Долгая задача и checkpoints

Для работы длиннее одного запуска задачу разбивают на bounded checkpoints, каждый с самостоятельной acceptance и persisted artefact. Агенты не должны поддерживать «бесконечный разговор». Resume получает только минимальный проверенный контекст и предыдущие результаты; старый запуск закрывается или reconciling до передачи новому.

## 15. Независимая верификация и критерии «готово»

### 15.1 Стадии результата

`reported` — агент заявил; `artifact_observed` — артефакт существует; `tests_verified` — проверка реально прошла; `merge_eligible` — защищённые условия выполнены; `merged` — GitHub подтвердил; `deployed` — целевая среда подтвердила; `live_verified` — реальные сценарии пользователя прошли. Это разные статусы, **не** одна строка `Done`.

### 15.2 Матрица доказательств

| Тип задачи | Проверяет независимый verifier | Когда можно закрыть |
|---|---|---|
| Спецификация | Документ существует, содержимое прочитано, ревизия зафиксирована | `completed_verified` |
| Аналитическая рекомендация | Метрика, период, источник и расчёт доступны | `completed_verified`; действие отдельно |
| Кодовый patch | Изменение файлов/коммит/PR привязано к task, прошли фокусные тесты | `completed_verified` или `ready_for_release` |
| Релиз веб-функции | Exact-head CI, policy gates, merge, Vercel READY, нужный browser smoke | `completed_live` |
| Telegram бот | Фактическое сообщение/команда, учёт delivery uncertainty, E2E в тестовом чате | Verified delivery по факту |
| Видео | Воспроизведение, корректный формат, download в нужном браузере | Тест подтверждён |
| Видео из внешнего источника | Право, provenance, source identity, editorial approval, rendition quality | Только после утверждения rights |
| UX-макет | Утверждённый макет + визуальная приёмка размеров/языков | `completed_verified`; не `LIVE` |
| Платежи/секреты | Owner approval, отдельный change control, provider audit | Автоматически не выполняется |

### 15.3 Exact-HEAD и ownership GitHub

Исполнитель сначала читает актуальные base, PR, SHA и требуемые проверки. Если этот PR уже в CI и новая ошибка не доказана, он не публикует косметический commit. Подтверждённая repair попытка готовится в локальном worktree, проверяется, публикуется **одной согласованной пачкой** и затем ожидает защищённый CI. `GLOBAL_PR_ONE_PUBLISH_V1` имеет более высокий приоритет, чем оптимизация скорости или просьба агента.

### 15.4 Вывод результата в UI

У каждой задачи показываются `Что заявлено`, `Что реально проверено`, `Каких доказательств не хватает`, `Следующий автоматический шаг`, `Кто владеет следующим действием`. Зелёный LIVE невозможен при `unknown` или outdated deployment evidence.

## 16. Политика повторов и восстановление ошибок

| Категория | Автоматическая реакция | Предел |
|---|---|---|
| Временный сетевой отказ, 5xx | Короткий bounded backoff+jitter | Проверить эффект до новой отправки |
| Rate limit/quota | Pause provider, уведомить и отложить | Не обходить лимит другим платным ключом |
| CI infrastructure flake | Диагноз + точечная проверка существующего workflow | Без безусловных новых CI waves |
| Кодовый defect | Один verified repair batch на актуальном SHA | По умолчанию до 2 code edit attempts |
| Head поменялся/конфликт | Re-read head/base, lock PR, передать PR owner | Без слепого rebase |
| Нет runner/auth | `blocked_no_runner` или `blocked_auth` | Не утверждать, что агент запущен |
| Неподтверждённый external write | `launch_unknown → reconcile` | Не повторять без evidence |
| Policy/security violation | Сразу остановить и эскалировать | Нет autonomous override |
| Две одинаковые неудачи | `no_progress` и новая диагностика | Автоцикл прекращается |
| Сбой verifier | Сохранить pending, retry чтения (не write) | Не закрывать задачу |

Детектор отсутствия прогресса сопоставляет `(same failed check family, same patch fingerprint, same head SHA, same error class)` в последних попытках. При отсутствии фактического продвижения задача переходит в `dead_letter/no_progress`. Возврат к работе происходит только после новой достоверной информации или owner review.

**Принцип:** автоматически продолжать работу — да; автоматически бесконечно переделывать одно и то же — нет.

## 17. FinOps и управленческие разрешения

### 17.1 Бюджет по четырём измерениям

1. **Деньги:** реальные API/sandbox/provider charges, подтверждённая валюта/тариф и `unknown` при отсутствии данных.
2. **Вычислительные ресурсы:** GitHub Actions minutes, Vercel executions, Supabase queries/storage, local CPU/GPU.
3. **Агентные попытки:** число headless runs, retries, model requests и максимальная параллельность.
4. **Риск и права:** write scope, чувствительность информации, работа с production и публичные действия.

Установка `zero_new_paid_services` = true означает запрет на непроверенный платный маршрут, но **не** гарантию нулевого consumption существующих тарифов. До реального авторизованного charge source расходы показываются как `unknown`; резервация бюджета происходит *до* внешнего run.

### 17.2 Уровни действий

| Уровень | Разрешённый класс | Вмешательство владельца |
|---|---|---|
| L0 / Observe | Read-only GitHub, анализ открытых CI logs, aggregation, planning, briefing | Не требуется при предварительном policy |
| L1 / Bounded execution | Проверенные скрипты и ограниченный coding run в worktree; один approved PR path | Одноразовое предварительное разрешение для класса операций |
| L2 / High-impact | Secrets, billing, публикация конфиденциальных материалов, permissions, branch rules, необратимые миграции | Отдельное approval на конкретное действие |
| L3 / Prohibited | Саморасширение полномочий, обход security policy, безлимитные расходы, несанкционированные персональные данные | Запрещено; даже AI recommendation не может исполнить |

`Owner approval` — серверная запись с actor, ресурсом, сроком действия, ограничением budget и audit hash. **Текст в issue или Telegram-сообщении не является approval** без проверенной owner-authenticated команды. Revocation отзывается до следующего claim/privileged effect; уже начатые незавершённые операции reconciler контролирует отдельно.

### 17.3 Kill switches

`CC_GLOBAL_PAUSED`, `CC_EXECUTION_PAUSED`, `CC_PROVIDER_CODEX_DISABLED`, `CC_PROVIDER_HERMES_DISABLED`, `CC_PROVIDER_OPENCLAW_DISABLED`, `CC_REQUIRE_OWNER_RELEASE`, `CC_MAX_NEW_SPEND_USD=0`. Пауза принимает запись в private policy store и отражается в UI. Для аварийного отключения предусмотрен service config kill-switch, позволяющий остановить систему при сбое БД. UI «остановить всё» не скрывает уже внешне запущенные процессы: показывает список cancel requests и confirms фактическую остановку.

### 17.4 Партнёрские/внешние команды

В будущем можно включить роли подрядчиков/других мастеров, но требуется project-scoped ACL и разделение пользовательских доменов. Агенты без разрешения не видят общую клиентскую базу, приватные отчёты, оплаты, документы психотерапии и другие чувствительные области. Для публичных маркетинговых отчётов передавать только агрегаты с проверенными правами доступа.

## 18. Server/API контракты

### 18.1 Owner API (authenticated, CSRF/rate limits, schema validation)

| Метод/путь | Действие | Безопасность |
|---|---|---|
| `GET /api/admin/command-center/overview` | Portfolio snapshot, stale flags, top priorities | Owner only, no-cache |
| `GET /api/admin/command-center/objectives` | Objectives/KRs/initiatives | Owner role + row scope |
| `POST /api/admin/command-center/objectives` | Create/approve/change strategic plan | CSRF, version precondition, audit |
| `GET /api/admin/command-center/projects/:id` | Project health, milestone and timeline | Source timestamps |
| `GET /api/admin/command-center/tasks` | Board/filter pagination | Strict query allowlist, cursor |
| `POST /api/admin/command-center/tasks` | Create task/proposal | Canonical dedupe, policy assignment |
| `POST /api/admin/command-center/tasks/:id/action` | Approve, pause, priority, resume | Immutable actor/event + `expected_version` |
| `GET /api/admin/command-center/agents` | Runtime registry health/usage | Secret aliases redacted |
| `POST /api/admin/command-center/agents/:id/test` | Non-destructive healthcheck | Hard timeout, rate limit |
| `GET /api/admin/command-center/reports` | Briefing, history, evidence | Source drilldown |
| `POST /api/admin/command-center/policies/pause` | Global/project/agent stop | Reauthentication if high impact |

Префикс — проектное предложение; до написания кода проверить существующую Next.js routing структуру, owner authorization и методы возврата `privateJson`.

### 18.2 Internal endpoints (service-authenticated)

| Метод/путь | Ответственность |
|---|---|
| `POST /api/internal/command-center/events/github` | HMAC verify raw webhook, owner repo allowlist, inbox append |
| `POST /api/internal/command-center/events/deployment` | Provider signature+readback, inbox append |
| `POST /api/internal/command-center/tick` | Bounded reconcile/dispatch, short response |
| `POST /api/internal/command-center/worker/heartbeat` | Scoped signed run heartbeat + generation |
| `POST /api/internal/command-center/worker/result` | Signed structured receipt (data-only) |
| `POST /api/internal/command-center/verify` | Whitelisted verification request |

Входящие worker callback URL нельзя выбрать агенту произвольно. Использовать `mTLS` либо HMAC/short-lived signed callback bearer с audience, nonce, expiry, body hash, проверкой `run_id`, `generation`, replay protection и минимальными scope. Не публиковать внутренние API в sitemap/robots, и не считать robots защитой доступа.

### 18.3 Пример owner action

```json
{
  "task_id": "uuid",
  "action": "approve_execution",
  "expected_version": 12,
  "request_id": "uuid",
  "capability_scope": ["repository.read", "patch.prepare"],
  "budget_policy_id": "zero-new-spend",
  "reason": "Scoped release-critical repair"
}
```

Ответ возвращает **решение о допустимости**; `execution_started=true` разрешён только после подтверждённого external admission/readback. Код `202 queued` не равен `200 started`.

### 18.4 Ошибки и коды

`409 STALE_VERSION`, `409 TASK_ALREADY_CLAIMED`, `423 POLICY_PAUSED`, `409 DEPENDENCY_UNRESOLVED`, `409 BUDGET_UNAVAILABLE`, `409 NO_ELIGIBLE_RUNNER`, `429 RATE_LIMITED`, `503 PROVIDER_DOWN`, `202 LAUNCH_UNKNOWN`, `401 UNAUTHORIZED`, `403 CAPABILITY_DENIED`. API не возвращает exception trace, env keys, prompt bodies и секреты в клиентский UI.

## 19. Управленческая отчётность и intelligence

### 19.1 Три уровня отчёта

**Daily Executive Brief:** 3 главных результата; что реально завершено; на чём работают агенты; какие задачи автоматически восстановлены; 1–3 конкретных решения для владельца; budget/permissions anomalies; ссылка на фактические receipts.

**Weekly Portfolio Review:** состояние Objectives/KRs, прогресс инициатив/милестонов, изменение scope, новые blockers, сколько задач закрыто автоматически, конверсия task→verified→LIVE, куда перераспределить WIP, качество и стоимость по агентам.

**Monthly Strategy Review:** наблюдаемые продуктовые результаты и пользователи, что не принесло эффекта, какие направления остановить, изменить или усилить; AI предлагает выводы с уровнем уверенности. Такие решения не выполняются без owner authorization.

### 19.2 Пример настоящей структуры брифинга (без придуманных метрик)

```
Мой брифинг — [дата, America/Toronto]

САМОЕ ВАЖНОЕ
1) [Названная стратегическая цель] — [подтверждённый риск/возможность]
2) [Задача на critical path] — [что запущено, что проверено]
3) [Следующий релиз] — [какое доказательство отсутствует]

РАБОТА АГЕНТОВ
[Агент] / [run_id] / [фактический статус] / [last heartbeat]

ПРОГРЕСС И ПРОДУКТОВЫЕ МЕТРИКИ
[KR] baseline → latest → target / [источник] / [дата наблюдения]

ТРЕБУЕТ РЕШЕНИЯ
[Approve / Reject / Budget / Policy] + почему + риск без действия

ЗАВТРА АВТОМАТИЧЕСКИ
[Следующие 1–3 approved dispatch actions]
```

Если решений нет — не отправлять пустые срочные уведомления. Владелец получает краткую ежедневную Telegram-сводку только через существующую авторизованную delivery policy; приложение показывает полный контекст. Не дублировать уже существующие ежедневные брифинги и сообщения, пока не сделана инвентаризация.

### 19.3 Метрики управленческого качества

| KPI | Определение | Граница достоверности |
|---|---|---|
| Strategic outcome progress | Изменение подтверждённого KR относительно baseline/target | Не заменяется task counts |
| Task throughput | `completed_verified` за окно времени | Только с evidence |
| Autonomous completion rate | Без новых owner-команд внутри однократного approved scope | Исключать tasks без eligible runner из знаменателя отдельно |
| Dispatch latency p50/p95 | Время `ready_at → admitted_at` | Не `created_at → UI click` |
| Review/verification latency | `worker_finished → independently_verified` | С указанием источника |
| PR lead time | `first_publish_at → merged_at` | GitHub timestamps, exact event attribution |
| CI amplification | Лишние waves после открытия PR | Раздельно first wave/real repair/duplicate |
| No-progress loop rate | Повтор без нового evidence | Должно быть 0 в pilot |
| Release correctness | Доля `LIVE` со всеми обязательными доказательствами | False positive = 0 |
| Agent reliability | Verified success per eligible attempted class | Нельзя сравнивать разные риск/типы без нормализации |
| Cost per verified outcome | Подтверждённые расходы / verified results | Если стоимость неизвестна, показывать unknown |
| Owner attention | Число действительно требовавших approval/escalation решений | Не максимизировать количество уведомлений |

### 19.4 Пояснимый AI-советник

Для рекомендации система должна указывать `observed signal`, `linked goal`, `suggested action`, `expected benefit`, `risk/effort`, `confidence`, `why not another action`, `source links` и `owner required?`. Не предлагать общие советы вроде «улучшить маркетинг», если можно показать конкретный разрыв в воронке или незавершённый релиз.

### 19.5 Графики и история

Дашборд включает trendline «основные KRs» с source windows, throughput/stalled tasks, cycle time, исполнение по provider/role, budget and reserve, scope-creep график (аналог Linear project graph), release timeline. Графики строятся из snapshot/API, а не из AI текста. Нужны drilldown и backfill, иначе метрики будут декоративными.

## 20. Безопасность, приватность и защита от prompt injection

### 20.1 Trust boundaries

- Любые GitHub Issue/comment, веб-страницы и model outputs помечать `untrusted`, даже если текст выглядит как инструкция «немедленно запусти».
- В `task_context` передавать только факты, отфильтрованные policies; capabilities/permissions приходят **только** из server-approved manifest, а не из текста задания.
- URL fetch allowlist; запрет SSRF, arbitrary git clone, insecure curl install, shell injection и прямого доступа к env/secret store.
- Worktree/file writes ограничены конкретным repo/branch/path и GitHub App permissions; приватные клиентские документы не доступны общим разработчикам-агентам.
- Callback: подпись + срок действия + `run_id` + nonce + replay protection; любой outdated generation отвергается.
- `No self-modification`: агент не вправе менять policy, provider allowlist, kill switches, quotas, scheduling и собственную роль.
- Owner действия записывать в неизменяемый журнал, журнал не должен включать raw secrets и персональные записи.

### 20.2 Угрожающие сценарии и тесты

| Атака/сбой | Механизм защиты | Приёмочный тест |
|---|---|---|
| Prompt injection в Issue | Текст data-only, no shell, explicit permissions | Поддельная команда не исполняется |
| Нелегитимный provider callback | HMAC/expiry/generation | Подписанный старым ключом/поздний receipt отвергнут |
| Повтор webhook | unique inbox key + idempotent outbox | Один run/effect |
| Два агента редактируют PR | DB effect lock, one owner, generation | Только один writer |
| Обход branch protection | Соблюдение required checks и existing merge owner | Нет bypass/force merge |
| Незапланированные расходы | Provider allowlist, budget ledger, hard gate | Paid route не запускается при cap=0 |
| Утечка PII | Data classification, aggregate-only, redaction | На code worker не передаётся клиентское досье |
| Фиктивный LIVE | Independent source readback + smoke | `unknown` не превращается в completed |
| Prompt создаёт cron | Automation creation requires owner policy | Нет самопорождающихся расписаний |
| Недоступность DB | No claim, no writes, degraded UI | Fail closed и понятный статус |

### 20.3 Эксплуатационные права

Нужны минимум три identity: `owner_admin` (планы/approval), `dispatcher_service` (bounded claims/dispatch), `worker_service` (heartbeat/result per run); read-only verifier читает GitHub/Vercel через отдельный scoped provider identity. В маленькой системе технические роли могут работать с общим backend, но токены/claims и разрешения должны быть логически разделены, а не один всемогущий секрет во всех процессах.

## 21. Четыре опорных сквозных сценария

### Сценарий A. Video Studio: ошибка генерации → LIVE

1. Наблюдение browser E2E или пользовательский report связывается с Objective «клиент получает завершённое видео».
2. Triage находит существующую проблему/PR или создаёт approved P1 task с конкретными acceptance.
3. Планировщик формирует подзадачи только если нужны (воспроизведение, patch, testing, release).
4. Broker выбирает `ci_diagnostician`, затем проверенного `engineering_implementer`.
5. Coding worker в ограниченном worktree выполняет минимальные изменения; не публикует по одному файлу.
6. Единственный PR получает one-publish patch, выполняются focused tests и required exact-HEAD checks.
7. При проверенном дефекте CI допускается bounded repair, но без бессмысленной волны.
8. PR owner даёт merge только по действующей policy; Vercel deployment и E2E video preview/download проверяются независимо.
9. KR получает обновление только после фактических изменений показателя, не по одному merge; brief содержит ссылку на доказательство.

**Финиш:** `completed_live` с matching SHA/required CI/deployment/browser evidence, либо `blocked` с точным missing proof.

### Сценарий B. Автопополнение видео с защитой прав

По расписанию existing Video Scout собирает лишь Wikimedia metadata-кандидатов; Command Center мониторит слоты, количество действительно новых кандидатов и причины квотных пауз. Classification и Council дают предложения. Rights/editorial gate остаётся отдельным, в Video Vault не публикуются сомнительные MP4. Система может автономно проверить отсутствие кандидатов и выбрать следующую поисковую задачу, но не заменяет юридическую проверку прав.

### Сценарий C. SEO/маркетинг: заметить просадку и дать действие

Агрегированный сигнал из подключённой веб-аналитики указывает на изменение воронки услуг. Система проверяет достаточность периода, источника, объёма данных и privacy settings. AI Analyst предлагает гипотезы, Product Planner формирует task на безопасное A/B или UX-изменение, но публичное рекламное размещение, платные кампании и доступ к личным данным требуют отдельного permission. После релиза наблюдать последующую метрику, не приписывать причинность одному действию без проверки.

### Сценарий D. Мой проектный брифинг и команда в Telegram

Владелец получает ежедневный краткий отчёт «что главное / что уже работает / что ждёт решения». Через аутентифицированную owner-команду может нажать `Одобрить задачу` или `Приостановить агента`. Система сохраняет owner approval, сама выполняет дальнейшие безопасные шаги и больше не требует повторять «Продолжи» для каждого нового цикла.

## 22. Программа реализации — маршруты и последовательность

### 22.1 Два согласованных потока

**Поток A — Strategy & UX:** Strategic Portfolio data model → Read-only Executive Dashboard → Projects/Milestones/Tasks UI → AI recommendations → Reports. Даёт владельцу ценность до подключения дорогих coding-агентов.

**Поток B — Execution & Trust:** Durable task queue → Dispatcher/Lease/Outbox → Event/tick → Real deterministic worker → Evidence verifier → Approved AI adapter → Autonomous recovery. Даёт реальную автономность и не зависит от готовности красивой панели.

Потоки объединяются на базе одной схемы `Task` и общего audit. Не допускаются независимые «таблица задач для UI» и «таблица задач для роботов»: это должно быть одно состояние.

### 22.2 Выпускать по вертикальным срезам

Каждый инженерный пакет имеет единственный ограниченный scope, тесты и один coherent publish. Не разрабатывать сразу 20 разрозненных API и десятки UI-страниц. Сначала сквозная цепочка одного безопасного задания, затем добавление новых ролей и типов работ.

| Этап | Scope | Доказательство приёмки | Зависимости |
|---|---|---|---|
| P0 · Inventory & decisions | Аудит branch, release owners, APIs, Supabase, billing, agent runtimes, usage | Current-state map, реестр точных providers, `no new spend` policy | Начало |
| P1 · Portfolio Foundation | Objectives/KRs/Initiatives/Projects/Milestones, read-only owner cockpit | Сохранение и readback стратегической цели, реальные source refs, нет ложного прогресса | P0 |
| P2 · Task Graph & Board | Tasks, dependencies, dedupe, audit, Kanban, acceptance, approvals | Видна задача с корректными status, блокировками и history | P1 |
| P3 · Durable Dispatcher | Registry, role/routing, claims, leases, outbox/inbox, budget | Конкурентные dispatch не дублируют run; unknown launch корректно reconciled | P2 |
| P4 · Automation Tick | Event intake, защищённый bootstrap, 10-min reconciliation и deterministic worker | Реальный provider run стартует и подтверждается без повторной команды | P3 |
| P5 · Evidence/PR Integration | Exact-head checks, release proof, existing merge handoff, retry policy | No duplicate CI waves, задачи различают code/merged/LIVE | P4 |
| P6 · AI Coding Route | Один доказанно доступный Codex/другой headless provider, sandbox, permits | Ограниченный end-to-end patch+review с затратами в лимите | P5 + runtime proof |
| P7 · Council & Intelligence | Agent suggestions, strategic score, project health, daily/weekly brief | Совет предлагает 1–3 действия с фактами, ничего не исполняет за пределами policy | P1–P6 |
| P8 · Canary & Production | Feature flags, shadow mode, restricted classes, soak/readbacks, rollback | Подтверждённая непрерывность, безопасная остановка, owner acceptance | P0–P7 |

P6 нельзя обозначить «выполнено» после добавления адаптера с `disabled`. Нужен **реальный запуск** на проверенном headless runtime со структурированным receipt и успешным независимым readback.

### 22.3 Пакеты PR и критерии готовности

**Package 1 / architecture & policy:** ADR, схемы, risk register, перечень агентов, access matrix; строго docs/source tests.  
**Package 2 / storage core:** миграции, indexes, grants/RLS, state machine и contract tests.  
**Package 3 / read-only portfolio UI:** owner page + API, filters, provenance и responsive smoke.  
**Package 4 / task board and approval:** создание задач, Kanban, audit/versions.  
**Package 5 / dispatcher worker core:** inbox/outbox/lease, fake adapter/contract tests.  
**Package 6 / real deterministic launch:** разрешённый GitHub runner, controller tick, idempotency.  
**Package 7 / independent evidence and PR handoff:** exact SHA, verifier, readback release.  
**Package 8 / approved AI coding adapter:** ограниченный sandbox + capabilities + feedback.  
**Package 9 / executive intelligence and rollout:** отчёты, scoring, guardrails, monitoring.

Сочетание пакетов допускается, когда не приводит к дополнительным CI waves; **связанное изменение кода + тестов + docs должно публиковаться одной подготовленной пачкой**, а не десятками последующих коммитов.

## 23. Подробный инженерный backlog (issue-ready)

Все пункты — **TO DO** и требуют ещё исполнения. Отмечать как DONE по этому документу нельзя. Формат: `ID · задача — критерий завершения`. При импорте в GitHub Issues указывать `parent`, `labels`, `owner`, `deps`, `acceptance`, `policy` и ссылку на настоящий release checklist.

### P0 — подготовка / policy / источники

- **CC-001 · Inventory repositories and owners.** Зафиксировать repo IDs, ветки default/prod, workflow owners, current CI gates, actors; readback в документе.
- **CC-002 · Audit existing automations.** Составить список webhook/cron/Actions/ChatGPT Automations и ownership, найти дубли; не создавать новые расписания до результата.
- **CC-003 · Validate runtime providers.** Для каждого Codex/CLI, Hermes, OpenClaw, Ollama, GitHub Actions: host, executable/API, token metadata, permissions, quota, ability to receive callback; `not_verified` по умолчанию.
- **CC-004 · Budget & cost baseline.** Проверить использованные GitHub minutes, Vercel invocations, Supabase storage и AI cost; неизвестное не писать нулём.
- **CC-005 · Approvals & trust ADR.** Owner утверждает L0/L1/L2/L3, permissions, kill switches, read/write scopes; версия immutable.
- **CC-006 · GitHub PR ownership ADR.** Подтвердить `GLOBAL_PR_ONE_PUBLISH_V1` и единственного PR merge owner; regression checklist.
- **CC-007 · Target topology decision.** Выбрать один bootstrap/tick режим, проверить default/prod branch mismatch и полномочия workflow_dispatch.

### P1 — стратегическая модель и чтение данных

- **CC-010 · Portfolio schema migration.** Objectives/KRs/Initiatives/Projects/Milestones; проверены RLS/grants/indexes.
- **CC-011 · Portfolio aggregate API.** Подтверждённый owner read-only endpoint с stable cursors и timestamps.
- **CC-012 · Source registry.** Явные source adapters GitHub/Vercel/analytics с `observed_at`, статусом и confidence.
- **CC-013 · Seed project taxonomy.** Названия проектов Holistic House, без поддельных процентов/статусов и без массового создания Issues.
- **CC-014 · Executive Overview UI.** Три приоритета, портфель, blockers, active workers, freshness, evidence links; responsive RU/EN/ES.
- **CC-015 · Initiative & KR cards.** Baseline/target/current с source and unknown-state; owner audit trail.
- **CC-016 · Milestones/timeline view.** Этапы и target dates, требующие явных критериев завершения.
- **CC-017 · Portfolio health rule.** Объяснимые statuses on_track/at_risk/off_track/unknown; fail-closed on stale source.

### P2 — единая система задач и Board

- **CC-020 · Task DB migration.** Структура Tasks, external links, milestones, dependency edges, audit.
- **CC-021 · Task state machine.** Все допустимые transitions с actor/policy version, негативные причины и terminal states.
- **CC-022 · Canonical task intake.** Owner creation, GitHub issue mapping, normalized dedupe; повтор источника не создаёт новый work.
- **CC-023 · DAG dependency planner.** Hard/soft relationships, запрет cycles, downstream wake после verified predecessors.
- **CC-024 · Task detail API.** Read/update через precondition and CAS, pagination, version conflict.
- **CC-025 · Kanban UI.** Executive/Kanban/Timeline представления, фильтры по initiative/project/status/role.
- **CC-026 · Approval workflow.** `approve/reject/pause/resume/reprioritize`, CSRF+owner actor+history.
- **CC-027 · Priority scorer.** Детерминированный score и explanation; tests priority/severity/aging.
- **CC-028 · Cross-project dedupe UI.** Предложения merge/link, no auto-close внешних Issues.

### P3 — agent registry, durable dispatch, outbox

- **CC-030 · Agent manifest schema.** Разделить role/runtime/model/instance, validate caps, permissions, credentials alias.
- **CC-031 · Provider health registry.** Возможность `disabled/unknown/unavailable/healthy` по фактическому тесту, не по существованию yaml.
- **CC-032 · Capability broker.** Hard match и deny-by-default для любых unlisted tools/repos/paths.
- **CC-033 · Cost & quota ledger.** Reservations, usage readback, hard cap, unknown cost, bounded cancellation.
- **CC-034 · Atomic claim + fencing.** Generation, lease, one active writer per effect; parallel-claim integration test.
- **CC-035 · Transactional inbox/outbox.** Unique external event/intent keys, delivery state, replay controls.
- **CC-036 · Launch reconciliation.** `launch_unknown` → authoritative provider run lookup; no blind retry.
- **CC-037 · Worker callback authorization.** Signed scoped receipts, nonce, expiry, replay/generation validation.
- **CC-038 · Assignment audit.** Record route selection score, alternatives rejected, policy version, last known health.

### P4 — событийное пробуждение и настоящий worker

- **CC-040 · GitHub event bridge.** Signature verification, allowlisted repo+event, data-only intake, minimal payload.
- **CC-041 · Safe periodic bootstrap.** One approved 10-minute reconciliation schedule with correct default/prod SHA handling.
- **CC-042 · Idempotent deterministic worker.** Real GitHub Actions/approved host execution and external run readback.
- **CC-043 · Bounded dispatcher.** Fair queue, WIP caps, no recursive loops, max events per tick.
- **CC-044 · Worker heartbeat.** Lease renewals, progress states, timeout detection and output receipt.
- **CC-045 · Lost-event recovery.** Missed webhooks/expired lease/provider unknown tests under network partition.
- **CC-046 · Pause & emergency stop.** Revocation of new claims and best-effort cancel of external runs; audit of remaining work.

### P5 — evidence, PR release and remediation

- **CC-050 · Evidence schema and verifier.** Distinguish claimed/tested/merged/deployed/live, verifier source timestamps.
- **CC-051 · GitHub exact-head adapter.** Fetch required checks, branch rules, PR writer ownership, changed SHA.
- **CC-052 · PR merge handoff.** Existing Control Tower only; no second merge controller.
- **CC-053 · Vercel deployment readback.** SHA/status/environment/URL provenance and edge/cache checks.
- **CC-054 · Feature E2E browser smoke.** Representative Video Studio scenario, device profiles and expected results.
- **CC-055 · Recovery policy.** Transient vs functional error, bounded retries/no-progress detector, dead-letter.
- **CC-056 · CI amplification guard.** Test no duplicate Core waves/no-op commits/redundant PR edits.
- **CC-057 · Evidence-driven task completion.** `completed_live` forbidden when mandatory source is pending/unknown.

### P6 — headless coding agent

- **CC-060 · Provider readiness proof.** Проверить actual subscription/API/CLI ability and cost limits; не предполагать безлимитный Codex.
- **CC-061 · Sandboxed coding profile.** Ephemeral worktree, allowlisted paths, secrets isolated, no unreviewed remote shell.
- **CC-062 · Codex CLI/SDK adapter.** Confirm `start/status/cancel/result`, structured output; disabled until auth proof.
- **CC-063 · Agent reviewer split.** Implementation and independent reviewer different roles/receipts.
- **CC-064 · Single-PR repair integration.** One coherent write/verified repair wave, no branch race.
- **CC-065 · Optional Hermes adapter.** Disabled default; only with trusted host, ID, callback and permission control.
- **CC-066 · Optional OpenClaw adapter.** Disabled default; allowedAgentIds, isolated session, no unrestricted tools.
- **CC-067 · Provider failover test.** Confirm old process is stopped/reconciled before switching writers.

### P7 — стратегический советник и отчётность

- **CC-070 · Project health snapshots.** Health evidence, freshness and source-linked deltas.
- **CC-071 · Daily executive briefing.** Three priorities, runs, blocked, verified outcomes, 1–3 actions, quiet delivery.
- **CC-072 · Weekly portfolio review.** Objectives, KR trends, scope change, capacity, released value, bottlenecks.
- **CC-073 · AI proposal adapter.** Strict JSON `signal → why → action → check → risk`, no self-execution without policy.
- **CC-074 · Agent productivity metrics.** Success by comparable task classes, failed retries, cost per result, stale.
- **CC-075 · Replanning based on evidence.** Reprioritization proposal on changed KRs, not autonomously altered strategic mission.
- **CC-076 · Report export and archive.** Safe Google Doc/markdown summary references, dedupe daily delivery, no secret data.

### P8 — безопасный выпуск и управление эксплуатацией

- **CC-080 · Read-only shadow mode.** Диспетчер планирует намерения, но не отправляет writes; сравнить с реальными GitHub events.
- **CC-081 · Limited canary.** Только один low-risk task class, one runner, hard cap, owner kill switch.
- **CC-082 · Failure injection.** Два параллельных tick, lost ACK, stale generation, provider down, PR changed mid-run.
- **CC-083 · Security review.** HMAC/RLS/CSRF/SSRF/prompt-injection/secret leak tests.
- **CC-084 · Regression & mobile acceptance.** Existing Scout/Council/PR unchanged, 320/390/430 px, RU/EN/ES.
- **CC-085 · Cost review.** Real usage, overage protection, daily/weekly cap and alert.
- **CC-086 · LIVE readback.** Protected merge+deployed SHA+real dispatcher run+dashboard receipts.
- **CC-087 · Operations playbook.** Emergency stop, dead-letter, retry manual, rollback, provider disable, incident contacts.
- **CC-088 · Owner acceptance.** Подтверждённый автономный workflow без повторного «Продолжи» и понятный executive brief.

### 23.1 Минимальные зависимости пакетов

`CC-001..007 → CC-010..017 → CC-020..028 → CC-030..038 → CC-040..046 → CC-050..057 → CC-060..067 → CC-070..076 → CC-080..088`. Некоторые UI/read-only модули допускают параллельную разработку, но переход к реальному AI worker блокируется до проверки security, privileges, cost, external run admission и PR ownership.

### 23.2 Критический первый вертикальный срез

**Сценарий:** вручную создать одну low-risk task → queue → auto-claim → deterministic GitHub Actions worker → signed receipt → independent verification → done/blocked в dashboard → daily brief. Всё без второго сообщения пользователя. Это должно заработать **раньше**, чем внедрение полноценных Hermes/OpenClaw и многопровайдерного маршрутизатора.

## 24. План тестирования: acceptance matrix

| ID | Тест | Ожидаемый результат |
|---|---|---|
| T01 | Создание Objective/KR | owner view и readback, без fictitious progress |
| T02 | Два одновременных update Task | Только один CAS succeeds; второй получает `STALE_VERSION` |
| T03 | Две параллельные scheduler ticks | Не более одного claim на task/effect |
| T04 | Повтор того же webhook 10 раз | Один canonical event/task/run |
| T05 | Duplicate source issue | Связь с существующим task без второго PR |
| T06 | DAG cycle attempt | Транзакционно отвергается |
| T07 | Dependency incomplete | Downstream не стартует |
| T08 | Provider disabled/unknown | `blocked_no_runner`, запуск не происходит |
| T09 | Provider token отсутствует | `blocked_auth` без логов секрета |
| T10 | Policy запрещает write | Capability broker denies |
| T11 | Budget cap=0 paid provider | Нет внешнего платного run |
| T12 | Lost launch ACK | `launch_unknown`, readback до повторения |
| T13 | Expired lease/stale result | Old generation не закрывает задачу |
| T14 | Heartbeat потерян, run ещё жив | Не запускается конкурент |
| T15 | Worker failure с transient cause | Bounded retry с backoff |
| T16 | Два одинаковых patch failures | Circuit break/no-progress и explanation |
| T17 | Prompt-injection text в Issue | Не запускаются произвольные команды |
| T18 | Worker заявляет success без evidence | Статус остаётся awaiting verification |
| T19 | Required CI не пройден | Нет merge или LIVE |
| T20 | PR HEAD changed after check | Старое evidence недействительно |
| T21 | Vercel READY для другого SHA | Не считается released target |
| T22 | Browser smoke failed | `completed_live` запрещён |
| T23 | Global Pause в середине работы | Новые claims stop, in-flight перечислены |
| T24 | Existing Video Scout regression | Нет двух crawlers и правовых auto approvals |
| T25 | RU/EN/ES + 320/390/430px | Дашборд доступен без горизонтального clipping |
| T26 | 7-day operational soak | Реальные events/receipts, без ложных успешных событий |
| T27 | Failed database read | UI `unknown/degraded`, backend fail closed |
| T28 | Другая роль/сервис | Retry следует policy, а не предложению модели |
| T29 | Signed callback replay | Отвергается без изменения run state |
| T30 | Task→Agent→Proof drilldown | Любой `Done/LIVE` имеет открываемый source link |

**Запрещённые упрощения:** заменить browser smoke unit test, считать HTTP 200 доказательством работы интерфейса, записать «merge выполнен» без GitHub API, считать deployment READY доказательством исправленного клиентского сценария, дать second agent свободный push на ту же PR ветку.

## 25. Нефункциональные требования и эксплуатационный контроль

**Reliability:** durable очередь и outbox; идемпотентные boundaries; отсутствие лишних external writes при повторном tick; возможность восстановиться после прерывания DB/API. **Security:** minimised provider tokens, signed callbacks, owner-only admin, audit and kill. **Performance:** admin overview — агрегированный server snapshot с cursor/pagination; не выполнять многоминутный GitHub full inventory при открытии каждой страницы; heavy reconciliation вне пользовательского HTTP path.

**UX:** mobile-first, только важные решения на первом экране, детальные логи раскрываются по требованию, явная свежесть данных, единая терминология RU/EN/ES, WCAG-oriented focus states и клавиатурная навигация. **Observability:** structured events without raw prompts/secrets, run correlation ID, policy revision, task owner, source, error class, cost confidence, UTC timestamps + отображение America/Toronto.

**Data lifecycle:** безопасная retention политика: короткие технические логи агрегируются, evidence links сохраняются; PII из внешних issue и клиентских материалов не копируются в публичный dashboard и model prompts. Импорты и миграции не стирают старые журналы задач; схема versioned.

**Schedule semantics:** желаемый reconciliation каждые 10 минут; фактический `observed_at` записывается. Не обещать гарантированный десятиминутный SLA на best-effort GitHub-hosted cron. Для строгого SLA нужна подтверждённая постоянно работающая инфраструктура с отдельным бюджетным решением.

## 26. Definition of Done по этапам

**P0 готов**, когда есть полный реестр auth/cost/runtimes/default branch, утверждённые policies и одна целевая схема ownership. **P1–P2 готовы**, когда strategy/board отражают реальные данные, а неизвестное не отображается как success. **P3–P4 готовы**, когда внешний deterministic worker автоматически запускается от одной owner-approved задачи, запись запуска и результат переживают потерянный HTTP connection. **P5 готов**, когда код и LIVE разделены доказательствами и существующий PR owner не дублирован. **P6 готов**, только если реальный coding runtime смог ограниченно исправить low-risk проблему и пройти самостоятельное review/CI. **P7 готов**, когда отчёты опираются на реальные receipts/метрики и предлагают конкретные решения. **P8 готов**, когда canary успешно выдержал failure-injection/soak и owner подтвердил рабочий ежедневный сценарий.

Ни одна фаза не считается выпущенной только по коммиту, мокам или PR. Требуется deployed SHA, факт работы в целевой среде и ссылка на приёмочный evidence.

## 27. Rollout, backout и регламент изменений

1. **Spec approval:** архитектурные решения, права и бюджет зафиксированы.
2. **Migrations isolated:** создать таблицы без включения workers; миграция c RLS/readback.
3. **Read-only dashboard:** источники данных видны, но кнопки опасных действий скрыты/disabled.
4. **Shadow dispatcher:** логируются предполагаемые claims и route decisions, реальных запусков нет.
5. **Canary L0:** один deterministic worker, закрытый тестовый task class.
6. **Canary L1:** один проверенный coding provider, один approved PR, hard budget и rollback.
7. **Limited production:** расширять только доказанно безопасные задачи/репозитории.
8. **Operational review:** проверить расходы, отказоустойчивость, ложные статусы, retries, человеческие approvals.

**Rollback:** выключить provider route и dispatch flag, прекратить новые claims, безопасно reconcile/abort in-flight, оставить старые Scout/Council и PR Control Tower нетронутыми; UI переходит в read-only mode. Не удалять таблицы и журналы до подтверждённого сохранения истории и отсутствия активных tasks.

**Изменение policy/priority:** иметь `expected_revision` и audit. Изменения budget и продакшен-разрешений выполняются через owner-authenticated control, не через LLM-переписанный AGENTS.md.

## 28. Ограничения, открытые решения и приоритет

### 28.1 Обязательные технические решения до реализации

- Установить, какой headless coding provider реально можно запускать 24/7 без новых трат; подтвердить наличие credentials, runtime, quotas, CLI/SDK/version и callback.
- Выбрать доверенный bootstrap в условиях отличающихся default/prod веток; проверить, что не вызывает дублирующие CI waves.
- Определить, какие бизнес-метрики уже разрешено читать с учётом текущего privacy hold веб-аналитики. Без consent/readback аналитический модуль остаётся `no_verified_source`.
- Уточнить список ранних задач, допустимых к L1 автоматическому исправлению без отдельного approval; высокорисковые действия по умолчанию запрещены.
- Зафиксировать дневные лимиты существующих GitHub/Vercel/Supabase ресурсов, а не считать их бесконечными.

### 28.2 Приоритет запуска проекта

**Первые две реальные поставки:** (1) стратегический обзор + единая task board с provenance; (2) один автономно исполняемый безопасный task без repeated owner prompts. Это создаст и видимый управленческий интерфейс, и доказанную техническую автономность. Многопровайдерный AI-рой, advanced forecasting и внешние Linear sync — только после этих двух базовых результатов.

### 28.3 Что можно добавить позже, но не в критический путь

Двусторонняя синхронизация с Linear (если он появится); multi-organization tenancy; forecasting ML; кросс-проектное ресурсное планирование; визуальный agent graph; дополнительные каналы Slack/WhatsApp; сложные AI Councils и голосовой командный интерфейс. Все они не должны задерживать безопасный task→run→verify loop.

## 29. Справочник источников и code base

**Официальные публичные материалы** (сверены на 6 ноября 2026; названия API и тарифы могут изменяться):

1. Linear — Initiatives: https://linear.app/docs/initiatives
2. Linear — Project milestones: https://linear.app/docs/project-milestones
3. Linear — Project graph: https://linear.app/docs/project-graph
4. Linear — Initiative/project updates: https://linear.app/docs/initiative-and-project-updates
5. Linear — Triage Intelligence: https://linear.app/docs/triage-intelligence
6. Linear — Agent platform: https://linear.app/docs/agents-in-linear
7. Linear — cloud coding agent: https://linear.app/docs/linear-cloud-coding-agent
8. Linear — Loops (20.07.2026): https://linear.app/changelog/2026-07-20-introducing-loops
9. Hermes — Kanban reference: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/kanban.md
10. Hermes — scheduled tasks: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/cron.md
11. OpenClaw — Automation: https://docs.openclaw.ai/automation
12. OpenClaw — How automations work: https://docs.openclaw.ai/automation/cron-jobs/how-it-works
13. OpenClaw — inbound webhooks: https://docs.openclaw.ai/automation/cron-jobs/webhooks
14. OpenAI Codex harness / SDK / app-server: https://developers.openai.com/blog/codex-as-a-platform
15. GitHub Actions events/default branch: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
16. GitHub workflow dispatch: https://docs.github.com/en/rest/actions/workflows
17. Vercel Cron Jobs: https://vercel.com/docs/cron-jobs

**Проверенные действующие файлы Holistic House:**

18. Owner Automation UI: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/app/admin/automations/page.tsx
19. Owner Automation API: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/app/api/admin/automations/route.js
20. Worker adapters: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/lib/automations/worker-adapters.mjs
21. Scout DB: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/lib/automations/scout-db.mjs
22. Weekly Council runner: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/lib/automations/weekly-council-runner.js
23. Existing local gateway: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/scripts/owned-agent-gateway.mjs
24. PR sweep guard: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/scripts/pr-sweep-guard.mjs
25. Automation operations canon: https://github.com/andylitvinov-design/books/blob/codex/public-book-library/docs/operations/AI_COUNCIL_AUTOMATIONS_V2.md
26. Cross-project PR One Publish: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md

---

**Финальный архитектурный принцип:** в Holistic House владелец управляет **целями, приоритетами, правами и бюджетом**, Command Center управляет **задачами и запуском**, агенты выполняют **ограниченные работы**, независимые сервисы проверяют **фактические результаты**. Только такой контур действительно избавляет от повторяющейся команды «продолжи» без потери контроля, денег и качества.
