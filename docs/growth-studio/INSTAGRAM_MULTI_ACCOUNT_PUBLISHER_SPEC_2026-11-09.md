# Техническое задание: Multi-account Instagram Publisher для Holistic House Growth Studio

**Версия:** 1.0  
**Дата:** 9 ноября 2026  
**Репозиторий:** `andylitvinov-design/books`  
**Целевая ветка:** `codex/public-book-library`  
**Канонический интерфейс:** `/admin/growth-studio`  
**Связанная задача:** [#1214 — HH Growth Studio / Publer+](https://github.com/andylitvinov-design/books/issues/1214)  
**Текущий account-registry PR:** [#3997](https://github.com/andylitvinov-design/books/pull/3997)

---

## 0. Owner decision superseding earlier account lists — 9 November 2026

The active Instagram destinations are exactly:
- Work: `@wizards.secrets` (`wizards_secrets`)
- Personal professional: `@andy.therapist` (`andy_therapist`)

The earlier `@my.coach.ai` and `@my.couch.ai` destinations are retired from the active allowlist. Older four-account references elsewhere in historical implementation notes are superseded by this owner decision. Do not authorize, select or publish to the retired targets through the active Growth Studio UI. Existing encrypted records for old target IDs are not migrated or silently reassigned.

## 1. Цель

Довести существующий Holistic House Growth Studio до полноценного многопрофильного Publisher, который позволяет готовить, согласовывать, планировать, публиковать и проверять контент отдельно для нескольких Instagram-аккаунтов.

Это расширение существующего Growth Studio. **Нельзя создавать второй Publisher, отдельный несвязанный календарь или новую систему хранения контента.** Нужно переиспользовать текущие редактор, Redis-хранилище, owner-auth, календарь, media preflight, UTM, историю, CSV и dry-run queue, последовательно переводя их на реальные провайдерские операции.

### 1.1. Целевые Instagram-аккаунты

| Внутренний ключ | Instagram handle | Бренд/назначение | Стартовый статус |
|---|---|---|---|
| `wizards_secrets` | `@wizards.secrets` | Wizards Secrets · work / entertainment | `pending_authorization` |
| `andy_therapist` | `@andy.therapist` | Andy Therapist · personal professional | `pending_authorization` |

Утверждённая владельцем активная конфигурация — ровно два профиля: рабочий `@wizards.secrets` и личный профессиональный `@andy.therapist`. Прежние `@my.coach.ai` и `@my.couch.ai` не являются активными destinations. Два утверждённых профиля должны оставаться самостоятельными сущностями с отдельными provider ID, полномочиями, настройками, расписанием, публикациями, ошибками и аналитикой.

**Важно:** регистрация handle в коде не доказывает существование аккаунта, владение им или наличие разрешения на публикацию. Фактическая идентичность устанавливается только после авторизации и readback от Meta/провайдера.

### 1.2. Связь с бизнес-брендами сайта

Не смешивать:
- **Brand / Workspace** — Holistic House, TorontoTantra, PsiTrends и другие контентные проекты сайта;
- **Social Account** — конкретный Instagram-профиль;
- **Channel Variant** — версия конкретной публикации для конкретной соцсети и аккаунта.

Связь Social Account с Brand должна быть явной и редактируемой владельцем. Один бренд может иметь несколько социальных аккаунтов; один аккаунт по умолчанию принадлежит одному основному бренду. Разрешать дополнительную связь только явно, с проверкой прав и без автоматического копирования приватных данных.

---

## 2. Текущее проверенное состояние и границы

На момент подготовки ТЗ:

### Уже реализовано в существующем Growth Studio
- Owner-only интерфейс `/admin/growth-studio` и существующая авторизация.
- Три контентных бренда: Holistic House, TorontoTantra, PsiTrends.
- Редактор публикаций, EN/RU/ES, статусы draft/approved/manual plan/archive.
- Предварительная проверка URL, UTM, текста, медиа и ограничений отдельных каналов.
- Redis-хранилище редакторских записей с revision/CAS и fail-closed поведением.
- Ручной календарь по America/Toronto, inbox задач публикации, ICS.
- CSV import/export, массовая подготовка черновиков, импорт метаданных публичной страницы в черновик.
- Подготовка evergreen-повторов в виде новых черновиков, требующих отдельного согласования.
- Provider readiness panel с честным разделением manual / external / configured-unverified.
- Redis dry-run queue: атомарные проверки согласования/версии, идемпотентность, lease/reclaim, cancel. Эта очередь пока моделирует исполнение и **не публикует в соцсети**.

### Текущие внешние подключения
Последний readback Metricool показал один бренд ID `7153286`, timezone `America/Toronto`, с YouTube only. Instagram/Facebook в этом readback отсутствуют. Подключение Metricool в ChatGPT само по себе не является credential для сайта/Vercel.

### В работе, но ещё не LIVE
PR #3997 зарегистрировал первые два Instagram destinations, PR #4003 добавил официальный Meta Facebook Login OAuth и зашифрованное серверное хранение, а PR #4006 добавил выбор destination в composer и owner-confirmed JPEG Feed Post adapter. Production-код поддерживает account-aware drafts и ручной запуск одного уже одобренного JPEG-поста. Актуальная конфигурация владельца заменяет прежнюю пару My Coach/My Couch на два профиля: `@wizards.secrets` и `@andy.therapist`. Оба остаются `pending_authorization` без provider ID и с выключенной публикацией до отдельного Meta identity/Page/permission readback. Автоматический schedule worker не подключён; dry-run queue не отправляет публикации.

**Все статусы этого документа следует пересматривать по актуальному readback перед началом каждого этапа.**

---

## 3. Продуктовые требования

### 3.1. Управление аккаунтами

В Growth Studio добавить в существующий раздел Connections/Accounts полноценный список аккаунтов.

Для каждого аккаунта показывать:
- понятное название и @handle;
- платформу;
- связанный бизнес-бренд;
- профиль Meta / Facebook Page, если он необходим выбранному способу публикации;
- transport: Meta Direct API / Metricool Bridge / Manual;
- connection state;
- список доступных разрешений без раскрытия токенов;
- время последней успешной проверки;
- срок действия/необходимость обновления авторизации, если провайдер предоставляет эти данные;
- последнюю ошибку и безопасное следующее действие.

Доступные действия:
- Connect / Authorize;
- Recheck connection;
- Reauthorize;
- Disconnect / Revoke;
- Change primary brand;
- Pause account publishing;
- View account publication history.

Секреты, access token, refresh token, app secret, authorization code и полные чувствительные provider payloads нельзя отдавать в браузер, UI, GitHub issues, логи или ChatGPT. UI показывает только минимальный статус и маскированные данные.

Состояния аккаунта:
- `pending_authorization` — аккаунт заведён, авторизация не выполнена;
- `authorization_in_progress`;
- `connected_unverified` — credentials получены, права/identity ещё не подтверждены;
- `connected` — провайдер подтвердил идентичность и требуемые разрешения;
- `reauthorization_required` — токен отозван/истёк/недостаточен;
- `permission_limited` — подключён, но нужной функции публикации нет;
- `paused` — владелец остановил отправку;
- `disconnected`;
- `error` — техническая ошибка с безопасным кодом.

Аккаунт нельзя считать connected, пока не выполнены provider identity readback и минимальная permission check.

### 3.2. Мультиаккаунтность в редакторе

При создании/редактировании публикации:
- выбор бизнес-бренда;
- выбор одной или нескольких целевых соцсетей;
- выбор одного или нескольких конкретных аккаунтов;
- выбор языка/локали;
- уникальная версия текста, CTA, ссылки, hashtag-набора и alt text для каждой пары account + network;
- отдельный media asset или crop/format, когда форматы отличаются;
- выбор типа Instagram-публикации: Feed Photo / Carousel / Reel / Story — только если выбранный transport и API действительно поддерживают формат;
- отдельный preview для каждого выбранного аккаунта;
- явное отображение неподдерживаемых форматов и причин блокировки.

Режимы:
1. **Один аккаунт:** обычная публикация в один профиль.
2. **Несколько аккаунтов:** один общий исходный материал порождает отдельные Channel Variants и независимые jobs для каждого выбранного аккаунта.
3. **Кросс-постинг:** допустим только после независимой проверки каждого аккаунта/формата. Успех на одном аккаунте не означает успех на другом.

Нельзя молча переключать аккаунт, если выбранный недоступен. До планирования показать точное предупреждение и требовать выбора другого профиля или перевода задачи в manual handoff.

### 3.3. Планирование и календарь

Оставить единый календарь Growth Studio, расширить фильтры:
- бренд;
- сеть;
- социальный аккаунт;
- язык;
- тип публикации;
- статус;
- дата/временной диапазон.

У каждой публикации — независимое расписание по каждому аккаунту. Групповой календарный объект может связывать несколько jobs, но не должен объединять их состояние.

Правила времени:
- основной timezone: `America/Toronto`;
- сохранять timestamp в UTC и IANA timezone/локальное намерение;
- отображать время пользователя в Toronto;
- корректно обрабатывать EST/EDT и неоднозначные/несуществующие часы перехода DST;
- при изменении даты после approval — инвалидировать approval и требовать нового подтверждения.

Публикацию можно планировать только если:
- аккаунт `connected`;
- формат/медиа поддерживаются;
- текст и ссылка прошли preflight;
- утверждена точная версия контента;
- разрешены целевой бренд и account;
- provider transport готов;
- job прошёл server-side authorization gate.

### 3.4. Подготовка контента и медиа

Переиспользовать текущие source picker и media preflight. Дополнить:
- формат/ориентация/длительность видео;
- разрешение, соотношение сторон, размер файла;
- MIME и реальное содержимое файла (не только расширение);
- длительность, codec, frame rate для видео;
- требования конкретного типа Instagram-поста и текущего API;
- обложка/thumbnail, где допустимо;
- alt text / доступность;
- caption length и platform-specific fields;
- проверка публичной и стабильной доступности медиа для Meta;
- отсутствие временных URL, ссылки на закрытый Drive и приватные файлы клиента.

Для видео и фото нужен единый media asset с производными форматами, но оригинал не изменять. Сохранять provenance, права использования, source URL, hash, размер и тип. Преобразование файла выполнять только существующей/одобренной инфраструктурой и без нового платного сервиса без согласования.

Не допускать автоматического размещения приватных клиентских данных, результатов тестов, консультационных материалов и медицинской информации. Публичный маркетинговый контент должен идти только из утверждённых публичных источников.

### 3.5. Предварительное согласование и approval

Approval относится к точной версии:
- аккаунт назначения;
- caption/текст;
- media asset + media hash;
- тип публикации;
- public URL/UTM;
- время;
- язык;
- brand;
- provider-specific settings.

Любое существенное изменение этих полей после согласования сбрасывает approval и возвращает материал в draft/review. Изменение только порядка отображения не должно сбрасывать approval.

Для массового согласования UI показывает все выбранные аккаунты/варианты. Владелец должен видеть список точных destinations до подтверждения.

Публичная публикация в Instagram требует явного owner approval на конкретный контент и destinations. Этот документ разрешает разработку и тестирование, но **не разрешает массовую/автоматическую публичную отправку непроверенного контента**.

---

## 4. Интеграция и авторизация провайдеров

### 4.1. Поддерживаемые способы публикации

Реализовать provider-agnostic интерфейс с capability matrix:

1. **Meta Direct API** — при наличии официального приложения, разрешённых scopes, нужных ролей и пройденного Meta review, когда он требуется для intended use.
2. **Metricool Bridge** — только при наличии поддерживаемого официального API, подходящего тарифного entitlement и server-side credentials. Текущий ChatGPT Metricool connection не переносится автоматически в Vercel.
3. **Manual handoff** — fallback: готовый пост, медиа, ссылка на аккаунт/официальный инструмент и отметка о ручном выполнении без ложного статуса Published.

Не использовать password scraping, приватные/внутренние endpoints, недокументированные GraphQL API, эмуляцию браузера для обхода ограничений, хранение паролей Instagram или автоматизацию, запрещённую платформой.

### 4.2. Meta OAuth

Требования:
- OAuth flow через официальный Meta login/authorization;
- привязка к Facebook Page и профессиональному Instagram account (Creator/Business), когда это требуется выбранной схемой;
- проверка, что авторизованный владелец имеет соответствующие полномочия;
- получение и проверка provider-side Instagram account ID;
- минимально необходимые разрешения;
- state/nonce, CSRF защита, строгие redirect URI и allowlist;
- безопасное хранение access/refresh tokens на сервере в зашифрованном виде;
- refresh/revocation/error management;
- повторная авторизация без потери истории/постов;
- отключение аккаунта отзывает возможность новых jobs и безопасно обрабатывает уже запланированные jobs.

Не запрашивать у владельца пароль Instagram в Holistic House и не просить отправлять коды/токены в чат.

### 4.3. Комиссионирование двух утверждённых аккаунтов

Для `@my.coach.ai`, `@my.couch.ai`, `@wizards.secrets` и `@andy.therapist` выполнить отдельно:
1. Проверить существование точного handle и профессионального типа аккаунта.
2. Авторизовать владельца через Meta/одобренный transport.
3. Прочитать provider account ID и привязанный Page.
4. Сверить account handle и дать владельцу визуально подтвердить его.
5. Проверить нужные scopes и publish capability.
6. Проверить доступность медиа и требуемого формата.
7. Записать connection proof timestamp и безопасный статус.
8. Оставить публикацию выключенной до теста и последующего разрешённого включения.

Нельзя подставлять provider ID из другого аккаунта, автоматически связывать аккаунт по похожему названию или считать совпадение handle достаточным доказательством.

### 4.4. Стоимость

- Сначала исследовать возможность официального Meta Direct API без дополнительной подписки.
- Metricool API использовать только если текущий тариф действительно включает нужные возможности и владелец согласовал стоимость.
- Не менять Publer, Metricool, Vercel или другие тарифы.
- Не добавлять платный worker/cron/storage/media processor.
- В PR описывать каждый новый потенциально платный компонент и free/paid entitlement.
- Любой новый платёж, upgrade, credit purchase или рекламный бюджет требует отдельного согласования.

---

## 5. Реальная очередь и исполнитель публикаций

### 5.1. Архитектура

Переиспользовать существующий Redis и dry-run queue из PR #2711. Не создавать второй job store. Разделить:
- content source;
- channel variant;
- schedule occurrence;
- provider delivery job;
- provider receipt.

Каждая цель публикации — отдельная job. Один исходный пост, выбранный для нескольких профилей, создаёт отдельную независимую job для каждого профиля.

Пример ключа идемпотентности:
`contentId + revision + provider + accountId + scheduledOccurrence`.

### 5.2. Статусы job

- `draft`
- `approved`
- `scheduled`
- `queued`
- `leased`
- `preflight`
- `publishing`
- `provider_processing`
- `published` — только после readback подтверждённого provider ID/URL/status;
- `failed_retryable`
- `failed_permanent`
- `reauthorization_required`
- `unsupported_manual`
- `delivery_unknown` — запрос мог завершиться, но ответ потерян/неясен;
- `cancelled`.

`manual_done` — отдельная отметка владельца, не равная provider-confirmed `published`.

### 5.3. Исполнение

Worker должен:
- запускаться автоматически по due jobs на существующей разрешённой инфраструктуре;
- иметь bounded concurrency и provider rate limits;
- забирать job атомарной lease операцией;
- повторно проверять approval revision, account state, media fingerprint и scheduled time непосредственно перед внешним запросом;
- не отправлять job, если аккаунт отключён, изменён или permission limited;
- сохранять точный provider request correlation ID, provider media ID и receipt;
- поддерживать cancel до точки невозврата;
- применять backoff только к однозначно retryable ошибкам;
- иметь dead-letter/manual recovery и журнал действий;
- обрабатывать остановку/restart worker без потери jobs.

### 5.4. Защита от дублей и неизвестного результата

Запрещён blind retry после неоднозначного network timeout на запросе создания публикации.

При `delivery_unknown`:
1. Не повторять create/publish запрос.
2. Сделать только безопасный provider read/list lookup в пределах доступного account scope.
3. Сопоставить с сохранённым request correlation/idempotency metadata, timestamp, account и content fingerprint.
4. Если найден точный пост — сохранить receipt и завершить как published.
5. Если достоверно доказано отсутствие поста — вернуть job на retry после повторной проверки approval.
6. Если провайдер не позволяет доказать исход — оставить `delivery_unknown` и показать владельцу ручную проверку.

---

## 6. Provider receipts и статус публикации

Для каждой успешной публикации сохранять:
- provider name;
- provider account ID (внутренний reference);
- provider media/post ID;
- canonical public URL, если доступна;
- provider status;
- created/published timestamp;
- media hash и content revision;
- last readback timestamp;
- request/correlation ID;
- безопасные диагностические коды.

Публикация не считается успешной на основании:
- HTTP 200 без разбора результата;
- ответа о создании container без финального publish;
- ответа worker;
- изменения локального статуса;
- отправки в Metricool/Meta без последующего readback.

Для Reels/контейнерных API учитывать промежуточные provider states и проверять их до финального статуса.

---

## 7. Аналитика и атрибуция

### 7.1. Метрики по аккаунтам

Если выбранный официальный API и права дают доступ, собирать:
- reach;
- impressions/views;
- plays/video views;
- likes;
- comments;
- shares/saves;
- profile actions/link clicks — только где доступны и корректно определены;
- период и время снимка.

Не подменять отсутствующие метрики нулём. Использовать:
- `measured`;
- `not_available`;
- `not_authorized`;
- `not_measured`.

Не запрашивать лишние audience/person-level данные.

### 7.2. Связь с бизнес-результатом

Переиспользовать существующий first-party attribution/CRM контур и issue #988. Различать:
1. опубликованный пост;
2. переход по ссылке;
3. добровольный handoff в мессенджер;
4. полученное обращение;
5. подтверждённая запись;
6. оплаченный заказ/доход.

Клик не является заявкой, заявка не является оплатой. Не включать публичную аналитику/пиксели и не отправлять client-cabinet/test/health data в Meta или рекламные аудитории. Сохранять действующие consent/privacy holds.

---

## 8. UX / интерфейс

Все изменения — в существующем Growth Studio, с RU/EN/ES локализацией. Основной мобильный сценарий должен быть удобен на iPhone 320–430 px.

### 8.1. Connections / Accounts
- короткая сводка: connected / needs authorization / paused / error;
- две отдельные карточки указанных Instagram-профилей;
- понятное действие Connect/Retry/Disconnect;
- отдельная привязка профиля к сайту-бренду;
- никаких токенов или длинных provider payloads.

### 8.2. Composer
- account selector сразу виден в расширенных параметрах;
- быстрый выбор одного/нескольких аккаунтов;
- чёткое различие общего draft и account-specific variant;
- preview по каждому аккаунту;
- раздельные ошибки и readiness;
- до подтверждения отображать destinations, дату, timezone и тип публикации.

### 8.3. Calendar / Queue
- фильтр/группировка по аккаунту;
- в одной кампании виден результат каждого destination отдельно;
- быстрое изменение времени с повторной проверкой конфликта и approval;
- карточка задачи показывает текущий provider status, а не только локальный status.

### 8.4. History / Analytics
- отдельная вкладка/фильтр истории по аккаунту;
- provider post URL;
- ошибки и retry timeline;
- метрики с датой получения и происхождением.

---

## 9. Безопасность, приватность и аудит

Обязательные требования:
- owner-only доступ к настройке аккаунтов, credentials и публикациям;
- server-side authorization на каждой read/write action;
- RLS/namespace scoping по owner/workspace, где применимо;
- encrypted tokens, key rotation и revoke;
- redact токены, коды, Page IDs и private provider payloads из логов;
- проверка origin/redirect, CSRF и account allowlist;
- allowlist public media/source URL; защита от SSRF и redirects на private IP;
- отсутствие клиентских тестов, медицинских данных, заметок консультанта и private media в контентной базе;
- immutable audit trail для connect/disconnect, approval, schedule, publish, cancel, retry и manual override;
- все изменения approval revision должны быть traceable;
- минимальные права и минимальное хранение данных;
- synthetic test data в CI, никаких реальных клиентских данных.

Ни одна из новых функций не должна ослаблять существующие auth, privacy, consent, queue и production release gates.

---

## 10. Техническая модель данных

Адаптировать к существующим Redis/DB схемам и не создавать параллельный источник истины. Предлагаемые сущности/логические поля:

### SocialAccount
- `id` (stable internal ID);
- `platform`;
- `handle`;
- `displayName`;
- `brandId`;
- `provider`;
- `providerAccountId`;
- `providerPageId` (если применимо, server-side/minimized);
- `connectionState`;
- `capabilities[]`;
- `tokenReference` (reference only, not token value);
- `lastVerifiedAt`;
- `publishingEnabled`;
- `createdAt/updatedAt`.

### OAuthConnection
- `id`;
- `provider`;
- `ownerId`;
- `encryptedCredentialReference`;
- `scopeSet`;
- `expiresAt`;
- `revokedAt`;
- `status`.

### ChannelVariant
- `contentId`;
- `revision`;
- `socialAccountId`;
- `locale`;
- `caption`;
- `mediaAssetId`;
- `mediaType`;
- `altText`;
- `permalink/CTA`;
- `approvalRevision`;
- `approvalStatus`.

### PublishJob
- `id`;
- `contentId`;
- `contentRevision`;
- `variantId`;
- `socialAccountId`;
- `provider`;
- `scheduledAtUtc`;
- `timezone`;
- `status`;
- `idempotencyKey`;
- `attemptCount`;
- `leaseUntil`;
- `lastErrorCode`;
- `createdAt/updatedAt`.

### PlatformPost / ProviderReceipt
- `jobId`;
- `providerPostId`;
- `permalink`;
- `providerStatus`;
- `publishedAt`;
- `readbackAt`;
- `providerCorrelationId`.

### PerformanceSnapshot
- `socialAccountId`;
- `providerPostId`;
- `metricName/value`;
- `periodStart/periodEnd`;
- `capturedAt`;
- `measurementState`.

Уникальные ограничения:
- один provider account ID не может быть привязан к двум внутренним аккаунтам одного owner без явного разрешённого multi-brand mapping;
- одна job уникальна по content revision + account + occurrence;
- одна provider receipt привязана к одной конкретной job;
- нельзя автоматически перелинковать provider ID на другой internal account.

---

## 11. Этапы реализации

### Этап 0 — baseline / account commissioning
- Принять/довести PR #3997 через актуальные проверки.
- Повторно проверить production source SHA и Growth Studio status.
- Подтвердить все четыре handles, владельца, профессиональный тип аккаунта, связанные Pages и доступ.
- Выбрать официальный transport с учётом реальных API прав и нулевой доплаты.
- Не выполнять публичные записи.
**Выход:** все четыре записи видны в production, но статусы остаются pending, пока нет реальной OAuth-проверки.

### Этап 1 — аккаунты и OAuth
- Persistent account registry.
- Meta/approved provider connection flow.
- Account identity/scopes readback.
- Connect/re-auth/disconnect/pause.
- Owner Connections UI.
- Тесты cross-account isolation и secrecy.
**Выход:** все четыре профиля отображаются как connected только при доказанном provider readback.

### Этап 2 — account-aware composer и calendar
- Account selector.
- независимые Channel Variants;
- per-account media/preflight;
- calendar filters и independent job placeholders;
- approval bound to exact account/revision.
**Выход:** владелец может создать, согласовать и спланировать черновики для каждого аккаунта отдельно; реальных публикаций ещё нет.

### Этап 3 — реальный publisher worker
- Официальный Meta или approved Metricool adapter.
- Переиспользовать существующую durable Redis queue.
- Worker/cron на имеющейся инфраструктуре; cost guard.
- idempotency, leases, retry/reconcile, cancel/dead-letter.
- provider receipt + readback.
**Выход:** по одному низкорисковому тестовому посту в каждом отдельно выбранном аккаунте после явного подтверждения владельца. Каждый пост должен иметь точный provider ID/URL и независимый readback.

### Этап 4 — стабильный multi-account release
- E2E: два утверждённых аккаунта, разные варианты, разные media types, Toronto timezone/DST, expiry, permissions, retries, unknown outcome, duplicate prevention.
- desktop and iPhone Safari/Chromium/WebKit.
- telemetry, queue alerts, audit log, rollback.
**Выход:** повторяемый подтверждённый publish flow для всех четырёх аккаунтов.

### Этап 5 — аналитика и growth attribution
- реальные разрешённые provider metrics;
- first-party campaign links;
- подтверждённые leads/bookings/payments;
- no fake zeros/conversions;
- export/reporting по аккаунтам.

---

## 12. Тестирование и критерии приёмки

### 12.1. Unit / integration
- четыре профиля не смешиваются;
- корректно обрабатывается повторный/дублирующий handle;
- нельзя публиковать без connected state;
- нельзя планировать неподдерживаемый media type;
- изменение текста/media/account/time сбрасывает approval;
- stale revision не публикуется;
- queue lease и reclaim работают атомарно;
- повторная доставка не создаёт дубль;
- ambiguous outcome не повторяет POST вслепую;
- token values никогда не попадают в client response/log/test snapshot;
- disconnect блокирует новые jobs;
- paused account не забирает due jobs;
- один destination fail не меняет успех второго destination.

### 12.2. Provider sandbox / synthetic
- OAuth state/nonce and callback validation;
- account ID readback;
- scopes/read capability;
- media URL fetch and format constraints;
- simulated timeout/revoke/rate limit;
- provider readback reconciliation;
- synthetic accounts and fake token fixtures only.

### 12.3. Production acceptance
1. Production branch exact SHA reviewed.
2. Current required CI/Core release-ready/actionlint GREEN; no skipped mandatory gates.
3. Vercel deployment READY and canonical alias includes exact merged SHA or proven descendant.
4. Owner-only account connection route protected; non-owner denied.
5. All four Instagram accounts are separately authorized and actual handle + provider ID readback confirmed.
6. Each of the four accounts can be selected separately in composer.
7. One separately approved test post is sent to each selected account and provider ID/public URL read back.
8. Confirm independent receipts and no cross-account leakage across all two approved profiles.
9. Retry/replay confirms no duplicate.
10. Account errors/expired authorization do not spill across accounts.
11. Real mobile UI test at 320–430 px.
12. Audit and rollback path are documented.
13. No unapproved spend and no private client data transfer.

### 12.4. Definition of DONE
Publisher may be called **LIVE for Instagram** only after all four account connections and separate end-to-end publication receipts have been verified in production. A merged PR, green unit tests, a successful Meta login, a scheduled local item or a dry-run result do not satisfy this definition.

Publer subscription cancellation/reduction is explicitly out of scope until owner separately reviews actual multi-account parity and decides to migrate.

---

## 13. Ограничения и решения, которые нельзя принимать автоматически

- Не покупать Metricool Advanced/Custom, Meta services, worker plan, paid cron or additional hosting.
- Не включать ads, pixels, remarketing, bulk DMs/email/SMS.
- Не публиковать непроверенный контент автоматически.
- Не переносить пароли или OAuth tokens в ChatGPT, GitHub issues или frontend.
- Не использовать client cabinet, private test results, health/therapy content or client media.
- Не объединять разные Instagram profiles, даже если их названия похожи.
- Не удалять/не отменять Publer и не менять текущую подписку без отдельного решения владельца.
- Не ослаблять CI/release checks ради быстрого merge.

## 14. Итоговый приоритет

1. **P0:** выпустить текущий account registry PR #3997 и проверить production.
2. **P0:** подтвердить и авторизовать все четыре реальных Instagram профиля через официальный путь.
3. **P1:** постоянный multi-account registry и composer selector.
4. **P1:** account-specific scheduling + реальный worker + provider receipts.
5. **P1:** стабильность, идемпотентность, восстановление и мониторинг.
6. **P2:** метрики и first-party attribution.
7. **P3:** расширение на новые платформы после успешной работы всех четырёх Instagram-аккаунтов.

**Ожидаемый итог:** одна система Growth Studio управляет многими брендами и социальными аккаунтами, а каждая публикация имеет независимый destination, approval, schedule, provider receipt и измеримый результат.
