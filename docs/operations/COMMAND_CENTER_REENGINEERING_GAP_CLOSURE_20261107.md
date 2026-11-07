# Holistic House · Command Center — аудит незавершённого и дорожная карта
**Дата среза:** 7 ноября 2026. **Контур:** GitHub `andylitvinov-design/books`, Vercel Holistic House, приватный Supabase.  
**Владелец архитектуры:** один Command Center + один существующий GitHub Watchdog/Repair Worker.  
**Статус документа:** подтверждённые факты, предлагаемые следующие работы и критерии приёмки; не имитация выполненных задач.

## 1. Подтверждённое LIVE
- PR [#3796](https://github.com/andylitvinov-design/books/pull/3796): приватная база и ограниченный диспетчер.
- PR [#3798](https://github.com/andylitvinov-design/books/pull/3798), [#3800](https://github.com/andylitvinov-design/books/pull/3800): мобильная PWA, создание задач, вкладки, журнал.
- PR [#3815](https://github.com/andylitvinov-design/books/pull/3815): честные десятиминутные `no_change`, пауза/отмена.
- PR [#3814](https://github.com/andylitvinov-design/books/pull/3814), [#3828](https://github.com/andylitvinov-design/books/pull/3828): on-demand GitHub PR/CI/production-код и source-инвентарь.
- PR [#3831](https://github.com/andylitvinov-design/books/pull/3831), [#3841](https://github.com/andylitvinov-design/books/pull/3841): Epic → три плана → задачи и мобильная навигация.
- PR [#3847](https://github.com/andylitvinov-design/books/pull/3847) и контрольный [#3848](https://github.com/andylitvinov-design/books/pull/3848): owner-only Execution Gateway, защищённый Watchdog handoff, UUID-корреляция на control HEAD.
- PR [#3857](https://github.com/andylitvinov-design/books/pull/3857): учёт независимых evidence, защита от ложной метки `completed_verified`; production Vercel READY+alias подтверждены.
- Альтернатива PR [#3849](https://github.com/andylitvinov-design/books/pull/3849) закрыта **без merge**, чтобы не создать второй gateway/queue.
- В приватной базе при последнем наблюдении: **7 проектов, 12 Epic, 65 задач, 1 GitHub Reader run, 1 evidence**. У 11 из 12 прежних `completed_verified` не было записи `cc_evidence`. Это пробел доказательств, а не автоматическое доказательство, что изменение кода отсутствует.
- Последний подтверждённый runtime: `/admin/command-center`, `/admin/project-management`, protected auth, нет выявленных Vercel runtime-ошибок в выбранном суточном диапазоне. **Владелец iPhone не проходил инструментально подтверждённый end-to-end smoke в этом срезе.**

## 2. Цель и запреты
На iPhone: диктую/ввожу задачу → она сохраняется → выбирается допустимый исполнитель → реальный запуск → подтверждённый patch/commit → exact-HEAD CI → protected merge → deployed SHA → функциональный LIVE. **Каждый переход основывается на своём доказательстве**, а не на желаемом статусе.

Запреты: ZERO NEW PAID SERVICES; не выдавать GitHub HTTP 204, выполненный Watchdog, зелёный CI, merge или Vercel READY за работающего AI-кодера и подтверждённый пользовательский LIVE; не обходить RLS, owner confirmation, `hh-merge-check`, Specialist, CI/WebKit, leases; не запускать второй cron/merge worker; не повторять бесконечно исправления без новой ошибки; не копировать секреты в браузер или PR.

## 3. Программа работ — в порядке зависимостей

| ID | Приоритет | Статус на дату среза | Работа / критерий готовности |
|---|---|---|---|
| CC-P0-01 | P0 | **В реализации (текущий PR)** | Исправить `execution_status`: запуск GitHub Watchdog `direct-handoff` подтверждает лишь диспетчер, НЕ кодового агента. Сопоставлять точные `PR # + request UUID`, выводить `WATCHDOG_DISPATCHER_STARTED` / `WATCHDOG_COMPLETED_UNVERIFIED`, сохранять `codeWorkerProof=UNVERIFIED` до подписанного независимого доказательства. Тест на ложный `RUNNER_STARTED`. |
| CC-P0-02 | P0 | **Блокер: нет подтверждённой настройки** | Владелец отдельно разрешает production `HH_PM_EXECUTION_ENABLED=true` и подключает repo-scoped server-only `HH_PM_GITHUB_ACTIONS_WRITE_TOKEN` с минимальным Actions write/read. Секрет создаётся/подключается через доверенный интерфейс, не публикуется в чате, коде, логах. До этого кнопка запуска показывает `OWNER_EXECUTION_NOT_ENABLED` / `ACTIONS_WRITE_TOKEN_NOT_CONFIGURED`. |
| CC-P0-03 | P0 | **Подготовлено частично, не подключено** | Проверить реального бесплатного исполнителя: сначала детерминированный безопасный patch/TS/ESLint; только затем адаптер существующего Repair Worker / OpenRouter `:free` при live price=0, бюджете 0, нулевых fallback и свободной квоте. Требуется подписанный runner + проверенный новый source SHA, не успешный step-отчёт. |
| CC-P0-04 | P0 | **Не подтверждено** | Один безопасный тест на подходящем, не удерживаемом owner/lease, действительно RED PR: owner target и exact SHA, signed Watchdog reservation, start рабочего code worker, verified patch, новая ревизия, отдельные Core/Specialist/Guard и защищённый merge. При отсутствии допустимого PR не создавать фиктивную ошибку. |
| CC-P1-05 | P1 | **Частично** | Событийное продолжение после итерации: если новых source-change/CI proof нет — пауза с причиной; если есть подтверждённая новая неисправность — разрешённый повтор до лимита. Backoff, уникальность `task+HEAD+fingerprint`, максимум 3 разрешённых попытки; защищённые leases. |
| CC-P1-06 | P1 | **Частично** | Собирать из существующих GitHub/Vercel/Supabase источников единую поэтапную timeline `TASK_ACCEPTED → AGENT_CLAIMED → SOURCE_PUBLISHED → PR_OPEN → CI_RED/GREEN → MERGED → SERVED → FUNCTIONAL_LIVE`. `SOURCE_PUBLISHED` требует доказанного нового SHA и связи с исполнителем. |
| CC-P1-07 | P1 | **Частично** | Доказательства работы и покрытия: восстановить/подтвердить 11 исторических `completed_verified` без `cc_evidence` через PR-specific proof; не вписывать выдуманные evidence и не менять исходные записи. Для статусов LIVE нужен независимый функциональный smoke, а не только SHA Vercel. |
| CC-P1-08 | P1 | **Частично** | Связать мобильную кнопку «+ задача» и существующий Epic/3 Plan: одна idempotent «Оформить план» с указанием цели, критериев и проекта, затем owner approval, исполнитель/PR только после разрешения. Reuse существующих таблиц, без второго графа. |
| CC-P1-09 | P1 | **Частично** | Автоматическая PM-статистика и охват: счётчики task/epic/subtask по действительной БД, pagination при >100 задач, no_change отдельно от success, коэффициент полезных source commits / попыток и фактическое время до merge/LIVE. На один слот без новых запросов на весь PR backlog. |
| CC-P2-10 | P2 | **Требует приёмки** | Owner-authenticated Safari 320/354/390/430: создать задачу, диктовка, reload и сохранение, PR proof, bottom dock и safe-area, keyboard, RU/EN/ES, переход в PM, блокеры. Скриншот и реальные ответы API, без демонстрационных данных. |

## 4. Этапы
**Этап A (P0 честные статусы):** CC-P0-01 → защищённые Core/Specialist/Guard → production deploy/alias → серверное route proof. Это выполняемый сейчас кодовый пакет.

**Этап B (владелец подключает реальный запуск):** CC-P0-02 + CC-P0-03. Авторизация и runtime не подменяются новыми платными сервисами. Прежде чем включить автоматическое исправление, обязательны подтверждённые права, бюджет GitHub Actions и замер стоимости модели `$0`.

**Этап C (первое доказанное исправление):** CC-P0-04. Один допустимый RED PR; алгоритм не меняет чувствительные файлы и не удаляет CI/Specialist. Результат — ссылочный commit/PR, proof о merge и tested LIVE или честный blocker.

**Этап D (автономность и продукт):** CC-P1-05..09, затем CC-P2-10. Повтор запускается по доказанному событию, а не потому, что агент «закончил сообщение».

## 5. Критерии закрытия задачи
- У каждой задачи есть project, цель, acceptance, владелец/исполнитель, `current_run_id` или причина блокировки.
- Dispatcher не делает кодовый job claim без реального runtime, арендованной ветки и разрешённых capabilities.
- `RUNNER_STARTED` относится только к доказанному конкретному worker; Watchdog различим.
- `SOURCE_PUBLISHED` фиксирует `old_sha → new_sha`, ссылку на commit и независимое сравнение.
- `CI_GREEN` строго по нужному HEAD, независимый Specialist и `hh-merge-check` обязательны.
- `MERGED` — GitHub merged_at / merge SHA; `SERVED` — действующий Vercel alias и SHA/ancestry; `FUNCTIONAL_LIVE` — проверенный пользовательский путь.
- Любое неудачное/недоступное соединение = явный blocker, а не фиктивная успешность.
- Новый сервис с оплатой не подключён; счета, токены и персональные данные не попадают в клиентский JSON.

## 5а. Текущая доработка: доказательство source commit по подписанной цепочке

Связка `pm_request_id → Watchdog run → RESERVE → CLAIMED → RUNNER_STARTED → PUBLISHED` строится из ограниченного чтения GitHub API **по явному запросу владельца**, без дополнительных cron и GitHub write-токенов.

Проверка принимается только при совпадении PR, старого HEAD, owner UUID, номера Watchdog run, 32-символьного `task_key`, GitHub Actions bot App ID 15368 и worker run ID. Проверяется **полная** одна страница issue comments (≤100), а для нового source commit — текущий PR HEAD и независимый parent в GitHub commits API. Частичная история, неверная подпись, непроверенный parent и устаревший HEAD остаются `UNCONFIRMED`.

Новые состояния: `SIGNED_RESERVATION_ONLY`, `WORKER_CLAIMED`, `RUNNER_CONFIRMED_NO_SOURCE`, `READ_ONLY_PREFLIGHT_NO_SOURCE`, `SOURCE_COMMIT_UNCONFIRMED`, `SOURCE_COMMIT_VERIFIED`. Ни одна из этих меток сама по себе не означает `FUNCTIONAL_LIVE`, а наличие GitHub runner само по себе не означает запуск AI-модели.

Инцидент [Repair Worker run 42404038363](https://github.com/andylitvinov-design/books/actions/runs/42404038363): `claim` и `fix` завершились, но `code_fix`, `code_verify`, `publish` были пропущены; подписанное заключение `READ_ONLY_PREFLIGHT_NO_SOURCE`, `HH_CODE_AVAILABLE=false`, `new_sha=null`. Это не успешный кодовый ремонт и не основание бесконечно повторять workflow.

Реальная автоматическая разработка по-прежнему требует владельческого разрешения `HH_PM_EXECUTION_ENABLED`, серверного Actions-write token с минимальными правами, проверенного бесплатного кодового исполнителя и допустимого RED PR. Нельзя копировать чужой секрет из Vercel в GitHub или добавлять новый платный ключ без разрешения владельца.

## 6. Точки входа
- [Command Center](https://holistichouse.vercel.app/admin/command-center)
- [Project Management](https://holistichouse.vercel.app/admin/project-management)
- [PR Monitor](https://holistic-house-pr-monitor.vercel.app/)
- [Production branch](https://github.com/andylitvinov-design/books/tree/codex/public-book-library)
- [Control branch](https://github.com/andylitvinov-design/books/tree/codex/bootstrap-books)
- [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md)
