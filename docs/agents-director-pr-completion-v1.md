# Agents Director · PR Completion Controller — техническое задание v1

**Дата:** 2026-11-16  
**Репозиторий:** \`andylitvinov-design/books\`  
**Production branch:** \`codex/public-book-library\`  
**Trusted GitHub Actions control branch:** \`codex/bootstrap-books\`  
**Цель:** владелец указывает только номер PR; система использует существующие AI Repair, обязательные CI, защищённый merge, наблюдение LIVE и сообщает владельцу фактический результат.

## 1. Критерии завершения

- Обращение \`4770\` или \`!pm live #4770\` приводит к однозначному \`repo+PR\`, текущему \`head_sha\`, \`base_ref\` и устойчивой записи статуса.
- Уже зелёный PR не получает новую CI-волну. После точного зелёного Core и required checks активируется **существующий** native auto-merge; снятие branch protection и фиктивная отметка green запрещены.
- При подлинной ошибке исходников подписанная диагностика и single-writer lease запускают существующий Repair Worker. Настоящий вызов AI и проверенный source commit обязательны; назначение/CLAIMED/HTTP 204 не доказывают исправление.
- После нового source SHA система ждёт реальный CI этого SHA. Отказ модели, неподходящая область source, conflict, отсутствие токена, 429, неопределённость GitHub/API и лимит расходов приводят к \`BLOCKED\` или \`NEEDS_REVIEW\`, не к повторному слепому rerun.
- Только доказанный GitHub \`merged=true\`, \`merged_at\` и \`merge_commit_sha\` даёт \`MERGED\`. Отдельное Vercel Production READY + exact deployed SHA + целевой smoke необходимо для \`DONE_LIVE\`.
- Личное уведомление должно быть одно по \`repo+PR+merge_sha\`; повторная проверка не повторяет мердж или сообщение.

## 2. Проверенные исходные проблемы

1. **Actor mismatch:** публичный PM inbox \`!pm repair #N SHA\` посылал \`workflow_dispatch\` через \`github.rest.actions.createWorkflowDispatch\`, то есть \`GITHUB_TOKEN\`, с актором \`github-actions[bot]\`. Принимающая функция \`validOwnerRepairTarget\` ожидает \`context.actor='andylitvinov-design'\`. Успешное HTTP 204 не означает успешную передачу исполнителю.
2. **Неудобная точка входа:** нужно было копировать 40-символьный source SHA.
3. **Недостающий терминальный сигнал:** в существующих PM ответах \`DISPATCH_ACCEPTED_UNCORRELATED\` не было дальнейшего события о GitHub merge.
4. **Разрозненные подтверждения:** записи \`AUTO_TASK_CREATED_NOT_DISPATCHED\`, \`RUNNER_CONFIRMED\`, \`OpenRouter COMPLETED\` не доказывают опубликованный исходный код. Нет одного контрольного журнала прогресса от ошибки до LIVE.
5. **Отсутствующие полномочия прямого private-chat source write:** first-party Director в Vercel исполняет read-only OpenRouter. В проверенной Production env-конфигурации не выявлено переменных GitHub App source publisher, поэтому прямую работу AI над существующим PR через private-chat нельзя объявлять LIVE только на основании наличия исходников.
6. **Цена и ожидание:** отдельные CI/cron/workflow на каждый этап усиливают задержку. Нужно повторно использовать существующие задания без дополнительных волн.

## 3. Предусмотренный контракт

**Публичный технический PM канал (первый безопасный релиз):** owner comment \`!pm live 4770\` или \`!pm complete 4770\` в [Issue #3890](https://github.com/andylitvinov-design/books/issues/3890). Только комментарии от подтверждённого владельца принимаются в очередь. В этом канале не публиковать конфиденциальные детали проектов, клиентов и ключи.

**Полный Agents Director (следующий интеграционный релиз):** owner-authenticated личный чат на странице Director / Telegram, ввод \`4770\` или \`доведи PR 4770 до LIVE\`. Внутренний запрос должен быть привязан к настоящим \`owner_id, chat_id, request_id\`, приватной задаче и текущему GitHub PR; LLM не выбирает репозиторий/токен/разрешение на запись самостоятельно.

### Жизненный цикл

\`\`\`text
OWNER_REQUESTED
  -> PR_READBACK_VERIFIED
  -> WAITING_REQUIRED_CI | CI_FAILED_CLASSIFIED
  -> DISPATCH_AUTHENTICATED
  -> RUNNER_STARTED
  -> MODEL_INVOKED
  -> PATCH_RECEIVED
  -> PATCH_INDEPENDENTLY_VERIFIED
  -> COMMIT_PUBLISHED_VERIFIED (new exact SHA)
  -> CI_RUNNING_EXACT_SHA
  -> CI_GREEN_EXACT_SHA
  -> GITHUB_MERGED_VERIFIED
  -> PRODUCTION_DEPLOY_PENDING
  -> LIVE_SMOKE_VERIFIED
  -> OWNER_NOTIFIED
\`\`\`

Дополнительные терминальные состояния: \`BLOCKED\`, \`CLOSED_UNMERGED\`, \`EXPIRED_UNVERIFIED\`, \`ESCALATE_SAFE_SOURCE_REPAIR\`. Каждый переход имеет источник доказательства и время. Не смешивать \`MERGED\` и \`LIVE\`.

## 4. Реализуемая P0 коррекция

- Перенаправить owner PM source repair dispatch через **существующий** \`HH_AUTOMERGE_TOKEN\`, уже передаваемый в trusted Watchdog в защищённом GitHub Secret. Не использовать \`github-actions[bot]\` как owner для адресного запуска. Remote HTTP 204 лишь подтверждает принятие dispatch. Ambiguous response не повторять без сверки.
- Создать \`!pm live #N\` / \`!pm complete N\`. HEAD всегда получать из GitHub; проверять конкретный PR, repo, protected base, draft, hold и существующие очереди. Для безопасного source failure использовать уже подписанный Repair Worker; иные категории не выдавать за исправленные.
- На том же запланированном Watchdog (без новой cron/workflow/runner) отслеживать владельческие live-заявки; не более трёх GitHub PR GET за цикл, с чередованием. Уведомлять через уже используемый owner PM Issue #3890 **только при GitHub-верифицированном merge** либо закрытии без merge; хранить bot-signed receipt и исключать повторную публикацию.
- При отсутствии доказательства, 401/403/429/5xx, новой HEAD, неверном контексте, отсутствии owner token, blocked/hold — честное \`WATCHING\`/\`BLOCKED\`. Никакой direct push в protected branch, paid fallback, обход CI, source patch без проверки.
- Публичный Issue receipt — техническое уведомление, **не** завершённое Telegram/ChatGPT push. Дальнейшая интеграция уведомления владельцу описана ниже.

## 5. Что ещё должно быть подключено для полной функции

### 5.1. Private-chat one-number intake
Реализовать owner-only \`POST /api/agent-director/pr-completion\` или защищённый вызов существующего Supabase Edge store. Параметры: \`pr_number\`, уникальный \`request_id\`, опциональный \`goal\`; всё остальное сервер читает сам. Идемпотентность \`(owner_id, repository, pr_number, request_id)\`, одна активная работа на точный HEAD. Повторное сообщение владельца возвращает сохранённый job ID, не создаёт второй workflow.

### 5.2. Гарантированное исправление
В existing execution ledger фиксировать: \`workflow_id/run_id/job_id\`, факт модели (\`provider, model_id, started_at, response_at, cost\`), кандидат, проверка и published SHA. Source repair только после signed Core failure и exact-head lease. Для сложных семантических ошибок — отдельно маркированная очередь с реальным подтверждением принятия; при таймауте аренды — безопасная reconcile, не бесконечный rerun. Лимиты попыток и затрат устанавливаются независимо от LLM.

### 5.3. Merge, LIVE и уведомление
Использовать \`hh-native-auto-merge.yml\` и требование \`hh-merge-check\`. Считать success только по GitHub API merged_at/merge_commit_sha; после Vercel готовности сравнить фактический deployed SHA и выполнить smoke. Передать персональное сообщение владельцу через существующий Telegram канал **без создания нового платного сервиса**. Подтвердить реальную доставку и idempotency ключ \`repo/pr/merge_sha\`. Отсутствие канала связи = \`NOTIFICATION_PENDING\`, не \`OWNER_NOTIFIED\`.

### 5.4. Мониторинг и экономика
Единая таблица, по каждому PR и периоду: received, claim, runner, real model call, patch, GitHub commit, CI start/end, protected merge, production READY, live smoke, delivered notice. Показывать \`unknown\` вместо «0 минут», если нет timestamp. Не создавать новый workflow для мониторинга. Проверки применяются на текущем SHA, green результаты не перезапускать.

## 6. Регрессионные тесты и приёмка

- Parser принимает \`!pm live #4770\` только от владельца; чужой коммент не исполняется.
- При наличии подписанной исправимой Core ошибки owner dispatch отправляется с действительным owner credential на проверенную default-branch workflow. Запрет fallback к \`GITHUB_TOKEN\` или стороннему актору.
- Зелёный PR сопровождается read-only, без дополнительного repair/CI dispatch.
- GitHub \`merged_at + merge_commit_sha\` приводит ровно к одному signed уведомлению; повторный Watchdog не публикует второе.
- Closed-unmerged или merged без merge SHA не считаются успешными; held/draft не обходятся.
- CI одного HEAD действительно проходит полный required gate; исходники становятся merged; затем Production READY/smoke подтверждается отдельно.
- Проверять реальный конец-в-конец на безопасном PR с воспроизводимой ошибкой, включая workflow run ID, точный old/new SHA, модельный receipt и конечное уведомление. Пока этого опыта нет — результат **PARTIAL**, не «автоматизация полностью LIVE».

**Ограничение текущего релиза:** исправление адресного владельческого диспетчера и GitHub merge observer возможно в trusted GitHub Actions уже сейчас. Личный private-chat запуск модели для source edit, Telegram уведомление и production LIVE acceptance требуют отдельного фактического end-to-end proof; не объявлять их завершёнными по одному коммиту.
