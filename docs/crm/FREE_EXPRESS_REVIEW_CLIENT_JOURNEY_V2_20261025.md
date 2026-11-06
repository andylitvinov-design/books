# Holistic House · единая заявка на бесплатную личную экспресс-диагностику — Client Journey v2

**Дата:** 2026-10-25 · **Тип:** техническое задание / план реализации · **Статус:** SPEC, не реализовано на live.  
**Продакшен:** `andylitvinov-design/books` → `codex/public-book-library` → Vercel `super10/codex-public-book-library` → https://holistichouse.vercel.app.  
**Основные задачи:** [#990](https://github.com/andylitvinov-design/books/issues/990) (воронка), [#1709](https://github.com/andylitvinov-design/books/issues/1709) (авторская коучинг-анкета), [#985](https://github.com/andylitvinov-design/books/issues/985) (CRM). Новые дубли issue, CRM и таблиц без необходимости не создавать.

## 1. Результат проверки 25 октября

Проверено в **production source** (не путать с реально прошедшим E2E):
- Публичная страница `app/[locale]/services/free-situation-review/page.tsx` рендерит `FreeEntryLanding` c **одной** бесплатной личной диагностикой. Ситуация и энергия/самочувствие — лишь темы одного обращения.
- `components/personal-express-enquiry.tsx` уже раскрывает форму в том же лендинге, выбор focus `situation|energy`. Не заменять раскрытие модальным окном и не восстанавливать устаревшие три услуги.
- `components/contact-channel-chooser.tsx` в режиме `compactPhone` спрашивает **только телефон и reply-only consent** и затем отправляет `POST /api/service-enquiries`; поле `description` существует в общей форме, но **отсутствует в compactPhone UI**. После валидного ответа `saved:true` и `HH-…` можно показывать спасибо. WhatsApp/Telegram лишь optional handoff; чат не равен записи.
- `app/api/service-enquiries/route.js` вызывает `createPublicServiceEnquiry`; `lib/practitioners/public-service-enquiry.js` транзакционно записывает AES-GCM encrypted `app.public_service_enquiries` и consented `app.crm_contacts` с идемпотентностью операции. Дубликат CRM контакта подавляется, но **два разных POST могут создать две отдельные заявки**.
- `components/free-drawing-intake.tsx` отправляет на **другую** страницу `/{locale}/coaching/intake`. Там `components/coaching-intake-form.tsx` использует все 20 вопросов из `lib/coaching/intake-model.js`, предлагает encrypted draft после Google и отдельную явную отправку через `POST /api/coaching-diagnostic`. Это **другая заявка**, если до этого уже был выполнен guest lead POST.
- `components/service-enquiry-thank-you.tsx` и `/{locale}/thank-you` уже существуют: receipt выводится при наличии валидного свежего marker в sessionStorage. **Не делать вторую независимую thank-you страницу**.
- Supabase project `holistichouse` (ref `shervdixkaxurnaecioe`) имеет закрытый bucket `hh-client-private-media`; кроме него есть специализированные **закрытые** buckets для других модулей. Реализованы защищённые фото-загрузки в отдельных авторизованных сценариях, например `/api/app/remote-support/[id]/photo`. **Готовой защищённой привязки гостевых personal/drawing фото к публичной бесплатной заявке нет.** Не считать bucket сам по себе разрешением доступа.
- Server RLS у `app.public_service_enquiries` ограничен backend-ролью. Не расширять до публичного `SELECT/UPDATE`. Frontend/live GET 200 — не доказательство CRM readback, media upload, мобильной работы или доставки владельцу.

## 2. Решение: один **in-page** пошаговый мастер

Мастер показывается внутри текущего лендинга `/{locale}/services/free-situation-review`, с крупными полями, плавным переходом в пределах одного блока, сохранением позиции прокрутки. Основной CTA — «Оформить бесплатную заявку» / “Request a free personal review” / ES зеркало. Не открывать modal, отдельный checkout или WhatsApp вместо первой формы.

### Экран A · Как связаться и о чём вопрос (минимальная заявка)

**Сначала:** выбор темы `situation` или `energy` (уже есть), номер телефона с кодом страны и поле «Опишите вопрос в 1–2 предложениях» (например, <=300–400 знаков). Не просить диагнозов, анализов, тестов, документов; один обратный контакт, без подписки. Поле «Как к вам обращаться?» по желанию, email как доступная альтернатива телефону при невозможности его предоставить. Согласие на **один личный ответ** — отдельный пустой checkbox и ссылки Privacy. 

**Primary button:** «Отправить заявку»; только после server `201`, проверенных `saved:true` и `referenceCode` UI выводит:
> «Спасибо! Заявка № HH-… зарегистрирована. Андрей сможет связаться с вами по указанному контакту. Чтобы разбор был точнее, можно дополнить вопрос — это по желанию».

Если отказ/timeout: **не** писать «Заявка отправлена», показать retry, сохранить ввод. Сохранение первого обращения должно произойти **один раз**; retry идемпотентен по `operationId`. Внешний мессенджер optional после receipt и содержит только код заявки и нейтральное сообщение, **не текст проблемы**.

### Экран B · Как точнее сформулировать запрос (коротко / подробно)

Сегментированный переключатель **«Кратко (1–2 минуты) / Подробно (5–10 минут)»**, переключение без удаления набранных ответов.

**Кратко:** 
1. «В чём сейчас основная трудность?» (`currentRequest` / существующее эквивалентное поле модели).
2. «Чего вы хотите вместо этой ситуации?» (`desiredOutcome` / существующее эквивалентное поле).
3. «Какой главный вопрос вы хотите задать Андрею?» — может быть необязательным для краткого пути.

**Подробно:** отрендерить существующие `COACHING_FIELDS` из `lib/coaching/intake-model.js`, включая исходную ситуацию и попытки, желаемое изменение, ресурсы/ограничения, возможности, поддержку, приоритетный вопрос. Не создавать вторую анкету со своей схемой и не выставлять баллы как у психологического теста. Уважать existing validation/field limits. 

Кнопки «Сохранить дополнение» и «Пропустить». `PATCH` (или отдельный **ограниченный** `POST`) дополняет **исходную** запись `app.public_service_enquiries`; **запрещено** вызывать второй `POST /api/coaching-diagnostic` ради того же обращения. Только один `HH-…` на весь процесс.

### Экран C · Ваше фото (необязательно)

Текст: «При желании добавьте своё фото. Оно поможет Андрею познакомиться с вами и учитывать контекст обращения. Это не диагностика по фотографии». Кнопки **«Сфотографировать» / «Выбрать файл» / «Пропустить»**; мобильное `accept=image/*`, чёткая предпросмотр/удаление/повтор. Для темы «здоровье» **не** заявлять, что фото определяет заболевания; не просить фото участков тела, анализы и интимные изображения. Запрашивать отдельное информированное согласие на передачу фото только Андрею в приватный разбор.

Upload — отдельная server-verified запись `kind=portrait` с owner-only приватным доступом; не размещать в профиль/публичный master page/CRM Contact avatar.

### Экран D · Кабинет Google (необязательно)

После зарегистрированной заявки: «Заявка уже сохранена. **Войти через Google и сохранить её в личном кабинете** — чтобы позднее вернуться к ответам и материалам». Две равнозначно доступные кнопки «Войти через Google» и «Продолжить без входа». Авторизация не должна повторно отправлять заявку, удалять ответы или менять клиента без верификации. 

Перед OAuth вернуть безопасный одноразовый state, после OAuth server-side связать **ту же** заявку с проверенным аккаунтом. Не привязывать заявку к вошедшему Google пользователю **только по введённому телефону или открытому коду HH**. Реюз существующего `/api/app/auth/start` и account-bound drafts в `app_private` там, где они совместимы. Если Google недоступен, предыдущий lead/receipt остаются сохранены.

### Экран E · Рисунок «Я — цель — проблема» (для `situation`)

Текст:
> «Для письменного разбора нарисуйте на листе бумаги три элемента: **Я**, **Моя цель**, **Проблема**. Разместите их так, как они ощущаются именно вам. Не нужно уметь рисовать — подойдут три круга, точки или символа. Сфотографируйте лист целиком и загрузите снимок сюда. Он будет виден только Андрею в защищённом кабинете. Это символическое упражнение, не психологический и не медицинский диагноз».

Показать **простую схему без навязывания правильного расположения**, кнопки камеры/галереи, предпросмотр, «Загрузить рисунок», «Загрузить позже». `kind=drawing` должен храниться **отдельно** от `kind=portrait`. Для `energy` эту стадию **не делать обязательной**: вместо рисунка уместно одно поле «Что хотите лучше понять о своём самочувствии и ресурсах?» и опциональное изображение, без медицинских обещаний.

Только успешный upload и server metadata linkage переводят материал в статус **received**; просто открытый экран, выбор файла или ошибка сети не являются доставкой.

### Финальный экран · Отправлено / осталось дополнить

Показать сохранённый код, отмеченные состояния **«Контакт получен ✓ / Вопрос ✓ или ждёт / Фото — по желанию / Рисунок — получен или можно добавить позже»**. Текст: «Андрей рассмотрит заявку и лично сообщит о следующем шаге. Это не запись на встречу и не гарантия срока ответа». 

Отдельный добровольный upsell на консультации €50/30 мин и €100/60 мин **после** завершения бесплатной дорожки. Без принудительной оплаты или обязательного Google-входа. Персональные ответы/фото — только в защищённом кабинете, уведомление по WhatsApp/Telegram/SMS/push — нейтральное «в кабинете новое сообщение», без медицинского/психологического содержания.

## 3. Состояния и модель данных (единый источник истины)

`local_draft` (нет лида) → `lead_saved` (сервер+CRM) → `context_saved` (дополнение) → `materials_partial|materials_received` (файлы) → `under_review` → `response_ready` → `closed`. Отказ/истечение согласия отдельно. Optional стадии не блокируют базовый lead.

**Не менять** текущий смысл `app.public_service_enquiries.status` без обратной совместимости; новые внутренние этапы хранить отдельными приватными метаданными/связанной record structure, не ломая existing practitioner relay. В CRM **один** основной consented lead с `source`, `locale`, `focus`, `referenceCode` и безопасным follow-up; private answers могут находиться в encrypted enquiry content, но не в `crm_contacts` публичном описании. Сохранять submit timestamp, consent version/time/channel, файл kind, приватный path/hash, размер, reviewedAt и сроки удаления.

**Защита от присвоения чужой заявки:** открытый `HH-…` нельзя использовать как ключ для GET/PATCH/upload. В момент успешного первой записи сервер выдаёт **ограниченную scoped continuation capability**, хранимую защищённо (например, Hash на сервере + HttpOnly Secure SameSite cookie с коротким TTL). Дополнения требуют proof, origin/CSRF, rate-limits, revision/idempotency; после Google account-bound подтверждённая привязка заменяет гостевую возможность. Никаких `SELECT` anonymous по референсу, URL с PII, публичных или бесконечных signed links.

## 4. Файлы и приватность

- Использовать существующий **private** Supabase Storage путь/код `createPrivateStorageClient` и при необходимости расширить `hh-client-private-media` **только с проверенным namespace и серверными правами**; не переиспользовать публичные service/profile buckets. Отдельный namespace `free-express/<opaque-enquiry-id>/<portrait|drawing>.jpg`; пути не раскрывать в аналитике, мессенджерах и публичных API.
- На сервере проверки контента/MIME: JPEG/PNG/WebP, строгий лимит размера (рекомендация 5 МБ исходно), количество 2, decoder hardening/limitInputPixels, поворот, ресайз, перезапись в JPEG, strip EXIF/GPS, content-disposition inline, `Cache-Control: private, no-store`; scanner/security review до запуска. Защитить MIME spoofing/polyglots, повторную отправку, file overwrite, ZIP/video abuse.
- Только подтверждённый пользователь и авторизованный владелец практики имеют доступ через time-bounded signed download либо proxy; owner role проверяется server-side, не через user_metadata. Предусмотреть удаление отдельного фото и всего пакета заявки, conservative retention proposal (например, 30 дней у незавершённой заявки) с юридическим/владельческим утверждением. RLS/авторизация — DENY по умолчанию.
- Не отправлять персональные материалы, здоровье, полные ответы, фото и рисунки через WhatsApp/Telegram/email/SMS/Push, advertising pixels, AI providers или логи. Public analytics consent hold `PUBLIC_ANALYTICS_AVAILABLE=false` не менять. Не включать внешнюю фотоаналитику или face recognition.

## 5. Архитектура и этапы внедрения

**PR-1 (P0) — существующий lead capture и wizard baseline, без DB media changes.**
1. Добавить короткое описание в phone-only `PersonalExpressEnquiry` (переиспользовать `ContactChannelChooser` или вынести общий проверенный field).
2. При `201` отображать inline thank-you/review progress, сохранять reference; не редиректить away на этапе optional supplement; внешние мессенджеры только fallback.
3. «Кратко / Подробно» как единый переключатель `COACHING_FIELDS`, UX/EN/RU/ES и 320–430px.
4. На первом PR **не симулировать** saved context: если secure resume API отсутствует, его controls оставить за flag/не выставлять публично до PR-2. Backward compatibility для всех остальных `ContactChannelChooser` callers.

**PR-2 (P0) — защищённое дополнение одной заявки.**
1. Спроектировать additive private metadata + TTL capability/revision, bounded `PATCH` и server-side optimistic locking, idempotency, consent audit.
2. Обновить существующую encrypted `app.public_service_enquiries` без второго лида; обеспечить единый CRM timeline. Если DB migration нужна — отдельный review RLS/advisors/rollback до применения.
3. Протестировать abandonment/retry/new tab/insecure reference/expired capability, Google OAuth return. Синтетическое создание **только** в изолированной test DB, без реальных клиентских данных.

**PR-3 (P1, privacy gate) — два вида медиа и Google save.**
1. Private upload/read/delete, отдельные `portrait` и `drawing`, ownership/role checks; file validation, cleanup, TTL и E2E.
2. Google account linking только с явным согласием, восстановление состояния и кабинет `My Practice` / client view по допустимому verified account path. Не смешивать CRM Contacts с приватными client profiles.
3. Owner CRM callback/report workflow: see receipt, context and uploaded drawing with authenticated private viewer, genuine provider neutral notifications only after separate approval.

**PR-4 (P1) — QA/live.** Укрепить CI, Playwright Chromium+WebKit at 320/375/390/430, lighthouse and EN/RU/ES, production READY SHA/alias and genuine consented visitor→DB→CRM→owner readback→reply; upload checked with synthetic media, and if permitted with controlled account and private image. No automatic Ads, paid API, payment or outbound sends.

## 6. Приёмка / anti-regressions

- [ ] Hero button opens the form **in page**, no modal or navigation; repeated hash click and Escape work.
- [ ] `POST` does not run before explicit consent. Invalid phone/no consent → no lead; server error/timeouts → no false thank-you; retry same operation ID does not create 2 records.
- [ ] CRM receipt exists after first submit. No second `app.public_service_enquiries` or duplicate CRM lead when switching questionnaire or uploading 2 files.
- [ ] Focus radio selected value survives all steps; phone/description and brief/detailed answers survive switching, back, and Google return.
- [ ] Existing authored 20-question questionnaire preserved, required fields consistent; brief path viable without all 20.
- [ ] Guest path works without Google, photo, or drawing; Google adds save capability but not implicit lead.
- [ ] Guest reference alone fails protected PATCH/GET/upload; another account sees nothing; expired capability cannot write.
- [ ] Private media has no public CDN URL; photo/drawing separately accessible to authorized owner, delete and expiry work; never exposed in logs, analytics or messengers.
- [ ] EN/RU/ES accurate; large controls >=44px, input keyboard `tel`, WCAG focus, reduced motion, no overlay bottom navigation at iPhone 320/375/390/430.
- [ ] Only completed server confirmation counts `lead_created`; upload success and delivery statuses are separate verified events; site visits/clicks never counted as a lead or confirmed booking.
- [ ] Unit/contract, lint/typecheck/build, isolated database RLS, browser tests, GitHub CI and real Vercel READY exact SHA/domain checked. Production smoke GET 200 insufficient for external delivery E2E.

## 7. Тексты на русском (MVP)

**Экран A:** «Расскажите о вопросе — Андрей ответит лично» · «Телефон для связи» · «О чём ваш вопрос? Одно-два предложения» · «Согласен(на) на один личный ответ по этой заявке. Без рассылок» · **«Оформить бесплатную заявку»**.

**После server save:** «Спасибо! Заявка № HH-… сохранена. Вы уже можете ждать личного ответа. Если хотите более точный разбор, уточните свой запрос — это займёт пару минут».

**Экран B:** «Как вам удобнее описать запрос?» · tabs **«Кратко» / «Подробно»** · «В чём сложность?» · «Чего бы вам хотелось?» · «Какой вопрос для вас главный?» · **«Сохранить и продолжить» / «Пропустить»**.

**Экран C:** «Добавьте своё фото — по желанию» · «Его увидит только Андрей; фото не используется для постановки диагноза» · **«Сделать фото / Выбрать из галереи / Пропустить»**.

**Экран D:** «Заявка уже зарегистрирована. Хотите сохранить её в личном кабинете?» · **«Войти через Google» / «Продолжить без входа»**.

**Экран E:** «Нарисуйте “Я — цель — проблема”» · «Возьмите лист бумаги и ручку, обозначьте три элемента любым способом, сфотографируйте весь рисунок» · **«Загрузить рисунок / Добавить позже»**.

**Финал:** «Ваша заявка № HH-… в работе. Здесь вы видите, какие материалы получены, и можете по желанию дополнить запрос. Андрей сообщит следующий шаг лично. Бесплатный письменный разбор — не медицинская диагностика».

## 8. Release gate / владелец

Это согласованное продуктовое направление, **не доказательство реализации**. Медиа-этап (личное фото/рисунок) нельзя публиковать без проверки server auth, privacy/retention, RLS и реального owner-only readback. Ограничения: Mac Remote Desktop offline на момент аудита, браузерный iPhone E2E и реальная отправка клиентом→owner не выполнялись. Текущая production deployment и SHA меняются из-за параллельных PR — перепроверять непосредственно перед выпуском. Предпочесть существующие компоненты и API, малые отдельные PR; не создавать новые параллельные публичные формы.
