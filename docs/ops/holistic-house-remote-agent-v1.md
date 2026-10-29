# Holistic House Remote Agent v1 — концепция, архитектура, ТЗ и рабочий план

**Дата:** 2026-10-28 (America/Toronto)  
**Статус:** APPROVED-CONCEPT / DESIGN ONLY; **не установлено, не подключено, не live**.  
**Трекер:** [books #2505](https://github.com/andylitvinov-design/books/issues/2505)  
**Проект:** [Holistic House](https://holistichouse.vercel.app) / [andylitvinov-design/books](https://github.com/andylitvinov-design/books)  
**Production source:** ветка **codex/public-book-library**, а не GitHub default **codex/bootstrap-books**.  
**Связь:** приватный Mac worker голосовых отчётов — [#1299](https://github.com/andylitvinov-design/books/issues/1299); не смешивать с удалённым shell.

## 0. Решение в одном абзаце

Сохранить существующие прямые GitHub/Vercel/Supabase подключения как **основной** путь разработки. Для задач, требующих локальных файлов, WebStorm и вычислений на Mac, создать отдельный **Holistic House Remote Agent**: минимально привилегированный локальный сервис с ограниченными MCP-командами, подключаемый извне через защищённый **outbound-only** канал. Начать с переиспользования MIT-кода [DesktopCommanderMCP](https://github.com/wonderwhy-er/DesktopCommanderMCP) и/или встроенного WebStorm MCP, а не писать полный аналог с нуля и не копировать закрытый Desktop Commander Remote Relay. Установка на Mac, открытие удалённого канала, платные ресурсы и доступ к персональным материалам требуют отдельных гейтов.

## 1. Исходные данные / не делать заново

1. В подключённом Desktop Commander Remote текущий показатель **remote_calls_left_pct = 0**, при этом устройство MacBook Air отображается **Online** (28 октября 2026). Это проверка аккаунта, а не диагностика функциональности всех инструментов.
2. [Desktop Commander pricing](https://desktopcommander.app/pricing/): Remote Free — **10 000 tool calls/месяц**, Remote Pro — **$20/месяц** с заявленным отсутствием месячного потолка; **Local MCP** бесплатный, open-source MIT и не зависит от месячной квоты Remote.
3. Локальный DesktopCommanderMCP умеет чтение, поиск, редактирование файлов, терминал, управление процессами. Это **не** безопасная песочница само по себе: опасный процесс, пакет или Git hook могут обойти ограничения уровня инструмента.
4. На стороне ChatGPT уже доступны прямые коннекторы GitHub/Vercel/Supabase. Для смены кода сайта Mac **не обязателен**. Проверять production branch, текущие PR, CI, Vercel READY deployment, alias и точный SHA при каждом релизе.
5. В books уже есть отдельная работа по защищённому локальному TTS worker [#1299](https://github.com/andylitvinov-design/books/issues/1299). Повторно не строить этот worker; будущий remote agent может служить лишь **инструментом администрирования** с отдельными правами, без выдачи клиентских текстов в chat/tools/logs.
6. [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) поддерживает исходящий HTTPS-канал с Mac к OpenAI без входящих портов, но требует tunnel identity, Platform API key/permissions и соответствующего допуска ChatGPT. В документации указан default rate 600 requests/min на tunnel ID + app; это **не** полное отсутствие лимитов и не гарантия нулевых счетов.
7. Документы [Add custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server) и [Developer mode/plan availability](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt) описывают разные условия доступа: **write/modify из конкретного персонального ChatGPT и iPhone не считать доступным до реального теста**. Для MVP предусмотрен альтернативный клиент Codex/локальный MCP, а GitHub workflow продолжает работать независимо.

## 2. Цели, границы, метрики

**Результат:** пользователь может из разрешённого AI-клиента запросить статус Mac, посмотреть разрешённый рабочий репозиторий, предложить и внести правку в изолированный worktree, запустить заранее разрешённые проверки и передать результат в стандартный GitHub PR/CI. Команда с iPhone — целевой сценарий, но только после подтверждения возможностей самого клиента.

### В scope v1
- Переиспользование локального MCP и адаптер ограниченных команд.
- Только заранее заданные каталоги **рабочих копий** репозиториев; без доступа к остальной домашней папке.
- Поиск/чтение, точечный diff, запись с ожидаемой версией файла, безопасные диагностические команды.
- Явные состояния **online / offline / busy / failed**, ограничение времени и размера ответа, отмена задачи, ограниченные повторы.
- Защищённый удалённый транспорт и identity с revocation/kill switch.
- Отдельный путь GitHub-first для всех операций с PR, Vercel и Supabase.
- Проверки безопасности, журнал минимальных метаданных, запуск как непривилегированный launchd service на Mac.

### Не входит в v1
- Универсальный удалённый root/sudo shell; администрирование всего ноутбука; доступ к Downloads, iCloud, Safari, почте, Keychain, SSH-ключам и секретам.
- Произвольные пакеты, платные API, unattended production deploy, автоматическая публикация или слияние без существующего разрешения и release gates.
- Тексты клиентов, голосовые эталоны, медицинская информация, приватные CRM/кабинеты в инструментальном контексте.
- Разработка клона закрытого Desktop Commander Remote или обход лимитов чужой услуги.
- Прямой входной endpoint Mac в публичном интернете, открытие роутера, exposed WebStorm MCP.
- Встраивание shell transport внутрь публичного Next.js/Vercel runtime.

### Измеримые цели (проверяются, не декларируются заранее)
- **M1:** локальный smoke test: read → proposed patch → approved apply → diff → npm check на синтетическом файле.
- **M2:** реальный удалённый вызов инструмента с разрешённого клиента, с iPhone при поддержке, и проверенный read/write E2E.
- **M3:** 100% предопределённых negative-path тестов запрещённых директорий, symlink, non-allowlisted command, подмены actor и replay — отклонены.
- **M4:** offline / reconnect / timeout / cancel / duplicate: корректный статус, отсутствие неожиданной повторной записи.
- **M5:** изменения сайта поступают через PR → CI → ревью/разрешённый merge → production READY + SHA + alias. Agent-readiness ≠ site-live.
- **M6:** ноль вызовов платного Remote Desktop Commander и ноль неутверждённых расходов в тестовой трассе собственного канала.

## 3. Архитектура (рекомендуемая)

~~~mermaid
flowchart TD
    A["ChatGPT / Codex / approved MCP client"] --> G{"Task dispatcher"}
    G -->|"GitHub/Vercel/Supabase operations"| N["Existing connected native apps"]
    G -->|"Need local files or Mac tools"| R["Restricted MCP facade"]
    R --> T["Secure outbound transport, if entitled"]
    T --> M["Mac hh-agent: auth + policy + audit"]
    M --> W["Isolated project worktree"]
    M --> C["Allowlisted checks / WebStorm MCP adapter"]
    W --> P["GitHub PR + CI"]
    N --> P
    P --> V["Vercel production verification when relevant"]
~~~

**Разделение ответственности:**

| Компонент | Где живёт | Что делает / чего не делает |
|---|---|---|
| Orchestrator | ChatGPT/Codex | Планирует задачи, получает результаты. Не получает обходной доступ к Mac. |
| Native connectors | GitHub/Vercel/Supabase | Issues, PR, CI, deployments, БД/RLS по существующим разрешениям. **Основной маршрут.** |
| Restricted MCP facade | На доверенной машине / отдельном runtime | Публикует только конечный список безопасных инструментов и схем аргументов. Не публикует все методы Desktop Commander как есть. |
| Transport | OpenAI Secure MCP Tunnel, если допуск подтверждён | Outbound-only HTTPS, без публичного входящего shell; не заменяет app-level авторизацию. |
| hh-agent | Mac, non-admin service account | Policy/approvals, работа с изолированным worktree, redacted audit, heartbeat. |
| Workspace | Отдельный worktree/контейнер/VM | Код и временные результаты тестов. Не монтирует домашние папки и клинические данные. |
| Existing private voice worker | Изолированный контур #1299 | Не является инструментом ChatGPT для чтения личных данных. |

**Транспорт — decision gate:**
- **A (предпочтительно):** Secure MCP Tunnel + private local MCP. Проверить права на создание туннеля, отображение в Plugins, поведение read/write и расходы. Если нет прав на write, не изображать, будто он работает.
- **B (fallback):** локальный DesktopCommanderMCP/WebStorm MCP с поддерживаемым Codex/локальным клиентом; GitHub/Vercel/Supabase — по существующим ChatGPT коннекторам. Это позволяет работать без Remote quota, но **не** даёт автоматически терминал Mac из iPhone ChatGPT.
- **C (условно):** собственный небольшой outbound-poll gateway на доверенном сервере, только если A недоступен и отдельно одобрены хостинг, архитектура auth и security review. Не выбирать по умолчанию; не хранить нешифрованные команды/файлы в Supabase проекта сайта. Tailscale/Cloudflare могут быть транспортными альтернативами, но не решают автоматически ChatGPT MCP permission/authorization.

## 4. MCP API v1 (фасад поверх локальных средств)

Все операции требуют: **actor / device / correlation_id / request_id**, проверенного токена и capability scope. Внешний клиент не выбирает произвольный root path. Пути — только workspace-relative и после canonical realpath проверки.

| Инструмент | Вход (поля) | Выход | Право |
|---|---|---|---|
| **agent_health** | ничего | online/version/capabilities/busy; без hostname/секретов | viewer |
| **repo_status** | repo alias | branch, SHA, dirty/clean, краткий diff-stat | viewer |
| **list_files** | repo alias, relative dir, depth <=3 | разрешённые имена, bounded count | viewer |
| **search_files** | repo alias, pattern, max results | bounded paths/snippets с redaction | viewer |
| **read_file** | repo alias, relative path, offset, lines <=200 | содержимое только non-sensitive allowlisted source | viewer |
| **propose_patch** | repo alias, path, expected SHA, patch | dry-run, diff summary, validation result | editor |
| **apply_patch** | proposal ID, expected SHA, approval proof | new file SHA, diff-stat, file path | editor + approval |
| **run_check** | enum [unit, lint, typecheck, build, status] | task ID, exit status, truncated redacted output | runner |
| **task_status / cancel_task** | task ID | state, bounded output, cancellation result | runner |
| **agent_disconnect** | owner approval | immediate revoke/stop remote access | owner |

**НЕТ в v1:** произвольный execute_command, shell string, install_package, edit arbitrary file, delete_directory, upload client assets, kill any PID, read arbitrary URL. Полный tool surface оригинального Desktop Commander не выставлять через удалённый фасад.

### Протокол записи
1. Сначала **propose_patch** с expected file SHA и bounded diff; никакой записи на этапе предложения.
2. Вторая операция **apply_patch** с короткоживущим approval, тем же SHA/patch digest и idempotency key.
3. При изменившемся SHA / неверной ветке / истёкшем approval — fail closed; пользователь видит конфликт.
4. Все изменения изолируются в feature branch/worktree; **никаких direct push to production branch**. GitHub PR создаётся через существующий GitHub app с readback.
5. Список исполняемых проверок хранится в отдельной доверенной конфигурации агента, **не** редактируемой самим репозиторием. Запуск npm test/build/скриптов из checkout считается исполнением потенциально опасного кода — для недоверенного содержимого нужен контейнер/VM без секретов и с ограниченными правами.

### Ограничения исполнения (первоначальные предлагаемые)
- Размер одной записи/патча: до 256 KiB; чтение <=200 строк на вызов; единичный ответ <=32 KiB после redaction.
- Одновременные write-задачи на один worktree: 1; очередь только по явно созданным задачам; дедупликация по request_id.
- Запуск проверок: процессный timeout с настройкой по типу (например, 5 минут unit/lint, 15 минут build), bounded CPU/RAM при наличии sandbox. Эти числа **проектные, не доказанные**.
- Idle/reconnect: сообщения о том, что Mac offline, без ложного «задача выполняется». Перезапуск агента не повторяет уже завершённый apply.
- Технические telemetry: код причины отказа, время, статус и размеры; без содержимого файлов/потоков.

## 5. Threat model и защита

| Угроза | Мера / тест |
|---|---|
| Prompt injection из README, issue, результатов теста | Модель не может менять tools/role/scopes; неподтверждённые команды в файлах игнорируются; policy enforced server-side. |
| Обход allowedDirectories через ../, URL, symlink, hardlink | Проверка нормализованного пути + realpath каждого перехода, reject symlink outside root; race тесты; по возможности контейнерная файловая изоляция. |
| Утечка Keychain, ~/.ssh, .env, клиентских voice/health данных | Отдельная учётная запись без прав на домашние каталоги; deny sensitive patterns даже в repo; контейнеры без secret mounts. |
| Произвольное выполнение через npm scripts/git hooks/dependency install | Check-only sandbox, pinned/проверенные зависимости, disable hooks при доступности, недоверенные PR не исполнять на host Mac. Allowlist команд **не** считается полной sandbox. |
| Похищение токена/повтор запроса | OAuth/short-lived scoped token по поддерживаемой модели, ротация, device binding, nonce/request_id, expiry, revocation; не логировать bearer. |
| Exposed remote shell | Только outbound transport, auth на каждом MCP tool, запрет общей shell-команды, TLS/secure tunnel и ACL. |
| Изменение production без QA | GitHub branch protection/PR + CI, отдельное согласование merge/deploy, Vercel exact SHA и domain readback. |
| DoS / бесконечные затраты | Rate/concurrency/body/output/time caps, kill switch, per-project budgets, никакого auto upgrade. |
| Mac sleep / сеть недоступна | Offline state; незавершённые таски abort/recover с дедупликацией; GitHub-first fallback. |
| Разглашение содержимого в логах | Только метаданные: id, tool, redacted path alias, latency, exit code; retention proposal 14 days, локальная защита. |

**Требование:** публичный GitHub репозиторий содержит только код, протоколы и примеры без токенов, device IDs, приватных каталогов, голосовых материалов, PHI или клиентских email. Секреты хранятся в системном защищённом хранилище/credential store, не в репозитории. Вся работа с приватным TTS #1299 остаётся за его отдельной моделью прав и согласий.

## 6. Реализация и размещение исходников

- Каноническое **ТЗ/трекер** — books #2505 и **этот файл**. Не плодить новые задачи/документы для одного и того же MVP.
- Код hh-agent предпочтительно вынести в **отдельный репозиторий или приватный пакет**, чтобы не включить нативные зависимости, ключи и клиентские пути в публичный Next.js production bundle. Выбор репозитория подтверждается на S0; не создавать его автоматически до проверок доступа.
- Runtime: Node.js LTS + TypeScript + официальный MCP SDK, либо адаптер к уже установленному DesktopCommanderMCP/WebStorm MCP. Приоритет **переиспользованию**, а не копированию реализации.
- Если копируется/модифицируется MIT-код DesktopCommanderMCP, сохранять LICENSE, авторство и уведомления; не смешивать это с закрытыми частями Remote Relay.
- Launchd agent от **non-admin** macOS пользователя, auto start только после согласованного локального установщика; конфигурация с минимальными путями и без широких прав.
- Выделенный workspace без приватных папок, который можно полностью удалить/пересоздать; GitHub tokens минимального scope, лучше вообще пользоваться существующим GitHub connector вместо передачи токена агенту.
- Эксплуатационные команды: start/status/stop/revoke/rotate/diagnose в runbook; никакой автоматической оплаты или платного SaaS.

## 7. Пошаговый delivery-план

| Шаг | Результат | Гейт / критерий окончания |
|---|---|---|
| **S0. Capability spike** | Проверка условий custom MCP, Tunnel, WebStorm MCP, архитектуры существующего Mac, security review; зафиксировать выбранный вариант A/B. | Протокол реального tool discovery/read/write (или зафиксированный отказ) + cost/rights record. |
| **S1. Local MVP** | Рабочий hh-agent в isolated worktree: health, status, read/search, patch proposal/apply, named tests; базовые контракты. | Локальный E2E с синтетическим файлом; запреты каталогов и escape tests. |
| **S2. Remote transport** | Pairing, scoped auth, outbound connection, reconnect, revocation, redacted audit, launchd. | Подтверждённый remote invocation; нет публичного inbound-port. |
| **S3. HH development pipeline** | Правки в ветке и передача через GitHub PR; readback CI; Vercel deployment verification только при реальных сайтоизменениях. | PR с тестами и без доступа к исходникам клиента / secret store; GitHub-first fallback при выключенном Mac. |
| **S4. Security + mobile E2E** | Негативные тесты, iPhone test, offline/timeout/replay/cancel, инвентаризация логов/прав. | Матрица тестов и evidence, не только HTTP 200. |
| **S5. Release + operations** | Versioned install/runbook, rollback, token rotation, обновления, бюджетный контроль; закрытие issue только по факту. | Подтверждённая рабочая цепочка без квоты Desktop Commander Remote, owner QA и записанный статус. |

**Предварительная трудоёмкость для планирования, не обещание сроков:** S0 ~0.5–1 рабочий день; S1 ~1–2; S2 ~1–3; S3 ~1–2; S4–S5 ~1–3. Если план/аккаунт не разрешает custom MCP write tools, цель «из iPhone ChatGPT менять локальные файлы» остаётся **BLOCKED**; локальный MCP+GitHub-first продолжают приносить пользу.

**Порядок реализации:** S0 → S1 → S2 → S3 → S4 → S5. Разрешён параллельный S3 через существующий GitHub connector. Не запускать платный хостинг и массовые автоматические процессы без отдельного согласия владельца.

## 8. Приёмочные тесты (обязательная матрица)

**Happy path**  
A01 локальный health/version → A02 read неопасного фикстурного файла → A03 proposed patch без записи → A04 approved apply с expected SHA → A05 diff + run_check → A06 PR через GitHub connector → A07 CI readback.

**Remote/mobile**  
A08 вызвать инструмент с разрешённого ChatGPT клиента / Codex → A09 если доступно, настоящий iPhone ChatGPT read/write, включая проверку идентичности изменённого файла → A10 reconnect after Wi-Fi loss/Mac sleep → A11 cancel и повтор без двойной записи.

**Отрицательные и security**  
A12 /../../ и absolute path → DENIED; A13 symlink escape и race → DENIED; A14 ~/.ssh/Keychain/.env/личные отчёты → DENIED; A15 arbitrary shell/install/kill PID → DENIED; A16 чужой actor/expired token/replay → DENIED; A17 prompt injection в README/terminal output → не меняет политику; A18 write SHA-conflict → DENIED; A19 offline перед write → отсутствует скрытое выполнение; A20 ревокация ключа → дальнейшие вызовы невозможны. A21 проверить audit/CI artifacts на отсутствие секретов и персональных данных.

**Эксплуатация и стоимость**  
A22 confirm Remote Desktop Commander не участвует в собственном transport path; A23 проверить лимиты и стоимость OpenAI Platform/туннеля/хостинга, отказ от дополнительных платежей; A24 аварийный stop/rollback; A25 Github/Vercel/Supabase штатно продолжают работать при offline Mac.

**Фиксация доказательств:** тест-кейс, дата, среда, версия агента, commit SHA, outcome, обезличенный лог, ссылка на PR/Actions; не копировать личные данные в issue.

## 9. Блокеры, решения владельца, rollback

### Blockers перед S2
1. Проверить фактический доступ текущего ChatGPT workspace к **Add custom MCP server / Tunnel / write tools**, доступ и условия OpenAI Platform. Документация не является proof of entitlement.
2. Локальная установка на Mac и создание **изолированного** workspace без root/admin прав. Remote DC Online ≠ разрешение на работу новым агентом.
3. Защитный профиль macOS: требуется выбрать отдельного пользователя/контейнер; на личном Mac запрещено выполнять непроверенный код с доступом к домашней папке.
4. Если Secure MCP Tunnel требует затрат — показать сумму и получить одобрение до API вызовов, способных списывать деньги.

### Операции владельца (при достижении нужного гейта)
- В веб-ChatGPT проверить Settings → Plugins → Add custom MCP server и фактическую поддержку Tunnel/read/write.
- Разрешить локальную установку agent + выделенной non-admin учётной записи/worktree на Mac (без доступа к приватным данным).
- Если потребуется платный Platform usage / relay — отдельно согласовать месячный бюджет и лимит. Отсутствие решения означает **нулевой бюджет**.

### Rollback
- Остановить launchd hh-agent и tunnel-client, аннулировать pairing/token/tunnel access.
- Снять доступ к workspace, отключить custom MCP plugin.
- Удалить отдельный worktree/временные файлы при безопасной проверке; не удалять исходники владельца.
- Продолжить работу с Holistic House исключительно через существующие GitHub/Vercel/Supabase connectors; действующий сайт не должен зависеть от Mac-сервиса.

## 10. Статусы и критерий «готово»

| Статус | Значение |
|---|---|
| **DESIGN** | Согласовано ТЗ; нет установленного агента (текущий статус). |
| **LOCAL POC** | Есть тестовый агент и локальный smoke test, **нет** удалённого доступа. |
| **REMOTE TEST** | Есть реальный удалённый вызов, тестовые каталоги, отрицательные security tests. |
| **READY FOR OWNER QA** | Пройдены интеграционные, mobile, offline, auth и cost tests; проведён review. |
| **LIVE** | Привязанный пользовательский инструмент реально работает и проверен, конфигурация сохранена/ротация доступна, соответствующие права подтверждены. |

**Документ сам по себе не является развертыванием:** создание или merge docs-only PR не доказывает удалённый Mac MCP и не должно считаться выпуском новой функции сайта. Нельзя помечать #2505 DONE до тестов S4/S5.

## 11. Источники (сверка на 2026-10-28)

1. Desktop Commander Remote pricing: https://desktopcommander.app/pricing/
2. DesktopCommanderMCP open-source (MIT): https://github.com/wonderwhy-er/DesktopCommanderMCP
3. OpenAI Secure MCP Tunnel: https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
4. OpenAI Custom MCP Server: https://developers.openai.com/api/docs/guides/custom-mcp-server
5. OpenAI Developer mode / plan gating: https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
6. Holistic House local private voice worker: https://github.com/andylitvinov-design/books/issues/1299

**Следующая работа после принятия ТЗ:** выполнять S0 (проверка прав, транспортов и Mac isolation), не создавать вторую архитектуру и не включать платные функции автоматически.
