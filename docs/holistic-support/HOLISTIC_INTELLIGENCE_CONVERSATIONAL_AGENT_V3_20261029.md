# HOLISTIC INTELLIGENCE 3.0 — живой разговорный агент: рабочая архитектура и техническое ТЗ

**Дата:** 29.10.2026. **Статус:** реализация по этапам; НЕ считать уже работающим публичным языковым AI.  
**Репозиторий:** andylitvinov-design/books. **PR:** #2532 stacked on #2528.
**Основное правило:** один механизм решений и безопасности, одна языковая оболочка; не создавать ещё один конкурирующий психологический движок.

## 0. Цель и честная граница готовности

Клиент пишет свободным русским/английским/испанским языком. Система понимает явный запрос, уточняет неоднозначность, помнит подтверждённые предпочтения с согласия, опирается на доступные материалы Holistic House и отвечает естественно: отражает сказанное, предлагает конкретный небольшой следующий шаг, допускает отказ и корректирует путь. Она явно представляется AI-проводником, не человеком и не лицензированным психотерапевтом. У неё нет права диагностировать или назначать индивидуальное лечение.

**Сейчас** PR #2528 содержит client-reasoning-core и bridge, PR #2532 содержит holistic-intelligence, guide adapter и Psychologist Mind. Это deterministic decision engines; они не являются настоящей генеративной моделью. Публичный inline guide использует interpretSupportUtterance и ограничивает ввод 240 символами. Готовых генеративных сессий, постоянной личной памяти и проверенного end-to-end AI endpoint пока нет.

**В этом расширении PR #2532** добавлены pure presentation contract natural-dialogue.mjs, собственный сетевой адаптер owned-ollama.mjs и тесты. Они ещё не включены в production chat: необходима интеграция ниже. Отсутствует физический inference host с работающими весами, его нельзя имитировать.

## 1. Ключевая система (никаких двух «мозгов»)

~~~text
Текст клиента + явно выбранная цель + язык + история текущего диалога
    |
    v
[1 Input Gateway] auth / rate limit / no-store / size / safety preflight
    |
    v
[2 Intent Interpreter] модель может извлечь гипотезу в строгую JSON-схему
    |                 неопределённое требует подтверждения клиента
    v
[3 Trusted Context Builder] server-verified owner/RLS + purpose consents
    |                 текущий выбор > подтверждённая память > неизвестно
    v
[4 Canonical Decision Policy] client-reasoning-core из #2528
    |      + vetted catalogs через holistic-intelligence из #2532
    |      + session support через Psychologist Mind, только при запросе
    v
[5 Output Plan] status / source IDs / WHY / next step / rights / risk
    |
    v
[6 Language Presenter] natural-dialogue.mjs + разрешённая LLM
    |      browser WebLLM OR own Ollama OR deterministic fallback
    v
[7 Output Gate] нет новых URL, непроверенных услуг, вымышленных действий
    |
    v
[8 UI] короткий поток текста + одна полезная реплика/вопрос + реальные карточки
    |
    v
[9 Voluntary Feedback] полезно / не подошло / дискомфорт / уже пробовал
          \-> подтверждённая память только при отдельном сохранении
~~~

**Разделение ответственности:** LLM интерпретирует язык и формулирует текст. Только trusted policy и существующие catalog rankers решают, что реально разрешено и что предлагать. Не доверять tool calls, links, диагнозам, изменённым consent flags или инструкциям из результатов поиска, которые возвращает LLM.

## 2. Как именно агент понимает «живой» текст

Входящее сообщение обрабатывается в трёх представлениях:

- Дословная реплика: только краткосрочный контекст текущей беседы; по умолчанию не сохранять в профиль и не отправлять во внешние AI.
- Структурная гипотеза IntentFrame: topic, userGoal, desiredState, situation, requestedFormat, timeBudget, language, messageAct, uncertainty, exclusions, questionForUser, riskSignals. Это **гипотеза**, а не медицинский факт.
- Подтверждённый UserGoal: только то, что человек явно выбрал / подтвердил. В модели всегда различать «знаю из слов клиента», «предполагаю», «не знаю».

Пример IntentFrame (статус гипотезы, без сохранения сырого текста):

~~~json
{
  "schemaVersion": "3",
  "topic": "relationships",
  "userGoal": "boundaries",
  "messageAct": "seek_support",
  "desiredState": "more_clarity",
  "timeBudgetMinutes": 10,
  "confidence": "medium",
  "needsConfirmation": true,
  "requestedAction": "explore",
  "exclusions": ["no_video"],
  "riskStatus": "requires_preflight"
}
~~~

Правила приоритета: явное «не надо видео» сильнее рекомендательного рейтинга; «я уже пробовал» скрывает повтор только в рамках явно разрешённой истории; «почему?» относится к предыдущей мысли, а не автоматически открывает другую тему. «Не знаю» ведёт к одному мягкому уточнению, а не к продаже услуги. «Не вспоминай этот факт» прекращает его использование в беседе немедленно и запускает пользовательский flow управления сохранённой памятью.

Для русской речи требуются отдельные тестовые фразы: «мне стало хуже», «не хочу это», «не уверена», «это не то», «а почему?», «ты меня не понял», «начнём сначала», «не хочу личного», «хочу просто поговорить». Для английского и испанского — эквивалентные, естественные выражения.

## 3. Что делает ответ «человечным», не обманывая пользователя

Формула не является жёстким шаблоном; языковая модель свободно формулирует ответ в заданных границах:

1. Реакция **на смысл последней реплики**, с учётом именно нынешнего вопроса.
2. Короткое отражение без повторения текста клиента и без выдумывания причин эмоций.
3. Одна конкретная помощь: мысль, проверенный материал, осторожный вопрос или подтверждённый следующий шаг.
4. Максимум один вопрос, 1–4 коротких предложения по умолчанию. Для сложных тем пользователь может запросить подробный разбор.
5. Вежливое признание неопределённости; без готовых диагнозов, магических обещаний и постоянного «я понимаю, как вам тяжело».

Пример: клиент пишет «После общения с людьми всё сжимается, и я не понимаю, что делать». Агент не выводит автоматически травму, стыд, причину реакции, диагноз или домашнее лечение. Он может ответить: «Похоже, после общения возникает неприятное напряжение. Хотите сначала разобраться, в какие моменты оно появляется, или выбрать короткую спокойную практику?» Если клиент отказывается, направление меняется сразу.

Обязательное раскрытие личности: «Я AI-проводник Holistic House». Нельзя представляться живым терапевтом или утверждать, что человек уже получил услугу, если действий не было.

## 4. Реальные языковые движки и стоимость

### Режим A: браузерное выполнение (нулевая оплата за отдельные ответы)

WebLLM + WebGPU через Web Worker с моделью из проверенного prebuilt model list (ориентир: подходящая многоязычная Qwen-квантованная модель). Перед установкой **проверить реальную поддержку выбранного model ID в текущем WebLLM**, лицензию весов и качество на RU/EN/ES. Нельзя прописывать несуществующий model ID наугад.

- Ленивая загрузка только по явному нажатию: «Запустить AI на этом устройстве»; показать объём модели, использование памяти, прогресс и кнопку отмены.
- Кэш OPFS/Cache API, worker isolation, лимиты генерации и памяти, явное удаление кеша.
- Feature detect WebGPU + quota + storage; не запускать огромную модель на слабом смартфоне.
- Chrome Prompt API может быть дополнительным при доступном LanguageModel.availability с нужным языком, **не основным RU/mobile вариантом**.
- При отсутствии GPU/совместимости — предложить режим B или честный fallback C, не зависать.

### Режим B: собственный Ollama/llama.cpp сервер (приоритет для мобильных)

Разворачивается на управляемом Mac mini/другой машине, которая включена и доступна постоянно. Стартовая проверяемая модель: Qwen family 3B–4B / 4-bit, либо более компактная при слабой памяти. Конкретную модель выбрать по RU/EN/ES benchmark, фактическому RAM и лицензии. Не считать гипотетическую скорость фактом.

- Ollama локально слушает 127.0.0.1:11434. **Никогда не открывать этот порт непосредственно в интернет**.
- Над ним TLS reverse proxy / защищённый туннель со service-to-service Bearer/mTLS, rate limit, IP/identity controls. API HTTPS /api/chat; секрет только в Vercel server environment.
- В Vercel backend добавить строго фиксированный endpoint из env, без возможности передать URL в JSON клиента. Ограничение timeout, concurrent requests, payload bytes, num_predict, daily quota.
- Сервисы: HH_AGENT_OWNED_ENABLED, HH_AGENT_OLLAMA_ENDPOINT, HH_AGENT_OLLAMA_MODEL, HH_AGENT_OLLAMA_TOKEN. По умолчанию отключены. Никаких автоматических платных AI API.
- Пользователь соглашается, что отправляет своё **сообщение** на собственный inference server, отдельно от согласия на профиль/тесты/память. При ошибке — локальная стратегия или объяснение недоступности.

Нет платы за токены стороннему API, но есть стоимость оборудования, электроэнергии, трафика, поддержки и доступности. Не обещать бесплатную неограниченную генерацию.

### Режим C: надёжный резерв

Использовать канонический client-reasoning-core / guide-dialogue. Правило не пытается имитировать генеративную модель, честно показывает «доступен упрощённый режим». Оно может уточнять цели, искать проверенные материалы, объяснять их, учитывать отметки в текущей сессии. Никаких фиктивных ссылок/аудио.

## 5. Строгий API/контракт и маршрутизация

Рекомендуемый endpoint: POST /api/app/agent/turn (через существующий private App Router pipeline).

~~~json
{
  "conversationId": "server-created-uuid-or-null",
  "locale": "ru",
  "message": "Можно сначала просто поговорить?",
  "conversationRevision": 4,
  "mode": "owned",
  "selectedGoal": "relationships",
  "requestedFormats": ["video", "test"],
  "consentVersion": 1
}
~~~

Ответ:

~~~json
{
  "version": "hi-agent-v3",
  "turnId": "server-generated-id",
  "status": "clarify",
  "reply": "Да, можем начать с разговора. Что сейчас больше всего занимает ваши мысли?",
  "source": "owned-local-model",
  "modelUsed": true,
  "recommendations": [],
  "requiresConfirmation": false,
  "usedConsents": ["ownedInference"],
  "memorySaved": false,
  "requestId": "opaque-server-id"
}
~~~

Нельзя принимать от браузера как доверенные параметры: authenticated, ownerScoped, isPractitioner, verifiedSafety, privateMeasurements, verifiedPublicManifest, catalogItems, clinicianApproved или memoryTrusted. Сервер определяет их самостоятельно через verified Supabase Auth + account access + RLS, реальные source/version/published gates, consent store.

Route обязан:
1. Проверить same-origin, CSRF условия, JSON content-type, размер (например, 8 KiB/turn) и server-verified auth.
2. Ограничить частоту по account ID + anonymized network bucket (initial target 10 turns/min, 100/day — конфигурируемо).
3. Вычислить safety preflight; фразы stop/worse/crisis → остановка, route human support; при неопределённости/сбой проверки fail closed.
4. Прочитать лишь разрешённый профиль, подтверждённую память и подходящий vetted catalog.
5. Вызвать canonical decision policy; собрать факты с идентификаторами опубликованных источников.
6. Сконструировать безопасный LanguageEnvelope и вызвать локальную/owned модель только после отдельного consent.
7. Проверить возвращённый текст; все ссылки, карточки, session actions из trusted plan, а не из текста LLM.
8. Вернуть no-store private response. Не выводить текст сообщений/профиль в логи, url params, analytics, error reports и метрики.
9. Когда будет streaming, SSE/ReadableStream передаёт только текст; карточки с проверенным source ID фиксируются **до** или **после** stream независимо от LLM.
10. В случае provider timeout/abort/failure — безопасный deterministic fallback, возможность повторить/сменить режим.

Интеграция в существующий UI: HolisticSupportInlineGuide сейчас ограничивает ввод 240 символами. Увеличить до 2000–3000 с серверным лимитом; не заменять одномоментно старый flow. Разделить «Ответ ИИ» (настоящий provider) и «Проверенный следующий шаг» (policy). Состояния: idle, downloading, ready, thinking, streaming, fallback, safety_handoff, paused, error. Адаптивные кнопки: «Остановить», «Это не подходит», «Почему?», «Забыть/не использовать», «Продолжить», «Открыть материал». Mobile 320/390/430, keyboard, VoiceOver, slow network, cancel.

## 6. Четыре памяти — и как технически отличать их друг от друга

1. Working memory (0–10 последних реплик): только текущая сессия в оперативной памяти/в защищённом thread при согласии. Сбрасывается по новой сессии.
2. Episode summary (необязательная история): краткое описание «обсуждали тему X; был выбран Y; клиент отказался от Z», с origin/time; не хранить лишний текст.
3. Long-term explicit preferences (отдельная память клиента): имя обращения, предпочитаемый язык/длина ответа, добровольно выраженные цели, нежелательные подходы, сохранённые разрешения. Запись лишь после предложения клиенту подтвердить/изменить конкретную запись.
4. Verified profile/test evidence: это не память диалога, а защищённый источник с provenance/version/time. Использовать только при отдельном consentToUseResults; не копировать raw scores в другую таблицу.

Пример entry:
~~~json
{
  "kind": "response_style",
  "value": "short_warm",
  "provenance": "user_confirmed",
  "sourceMessageId": "owned-uuid",
  "purpose": "agent_reply_personalization",
  "confirmedAt": "2026-10-29T00:00:00Z",
  "expiresAt": null,
  "revokedAt": null
}
~~~

**Триггеры памяти:** «Зови меня ...», «Отвечай кратко», «Не советуй ...», «Моя цель ...» → AI предлагает карточку «Запомнить: ...?» с выключенной по умолчанию галочкой. «Не сохраняй это», «Забудь эту цель» → мгновенное исключение из active context + отдельная команда удаления защищённых записей. Чувствительная информация о диагнозах, травме, интимности, лабораториях, лечении не должна сохраняться автоматически. «Удалить всё» и «Скачать мои данные» должны быть самостоятельными действиями пользователя.

Нельзя бесконтрольно подставлять в LLM полную историю и все результаты тестов. Контекстная сборка по purpose, актуальности и подтверждению; summary ограничен в размере, чувствительные элементы редактируются/исключаются.

## 7. Схема данных (проект миграций, НЕ применять автоматически)

Сначала проверить существующие таблицы, миграции и API: не создавать дублей client profile, course history, CRM, consent. При отсутствии подходящих хранилищ — добавить только минимальные таблицы:

- agent_conversations: id UUID PK; account_id UUID; locale; status; revision; created_at; updated_at; expires_at.
- agent_messages: id; conversation_id; account_id; role; encrypted_text; generated_mode; created_at. Хранить только по явному consent на историю.
- agent_memory_entries: id; account_id; category; encrypted_value; purpose; provenance; confirmed_at; expires_at; revoked_at; version. Единственное место правок памяти.
- agent_feedback: id; account_id; resource_id; feedback_code (helpful/neutral/not_for_me/uncomfortable/completed); consent_id; recorded_at.
- agent_action_intents: id; account_id; action_kind; resource_id; proposed_payload; status (preview/confirmed/executed/cancelled/failed); idempotency_key; created_at.

Для каждой таблицы: RLS + index на account_id, SELECT/INSERT/UPDATE/DELETE с account ownership; UPDATE WITH CHECK, explicit grants only. Private encrypted text — существующий app crypto (AAD account+record+field). Service role не использовать для обычных user reads/writes. Practitioner access только через отдельную проверяемую связь и право просмотра. Не хранить PII в analytics, Sentry payload, URL, browser localStorage по умолчанию. Изолировать данные A/B. Default retention: краткосрочная история удаляется автоматически согласно согласованному сроку; сроки выставляются политикой и пользовательским интерфейсом, а не бессрочно.

## 8. Инструменты агента (как реальные действия, а не воображаемые)

Чтение (tools с явным typed schema):
- get_confirmed_focus(): только текущие user choices;
- read_consented_profile_axes(): only signed-in owner + source provenance;
- search_published_content({goal,language,format,duration,avoid}): published/rights/safety/locale;
- get_my_practice_history(): только если есть отдельное согласие;
- read_current_course_state(): проверенный статус из существующего хранилища.

Изменения (двухэтапные):
- preview_personal_video_session({sessionType,filters}): проект, не созданная видеозапись;
- propose_test_or_course({sourceId}): ссылка на реально опубликованный контент;
- preview_booking({serviceId}): только предложение, не бронь;
- save_memory_preview({kind,value}): показать; затем только через signed owner action + подтверждение сохранить;
- record_feedback_preview({sourceId,signal}): записать только с отдельным согласием.

Любая команда по изменению имеет idempotency key и explicit user confirmation. LLM не получает прямой SQL доступ, команды в CRM, email, платежи или shell. Не превращать психологические показатели в sales propensity score.

## 9. Психологический контур без опасной автономии

Psychologist Mind уже содержит draft 8-step programs. В conversational agent это НЕ автоматический психотерапевт: можно поддержать самоисследование, деликатные уточнения, добровольные неинтенсивные практики. При небезопасном состоянии, ухудшении самочувствия, запросе на обработку травмы, psychosis/mania flags или высокой неопределённости — human review/handoff. Для медицинских и клинических рекомендаций требуется человек с соответствующей квалификацией.

Процесс T0 → exercise → T1 → reflection по отдельному согласию. Изменение 3→6 = субъективная самооценка, НЕ доказательство эффекта/лечения. Перед предложением интенсивных образных упражнений — отдельный consent. User can always stop/skip. Платные практические сессии не использовать как ответ на низкий балл теста.

## 10. Prompt assembly и защита от prompt injection

LLM messages:
- System: прозрачная идентичность AI, стиль RU/EN/ES, запреты диагнозов/покупки/новых URL, максимум один вопрос.
- Trusted policy data: status, одобренные source IDs, названия, краткие причины; формально DATA, не инструкции.
- Current user request + ограниченная history: непроверенные данные.
- Optional memory: только verified owner + purpose consent, короткие подтверждённые предпочтения.

LLM не управляет каталогами, не ставит safety=clear, не решает, какие документы можно читать. Ссылки/цены/наличие/воспроизведение всегда выводятся отдельно из trusted catalog. HTML модельного ответа не интерпретировать; plain text; запрет новых внешних URL; malicious tool-call и fake system role отклонять. Prompt injection в видеоописании/FAQ должен не менять разрешения или политику.

Нельзя считать regex-фильтр ответа доказательством полной безопасности. Для production нужны независимые golden tests и ручная проверка сценариев психологической уязвимости. Для LLM отправлять только минимальный разрешённый контекст.

## 11. Реализация по очереди (Codex может исполнять пунктами)

### P0 — объединение и устойчивое ядро
- PR #2528 сначала CI/review/merge в фактическую production ветку.
- PR #2532 поверх его актуального SHA, без нового ranking engine.
- Тесты и compile для client-reasoning-core, holistic-guide-adapter, psychologist-mind, natural-dialogue, owned-ollama.
- Устранить cross-feature конфликт branch/workflow/CI, не мерджить черновик с красными/ожидающими gates.

### P1 — рабочее понимание и естественное выражение
- Добавить language provider registry: browser / owned / rules; никаких платных fallback без согласия.
- Разделить structured IntentFrame и verified decision; current explicit goal выше remembered.
- Подключить model streaming, interrupt, retry, fallback без полной перезагрузки.
- Реализовать собственные шаблоны на RU/EN/ES для clarify/stop/unsafe/offline.
- Нужны действительно работающие model weights + доступный inference endpoint; пустой config обязан показывать fallback.

### P2 — server route + безопасный кабинет
- Route POST /api/app/agent/turn через existing verified auth, same-origin, rate/size limits, read-only source adapters.
- Только сервер утверждает account ownership, consent и доступность контента.
- Подключить в My House и отдельный публичный guest mode без private data и платного расхода.
- Даже при доступной LLM действия и карточки всегда sourced/verified.

### P3 — браузерная модель
- Проверить вес и RU/EN/ES quality выбранного реально поддерживаемого WebLLM model ID.
- Worker, download progress/abort, cache management, WebGPU capability checks, опционально built-in Chrome LanguageModel (только при доступности языка).
- Mobile battery/memory/reload graceful fallback.

### P4 — собственный inference server
- Установить Ollama, реально скачать модель, проверить /api/chat на RU/EN/ES, нагрузку и context length.
- Защитить HTTPS proxy bearer/mTLS + quotas; никогда не публиковать localhost Ollama напрямую.
- Добавить fixed endpoint configuration в Vercel, health checks без клиентских сообщений, timeout/failover.
- Подключить generateOwnedOllama к route только при consent. При простое сервера — fallback.

### P5 — память с контролем клиента
- Аудит существующего storage; миграция только при отсутствии подходящих таблиц.
- CRUD подтверждённых предпочтений, scope/purpose/TTL, review/revoke/delete/export.
- История, feedback и source identifiers без автоматических чувствительных выводов.
- Реальные owner A/B RLS тесты + consent revocation тест.

### P6 — проверенные действия/сессии
- Tool registry read-only и двухэтапные preview/confirm writes.
- Session planner получает реальные approved content/media IDs; пока 8 сессий — только spec/draft.
- Practice history, voluntary T0/T1, next step, practitioner approval. Никаких фальшивых видео или MP3.

### P7 — фактический выпуск и измерение качества
- Зелёный exact-SHA CI: Node tests, TypeScript, ESLint, Next build, app integration, DB RLS, auth owner A/B.
- Chromium/WebKit mobile 320/390/430; RU/EN/ES; slow network; offline/weak-GPU; microphone только по отдельному разрешению.
- Проверить, что system prompt/PII/user messages не попадают в URLs, browser logs, telemetry, чужой аккаунт и внешние сети при browser-only.
- Проверить реальный model reply, первый токен и частоту fallback; не считать шаблонную реплику LLM.
- Подтвердить Vercel READY, alias и конкретный production SHA; после этого включить флаг поэтапно.

## 12. Definition of Done: «реально работает, как живой собеседник»

Автоматические критерии (все обязательны):
- User RU/EN/ES пишет 1–2000 символов, получает реальную генерацию при доступном выбранном provider, без ручного переключения вкладок/копирования.
- Два независимых сообщения могут ссылаться друг на друга; «почему?» объясняет именно последнюю рекомендацию; смена цели сбрасывает устаревшие предложения.
- Нет несуществующих видео, аудио, сессий, цен, бронирований, несанкционированного чтения или непрошенных продаж.
- Consent по отдельным purposes проверяется до чтения и перед генерацией. Отзыв согласия действует в следующем turn; память не используется без него.
- Каждый human_review/safety_stop/missing_preflight исключает модельные предложения и коммерческие действия.
- 0 cross-account leak в owner A/B тестах; 0 unconsented provider egress в network tests.
- Плохой ответ или сбой модели приводит к безопасному fallback без crash.
- Тесты имитации «человек/психотерапевт», prompt injection, грубый пользователь, «стало хуже», отсутствующий материал, запрещённые форматы, отсутствие доступа к аккаунту.
- Для живого голоса нужна отдельная стадия STT/TTS и согласие; текстовый чат не выдавать за полноценную voice-терапию.

Качество измерять на реальных согласившихся тестировщиках по заранее определённому benchmark (не на самих клиентских приватных материалах): полезность и естественность по шкале 1–5, понимание ссылочных реплик, groundedness, частота уточнений, latency, отказов, ошибок RU/EN/ES. Целевые ориентиры: не менее 90% правильного понимания явной цели, не менее 95% grounded рекомендаций и средняя естественность >=4/5; до релиза установить и проверить baseline. KPI не подменяют безопасность.

## 13. Технический prompt для Codex (исполнять этапами, не обещать фиктивный live)

~~~text
Репозиторий andylitvinov-design/books.
Фактическая production ветка: проверить Vercel, предполагается codex/public-book-library.
Существуют stacked draft PR #2528 (canonical client-reasoning policy)
и #2532 (media orchestration, guided adapter, Psychologist Mind).
ДОБАВЛЕНЫ natural-dialogue.mjs и owned-ollama.mjs — не переписывай их вторым engine.

1) Сверь точный HEAD, открытые конкурирующие PR, CI и deploy.
2) Собери один decision core: safety + consent + owner scope + vetted catalogs.
3) Подключи генеративный provider registry (WebLLM WebGPU/browser optional,
   owned Ollama fixed HTTPS model server; rules fallback). Без платных AI API.
4) Реализуй route только после verified Supabase Auth, same-origin и rate limit.
   Не доверяй auth/consent/catalog/safety флагам от клиента.
5) Добавь настоящий RU/EN/ES чат с typing/stream, abort, feedback, one-question default,
   темой, проверенным следующим шагом и отделённой панелью согласий.
6) Не сохраняй memory/notes без подтверждения; разработай CRUD и RLS отдельно.
7) Создай typed tool registry только для существующих approved resources.
8) Не делай реальных оплат/брони/назначений/публикаций без preview + explicit confirm.
9) Покрой Node integration, security/IDOR, AI mock/provider, mobile E2E и CI.
10) Только зелёный exact HEAD + Vercel READY и подтверждённый alias = live.
Сохраняй собственные изменения в существующей ветке/PR, не создавай дубликаты.
Если нет running local model или auth-контракта — оставь feature disabled,
а не называй шаблонные ответы реальным AI.
~~~

## Источники и технические ориентиры

- WebLLM: https://github.com/mlc-ai/web-llm
- Transformers.js + WebGPU: https://huggingface.co/docs/transformers.js/main/guides/webgpu
- Chrome built-in Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- Ollama local API: https://docs.ollama.com/api
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Function runtime: https://vercel.com/docs/functions/configuring-functions/duration

**Недостаточный критерий:** наличие PR, типов, локальной генерации заглушек или README НЕ доказывает, что в production отвечает настоящая модель.


## 14. Добавленный end-to-end preview (feature-gated, не public release)

В stacked PR #2532 добавлены также:
- app/api/holistic-agent/turn/route.js: private same-origin POST; verified Supabase Auth; existing account check; rate 10/min и 100/day; server-only safety preflight; публичный проверенный services catalog; отдельное согласие на owned inference; bounded Ollama request; no-store. Ответ без хранения.
- components/holistic-agent-chat.tsx + CSS: RU/EN/ES, режимы rules / device / owned, явная опция серверной передачи, stop, карточки только из verified decision.
- app/[locale]/holistic-support/agent/page.tsx: экспериментальная страница; по умолчанию 404 пока флаг UI не включён.

Пример env для preview (значения токена/хоста определяет владелец):

~~~text
HH_AGENT_CHAT_ENABLED=true
HH_AGENT_CHAT_UI_ENABLED=true
HH_AGENT_OWNED_ENABLED=true
HH_AGENT_OLLAMA_ENDPOINT=https://owned-agent.example.org/api/chat
HH_AGENT_OLLAMA_MODEL=qwen3:4b
HH_AGENT_OLLAMA_TOKEN=(server-only opaque secret >=20 chars)
~~~

Первые два флага открывают приватный pilot. Без HH_AGENT_OWNED_ENABLED и реального сервера owned inference не происходит; ответ deterministic. Для browser/device Native LanguageModel в Chrome используется только при доступности конкретного языка и железа. Он не является полноценной RU/mobile стратегией.

**Важно:** этот preview ограничен authenticated users и не имеет долговременной памяти, streaming, видео-программ и UI управления согласиями на private test history. Авторизация, safety preflight, human red-team, full Next build, mobile E2E, реальная Ollama RU генерация и production READY НЕ подтверждены. Не включать оба UI/API флага на live до завершения release gates. Сканирование рисковых слов — только ранний защитный фильтр, НЕ полноценная клиническая оценка риска.


## Signed-in personalized recommendations and feedback — implementation addendum

**Delivered in PR #2532 source (not a live claim).** The existing authenticated agent endpoint now accepts only an explicitly chosen up-to-three registered research axes, an optional desired output format and a per-request `usePrivateProfile` opt-in. After verified same-origin account auth and a clear preflight, it reads **only the signed-in owner's** results using the existing portrait bootstrap and `buildPortraitRecommendations`. Without a chosen axis and the checkbox it does not read private results. Results are source-verified first; raw test scores, IDs, title, reports and notes never enter prompt construction, third-party AI, URL, or the portable suggestion response. No new scoring or database table is created.

The shared orchestrator uses existing published original video manifests, the canonical core service catalogue and their axis crosswalk to return actual material links for video, tests, courses and eligible free services. The output-format selection is a **hard filter**. For `audio` the server requests five fixed, language-specific public Reiki lesson slots through the existing approved manifest reader. It returns only released, playable audios; when none exists it does not claim that an editor soundtrack is a standalone recording. ES is never labelled as a dub of an EN/RU original.

A bounded per-conversation `feedback:{dismissedIds,completedIds}` is passed through the existing next-step policy. The UI offers **Don't suggest again** and **I tried it**. These are client-marked, ephemeral in-tab states, not evidence of medical efficacy and not persistent clinical notes. Future persistent feedback requires a separate signed-in, encrypted, revocable opt-in and RLS/retention review.

**Current release flags remain OFF**: `HH_AGENT_CHAT_ENABLED` plus `HH_AGENT_PRODUCTION_APPROVED` gate the server; an optional server-side language model requires an independent `HH_AGENT_OWNED_ENABLED` and client consent. No flags are turned on by merging source. Before any live claim, pass the latest exact-head Node regression (including `tests/holistic-agent-consented-profile.test.mjs`), TypeScript, ESLint, Next build, access/IDOR and network disclosure checks, mobile Chromium/WebKit, verified audio playback, owner-login and Vercel alias SHA acceptance. Server-only authorization properties must never be accepted from browser JSON.

**Regression found and repaired**: canonical YouTube videos returned by the axis matcher have IDs `youtube:<id>`; the guided adapter now maps them to the client's requested `video` format as well as the meditation category. Previously these items were accidentally suppressed as `no_match`, despite being published.
