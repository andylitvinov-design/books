# Holistic House Test Chat — реализация и дальнейший план (06.11.2026)

## Цель

Проходить **все доступные по правам и безопасности вопросы тестов** как последовательный диалог, без повторной системы баллов, через (1) веб-мессенджер Holistic House и (2) существующий opt-in Telegram Companion. Серверные определения, версии и алгоритмы расчёта не меняются. Исключения обусловлены правами на методику, возрастными/клиническими ограничениями и обязательным дополнительным протоколом перед травматическими тестами.

## Фактический аудит до работ

- Каталог: `MONITORING_CATALOG`, `ASSESSMENT_DEFINITIONS`, формы `Quick` (все вопросы) и `Guided` (один вопрос), сохранение `runs/{id}/save` и `guest/runs/{id}/save`, `submit`, отчёты и гостевые сессии.
- Веб-мессенджер `HolisticAgentChat` предлагает только ссылку на тесты; вопросы в чате отсутствовали.
- Telegram `/tests` / `hhai:tests` предоставлял ссылку на сайт. Переписка Telegram работает в отдельной consented-сессии и НЕ является подтверждённой связью с аккаунтом. Нельзя читать личные тесты без верификации.

## P0 — веб Test Chat (код текущего PR)

1. Открытие **внутри** компактного AI-мессенджера по `Получить подсказку / тест` либо контекстному quickPrompt формата `test`; без регистрации до старта.
2. Выбор / поиск среди реальных `startable && rightsStatus=cleared && guestEligible` тестов из текущего каталога. `phq-9` исключён в соответствии с гостевым входом.
3. Explicit adult+temporary storage agreement before `guest/session`. Без передачи тестовых ответов в `holistic-agent/turn` и без отправки внешней LLM.
4. Только immutable source `definitionId`, исходная формулировка `question.text`, исходные `responseAnchors`, цифровые значения включая ноль и дневные счётчики 0–30. Хранилище и score — существующий guest backend, без локального расчёта.
5. Каждый ответ атомарно сохраняется через `guest/runs/{id}/save` с `expectedRevision` и стабильным `operationId`; позиция восстанавливается после reload/выбора того же теста. На ошибке доступен retry той же операции; назад — серверное перемещение курсора и возможность исправить ответ.
6. Движение вопросов и отметка прогресса, короткая история последних ответов, завершение через `guest/runs/{id}/submit`, ссылка на оригинальный отчёт `/client?result=<opaque-id>` (cookie-scoped), добровольное сохранение через текущий кабинет.
7. Травматические методы направляются на защищённую страницу с их обязательным front matter, а не запускаются без данных и осознанного согласия; при risk-сигнале показывать текущий `SAFETY_COPY`, блокирующий дальнейший выбор до подтверждения.
8. Поддержка RU/EN/ES интерфейса; если перевод инструмента отсутствует, отображать оригинальный утверждённый язык с правильным `lang`.

### P0 приёмка

- От первого касания «тест» до первого вопроса максимум один явный выбор и обязательное согласие.
- В истории сети каждый выбранный ответ 0–10/0–30 отправляется точно один раз либо повторяется с тем же idempotency key; никакого нового standalone scorer.
- После Safari/iPhone refresh на том же устройстве и выбора теста — серверный draft продолжается; после смены браузера гостевой результат без account-link не переносится.
- `pytest` не применим: `node --test tests/test-chat-flow.test.mjs`, существующие unit checks и WebKit в текущей CI системе.
- Опасный ответ блокирует дальнейший интерфейс указанием службы помощи, без ложного обещания живого мониторинга.
- Проверить full baseline с `hh-current-state`, `cdc-hrqol-4`, `asrs-6`, долгое прохождение `hh-bach-flower-profile`, retry/reload и закрытие окна.

## P1 — native Telegram Quiz (отдельный безопасный PR; НЕ поставляется этим PR)

1. Расширить **существующий** `subscriber-ai-telegram.js` и policy для `/tests`, `hhai:tests`, `hhq:select:<test-key>`, `hhq:answer:<cursor>:<value>`, `hhq:back`, `hhq:stop`; кнопки только из проверенного собственного bot webhook и только приватный чат. 64-байтный лимит callback и антидубликат по `update_id`/версии.
2. Создать `app_private.subscriber_quiz_runs` с `session_id`, `definition_id`, `encrypted_answers`, `progress`, `revision`, `expires_at`, `consent_at`, `status`, `idempotency_key`; отдельные backend-only RLS policy и deletion TTL. **Не** писать ответы в Telegram AI logs или plaintext history; не передавать GPT/LLM.
3. General test adapter: reuse `chatAnswerOptions`, stored official definition/scoring, `validateAnswers`, `scoreAssessment`, and `safetySignal`. Server has to enforce cleared rights, Telegram eligibility, required trauma front matter and explicit participant consent. Do not duplicate scoring rules.
4. Atomic transaction per callback: verify chat hash, valid consent, `session_id`, current cursor, complete prior attempt and response values, save encrypted answer and enqueue next message using existing outbox; retries/reordered callbacks must be idempotent.
5. После последнего ответа — сначала persisted result+provenance, только затем отправка summary. Для крупного теста использовать 1 вопрос на сообщение, numeric keyboard or exact-day input, Telegram edit/short keyboard; бот остаётся доступным для чата и материалов.
6. Привязка к кабинету **только** после verified Telegram ↔ account linking плюс явного согласия на перенос; до этого результаты Telegram изолированы. Никаких связок по username/телефону без proof. Отвязка и `/ai_off` прекращают доступ, `/tests_off` удаляет тестовую сессию/отложенные сообщения.
7. E2E: update replay, multiple buttons, stale choice, lost outbound send, 988 signal, long test, cross-user isolation, revoke while worker in flight, SQL RLS, privacy expiry. Никакой платной модели, новых workers или повышения частоты cron.

## P2 — общая память и рекомендации

- После верифицированной связки гостевого/Telegram результата один приватный report в My House, в нём источник, версия инструмента, дата, по желанию динамика «до/после».
- Рекомендации / сопровождающие вопросы отдельно от шкал: LLM может объяснять опубликованную методологию с пометкой недиагностического характера, но не менять инструмент и scoring.
- Длинные батареи тестов: `assessment_plans`, выбор 1–12 инструментов и автоматическое предложение следующего, а не навязчивый вход в аккаунт.
- Voice answer: только явное согласие, безопасная STT, подтверждение распознанного значения до сохранения (особенно 0–10), никакой отправки произвольного текста в scoring.

## Что не считать доказанным по этому PR

**Web UI и unit tests не являются живым E2E.** Не утверждать завершение Telegram-native / sync / iPhone Safari / production до соответствующих доказательств. Release через Ready PR → protected Core/Specialist/Guard → merge → READY production SHA → LIVE smoke. Только штатный существующий CI и текущие Supabase/Vercel, без дополнительных платных сервисов.
