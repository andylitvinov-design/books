# Holistic House · CRM Messages v3 — план улучшения, внедрение и приёмка

**Дата:** 18 октября 2026 (America/Toronto)  
**Канонический исходный код:** `andylitvinov-design/books` → `codex/public-book-library`  
**Production:** https://holistichouse.vercel.app  
**Трекинг:** [#985](https://github.com/andylitvinov-design/books/issues/985)  
**Ограничение:** никакой отправки клиентам, массовых рассылок, рекламных затрат или переноса номера до отдельной проверки API и разрешённого тестового получателя.

## Что уже было на Live при аудите

- Owner-only CRM с Contacts / Overview / Messages, RLS, шифрованием, email workflow, бизнес-историей и followups.
- Интеграционные адаптеры Telegram Bot API, WhatsApp Cloud API, Instagram Login, Facebook Messenger; webhook HMAC/secret, дедупликация inbound, права владельца, fail closed на отсутствующие ключи, 20 сообщений в день.
- Входящие обращения создают отдельные CRM-лиды; не дают рекламного opt-in.
- В `Vercel Production` отсутствуют `HH_CRM_MSG_*` переменные; ни одна реальная переписка/отправка не может считаться проверенной.
- Невыполненные UX-задачи: нельзя из разговора записать внутренний бизнес-комментарий, назначить follow-up или управлять стадией контакта; при нескольких быстрых открытиях чатов поздний ответ может подменить текущую ленту.

## Ближайший релиз v3: полный workflow без сторонних аккаунтов

| Приоритет | Изменение | Результат и критерий |
|---|---|---|
| P0 | Защита устаревших загрузок | Ответ по чату A никогда не показывается в выбранном чате B после быстрого переключения; старое состояние удаляется сразу при выборе |
| P0 | Внутренние рабочие заметки | Owner-only, шифрование, отдельная карточка, нет вызова provider Send API, идемпотентность по UUID; тексты исключительно деловые, не медицинские |
| P0 | Стадия CRM непосредственно в чате | lead / client / archived с ожиданием revision; чужие owner UUID не принимаются; архив не открывает исходящую отправку |
| P0 | Задача последующего контакта | Прямо из беседы: выбрать дату/действие, создать задачу через существующий owner-scoped `crm_followups`, видеть и закрывать её без дублей |
| P1 | Удобство мобильной работы | Читабельная карточка контакта, понятные статусы и счётчик ожидания ответа, EN/RU/ES, iPhone 360–430px |
| P1 | Повторная проверка и мониторинг | Отрицательные тесты авторизации, заметки не отправляются, note/followup/stage не работают на чужих контактах, Next.js Production READY |

## Следующие итерации после v3

**v4 / масштабирование:** серверная пагинация диалогов с cursor, переключатель «ожидают ответа», метрики первой реакции, назначение ответственного сотрудника только после матрицы ролей, экспорт обезличенных KPI, регламент хранения/очистки переписок и webhook events, работа с вложениями исключительно после отдельной проверки приватности.

**v5 / внешние каналы — с обязательными зависимостями:** собственный отдельный Telegram BotFather bot + подтверждённые ключи → `/start` тест → inbox → ответ. Затем Meta Business/WABA с проверкой номера, Instagram Professional c messaging permissions, Facebook Page с messaging permissions, официальные вебхуки, запрет неразрешённой инициированной отправки, проверка platform policy/CASL. Meta WhatsApp шаблоны, платные действия и автоматизация не включаются по умолчанию.

## Архитектура v3

- Не создавать новый сайт, вторую CRM или новую базу. Переиспользовать owner-scoped `createCrmRepository`, существующие `app.crm_contacts`, `app.crm_followups`, `app.crm_msg_items`, `app.crm_msg_threads`.
- Сообщения `direction='note'` сохранять `seal` в `body_ciphertext` с AAD `crm.msgbody` (уже предусмотренный тип сообщения в БД). Не добавлять провайдерский ID, не отправлять webhooks, не сортировать ленту по внутренним заметкам как по новым входящим от клиентов.
- Для этапа контакта вызывать существующий проверенный `store.setLifecycle` с `expectedRevision`; для задач `store.createFollowup` и `store.changeFollowup`. Протокол `POST /api/app/crm/messenger` расширять только owner-only whitelist действий.
- Не сохранять тексты сообщений в URL, localStorage, QueryString, telemetry или контексте внешней аналитики. API и страницы по-прежнему `no-store`.

## Приёмка

1. Анонимный запрос к Messenger API не раскрывает беседы; чужой owner не может открыть, заметить, изменить статус контакта или закрыть follow-up.
2. Две быстрые загрузки разговоров A и B сохраняют ленту только B; устаревший ответ не перекрашивает статусы/сообщения.
3. Заметка сохраняется отдельно от исходящей переписки и не вызывает Telegram/Meta отправку, включая при повторном HTTP POST.
4. Статус меняется только при совпадающей ревизии, «архив» блокирует дальнейшие ответы; данные синхронизируются с контактом.
5. Follow-up с датой в Toronto создаётся ровно один раз, виден в Messenger и Overview, может быть завершён; неопознанный UUID не проходит.
6. Отсутствие provider secrets не превращается в фиктивную «доставку». Все рекламные рассылки выключены.
7. Тесты `node --test tests/crm-messenger.test.mjs`, целевой ESLint / Next.js build, Vercel Production READY по точному SHA и проверка alias.

**Состояние:** это исполняемый план и спецификация. Отмечать каждый пункт выполненным только после отдельной проверенной реализации.
## Implementation evidence · v3 source (18 Oct 2026)

This PR implements P0/P1 scope in the existing live-capable codebase, not a new CRM:
- `lib/crm/messenger-store.js`: owner-resolved linked contact, revision readback, encrypted internal `note` messages, exact replay protection, existing follow-ups by contact, needs-reply source signal.
- `app/api/app/crm/messenger/route.js`: strict owner-only POST actions `note`, `set_stage`, `create_followup`, `complete_followup`; no additional provider-sending route.
- `components/app/crm-messenger.jsx`: safe async A/B thread switching and owner-action race guards, stage dropdown, open and completed tasks, internal notes, neutral human-selected quick replies, accurate EN/RU/ES status/errors.
- `components/app/crm-manager.jsx`: refresh existing Contacts/Overview after messenger stage/task action.
- `tests/crm-messenger.test.mjs`: pure fail-closed policy and source contract checks covering message secrets, owner controls, task/notes UI, race isolation, and provider-off behavior.

**DB verified before merge:** PostgreSQL owner-restricted `crm_msg_items` supports `direction='note'` and `hh_crm_backend` INSERT; `crm_followups` supports the same role with no anonymous SELECT. A synthetic `BEGIN...ROLLBACK` validated note and task linkage; all test records reverted. No new DDL or schema migrations, and no provider sends.

**Open external gates:** no `HH_CRM_MSG_*` secrets in Production; separate owner-controlled Telegram/Meta accounts and valid permissions are required for any live E2E verification. Never state that customers were messaged until provider receipts are confirmed.
