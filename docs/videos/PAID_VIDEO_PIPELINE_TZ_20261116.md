# Holistic House · платная видеогенерация 30 секунд — техническое задание
**Редакция:** 2026-11-16 · **Канонический продукт:** `andylitvinov-design/books`, production branch `codex/public-book-library` · **Интерфейсы:** `/{ru,en,es}/holistic-support/mandala`, `/admin/videos`.

> Статусы не смешивать: `CODE` ≠ `MERGED` ≠ `LIVE` ≠ `PROVIDER_READY` ≠ `CUSTOMER_FULFILLED`. Никаких новых оплачиваемых ресурсов и реальных рендеров в рамках разработки этого ТЗ. Обычный Vercel production release — только существующий почасовой protected publisher.

## 1. Цель и недопустимые сокращения
Один Video Studio, одна понятная цепочка: **намерение → 30-секундный сценарий → утверждённая раскадровка → право на источники → серверная смета → верифицированная оплата и лимит → задачи сцен → техническая и визуальная QA → монтаж/озвучка → личное хранилище → выдача**.

Не выдавать монтаж из существующих клипов за новое text-to-video. Не заменять приватный Andrey HeyGen Digital Twin стоковым аватаром. Не публиковать клиентское видео на обычном YouTube. Не передавать приватные обращения, фото, тесты, отчёты, идентификаторы клиентов и медицинские данные в запросы к внешним моделям. Личное фото монтируется на доверенном контуре только с согласия. Никаких диагнозов, назначений, обещаний лечения или денежных результатов.

## 2. Верифицированный baseline и реиспользование
| Узел | Код/PR | Фактический статус и действие |
| --- | --- | --- |
| Локальный Canvas/WebCodecs/MediaRecorder | `components/mandala-free-video-studio.tsx`, merged #3659, #4700 | Оставить единственным клиентским редактором и экспортом для free/hybrid |
| Прайс/корзина | `lib/commerce/cart.js`, merged #3971 | Extra €3/PRO €5 — фиксированные SKU; PayPal.Me требует ручной верификации; на redirect нельзя ставить paid |
| Проверка возможностей/платного допуска | `lib/mandala/cinematic-production.mjs` | Чистый fail-closed контракт; не сохранённые счета или реально выполняющийся router |
| Veo Lite | `lib/veo-video.mjs`, `app/admin/videos/veo-actions.js`, merged #3952 | Серверный админ-пилот 1080p, без звука, только 4/6/8 с; production credentials/flags не подтверждены |
| Kling | `lib/kling-video.mjs`, `/admin/videos`, merged #2258/#2615 | Owner-only адаптер; платный флаг отсутствует |
| HeyGen Video 1 | draft #2625 | Не мержить старую ветку целиком. Извлечь только совместимые server adapters с современными security/quality checks |
| Сценарии | open #4696 | Интегрировать после protected merge; не дублировать его Story/Concept UI |
| Приватная доставка | open #4556, existing `/{locale}/app/videos` | Reuse private signed MP4; дождаться CSP+RLS+реального iPhone readback |
| Финансовый ledger | open #2634; obsolete #2631/#2705 | Не смешивать CAD и EUR; подтвердить точные квитанции, комиссии, refunds и способ конвертации |
| Публикация | ai-projects-brain #218/#219 | Отдельное разрешение на публичную публикацию; Drive master, затем YouTube/Metricool и сайт |

## 3. Продукт и финансовая модель
* Standard: существующий локальный фильм, в рамках бесплатных или включённых видео-кредитов. Не внешний AI API.
* Extra €3: проектный 30с гибрид с **одной** новой 6с сценой и 24с правомерно доступного медиа. Цена внешнего Veo Lite ориентировочно **$0.30** без повторов и накладных расходов.
* PRO €5: 30с гибрид с **двумя** новыми 6с сценами и 18с собственной библиотеки. Ориентировочная внешняя стоимость **$0.60**.
* PRO «все сцены AI»: 5×6с Veo Lite, ориентир **$1.50**. Это сравнительный расчёт, **не включённая в €5 обязанность исполнения** до проверки затрат на пересоздания, аудио, хранение, комиссии, налоги, валютный курс и маржу.
* Сервисные пределы внешних затрат для ранних опытных заказов: Extra до $0.80 и PRO до $2.00 **на принятый фильм**, при условии успешной QA. Это бюджетные цели, не разрешение на расход. Курс EUR/USD брать из подтверждённого источника и фиксировать при оформлении, не угадывать.

Цена за одну попытку не равна цене принятого фильма: `cost_per_accepted = (provider_spend + retries + postproduction + storage + transaction_fees) / accepted_count`. Для каждого модели/сцены фиксировать допуски, исполнение, сбои, реальный дебет и коды отказов. Прайсы сторонних моделей переобновлять по реальному аккаунту перед каждым запуском, не держать как вечные константы. Использовать один беспристрастный тестовый набор сюжетов и 1080p source quality; 720p upscale маркировать явно.

## 4. Поставка по этапам: точные задачи
### P0.A — Серверные предварительные расчёты (начато в этом PR)
Добавить `lib/mandala/paid-video-budget.mjs`: 30с Extra/PRO, 16:9/9:16, упорядоченные AI durations 4/6/8 с, остальные секунды — лицензированная библиотека, единый Veo rate из `lib/veo-video.mjs`, исходный EUR SKU из `lib/commerce/cart.js`. Reject extra/prompt/client inputs и никогда не устанавливать `canSubmit=true`. Добавить owner-only read-only action и UI в **существующий** `components/veo-scene-studio.tsx`. Никаких API-ключей, новых провайдеров, платежей, очередей и запросов с персональными данными.

### P0.B — Настоящий pricing/entitlement backend (следующий PR)
Создать серверный `VideoPriceQuote`: `quoteId`, `providerId`, `modelVersion`, `pricingVersion`, `locale`, `aspect`, `sceneDurations`, `providerCurrency`, `providerCostMinor`, `customerCurrency`, `customerPriceMinor`, `maxSpendMinor`, `expiresAt`, server signature/record revision, `noExternalClientData`. Клиент не передаёт стоимость и валидность. Отдельные `preview_quote` (бесплатный план) и `verified_quote` (аккаунтный check перед submit). Запросы на стоимость не должны инициировать генерацию или покупку. Сопоставлять валюту по внешнему проверяемому тарифу; запрет смешанных EUR/USD/CAD без зафиксированного курса и комиссии.

### P0.C — Private Postgres jobs / платежи (следующий PR)
Добавить **в существующий** Supabase `app_private`, только после review SQL/RLS:
`video_orders` (account, immutable SKU, amount/currency, verified payment receipt, quote revision, state);
`video_scene_jobs` (order/shot identity, provider/external_task_id, cost ceiling, creation nonce, claim lease, state, attempt index);
`video_scene_assets` (provider task reference, protected storage key, SHA-256, rights, QA);
`video_usage_ledger` (append-only authorized hold/charged/refunded, cost and source).
Unique(account, client_operation_uuid), unique(order, scene_sequence, approved_attempt), unique(provider, external_task_id) с CAS/row locks. Для неизвестного результата provider POST — `submission_unknown`, **не** повторять POST до provider readback. Подтверждение PayPal.Me вручную через владельца; ни redirect, ни screenshot, ни письмо клиента не переводят `paid=true`. Опция автоматической оплаты — только через реально утверждённого merchant и проверяемые подписанные webhooks.

### P1.A — Provider API adapters
Сохранять Kling 2.5/3 и Veo 3.1 Lite. Добавить совместимый HeyGen Video 1 и один выбранный резерв (Runway/LTX) как отдельные server-only адаптеры: `capabilities`, `quote`, `submitOnce`, `reconcile`, `fetchAsset`, `normalizeError`. Не передавать в провайдер частные данные/фото. Нарезка 30 сек. по поддерживаемым 4/6/8/10/15с вызовам, не фиктивная единая 30с модель. Каждое подключение: контрактный unit test, один авторизованный **микротест** после явного согласия на расходы, readback credits и source MP4. Keep paid flags OFF до отдельной приёмки.

### P1.B — Media assembly и приватная доставка
Для каждого кадра хранить shot id, semantic/action tags, duration, format, camera/motion, style bible, licensed source URI, provider model/job, checksum. Запрет повторения одинакового исходного видео и сходных временных отрезков. После получения каждого MP4 — ffprobe длительность, fps, resolution, aspect, codec; visual real-motion check и face/head/hand continuity. Собрать один 30s master через проверенную FFmpeg pipeline (локальный скрипт `scripts/cinematic-video-assemble.mjs` только для owner/offline; для server jobs — отдельный безопасный воркер вне Vercel request lifetime). Голос, музыка, timestamps для key phrases, отдельные captions; на 320–430px проверить читаемость. Только затем импорт в уже разрешённую private Supabase/R2 архитектуру; сохранить SHA-256, expiry read URL и RLS проверки двух аккаунтов.

### P2 — Выпуск и A/B benchmark
10 нейтральных 30с сценариев × поддерживаемые форматы × 3 модели, после утверждённого общего лимита расходов. Оценивать: 30% соответствие сюжету, 25% движение, 15% continuity, 20% фактическая стоимость принятого ролика, 10% скорость/надёжность. Считать `accepted` только после реального аудио-визуального и мобильного QA. Сравнение проводить на одинаковом brief и повторяемых source constraints; статистику записывать в owner отчёт. Готовность клиентского платного видео: подтверждённая цена + заказ/receipt + job ledger + actual bytes + QA + private link + browser playback.

## 5. API и переходы
`draft → planned → quoted → payment_pending → payment_verified → approved → submitting → submitted/submit_unknown → ready → qa_passed → delivered`.
`failed`/ `cancelled` отдельно с ручным разрешением повторных расходов. Важно: `submit_unknown` не означает failed; сохранить ключ операции, сверить с provider и лишь затем принимать решение.
Пути: `GET /api/app/video-pricing` read-only, `POST /api/app/video-orders`, `POST /api/app/video-orders/:id/approve`, `POST /api/admin/video-jobs/:id/submit`, `GET /api/app/video-orders/:id/status`, `POST /api/admin/video-jobs/:id/accept`, `GET /api/app/videos/:id/play` — имена финализировать по действующей App Router конвенции и существующему RLS/хранилищу, **не добавлять параллельный второй редактор**.

## 6. Тесты и критерии приёмки
1. Pure quote: 6s Extra ($0.30), 12s PRO ($0.60), 30s full comparison ($1.50), цены SKU из действующей корзины; 16:9/9:16; no client prompt transfer.
2. Public/guest, IDOR, credential, PII, tampered request, invalid price, signature/expiry, quote race and FX mismatch — fail closed.
3. Двойной click / lost response / timeout provider: одна оплачиваемая задача на уникальную approved attempt; status read-only и восстановление после reload.
4. Failed/rejected content: корректная ревизия hold/refund и сохранённая история без повторных списаний.
5. Проверенные 30.0s ± допустимый codec drift, реальное движение, без повторов, с лицензиями, captions/audio, не WebM под видом MP4; приватный MP4 playable iPhone.
6. Одна чужая сессия не видит чужую запись/URL/медданные; частные видео не попадают в Sitemap/YouTube. Для public — отдельная публикация с согласием и архивом в Drive.
7. Реальные проверенные exact-HEAD Core + Specialist + Guard + protected merge. LIVE: серверный SHA и канонический Vercel alias, затем отдельный acceptance в браузере. Не запускать второй Production deploy, использовать только текущий hourly publisher.

## 7. Необходимые внешние условия (не автоматизировать за владельца)
* Авторизованные отдельные Google Cloud Vertex project/IAM/private GCS, действительная цена и quota, готовые server-only env names `HH_VEO_GCP_PROJECT_ID`, `HH_VEO_GCS_OUTPUT_URI`, `HH_VEO_SERVICE_ACCOUNT_JSON`, `HH_VEO_PAID_ENABLED`.
* Для Kling: `KLING_API_KEY`, `HH_KLING_PAID_GENERATION_ENABLED`; для HeyGen — verified eligible direct API account, Andrey Digital Twin/voice/look IDs, rights and private master.
* Настоящие merchant/receipt права; проверить, доступны ли business webhooks / подтверждённая выписка. До этого — ручная проверка и никакого обещания автоисполнения.
* Реальный короткий approved paid render (сперва один), запись actual bill, motion/voice/mobile QA и разрешение на масштабирование.

**Важный статус текущего PR:** добавлены лишь безопасный owner-only бюджетный план и тесты; он не подтверждает, что работающие платные генераторы/платежи уже выпущены или что 30с film master собран.


## 2026-11-17 · Video Paid Orders v1 — additional feature-gated implementation

The new follow-up reuses `app_private.video_generation_jobs` for actual Veo shots and adds a parent `app_private.video_paid_orders_v1` with a fixed EUR customer SKU, immutable operation ID, unique verified PayPal receipt hash, account-scoped RLS, explicit owner-only moderator updates and status proof. Legacy HeyGen code-based jobs and prices stay readable. Extra €3 is one new 6-second 1080p silent shot with 24 seconds existing licensed footage, PRO €5 is two new shots and 18 seconds existing footage. Every provider task is recorded in PostgreSQL as `submitting` BEFORE a paid POST and never POSTed again after an uncertain result. Exactly one shot per `(paid_order_id,shot_index)` unique index.

Customer order: one on-demand button in existing `VideoCartPayment`, authenticated + same-origin + explicit consent; no payment capture, no external prompts or generation. Owner review and model control: `/admin/videos` + `/api/admin/videos/paid-orders`, manual verified receipt, scoped owner-only job approval ($0.30/scene), read-only provider reconciliation, separate QA and verified private 30s MP4 delivery. With flags OFF the public page remains on the previously approved PayPal.Me manual flow and no extra purchase occurs.

**New flags OFF by default:** `HH_VIDEO_PAID_ORDERS_SCHEMA_APPROVED`, `HH_VIDEO_PAID_ORDERS_ENABLED`, `HH_VIDEO_PAID_MANUAL_REVIEW_ENABLED`, `HH_VIDEO_PAID_PROVIDER_ENABLED`; existing `HH_VEO_PAID_ENABLED`, `HH_VEO_GCP_PROJECT_ID`, `HH_VEO_GCS_OUTPUT_URI`, `HH_VEO_SERVICE_ACCOUNT_JSON`; plus manually verified `HH_VIDEO_VEO_USD_CENTS_PER_SECOND=5`, `HH_VIDEO_VEO_RATE_VERIFIED_UNTIL` no more than 7 days in the future. User/customer prices remain fixed EUR, external cost estimation in USD. Never infer an actual receipt from PayPal redirect/screenshots and never expose client prompts to Veo. Private asset status is not `delivered` until actual verified account-owned `personal_videos` MP4, QA manifest, source verification and owner approval. Rollout must include additive SQL review, Postgres RLS, exact-head CI, one authorized no-client micro-render, iPhone QA and fixed-budget performance acceptance. **The new code alone does not perform autonomous FFmpeg assembly, payment verification or production generation.**
