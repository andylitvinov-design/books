# Holistic House · Voice Studio 1.0 — бесплатный пилот (30.10.2026)

## Задача
Предлагать клиенту шесть постоянных голосовых профилей в RU/EN (3 мужских и 3 женских: низкий/средний/высокий), генерировать настоящий WAV через Google Gemini 3.8 Flash-Lite TTS **только на бесплатном тарифе**, накладывать собственные звуки природы и экспортировать файл. Никаких автоматически платных вызовов.

## Где встроено
- Голосовой редактор встроен в основную страницу /{ru,en,es}/holistic-support/mandala: компактный раскрывающийся блок «Озвучить свой текст» (6 голосов и RU/EN), без отдельного тяжелого публичного лендинга.
- Старые ссылки /{ru,en,es}/holistic-support/voice-studio перенаправляются на /{locale}/holistic-support/mandala#voice-studio, чтобы сохранить ранее выданные адреса и не дублировать интерфейс.
- В существующем редакторе есть видимая ссылка на голосовой модуль.
- После формирования персональной медитации внутри существующего MandalaPersonalMeditation: отдельная необязательная карточка облачной озвучки. Локальный Web Speech API остаётся бесплатной альтернативой.
- Существующий видеоредактор принимает локальную WAV-дорожку через загрузку пользовательского аудиофайла. Встроенная кнопка озвучки аффирмаций автоматически прикрепляет сгенерированный WAV к текущему видео через существующий механизм аудиодорожки; отдельная Voice Studio сохраняет возможность скачать файл. Прикрепление не означает, что экспорт видео или публикация уже проверены.

## Наши 6 голосов
| ID | Голос HH | Провайдер Google | Пол | Желаемая высота |
| --- | --- | --- | --- | --- |
| mark | Марк / Mark | Enceladus | М | низкий |
| alexander | Александр / Alexander | Charon | М | средний |
| leon | Леон / Leon | Puck | М | высокий |
| sofia | София / Sofia | Gacrux | Ж | низкий |
| maya | Майя / Maya | Sulafat | Ж | средний |
| alisa | Алиса / Alice | Zephyr | Ж | высокий |

Это **редакторские гипотезы** о тембре, не аудиометрически подтверждённые диапазоны. Отобрать шесть финальных голосов после прослушивания всех 12 сочетаний (6 голосов × 2 языка) на одинаковом тексте и на iOS/Android. Не используем имитацию известных людей или клонирование.

## Free-only activation — действия владельца
1. В Google AI Studio https://aistudio.google.com/api-keys уже создан проект Default Gemini Project. По скриншоту владельца от 30 октября 2026 оба ключа проекта имеют Free tier, рядом отображается Set up billing; новый ключ не требуется.
2. В production Vercel проекта codex-public-book-library уже есть **серверная** переменная HH_COUNCIL_GEMINI_API_KEY (защищённое значение не отображается в коннекторе). Только после проверки, что эта переменная относится к показанному бесплатному проекту, разрешено использовать её для TTS.
3. Режим переиспользования (без копирования и раскрытия секрета) — Environment Variables, Production:
   - HH_VOICE_STUDIO_USE_EXISTING_COUNCIL_KEY = true
   - HH_VOICE_STUDIO_FREE_TIER_CONFIRMED = true только при проверке, что существующий ключ действительно из Free-tier проекта без биллинга
   - HH_VOICE_STUDIO_ENABLED = true
   Никакой отдельной переменной HH_VOICE_STUDIO_GEMINI_API_KEY в этом режиме не требуется. При желании позднее можно задать отдельный dedicated key; он имеет приоритет и должен быть free-tier.
4. После безопасного merge выполнить redeploy. До включения обоих флагов HH_VOICE_STUDIO_ENABLED и HH_VOICE_STUDIO_FREE_TIER_CONFIRMED / наличия разрешённого ключа UI отключает генерацию, POST отвечает VOICE_STUDIO_NOT_CONFIGURED. Флаг FREE_TIER_CONFIRMED — подтверждение оператора, а не техническая проверка биллинга проекта или гарантия неизменности тарифа; status enabled также не доказывает бесплатность реального вызова. Ни одна функция не должна включать биллинг или менять Google-проект.
5. Проверка происхождения секрета: значение защищённого env var нельзя получить в текущем Vercel коннекторе, поэтому по одному лишь совпадению имени проекта нельзя доказать, что именно этот секрет — один из двух показанных на скриншоте. Не заявлять такое совпадение без отдельной проверки.
5. Проверить, что бесплатная квота не исчерпана и настоящие WAV создаются. При Google 429 вернуть TTS_FREE_QUOTA_EXHAUSTED; никогда не переключаться на платный сервис. Если условия тарифа изменятся, выключить HH_VOICE_STUDIO_ENABLED.

## API и формат
GET /api/holistic-support/voice — публичный технический status, без секретов.
POST /api/holistic-support/voice — JSON:
- Образец: режим sample, voiceId mark, language ru. Фактический текст берётся с сервера; пользовательский текст **отвергается**.
- Короткий собственный текст: режим short_text, voiceId maya, language ru/en, text до 650 символов, consent=true. Доступен гостю с общим лимитом 3/IP/час + 60/день (совместно с affirmations), без передачи профилей.
- Персональная медитация из профиля: режим custom, voiceId maya, language en, текст фрагмента, consent=true. Требуется verified authenticated session; до 650 символов.
- Аффирмации: режим affirmations, language ru/en/es, text до 650 символов и consent=true; доступен гостю. Сервер принимает ограниченный по длине произвольный текст, а не только фразы из каталога. Отправка из UI требует явного согласия и нажатия кнопки генерации.
- Ответ audio/wav — настоящая RIFF/WAVE дорожка 24 kHz mono 16-bit, до 8 MiB. Cache-Control private/no-store. Никаких публичных URL персональных медитаций.
- Server-only x-goog-api-key; модель строго gemini-3.8-flash-lite-tts; modality AUDIO, allowlist шести голосов и metadata с медитативным стилем. Provider endpoint фиксирован.
- Durable Postgres rate: 12 образцов / IP / час, 8 персональных записей / verified user / час, 3 гостевых текстовых TTS-запроса (short_text и affirmations вместе) / IP / час и 60 таких запросов глобально / день, общий глобальный потолок 120 / час. 45-секундный upstream timeout, ограниченный размер тела и ответа, RIFF-проверка.
- Same-origin проверяется через существующий конфиг. Режим custom требует verified session; публичные режимы affirmations и short_text допускают ограниченный произвольный текст с consent=true. Текст и аудио не сохраняются в CRM/Supabase; счётчики лимитов используют существующую БД.

## Приватность
Google явно сообщает, что содержимое **бесплатного** API тарифа может использоваться для улучшения продуктов. Клиент выбирает публичный образец без личных данных или отправляет свой текст с отдельным **явным согласием**: для custom требуется вход в кабинет, для affirmations доступен гостевой режим. Не передавать профили, тесты, диагнозы и контакты автоматически. Редактор готовит лишь короткий речевой отрывок локально; клиент проверяет его перед отправкой. Необходимо пересмотреть policy privacy перед массовым коммерческим запуском.

## Сведение и выгрузка
После генерации получаем WAV без фоновой дорожки. Клиент может переключить «Море», «Дождь», «Ветер» и слушать авторский фон. Кнопка «Скачать с природным фоном» смешивает речь с first-party WAV из public/audio/mandala/ детерминированным PCM16 mono микшером в браузере, без OfflineAudioContext, приглушает фон до ~0.11, добавляет плавные переходы, экспортирует моно WAV. Фоновое аудио никогда не загружается в Google. До 180 секунд; пилот ограничен 650 символами. Таймкоды видео и длинные 20-минутные рендеры в этот release не входят.

## Release gate
- node --test tests/voice-studio.test.mjs
- npx tsc --noEmit, targeted ESLint, Next build и relevant existing mandala tests на точном HEAD.
- GitHub Actions release-ready и специализированные проверки без обхода безопасности; mobile DOM 320/390/430, iOS Safari playback, Blob URL, mixing, saving.
- После ключа — реальное Google API: 6 RU + 6 EN, WAV decode/playback, free quota отказ, signed-in custom consent.
- Merge только в **codex/public-book-library**; GitHub default — не production. Проверить Git SHA, Vercel READY и алиас holistichouse.vercel.app.
- Для проверки короткой генерации: откройте /ru/holistic-support/mandala#voice-studio, выберите «Образец», голос и нажмите «Создать голос по API». Проверьте WAV и скачивание. Для собственного текста войдите в кабинет и подтвердите согласие.
- Future: прослушивание и окончательное утверждение тембров, длинные сегментированные тексты с паузами, дашборд лимитов, приватный архив.

## Источники
- https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/api-key


## 30.10.2026: OpenRouter/xAI — независимый резерв генерации голоса

К существующему Gemini 3.8 Flash-Lite TTS добавлен второй TTS-транспорт: OpenRouter
`POST /api/v1/audio/speech`, модель `x-ai/grok-voice-tts-1.0`, строго
`response_format:pcm` (24 кГц, mono). API принимает только проверенный текст,
фиксированную модель и допустимые профили; результат конвертируется сервером в
RIFF/WAV для действующего плеера, смешивания с природой и реального экспорта видео.
Это именно **xAI через OpenRouter**, а не `openrouter/free` (текстовая модель).

**Резерв OFF по умолчанию**. Для включения нужны все флаги:
- `HH_VOICE_STUDIO_ENABLED=true`
- `HH_VOICE_STUDIO_OPENROUTER_ENABLED=true`
- `HH_VOICE_STUDIO_PAID_BACKUP_APPROVED=true`
- `HH_VOICE_STUDIO_OPENROUTER_API_KEY` (отдельный ключ с spend cap), либо
  `HH_VOICE_STUDIO_USE_EXISTING_OPENROUTER_KEY=true` и существующий серверный
  `HH_COUNCIL_OPENROUTER_API_KEY` (повторное использование только opt-in).

OpenRouter **платный**: xAI Grok Voice TTS около $15/M символов на дату проверки.
До 650 символов, максимум 20 резервных вызовов за скользящие 24 часа через
`consumeRate` => теоретический верхний бюджет около $0.20/день на текстовые
символы по текущему тарифу (при условии постоянства тарифа).
Гостям 3/IP/час и 60/day глобально по-прежнему, auth для персональной медитации,
origin/consent обязательны. Посетители не платят, скрытой оплаты нет.
Владелец дополнительно должен поставить финансовый лимит в OpenRouter.
При неготовности Gemini OpenRouter не вызывается без всех флагов.

`GET /api/holistic-support/voice` теперь даёт безопасный список
`providers.gemini` и `providers.openrouter`; WAV сообщает
`X-HH-Voice-Provider`, UI показывает факт использования резерва.
Тексты согласия обновлены на RU/EN/ES. У резервного xAI пять голосов,
поэтому два из шести HH-профилей пока используют один и тот же резервный тембр;
до акустической приёмки нельзя обещать полное совпадение с исходными шестью.

Cloudflare Workers AI MeloTTS — следующий возможный бесплатный резерв
(10 000 Neurons/сутки), но MP3 потребует безопасной декомпрессии/сведения,
а RU/EN/ES сначала требуют проверки. Сейчас Cloudflare **не подключён**.
Локальный Web Speech API остаётся нулевым по стоимости предпросмотром,
но не заменяет скачиваемый WAV.

**Проверки:** `node --test tests/voice-studio-openrouter.test.mjs
 tests/voice-studio-provider.test.mjs tests/voice-studio.test.mjs`,
Next TypeScript, eslint, сборка, реальный WebKit/Chromium Audio Export.
Без успешных production ключевых проб, security review и точного SHA Vercel
признак LIVE не заявлять.

Источники: https://openrouter.ai/docs/guides/overview/multimodal/tts ;
https://openrouter.ai/x-ai/grok-voice-tts-1.0 ;
https://developers.cloudflare.com/workers-ai/platform/pricing/ .


## 30.10.2026 · Новая БЕСПЛАТНАЯ TTS-ступень OpenRouter/Deepgram

OpenRouter предоставляет настоящий zero-cost TTS `deepgram/flux-tts:free`
(модель **не** `openrouter/free`, которая выбирает преимущественно текстовые модели).
Она ограничена бесплатной квотой OpenRouter и в текущей проверенной интеграции
**используется исключительно для английского языка**; RU/ES продолжают опираться
на бесплатный Gemini и, если отдельно разрешено, платный резерв.
Голоса Free по шести профилям: `flux-cliff-en`, `flux-miles-en`,
`flux-kit-en`, `flux-sienna-en`, `flux-haley-en`, `flux-hannah-en`.
Эти IDs опубликованы Deepgram; реальное присутствие в OpenRouter и качество
нужно проверить на настоящем вызове. Строго `response_format:pcm` и контроль
частоты 24000 Hz, mono, 16-bit; неизвестный формат не выдаётся в видеоплеер.

Флаги бесплатного резерва (все нужны):
- `HH_VOICE_STUDIO_ENABLED=true`
- `HH_VOICE_STUDIO_OPENROUTER_FREE_ENABLED=true`
- `HH_VOICE_STUDIO_OPENROUTER_FREE_TIER_CONFIRMED=true`
- серверный `HH_VOICE_STUDIO_OPENROUTER_FREE_API_KEY` либо существующий
  `HH_COUNCIL_OPENROUTER_API_KEY` с явным
  `HH_VOICE_STUDIO_USE_EXISTING_OPENROUTER_KEY=true`.

Очередь на бэкенде: Gemini (20 s) → OpenRouter Deepgram Flux :free (12 s, EN)
→ **только при особом отдельном платном одобрении** OpenRouter xAI (12 s).
Помимо гостевых лимитов, на бесплатный резерв отдельный потолок 30 запросов/
сутки, с учётом глобального лимита бесплатного OpenRouter аккаунта.
Платный xAI не активируется через флаг бесплатного режима и не вызывается
автоматически без `HH_VOICE_STUDIO_PAID_BACKUP_APPROVED=true`.

Обновлены UI-согласия RU/EN/ES: указывается Google, бесплатный Deepgram и
опциональный xAI, независимо от того, какая ступень сработала.
GET endpoint сообщает только готовность трёх путей без ключей. В заголовке
ответа `X-HH-Voice-Provider: openrouter-free` бесплатный путь отличим от
`gemini` и платного `openrouter`.

Дополнительно изучены бесплатные Fish Audio S2.1 Pro Free (RU/ES потенциально
подходит, но его ожидаемый MP3 нужно конвертировать в WAV и подтвердить
поддержку PCM до добавления в реальное видео), HeyGen Voice Turbo Free
(срок окончания 30 ноября 2026) и Cloudflare Workers AI MeloTTS
(обычно MP3); **ни один из этих трёх пока не включён как рабочий маршрут**.

Источник: https://openrouter.ai/deepgram/flux-tts:free ;
https://developers.deepgram.com/docs/flux-tts/voices ;
https://openrouter.ai/fish-audio/s2.1-pro-free:free ;
https://openrouter.ai/collections/free-models .
