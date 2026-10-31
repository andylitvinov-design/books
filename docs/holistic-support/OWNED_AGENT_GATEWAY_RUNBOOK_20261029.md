# Holistic House AI — запуск собственной бесплатной языковой модели

29 октября 2026. Статус: готов исходный код preview/шлюза. Модель на постоянном оборудовании, TLS-доступ, профильная память, E2E и production не активированы.

## 1. Что уже есть в коде

- scripts/owned-agent-gateway.mjs — внутренний Node.js HTTP server, слушает ТОЛЬКО 127.0.0.1:8787, с bearer, constant-time comparison, size limit 16KB, concurrency 2, timeout 18s и фиксированной моделью.
- lib/holistic-support/owned-ollama.mjs — server-only клиент для HTTPS upstream.
- app/api/holistic-agent/turn/route.js — same-origin, signed-in verified Supabase account, rate limits, no-store, safety preflight, проверенные услуги; LLM только при отдельном согласии.
- components/holistic-agent-chat.tsx — приватная RU/EN/ES страница за feature flag, режимы без нейросети / browser / own model, история короткая и несохраняемая.
- lib/holistic-support/conversation-context.mjs — связь текущей темы с предыдущими репликами, новый разговор сбрасывает контекст.
- tests/owned-agent-gateway.test.mjs — Node integration на localhost без запуска реального Ollama.

Сервер *не* запускается сам при деплое Next/Vercel: его нужно поставить на отдельный постоянно включенный Mac/Linux host. Не открывать напрямую публичный Ollama (порт 11434).

## 2. Подготовка своего Mac mini или другого компьютера

Установить актуальные Node.js 22+ и Ollama с официального сайта https://ollama.com/download. Выбрать подходящую multilingual instruct-модель; в качестве стартового проверяемого варианта Qwen3 4B instruct. Вес quantized Q4_K_M около 2.5 GB; при работе требуется больше RAM. Технический минимум не равен комфортной скорости.

~~~bash
ollama pull qwen3:4b-instruct
ollama run qwen3:4b-instruct "Ответь на русском двумя короткими предложениями: чем ты можешь быть полезен?"
ollama list
~~~

Проверить отдельными короткими запросами RU, EN, ES: длинная мысль, неоднозначность, реакция на отказ, перефразирование, недопустимость новых фактов/покупок, "ты человек?" — агент должен честно сказать, что AI.

В актуальной локальной копии GitHub-ветки PR #2532 запустить шлюз (никогда не коммитить настоящие секреты или chat data):

~~~bash
export HH_AGENT_GATEWAY_TOKEN="$(openssl rand -hex 32)"
export HH_AGENT_OLLAMA_MODEL="qwen3:4b-instruct"
node scripts/owned-agent-gateway.mjs
~~~

Сохранить токен в защищённом secrets manager для рестартов; не выводить в логи и не записывать вручную в shell history. Запуск организовать как launchd/systemd service c auto-restart, без root. Шлюз слушает только 127.0.0.1:8787, Ollama — только 127.0.0.1:11434. Нужен постоянный интернет и питание.

## 3. HTTPS между Vercel и собственным Mac

Настроить собственный HTTPS host (например, через Caddy reverse_proxy + публичный DNS с корректным TLS, либо named outbound tunnel на Mac за NAT). Путь HTTPS /api/chat → локально http://127.0.0.1:8787. Защита включает:
- TLS с проверяемым сертификатом, DNS, firewall, отсутствие публичного доступа к 11434 и 8787.
- Токен bearer не менее 32 случайных символов, сопоставимый с gateway token, только server env.
- Fail-closed при недоступности, ограничение concurrent 2 и payload size, токены на вход/выход, no body logs, мониторинг только статусов/latency.
- Перед запуском убедиться, что нет обходного маршрута к Ollama. Remote proxy не должен перенаправлять пути, отличные от /api/chat.
- Если используется Cloudflare Tunnel, настроить устойчивый named tunnel/DNS и проверку доступа, а не временный публичный Quick Tunnel.

Обычный рабочий домен Holistic House остаётся на Vercel. Мак обслуживает только AI inference, данные клиента и сервисы не копируются туда без явного согласия.

## 4. Разрешённые Vercel Preview переменные

~~~text
HH_AGENT_CHAT_ENABLED=true
HH_AGENT_CHAT_UI_ENABLED=true
HH_AGENT_OWNED_ENABLED=true
HH_AGENT_OLLAMA_ENDPOINT=https://YOUR_OWN_TLS_DOMAIN/api/chat
HH_AGENT_OLLAMA_MODEL=qwen3:4b-instruct
HH_AGENT_OLLAMA_TOKEN=(server secret, same as HH_AGENT_GATEWAY_TOKEN)
~~~

Все значения серверного токена создавать в Vercel Environment Variables для Preview, НЕ с префиксом NEXT_PUBLIC_. Требуются также существующие HH_APP_* env, включая configured Supabase Auth, private DB, account encryption, allowed origins; их нельзя подменять заглушками.

После реально готового и защищённого Preview открыть с Google sign-in:
- /ru/holistic-support/agent
- /en/holistic-support/agent
- /es/holistic-support/agent

В режиме own AI пользователь отдельно соглашается на передачу текущего сообщения и нескольких недавних реплик на собственный сервер. Без согласия вызов модели не выполняется. Профиль, тесты и заметки практиков этим preview не читаются. История в БД не сохраняется. Режим device основан лишь на поддерживаемом browser built-in LanguageModel: русский и мобильные Chrome/iOS не гарантированы; WebLLM Worker предстоит внедрить отдельно.

## 5. Проверка, что отвечает именно реальная модель

1. Прямо на Mac попросить Qwen ответить на три непохожие свободные фразы RU/EN/ES. Убедиться, что она не выдаёт одно и то же правило.
2. Отдельно проверить gateway auth: 401 без Bearer, 415 не JSON, 400 на неверный prompt, 429 при превышении одновременных генераций; реальные сообщения в логи не выводить.
3. На Vercel Preview после login послать запрос в own mode и согласиться на передачу; в ответе должен быть source=owned, modelUsed=true. При отключенном Mac ответ mode=rules, modelUsed=false.
4. Проверить 401 без sign-in, 403 cross-origin, 429 rate; невозможно подставить account id, owner rights, чужие results, внешний model URL, произвольные sources или payments через POST.
5. В двух аккаунтах A/B проверить, что никакое сообщение/тест/профиль A не попадает к B. Нет записи в CRM, истории и analytics без отдельного consent.
6. Проверить многошаговый диалог: "отношения" → "а почему?" → "не надо это" → "другая тема"; ещё "стоп"/"мне стало хуже", безопасный handoff, отсутствие автоматического назначения клинических упражнений.
7. Проверить Chromium, Safari, iOS/Android и мобильные 320/390/430, ошибки сети, отмену, слабое устройство, RU/EN/ES, timeout.
8. Только зелёный exact-SHA CI, review, Vercel READY/alias, реальное наблюдение ответа модели и owner acceptance дают право отдельно включить production flag.

Критично: первая версия gateway и простой lexical risk detector НЕ заменяют более глубокую клиническую оценку. Сеансы, сохранённая память, T0/T1 и автоматические действия требуют отдельных purpose-specific permission, source approval и owner-scoped RLS. Никакого заявления о готовой терапии на этапе preview.
