# Agent Commander — бесплатный AI Repair Worker · Handoff V1
**Дата:** 07.11.2026 · **ID:** HH_COMMANDER_AI_REPAIR_HANDOFF_V1
**Статус:** подготовлено для отдельного control-plane PR. Production standalone требует отдельной проверки.

## Реальный путь пользователя

На странице «Задачи и PR» в Agent Commander появится кнопка **🛠 AI-ремонт** на карточках PR в двух существующих представлениях. Она готовит безопасную публичную команду через уже существующий GitHub Agent Inbox #3890, не требует нового доступа или платного API.

1. Нажатие → read-only GitHub GET /pulls/{number}; проверка открытого Ready PR из andylitvinov-design/books, базы codex/public-book-library, актуального 40-символьного HEAD SHA, mergeable state, метки hh:repair-needed и отсутствия hold/worker-claimed.
2. Read-only GET /issues/{number}/comments?per_page=100&page=1 → строгая проверка подписи GitHub Actions App (ID 15368), exact SHA и строки Failed jobs: core-lint-types-build внутри HH_PR_10MIN_SOURCE_REPAIR_V1.
3. Если хоть одно условие не выполнено, показывается конкретная блокировка и НЕ создаётся команда.
4. Если всё подтверждено, показывается команда формата: **!pm repair PR_NUMBER EXACT_HEAD_SHA**, кнопка копирования и ссылка на GitHub Agent Inbox #3890. В команде только публичные номер и SHA.
5. Владелец самостоятельно размещает команду в GitHub. Это отдельное подлинное разрешение на обработку. Открытие ссылки, копирование команды, нажатие кнопки в Commander **не запускает** код.
6. Прежний 10-minute Watchdog распознаёт только настоящий GitHub-комментарий владельца, пишет CLAIMED, проверяет PR, signed Core RED, label, lease/hold и адресует прежнему trusted Repair Worker. Успех workflow_dispatch — не доказательство начала модели и тем более исправления.
7. Worker уже содержит бесплатный профиль **auto repair**: North Mini Code → Flint → Nemotron Ultra → Xing4.0. Перед ОДНИМ вызовом проверяет текущий OpenRouter :free каталог и нулевую цену. После неудачи/429 — STOP, без второго API-вызова, платных fallback и покупки кредитов.
8. Модель — недоверенный proposer. Отдельный исполнитель перепроверяет scope файлов, exact HEAD, lease, diff, целевые тесты, Core/Specialist/Guard, и только доверенный publisher может создать один осмысленный source commit. Merge и проверенный production LIVE — независимые этапы.

## Ограничения

- Кнопка не использует локальный выбор модели из PR #3916 для назначения исполнителя. Ранее выбранная модель — только предпочтение на устройстве. Worker использует свой закреплённый **auto** профиль, а фактически выбранная модель должна подтверждаться GitHub-run receipt.
- Чат, частная информация, CRM, пользовательские или медицинские данные, пароли и ключи не передаются в GitHub Inbox. GitHub Issue #3890 публичный.
- Никакого клиентского Github token в браузере, нового Vercel write API, секретов, cron, Actions workflow или платного провайдера. Нет самовольного merge, нет обхода CI.
- Это путь только для точно подтверждённых RED Core PR. Draft, конфликтный, HOLD, security-sensitive и PR без подписанного failing Core proof будут заблокированы.
- Если подходящего PR сейчас нет, НЕ создавать тестовую ошибку или метку ради принудительного запуска.

## Acceptance / release

- Код находится в репозитории books, контрольная ветка codex/bootstrap-books, standalone PR Monitor разворачивается вручную с ПОЛНЫМ manifest предыдущего READY деплоя. Частичный GitHub пакет нельзя публиковать на standalone LIVE: исторически в нём были дополнительные файлы и API.
- Новый JS/HTML/CSS и шестичастный Node contract test включаются в существующий HH PR watchdog contract workflow. Новые jobs/cron не создаются.
- Проверить авторизацию GitHub-контракта, 100+ comments fail-closed, реальный read-only PR/HEAD, 320/390/430 px, сохранность task/model picker и всех API/legacy pages.
- Реальная E2E проверка требует настоящего eligible RED Core PR без чужой lease, владельческого GitHub-комментария, фактической Watchdog/Worker цепочки, указанного ответа модели и стоимости $0. До этого нельзя объявлять реальный PR исправленным.
- Только после exact-HEAD CI и защищённого merge можно переносить полную сборку в Vercel и подтверждать alias/deployment/SHA/функциональный LIVE.

Связанные документы:
- [Рейтинг моделей и Worker routing](HH_AI_CODE_PR_MODEL_ROUTING_V1.md)
- [GitHub Free Inbox](HH_PM_GITHUB_FREE_RELAY_20261107.md)
- [CI release](CI_RELEASE_POLICY.md)
- [Global PR one-publish](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md)
