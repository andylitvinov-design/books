# Holistic House — собственный Telegram → AI Console → Telegram

Дата: 20 октября 2026. Production branch: codex/public-book-library. Только для владельца, не является клиентским AI-консультантом.

## Интерфейс
В существующем @Andydotbot команда /ai автоматически проверяет/восстанавливает приватные команды и callback_query на текущем подписанном webhook (без посещения CRM), затем открывает меню «Gemini + Mistral / Gemini / Mistral». При выборе бот просит ответить на его сообщение вопросом (ForceReply); произвольный текст вне выбора/прямой команды не передаётся ИИ, чтобы не переслать чужие данные по ошибке. Прямые команды: /gemini вопрос, /mistral вопрос, /council вопрос. Каждый подтверждённый результат приходит отдельным сообщением с точным именем модели, после есть «Задать ещё вопрос». Это тот же серверный модуль Gemini/Mistral, который обслуживает ежедневные аудиты AI Council. Синхронизация истории сообщений с открытой браузерной вкладкой AI Council пока НЕ реализована.

## Архитектура и безопасность
- Только существующий /api/app/notification-channels/telegram/webhook, без второго бота/токена/webhook. Клиентские /start с токеном, /stop, CRM уведомления и прочие боты сохраняются.
- Вход: Telegram secret-token header, приватный chat, from.id=chat.id, username @AndyTherapist и точное совпадение числового ID с ранее верифицированной зашифрованной парой владельца. Username недостаточен. Клиентские запросы не направляются в модели.
- Выход: sendMessage исключительно на зафиксированный приватный owner chat. BotFather token и числовой chat ID не раскрываются в браузер, логи, issue, веб AI Console или код. Меню команд имеет Telegram scope «chat» только для владельца; callback_query разрешается на уже подписанном webhook, чужой активный webhook нельзя перезаписать.
- Supabase: приватная таблица app_private.telegram_owner_ai_updates с FORCE RLS, хранит только update_id, action, mode, статусы и время, БЕЗ prompt/response, телефонов, chat ID, результатов тестов или API ключей. ON CONFLICT DO NOTHING делает обновления идемпотентными, автоматический повтор запроса к моделям отключён.
- Частота: максимум 10 вопросов в час, длина 2000 символов. Очевидные токены, email, телефоны отклоняются до отправки ИИ. Это не полноценная DLP-проверка: владелец должен не отправлять клиентские и медицинские данные.
- Только бесплатные запросы: Gemini требует HH_COUNCIL_GEMINI_API_KEY и HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED=true; Mistral требует HH_COUNCIL_OPENROUTER_API_KEY, live catalog c pricing=0, max_price=0, allow_fallbacks=false, exact model ID и usage.cost=0. Иначе настоящего модельного ответа НЕТ; подделка недопустима.
- Gate HH_OWNER_AI_TG_ENABLED=true включает только эту ветку webhook после выкладки на Production. При false клиентские Telegram уведомления не меняются.

## Развёртывание
1. Записать новую SQL миграцию, проверить FORCE RLS и GitHub CI / Vercel READY / SHA на production. В Vercel Production https://vercel.com/super10/codex-public-book-library/settings/environment-variables включить HH_OWNER_AI_TG_ENABLED=true, сделать Redeploy после изменения env. Не дублировать BotFather token или numeric chat ID — оба уже безопасно привязаны.
2. Дополнительные действия в кабинете не требуются. Приватное меню и callback-запросы регистрируются автоматически после первого /ai; отдельная существующая Vercel cron дополнительно чинит регистрацию ежедневно, без изменения других webhooks. Для немедленной первичной настройки оператор может воспользоваться только короткоживущей подписанной ссылкой /api/internal/owner-ai-bootstrap со случайным ключом в Production Secrets; ссылка не раскрывается пользователю, истекает автоматически. Подключения CRM остаются дополнительной диагностикой.
3. В https://t.me/Andydotbot отправить /ai, выбрать модель, ответить обезличенным рабочим вопросом и проверить фактический полученный ответ. Без API ключей вместо подставных ответов должны появиться конкретные ошибки провайдеров. Для Gemini/Mistral вписать действующие ключи своих подтверждённых бесплатных аккаунтов только в Vercel Production Env (не чат), если их ещё нет.

## Приёмка и откат
Тесты Node: действительный owner vs клиент/другой чат, callback, клиентские /start и /stop, секреты/PII, idempotency, FREE-only модель и стоимость, приватный SQL RLS. HTTP 200 и mocks не доказывают E2E. Подтверждать E2E только по реальному Telegram update → provider response → Telegram Bot API acceptance → проверка сообщения у владельца. При инциденте: HH_OWNER_AI_TG_ENABLED=false и redeploy; клиентские уведомления сохраняются.

## Одноразовая серверная активация (без аккаунта пользователя)
- `HH_OWNER_AI_BOOTSTRAP_SECRET` — 64+ символа, **sensitive**, только Vercel Production; `HH_OWNER_AI_BOOTSTRAP_EXPIRES` — Unix epoch milliseconds, окно максимум 2 часа. GET с точным host/path и одноразовым секретом запускает уже существующую проверенную `registerClientTelegramWebhook` для фиксированного ранее верифицированного бота и чата. Результат подтверждается Telegram `setWebhook` + `getMyCommands`; чужие webhooks не меняются.
- Применить секрет непосредственно через Vercel, вызвать закрытый endpoint 1 раз, проверить `ok`/`ownerAiCommandsReady`, затем позволить сроку истечь и удалить временный секрет. Ни BotFather token, ни числовой chat ID, ни API-ключи моделей никогда не передавать через URL. Общий GET endpoint без совпадения сильного proof+TTL всегда 404.
- Включение меню ≠ доступность Gemini/Mistral. Для них всё равно нужны принадлежащие владельцу бесплатные API credentials, которые нельзя получить из GitHub/LLM; оплачиваемые тарифы без отдельного разрешения не включать.

## 2026-10-25 — актуальные бесплатные модели и Telegram-меню

**Наблюдалось до изменения:** private signed webhook /ai принял owner update 2026-10-25 (accepted); за предшествующие семь дней owner AI ledger не содержит вопросов моделям. Vercel Production содержит Gemini/OpenRouter secrets; Supabase owner settings — зашифрованный Mistral Studio key и подтверждения Free Tier. Ключ ≠ работоспособный API. Последняя независимая проверка daily Council: Gemini timeout, Mistral Studio HTTP 429. Mistral нельзя обозначать рабочим без реального ответа.

**Обновлённая логика:**
- /ai и /status выполняют только authenticated GET preflight к Google model metadata, Mistral Studio catalog (при подтверждённом Free) и OpenRouter key metadata + catalog. Никакой генерации и рассылок при открытии меню.
- Меню строится заново, показывает причины недоступности, кнопки доступны только для подтверждённых по metadata Free-моделей. Это ещё не E2E.
- /gemini, /free, /council (Gemini + OpenRouter Free) и старый /mistral вручную обрабатываются при verified owner pairing и существующем rate limit. В UI Mistral скрыт, если Studio 429 и OpenRouter не содержит бесплатной Mistral. Старые команды сообщат реальную ошибку, без выдуманного ответа.
- OpenRouter Free выбирает фактическую provider/model:free из свежего каталога. Все ценовые поля строго 0, допустима только текстовая модель, нужен проверенный ключ, per-request max_price=0 и allow_fallbacks=false; возвращённый model ID точно совпадает, usage.cost — число 0. Telegram показывает настоящую model ID: это не Mistral и не ChatGPT.
- /status обновляет availability без inference. Никаких новых ботов, новых cron, таблиц, платных fallback, рассылок или рекламы.
- OpenRouter Free лимитирован по частоте, не гарантируется для production SLA; сторонние Free API могут иметь политику хранения данных. Клиентские и медицинские сведения не пересылать.

**Release acceptance:** targeted GitHub CI + Vercel READY/alias/SHA + реальный провайдерский Telegram receipt на запрос /free тест или /gemini тест. До этого E2E не подтверждён.

Preserved prior owner bot audio callback/commands from live production; handled by the existing audio service, independent of the AI menu.

## 25 октября 2026 — Только подтверждённые ответы / Ask All

**Коренная ошибка:** в production таблице app_private.telegram_owner_ai_updates CHECK action остался от первого выпуска (menu/prompt/question/too_long/sensitive), а CHECK model_mode разрешал только both/gemini/mistral. Поэтому кнопки /status, /free, /council, появившиеся позже, могли завершаться ошибкой CHECK до вызова ИИ. Миграция 20261025163000 исправляет ограничения, сохраняя FORCE RLS, backend grant, дедупликацию и отсутствие вопросов/ответов/chat IDs в БД.

**Owner Telegram UX:**
- /ai открывает компактное меню. **Доступно** означает только успешный настоящий ответ модели (записан как безопасные статусы и model ID) за последние 36 часов + текущее read-only GET-подтверждение model/key; наличие key и положительный GET сами по себе НЕ делают кнопку зеленой.
- /verify или 🧪 выполняет настоящий короткий обезличенный пробный вопрос максимум дважды за 24 часа (явное действие владельца, без массовых отправок). Выполняются только Free-tier eligible Gemini, прямой Mistral с ранее подтверждённым Free, и до двух моделей OpenRouter с каждым ценовым полем равным 0. Результат: реальные model IDs и причины отказа, без выдуманных ответов. При отсутствии успеха кнопки моделей скрыты; старые /gemini, /mistral, /free остаются ручными проверочными командами.
- Free AI 1 и Free AI 2 — **не бренды**: две реально присутствующие в текущем OpenRouter каталоге качественные модели **разных авторов**. В ответе отображается настоящий ID, маршрут не подменяется платной моделью, max_price=0, allow_fallbacks=false, data_collection=deny, проверенный usage.cost=0.
- /all /council /ai вопрос = «Спросить всех» только если >=2 подтвердили реальный ответ. Независимые промпты отправляются параллельно, максимум 4 участвующих: Gemini, Mistral, OpenRouter Free 1, OpenRouter Free 2. Один реальный **дополнительный** запрос к Gemini Free (или одному из ответивших OpenRouter Free) синтезирует JSON: главный вывод, действительные совпадения с указанием моделей, разногласия, 1–3 конкретные действия с критерием проверки, что ещё неизвестно. Если синтез или 2 участника не подтвердились, бот честно показывает статусы и исходные ответы, без фиктивного консенсуса.
- Бюджет: zero-paid APIs; не более 4 ансамблей/сутки и 2 проверок/сутки, старый лимит 10 вопросов/час сохранён. При неизвестной стоимости или policy privacy deny — fail closed. Клиентские и медицинские данные не отправлять даже в бесплатные модели; free-тарифы могут обрабатывать тексты по своим правилам.
- Новый cron, бот, отдельная модель OpenAI/Claude через подписку ChatGPT **не создаются**: у сервера нет подтверждённых прямых GPT/Claude API ключей и бесплатных планов. Это нельзя показывать как реально подключённые модели.

**Приёмка:** migration applied, FORCE RLS+CHECK проверены, CI успешен, Vercel exact READY SHA/alias; затем физический владелец нажимает /verify в @Andydotbot и /all обезличенный вопрос. Только модельные response receipts + Bot API message_id и запись статусов в private ledger подтверждают E2E. Build зелёный ≠ доставка.


## 26 октября 2026 — умные модели без зависимости от Gemini

- Owner-only «Спросить всех» теперь использует **две независимые лучшие из доступных по live $0-каталогу модели OpenRouter** и Gemini Free только если он действительно доступен. Из автоматического состава исключён Mistral Studio (наблюдавшиеся HTTP 429); явная legacy-команда `/mistral` сохранена, чтобы не ломать старые вызовы.
- Приоритет OpenRouter основан на reasoning/coding: Inkling Small/Inkling, Nemotron 3 Ultra, Gemma 4, Qwen и резервные модели разных издателей. Рейтинг — эвристика, не гарантия доступности. Существующие проверки полного pricing=0, точного model ID, usage.cost===0, max_price=0, allow_fallbacks=false, data_collection=deny **не ослаблены**. Важно: отдельные бесплатные провайдеры пишут, что могут использовать запросы для обучения — при несовместимости с data_collection=deny они должны честно отказать. Никаких клиентских или медицинских данных в модели.
- Gemini: основной документированный стабильный `gemini-3.8-flash`, резервный бесплатный `gemini-3.6-flash` — только после явного HTTP 404/429/503, который означает отсутствие готового ответа у исходного endpoint. Не повторять неоднозначный timeout, 400/401/403, успешно завершённый или обрезанный ответ. Для owner-chat тайм-аут 35 секунд вместо 26, thinkingLevel=low. Для синтеза доступен JSON MIME; ежедневный публичный аудит сохраняет прежний бюджет времени.
- Синтез выполняет ровно **один** дополнительный запрос, в первую очередь к уже реально ответившему бесплатному OpenRouter; нестабильный Gemini не вызывается второй раз без необходимости. При двух и более независимых настоящих ответах — сравнение и 1–3 измеримых шага; при одном — без фиктивного консенсуса.
- Первый запрос владельца `/all <обезличенный вопрос>` может сам подтвердить реальные ответы, если read-only preflight обнаружил минимум два бесплатных доступных кандидата. Меню тогда предлагает **«Спросить всех · первая проверка»**, но показывает 0 подтверждённых ответов, пока настоящих completion receipts нет. Отдельный `/verify` остаётся полезным, но больше не обязателен для запуска `/all`.
- `/verify` теперь показывает **и имя модели, и конкретную причину неуспеха** (`HTTP 429`, `timeout`, отсутствие бесплатного API), а не скрывает ошибку за именем.
- Без изменений: проверенная числовая owner-пара, подписанный webhook, no client messages/broadcast, FORCE RLS ledger без текстов, лимиты 2 проверки и 4 коллективных вопроса в день, 10 запросов в час, никакой платной подмены.
- Готовность: после PR CI и exact READY production необходимо **реальное владельческое** `/all Как улучшить путь заявки в CRM?` в https://t.me/Andydotbot, readback статусов провайдеров и Telegram message_id + подтверждение сообщения на телефоне. GET/ключи, зелёный CI и mock-ответы НЕ доказывают работающую команду.

## 26 октября 2026 — упрощённый AI Console для владельца (iPhone)

**Основной пользовательский сценарий — одна команда:**
1. В Telegram открыть https://t.me/Andydotbot → «Меню» → `/all`. Бот выдаёт ForceReply; ответить на сообщение своим обезличенным рабочим вопросом. **Или** без меню отправить `/all <вопрос>` одним сообщением.
2. Сервер после явного действия владельца запрашивает независимые ответы доступных $0-моделей разных авторов, включает Gemini только если Free Tier разрешает, а затем делает один отдельный синтез. Результат — один общий разбор: главный вывод, где мнения действительно совпали/разошлись, альтернативы и ограничения, риски и защита, 1–3 проверяемых действия, а также факты, которые ещё не подтверждены.
3. В результате есть кнопка «Задать следующий вопрос», которая сразу открывает поле ответа. Никакой необходимости вручную выбирать Gemini / Free 1 / Free 2 или нажимать `/verify` перед вопросом, если read-only проверка уже нашла два подходящих API.

**Что показывать в Telegram:** в owner-scoped BotFather меню ровно три пункта: `/all` (главный), `/audio`, `/materials`. Старые технические команды `/ai`, `/gemini`, `/free`, `/free2`, `/status`, `/verify`, `/mistral` по-прежнему обрабатываются при явном вводе; из короткого списка они убраны без удаления функциональности. `/ai` показывает одну кнопку «Задать вопрос всем ИИ»; дополнительная проверка подключения появляется лишь когда предварительно менее двух кандидатов. Точное сравнение `getMyCommands` с ожидаемым списком заставляет однократно заменить прежние 11 команд при следующем owner-only `/ai` / штатном восстановлении (без нового webhook или бота).

**Если серверных провайдеров меньше двух:** не подменять общий ответ единственным мнением, не зацикливать меню и не говорить «успешно»; показать причины и кнопку «Проверить подключение». Синтетические unit tests проверяют интерфейс и логические ветки, но НЕ реальную доставку; последний live owner ledger перед этой правкой содержал только меню, статус и prompt без успешных completion receipts.

**Релиз / проверка:** PR https://github.com/andylitvinov-design/books/pull/2104 на production branch `codex/public-book-library`; до мержа требуют зелёные targeted owner-ai, shared-Telegram CI и Vercel READY. После READY выполнить один реальный non-sensitive `/all Как упростить заявку на бесплатную консультацию и проверить подтверждение лида в CRM?`, убедиться в минимум двух настоящих статусах `ok`, provider-specific ID, cost=0, общем ответе + Telegram `message_id` и в прочтении владельцем на iPhone. Пока это не выполнено, статус end-to-end **BLOCKED**, даже если native menu стало коротким.

## 2026-10-27 · Owner Telegram AI Council 4+1 (five distinct FREE-only models)

Existing signed shared-practice webhook and `@Andydotbot` are reused; **no second webhook/bot, no extra credential or database migration**. After owner numeric chat+username checks, DB update-id claim and 4-per-day limiter, `/all <public question>` or `/council <public question>` dispatches four **independent** requests in parallel and a FIFTH independent model for synthesis.

| Role | Exact locked OpenRouter ID |
|---|---|
| UX and visual audit | `qwen/qwen3.8-27b:free` |
| Product and strategy | `dots-studio/dots-3-note-preview:free` |
| Engineering and security | `cohere/north-mini-code:free` |
| Skeptic and alternative hypothesis | `xingchen-agi/xing4.0-29b-a4b:free` |
| Chief reasoning synthesizer | `google/gemma-4-31b-it:free` |

These are chosen complementary candidates, NOT a scientifically verified objective five-best benchmark. **2026-10-27 CI correction:** the initially proposed NVIDIA models are blocked by the existing `freeOpenRouterModel` privacy guard because their free endpoints may collect prompts for training; keeping them made the five-model preflight fail even with zero-price fixtures. The revised Qwen/Dots/Cohere/XingChen/Gemma lineup uses five different authors which pass the strict local policy; OpenRouter must still accept `data_collection:'deny'` in a real request. The expired MiniMax free launch is not used. OpenCode's application-only GLM/DeepSeek Free access does not give a free third-party HTTP API. Model roster is pinned to prevent a quiet switch to a paid model. Each explicit user question performs two read-only OpenRouter GETs for user-key identity and live catalog, rejects any model whose COMPLETE pricing is not zero, performs up to four parallel POSTs with `max_price=0`, `allow_fallbacks:false`, `data_collection:'deny'` and checks exact returned model ID, finish reason, `usage.cost===0`; only then a **fifth** distinct $0 model attempts a structured source-attributed conclusion. No retry of ambiguous POSTs or paid substitute. Provider privacy policies and free rate limits may refuse inference; show truthful partial/unavailable status.

**Telegram owner behavior:** 1:1 owner-private `/all` and `/council` are recognized; `/ai` menu now foregrounds **4+1**; `ForceReply` binds the question. Real fifth-model summary is delivered to the same verified owner chat as a compact Telegram message, then four genuine reviewer texts and synthesis/status metadata are delivered as a Markdown attachment using the preexisting verified `sendOwnerDocument`. Failed attachments are NOT silently retried. Historical `/gemini`, `/mistral`, `/free` commands remain available when typed, and audio/client `/start`/`/stop` flows are untouched. Neither source prompts nor answers enter public Supabase or log, just sanitized per-update outcome statuses.

**Acceptance gate:** `node --test tests/practitioner-owner-ai-five.test.mjs` + existing owner AI/Telegram regressions, CI and Vercel READY with exact production SHA. Actual *full* 4/4 responses + separately completed fifth model + Telegram `sendMessage`/`sendDocument` verified by the provider + owner's visual receipt remains **NOT TESTED** until the owner sends a real anonymous question to `https://t.me/Andydotbot`. A green build / mocked 5 messages alone is not E2E. Do not enable subscription payments, relax `data_collection:deny`, retransmit private health/client details, or alter webhook ownership to make a test green.
