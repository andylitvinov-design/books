# Holistic House — My Coach / Groq Basic 3.0
## Техническое задание: быстрый, гибкий, естественный голосовой коучинг без новых расходов
Дата: 26.11.2026. Статус: ТЗ к реализации (не свидетельство LIVE).
Связь: PR #5714; BASIC_GROQ_LOW_LATENCY_20261126.md; базовый HEAD fec23ad972fa74b1539418b4692c86b91596af22.

## 1. Цель и обязательные ограничения
Basic = Groq Whisper + GPT-OSS 120B + существующие разрешённые TTS + локальная MP4-режиссура. Pro = Gemini Live. Не менять выбор владельца, существующие голоса, дизайн, курсы, цены, XP и утверждённые права доступа. Все восемь персонажей, RU/EN/ES, мобильный интерфейс прежде всего. Повысить качество разговора, а не просто уменьшить длину ответов.
- ZERO_NEW_SPEND: ни новых подписок, платных API, облачных агентов, LiveKit/Vapi/Hume Cloud, платных моделей, автоперехода на платный режим, Vercel Sandbox, новых фоновых сервисов, повышения лимитов или ручных дополнительных деплоев. Бесплатность каждого провайдера должна быть подтверждена владельцем; при недоступности — честная деградация, не автоматический платный fallback.
- Как правило один STT и один LLM вызов на завершённую содержательную реплику, один TTS на ответ; ранняя проверенная фраза и остаток допускают второй TTS только внутри действующего лимита и при подтверждённой пользе; не вводить спекулятивные обращения, дублирование распознавания или параллельный вызов двух LLM. Локальные реакции не требуют API. Нулевые дополнительные подписки не означают неограниченную бесплатную ёмкость.
- Согласие клиента на каждый используемый провайдер, проверка аккаунта, same-origin, существующие rate limits, FREE/ZDR gates, запрет секретов и ограничения контекста обязательны. Не сохранять исходное аудио, не отправлять аудио другим поставщикам без согласия, не логировать тексты/аудио/идентификаторы. Отмена/End/отзыв согласия освобождают локальные ресурсы и отменяют сеть.
- Coaching Director и канонический серверный протокол — авторитет методики и проверенных ответов. Никакое распознавание, модельный текст, мимика или таймер сами по себе не подтверждают ответ клиента. Таймер курса только после явного согласия на начало/продолжение, обрыв не завершает сессию, одна бесплатная сессия до 20 минут в день на аккаунт по согласованной политике; не обходить действующие серверные ограничения и не включать незавершённые Clarity-флаги. Сохранить авторство и непрерывность протокола. Не трогать Gemini Live, Ali Chat и Video Studio за пределами доказуемо изолированного общего исправления.

## 2. Точка отсчёта: что уже есть и что не подтверждено
В draft #5714: 50 мс локальная VAD, адаптивные паузы 750/1050 мс; duplex capability check iOS 27, отмена старых callbacks; Whisper Turbo text-only, mono, 12s timeout; короткий PCM WAV 16 кГц с локальным pre-roll 400 мс, при длинном/неполном PCM — тот же MediaRecorder; 120 мс coalescing ранней проверенной фразы, low/medium reasoning. 74 изолированных assertions, 9 suites по последнему зафиксированному отчёту PR. Не считать native CI, фактическое качество iPhone, снижение затрат или LIVE подтверждёнными.
В production-исходниках уже есть режиссёры, локальные правила вступления, history window с pinned goal/boundary/correction, verbatim earlier client statements, consent-scoped context, авторизованные аудиоприветствия, progressive WebCodecs opt-in. Сначала проверить их текущие версии и не создавать дублирующие реализации.

## 3. Архитектура
Microphone -> Local Voice Controller (AEC, VAD, pre-roll, endpoint, barge-in) -> STT (Groq Whisper Turbo or existing consented browser ASR) -> canonical Coaching Director -> one Groq request (when needed) -> validated reply -> existing TTS + MP4 Director.
Master Director — логический фасад над существующими модулями; не отдельная модель и не шесть агентов. Session Director выбирает цель и допустимую интервенцию; Voice Director только темп, слушание и воспроизведение; Personality Director задаёт характер; Memory Director — актуальные разрешённые факты; Groq — содержательный диалог; Audio/MP4 Director — доставка. Локальные реакции не являются ответами протокола.

## 4. План работ (приоритет, конкретные задачи и критерии)

### B30-P0-00 — baseline, безопасность и lifecycle
- Сверить #5714 с production SHA и смежными PR коучинга, прогнать существующие тесты, проверить #5714 на актуальном head. До развития убедиться в audible output, correct mic route и capture continuity на iPhone.
- Ввести единый локальный turnId/generation для capture, STT, LLM, TTS, визуального intent и отложенных таймеров. Состояния idle, listening, endpoint, transcribing, thinking, speaking, candidate_interrupt, interrupted, paused, ended, degraded. Взаимоисключающие владельцы микрофона/выхода; один активный ответ. При смене языка/движка/коуча, pause/end, visibility, consent revoked — invalidate, abort, cancel, cleanup. Не отменять подтверждённый клиентский текст.
- Не считать 'ready' или разрешение микрофона доказательством реального звука. Показать честный fallback, если duplex недоступен.
- Измерить baseline p50/p95 каждого этапа, число STT/LLM/TTS, аудио-секунды, ошибки/quota, потерю первого слога, ложные перебивания. Только агрегаты в памяти или существующий разрешённый numeric telemetry, без новых сервисов.
Acceptance: ноль старых реплик после смены turnId; ноль дублирующих запросов; End останавливает все локальные tracks, players, timers; текст незавершённого диалога сохраняется существующим защищённым способом, никакого нового хранения.

### B30-P0-01 — Smart Turn Director / адаптивные паузы
- Pure-JS policy поверх существующего voice gate; вход: разрешённый этап курса, тип последнего подтверждённого вопроса (yes/no, шкала, открытый, глубокий, практика), длительность текущей речи, наблюдённые паузы, выбранный пользователем режим. Не выводить диагноз, эмоцию или согласие из VAD.
- Стартовые калибруемые режимы: quick 650 мс, normal 900 мс, reflective 1500 мс, practice 3000 мс; при неопределённости normal/reflective. Режим практики только по явному действию/этапу, не принудительно. Измерять локальную типичную паузу в текущей сессии, ограниченно корректировать порог, reset при новой сессии/смене режима; не использовать для психологического профилирования.
- Для коротких реплик использовать pre-roll и локальный шумовой порог; длинные реплики не дробить на сетевые запросы по секундам. При достижении технического лимита длительности предложить продолжение, не выдавать частичную мысль за завершённый ответ; сохранять текст как неподтверждённый до ясности.
- Не отправлять тишину, шум и пустые записи; при неуверенном ASR уточнять или показать редактируемый черновик. Не авто-переотправлять.
Acceptance: тесты на короткие «да/нет», числа, паузы внутри мысли 0,5–2,5 с, длинную рефлексию, practice; отсутствие обрывов в согласованных сценариях; субъективная естественность оценена на физическом устройстве. Сравнить с baseline, а не объявлять все интервалы окончательными.

### B30-P0-02 — Smart Barge-in / false-interruption recovery
- Двухфазный local VAD: candidate -> duck/pause -> sustained speech confirmed, с echoCancellation, bounded pre-roll, hysteresis и проверкой совпадения текста с только что озвученным ответом. Кашель/шум -> восстановить громкость; один активный recorder; защита от асинхронного discard/onstop race.
- При подтверждении речи приоритет клиента: отменить старую генерацию и неозвученный TTS, перенести уже захваченный микрофон на новый turnId, получить финальную STT один раз. «Стоп», «нет», «подожди», исправление/смена темы — не считать поддакиванием. Если фраза неоднозначна, дать клиенту слово. Нельзя принимать просто «да» как подтверждение другого вопроса.
- Короткие естественные backchannels во время речи коуча («угу», «ага», mm-hm, ajá) классифицировать только с учётом фазы, текущего ожидаемого ответа и доступного текста. Без отдельного LLM-вызова. Если нет текста/уверенности — не игнорировать клиента. Поддакивание на вопрос клиента не является шумом.
- Восстановление после ложного candidate: возобновить ровно тот же локальный player/позицию, если ответ ещё действителен, не было новой клиентской реплики/отмены и всё ещё разрешён. После подтверждённого прерывания не оживлять отменённый ответ/старый запрос. Без второго TTS для resume; если resume невозможно — честно остаться в слушании, без повтора всего монолога. Помечать interrupted отдельно; не использовать непроигранное как услышанное клиентом.
- Предусмотреть manual Mic/Stop для unsupported или отказа разрешения; не скрывать фактическое состояние.
Acceptance: iPhone speaker/headphones, тихая и шумная обстановка, перебивание во время thinking/loading/speaking, echo, кашель, короткое «нет» и backchannel, ложная тревога, 10 последовательных перебиваний; отсутствие дублирования, утраты слов и stale playback. Цель p50 stop <=400 мс от начала устойчивой речи на совместимом устройстве; отчёт p95 и число ложных срабатываний.

### B30-P0-03 — Prompt Optimization и адаптивный интеллект
- Сохранить GPT-OSS 120B как default. Измерить размеры current messages, разбить стабильные системные инструкции (версия паспорта, локаль, метод, safety, формат) и изменяемые directive/session/history. Детерминированная сериализация без timestamp/random/requestId в стабильном префиксе; не менять приоритет инструкций и не превращать данные пользователя в system prompts.
- Использовать имеющиеся coachTurnWindow/coachEphemeralContext, canonical verified facts и scoped context. Удалять только точные дубли в контексте, сохранять дословные активные цели, корректировки, запрет советов, последнее слово и нужные прошлые ответы. Не заменять их генерируемой сводкой, не обрезать важный ответ ради скорости. Topic shift/correction/revocation очищают устаревшую информацию.
- Проверить официальные условия Groq automatic prefix caching, совместимость с account ZDR, eligibility, фактические cached tokens и тарифы. Не включать retention, передавать личные данные ради кеша или менять ZDR. Оптимизация длины и стабильности работает и без cache hit; экономию кеша не обещать.
- Единый routing: простые короткие и описательные голосовые реплики low; явный запрос анализа/сравнения/длинная рефлексия medium. Не переключать автоматически на high или другой провайдер. Safety/границы и обязательные правила работают независимо от reasoning. Локальный протокольный ответ — только если он уже поддержан авторитетным Director (например, вступление или однозначный вопрос), иначе Groq.
- Не добавлять speculative generation до завершения ASR. Не тратить второй LLM на классификацию, память или QA; использовать existing deterministic gates и human verification.
Acceptance: сравнение token/TTFT baseline vs new при одинаковом наборе диалогов; целевой сокращённый объём динамического prompt без потери результатов. RU/EN/ES tests: goal retention, corrected name/goal, consent withdrawal, repeated-question avoidance, no-advice, safety, no fabricated answer. 120B неизменён; 20B только отдельный будущий offline experiment под free quota, не автоматический production switch.

### B30-P0-04 — Fast Audio Pipeline
- Проверить existing MP3 progressive WebCodecs implementation, capability probe, existing opt-in (?coachStream=1/0), MSE/AudioContext. Не включать безусловно для всех. На устройстве сначала сравнить buffered vs progressive, затем при успешной приёмке безопасно открыть capability-gated Basic path под существующим rollout; оставить мгновенный escape hatch.
- Использовать тот же авторизованный TTS stream; incremental decode/play, bounded queue, correct timestamps, audio output gain/AEC, отмена scheduled nodes по turnId. Если decoder unsupported или сломан ДО audible start — проиграть те же bytes buffered; после старта не проигрывать целый ответ заново. Не повторять синтез автоматически.
- Сохранить 120ms coalescing: одна полностью проверенная фраза/ответ если результат готов быстро; ранняя речь только после существующего Director-approved sentence gate и без новых claims, при отмене — немедленно остановить. Не пропускать смысловую проверку ради latency; не считать неполный prefix итогом протокола.
- Протестировать prefetch только уже существующих локальных immutable greeting/media assets, никаких speculative vendor TTS; не ухудшить initial page performance. Ограничить memory, PCM, audio queue; не генерировать новые платные треки. Если лимит голоса исчерпан, показать текст + согласованный доступный fallback, не молча переключать на оплачиваемый сервис.
Acceptance: первое реально слышимое аудио до полного download на поддержанном устройстве; короткий/длинный MP3, broken chunks, cancellation, unsupported decoder, rate limit, Safari autoplay, no-audio route. TTS запросы и байты не растут без обоснования; текущие утверждённые голоса сохранены.

### B30-P1-05 — Personality Dialogue / темп каждого из 8 коучей
- Использовать существующие persona-registry, паспорта и approved voices. Ввести/расширить декларативные поля dialogueTempo, pausePreference, replyLength, reflectionStyle, questionStyle, interruptionRecoveryStyle; заполнить индивидуально из действующих паспортов, не придумывать девятого коуча.
- Все этапы: приветствие, ядро сессии, уточнение/верификация, переход, завершение; индивидуализировать форму, не менять обязательный смысл, очередность evidence gates или safety. Клиентский темп важнее defaults персонажа; явные предпочтения/границы важнее стиля.
- Не повторять одно и то же начало, вопрос или interjection; учитывать последние 2–3 реплики; на прямой вопрос сначала ответить по сути.
Acceptance: 8 x 3 locales x минимум 3 сценария, разные естественные формулировки при одинаковых протокольных данных; no duplicate prompts, no unsupported psychological claims. Выбор голоса/метода не меняется.

### B30-P1-06 — Local Response Library и MP4 Director
- Инвентаризировать уже существующие локальные/immutable аудиофайлы, привязать только реально доступные clips к personaId/locale/intent. Состояния listening, thinking, reflective pause, acknowledgment, clarification, farewell; каждому intent — разрешённые варианты и fallback silent MP4. Не маркировать отсутствующий клип готовым.
- Локальная нейтральная реакция при заметной задержке допустима после завершённой реплики, не во время речи клиента, не чаще одной реакции на turn и с cooldown/anti-repeat. «Я вас слушаю», если реально слушает; не говорить «Я понимаю» до распознавания смысла; не задавать лишнего вопроса вместо ответа Director. Не маскировать ошибки сети и не подтверждать данные реакцией.
- Новые голосовые клипы — только уже доступный разрешённый ресурс и отдельная проверка стоимости/лицензии; до этого тихие видео/существующие аудио. Не использовать synthetic clone без разрешения.
- MP4 Director: только существующие approved clips, плавное переключение после завершения текущего ролика, общие точки входа/выхода, длина любой реакции <=10.20s, no abrupt cuts. Аудио прекращается сразу по barge-in; видео переходят в listening на ближайшем безопасном стыке. Fallback порядок для greeting/listening/thinking/speaking/farewell, не имитировать точную синхронизацию губ если её нет. Не генерировать видео в realtime.
Acceptance: нет повторяющихся filler phrases, нет проигрывания поверх клиента или поверх TTS, все clip refs проверены, отсутствие сетевых vendor calls при локальной реакции, гладкое видео и честный статический fallback.

### B30-P1-07 — Smart Memory и Session Continuity
- Повторно использовать только разрешённый canonical session/protocol draft, reviewed evidence и verbatim context. Избегать повторного чтения одного неизменившегося контекста в рамках запроса; не обходить проверку grants/revisions/ownership; не использовать long-lived cache личных данных.
- Разделять client confirmed, candidate, skipped/unanswered, corrected, interrupted assistant output. Протокол обновляется после существующего validation/confirmation, не из предположений модели. При неопределённости коуч переспрашивает и ждёт ответа. Не переспрашивать уже подтверждённое без причины.
- При reconnect/coach change: восстановить существующий курс и протокол, кратко напомнить фактически пройденное, спросить продолжение/новую тему, запуск остатка таймера после согласия, без нового бесплатного entitlement. Не связывать успешность транспорта с завершением протокола. ДЗ только по установленному каноническому плановому завершению, не по обрыву.
Acceptance: no cross-account leakage; revoked grants withheld immediately; correction supersedes stale facts; reconnect + new coach + same logical session preserve verified protocol and clock. Если соответствующие P0 course runtime/DB gates ещё не готовы, зависимость остаётся закрытой — не включать экспериментальные flags.

### B30-P2-08 — последующие бесплатные эксперименты (не обязательны для P0)
- Оценить GPT-OSS 20B vs 120B только на синтетических/согласованных тестовых данных и в подтверждённой бесплатной квоте: latency, grounded answer, personality, question quality, evidence, safety, correction, RU/EN/ES. Без параллельных production requests. 20B не продвигать, если качество хуже или нет verified-free capacity.
- Исследовать локальный semantic endpointing без отдельного облачного LLM: правила по типу вопроса и словам уже полученной STT; при offline/local model evaluation учесть размер, батарею, лицензию, device performance. Не скачивать тяжёлую модель всем клиентам; VAD не умеет определять смысл без текста.
- Доработать персональные режимы темпа после данных с устройства; не вводить сторонний paid endpointing/STT/transport.

## 5. Зоны кода (проверить актуальные пути до правок)
- components/my-coach-speech-loop.jsx — voice lifecycle, interruption, TTS coalescing.
- lib/personal-coaching/coach-recorded-turn.mjs, coach-local-pcm.mjs, coach-barge-in.mjs, coach-ios-audio-route.mjs, my-coach-dictation.mjs — capture, pre-roll, VAD, iOS.
- app/api/holistic-support/audio-storyboard/route.js — существующий authenticated STT; не ломать Ali/Studio.
- lib/coaching/groq-coach-provider.mjs, groq-coach-stream.mjs, conversational-persona.mjs, coach-turn-window.mjs, coach-ephemeral-context.mjs, context-cloud-messages.mjs; lib/app/coaching-brain.js — model route, prompt, Director, memory.
- lib/personal-coaching/streamed-mp3-playback.mjs, streamed-mp3-webcodecs.mjs, direct-coach-intro-audio.mjs; app/api/app/my-coach/voice/synthesize/route.js — playback/TTS.
- components/my-coach-live-dialogue.jsx, my-coach-motion-media.jsx; lib/coaching/coach-reaction-director.mjs, persona-registry.mjs — persona, visual intents and shared protocol boundaries. Reuse existing canonical course ledger; avoid duplicate schema.
- tests/my-coach-stt-recovery.test.mjs, my-coach-webcodecs-stream.test.mjs, my-coach-dual-voice-stream.test.mjs, my-coach-early-stream.test.mjs, coaching-groq-provider.test.mjs and existing coaching release runner. Add focused tests within existing suite; don't relax gates.

## 6. Единая матрица качества и измерения
Показатели — цели, не фактические результаты; сравнить на одинаковых устройствах/сети/провайдерах и сопоставимых репликах. Baseline: production до изменений; candidate: exact HEAD #5714 и следующий scoped release.
| Метрика | Цель/проверка |
| --- | --- |
| Последнее реальное речевое событие -> первое слышимое аудио | p50 <= 2.5s; aspirational 1–2s; p95 измерить, ориентир <=4.5s без провайдерского сбоя |
| STT request -> final text (короткая фраза) | p50 <= 1s как цель; p95 зафиксировать |
| Устойчивая речь клиента -> coach output stopped | p50 <= 400ms на совместимых устройствах |
| Перебивания | не менее 10 подряд, без stale callbacks, первых потерянных слов и двойных LLM |
| Паузы | короткие и рефлексивные сценарии; не преждевременно завершать мысль |
| Стоимость | 0 новых подписок/ресурсов, лимиты unchanged; requests/audio seconds/token/TTS сравнить с baseline |
| Протокол | 0 fabricated confirmed facts в тестовом наборе; unknown остаётся unknown |
| Стабильность | 20 минут непрерывного разговора, pause/resume/end, reconnect, два аккаунта |
| Качество речи | RU/EN/ES; 8 персонажей, отсутствие навязчивых повторов/ложных утверждений |
| Privacy | 0 raw audio storage, 0 sensitive logs, 0 cross-account grants |
- Разделять метрики: last speech, endpoint, upload, STT final, model first token, approved first phrase, TTS headers, first actual audible audio, interruption stop. Performance.onStart не обязательно доказывает слышимость — ручная/устройственная проверка.
- Для отчёта p50/p95 указывать n, сеть, устройство, head, provider and codec, успехи/ошибки отдельно. Минимум 20 измеряемых обычных коротких реплик и набор длинных/interrupt cases для каждого тестируемого режима; полноценные 20-минутные сценарии на iPhone и desktop, smoke трёх локалей. Не выдавать synthetic timings за реальную сессию.
- Cost: учёт Groq request caps, tokens, provider billing minimum (проверить действующие условия), TTS slots и concurrency. При 429 не запускать циклические ретраи; сохранить текст, предложить продолжить допустимым способом. Отчёт о фактической capacity, без обещания unlimited.

## 7. Очередность и Definition of Done
Wave A: B30-P0-00, baseline and verify #5714. Не открывать дублирующий PR, если работа уже есть.
Wave B: B30-P0-01/02, безопасный voice state machine, adaptive turn + interruption/recovery.
Wave C: B30-P0-03/04, контекст и progressive TTS. Порядок A->B/C, отдельный controlled enable только после физической проверки.
Wave D: B30-P1-05/06/07, персонажи, local reactions, verified continuity; учитывать зависимости протокола/квот и не активировать незавершённые флаги.
Wave E: P2 experiments only after P0/P1 acceptance, no automatic provider/model change.
- Для каждой задачи: проверенные текущие исходники -> конкретный patch -> тесты -> exact diff scope -> существующий protected CI -> merge -> обычный cost-limited production publisher -> canonical domain deployment READY SHA -> real authenticated device acceptance. Не обходить CI, не запускать самостоятельный Vercel deploy, не создавать платные ресурсы. Если новая production-ветка изменилась, reconcile без потери параллельных задач.
- Native build/test, device and provider evidence обязательны для LIVE; при недоступном устройстве отметить blocker и оставить безопасный gate/draft. Сохранить отчёт pass/fail/blocked по каждой задаче, ссылки на commit/PR/production и результаты замеров.
- P0 не считается завершённым только по наличию кода, мокам или merged PR. Не менять pricing и daily limit. Новые значения пауз, thresholds, targets и порядок waves являются предложением на проверку, не утверждёнными измерениями.
- Источники: ранее сохранённый BASIC_GROQ_LOW_LATENCY_20261126.md; официальная документация Groq, LiveKit, Pipecat, описанные там публичные примеры. Эти материалы объясняют архитектурные подходы, но не доказывают, что конкретный конкурент-коуч использует Groq, и не заменяют наши измерения.

## 8. Реестр задач
- [ ] B30-P0-00 baseline + verify existing #5714
- [ ] B30-P0-01 Smart Turn Director
- [ ] B30-P0-02 Smart Barge-in + false-interruption recovery
- [ ] B30-P0-03 Prompt Optimization + reasoning routing
- [ ] B30-P0-04 Fast Audio Pipeline, device-gated
- [ ] B30-P1-05 Personality Dialogue
- [ ] B30-P1-06 Local Response Library + MP4 continuity
- [ ] B30-P1-07 Smart Memory and verified session continuity
- [ ] B30-P2-08 optional controlled free experiments
- [ ] Final protected CI / merge / canonical LIVE / signed-in physical-device acceptance
