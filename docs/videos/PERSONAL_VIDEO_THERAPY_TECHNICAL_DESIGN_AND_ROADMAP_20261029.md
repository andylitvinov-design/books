# Holistic House · Personal Video Therapy / Session Player
## Исполнимое техническое задание и план реализации v1.0

**Дата:** 29 октября 2026 (America/Toronto). **Статус: SPECIFICATION ONLY — НЕ РЕАЛИЗОВАНО, не проверено на live.**

**Продуктовый сценарий и методика:** [PERSONAL_VIDEO_THERAPY_SESSION_ENGINE_V3_20261029.md](./PERSONAL_VIDEO_THERAPY_SESSION_ENGINE_V3_20261029.md). **Единая задача:** https://github.com/andylitvinov-design/books/issues/2503. **Текущий docs PR:** https://github.com/andylitvinov-design/books/pull/2523. **Production source:** codex/public-book-library, а не default codex/bootstrap-books. Сайт: https://holistichouse.vercel.app/ru/holistic-support/mandala. Этот документ является **инженерным приложением** к продуктовому ТЗ, не вторым независимым продуктом.

### 1. Задача и границы

Добавить в уже существующий Video Therapy / Mandala editor функцию **«Перейти к моей персональной сессии»**. Восемь подготовленных сценариев становятся последовательным маршрутом, а одна сессия — интерактивным путём:

**ИИ-помощник (только данные по согласию) → моментная самооценка T0 → персональное видео или честный сценарный fallback → безопасное упражнение → T1 → персональная медитация (слушать/читать) → T2 → нейтральный итог, рефлексия, продолжение.**

Три точки T0/T1/T2 — **не повторные клинические тесты**, а одинаковый добровольный короткий self-check-in «прямо сейчас». Старые сохранённые результаты тестов — только source-backed контекст для фразы помощника, не подстановка вместо T0. Ни один шаг не обещает лечения, профессиональной психотерапии, изменения травмы, заработка или отношений.

**Out of scope MVP:** самостоятельная LLM-психотерапия, новый видеогенератор, клинические назначения, новые онлайн-оплаты, автоматический платный AI render, публикация приватных видео на YouTube, WhatsApp/Telegram/push с информацией о здоровье, второй кабинет или новый каталог тестов.

### 2. Проверенная кодовая база — переиспользовать

| Existing source | Реальная роль/ограничение | Плановая интеграция |
|---|---|---|
| components/mandala-free-video-studio.tsx | Основной local Canvas/MediaRecorder редактор: фото, опции, музыка, сценические кадры, MP4/WebM и download | Не заменять; показывать Session Player как режим этой страницы, передавать реально доступный local Blob |
| components/mandala-guided-course.tsx | Восемь storyboard-карточек; первая 60s может быть экспортирована; есть explicit opt-in к защищённому профилю и voice preview | Добавить CTA к Session 1, не дублировать планировщик и не обещать #2–#8 реальные фильмы |
| lib/mandala/personal-guided-course.mjs | COURSE_PLAN_VERSION=resource-imagery-course-1; 8 id guided-imagery-1..8; только один бесплатный ролик; selectVerifiedCourseEvidence с source и recency max 366 days | Версионированный adapter, сохранить старые IDs/scripts, добавить stageFunctionId и метаданные только без breaking changes |
| components/app/opora-v6-slide-player.jsx; lib/inner-growth/opora-as60-experiential-practices.js | Травма-информированные добровольные маленькие упражнения и STOP; учёт реальных попыток | Применять ровно одну безопасную адаптированную задачу, не переносить целиком 14-дневный курс |
| components/energywork-ai-learner.tsx; lib/academy/energywork-course-repository.js | Пять уроков Reiki, step-by-step learner, revision, private encrypted saved answers, отдельное teacher-sharing consent | Переиспользовать UX и auth/revision pattern; не добавлять иной course_key в Reiki-only DB |
| lib/assessments/test-result-discussion.mjs, /api/app/bootstrap?view=portrait | Источник результатов тестов, ограничения interpretation; разговорный формат | Source-backed deterministic assistant, а не новая модель диагностики |
| app/api/app/personal-videos/route.js; lib/app/personal-videos.js | Уже отдельное cloud-saving MP4 под HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED=true: до 12 MB, три ready объекта на владельца, max 36 MB на владельца, global 180 MB | Не класть туда журнал сессий. Можно связать с verified ready MP4 только после owner checks; не предполагать flag включённым |
| app_private.academy_course_progress; app_private.growth_courses | Reiki-only курс / 14–28 дневный курс ОПОРА; несовместимые версии и ограничения | Не хранить 8-сессионный маршрут в их существующих строках; делать private read-model проекцию для My Courses |
| app_private.learning_video_progress | Отмечает просмотр публичного Academy YouTube ID; click Play не равно watched | Не использовать для приватного персонального видео |
| PR #2522 / #2518 / #2520 | Текст персональной медитации, Cinematic Director, audio attach ещё **open** при проверке 29.10 | Перед кодовыми работами сверить merge и не переписывать конкурирующие части редактора |

**Архитектурный принцип:** один видео-редактор + один существующий guided-course planner + небольшой новый Session Player. Любые добавочные таблицы/API — лишь для чувствительного приватного хода сессии, не для нового видеопродукта.

### 3. UX и wireframe телефона

Пока клиент **создаёт** программу, оставить утверждённый компактный экран с 4 редактируемыми строками **Тема / Проблема / Желаемое изменение / Мой профиль**, один CTA «Сформировать 8 сессий» и mini edit sheet. После создания показать 8 карточек. Первая открывается через **«Начать персональную сессию»**; остальные показывают достоверный доступ: «Сценарий» или «Видео пока не создано / требует одобрения», а не платный fake-unlock.

**Session Player: один этап на экран, EN/RU/ES, тепло-бежевый с изумрудными акцентами.** Компактный хедер «Моя сессия · 1/8», тонкий прогресс, постоянная небольшая кнопка «Стоп / Мне некомфортно», Back/Skip и крупная основная CTA. Портрет уже имеющегося консультанта — маленький слева; короткая реплика справа. Не создавать новый talking avatar.

| № UI | Пользовательский экран | Минимальная интеракция |
|---|---|---|
| 1 | Помощник рассказывает: ваша подтверждённая задача/цель, дата прежнего теста при согласии, «Почему предложено?» | Подтвердить / изменить цель / продолжить / не читать прошлые данные |
| 2 | «Как сейчас?» T0 | 0–10 difficulty и resource (или skip), одинаковые anchors |
| 3 | «Ваш видеосюжет» | Постер → Play/Pause; real file / explicit «есть только сценарий», можно подтвердить watched отдельно |
| 4 | «Небольшая практика» | Одна 2–4 минутная добровольная OPORA-style задача; tried/read/skipped/uncomfortable |
| 5 | «Как сейчас после практики?» T1 | Точно те же два вопроса/якоря, не «насколько лучше» |
| 6 | «Моя медитация» | Читать текст; Слушать verified audio или «Голос устройства»; до 2 дополнительных акцентов |
| 7 | «Как сейчас после медитации?» T2 | Та же батарея и skip |
| 8 | «Мой опыт» | Три точки для каждого показателя, что подошло/не подошло, завершить, сохранить **только при реальном private API** |

Продуктовую навигацию можно группировать в 6 больших смысловых ступеней, но reducer сохраняет 8 отдельных состояний. На 320×568 разрешён scroll (не уменьшать шрифт до нечитаемого), кнопки не меньше 44px, safe-area, reduced motion, клавиатура и VoiceOver. Video/timer/speech не включаются без действия.

### 4. Состояния и версия моделей

**Предлагаемые новые (пока не реализованные) файлы:**
- components/mandala-personal-session.tsx — только плеер/шаги, никакого нового Canvas;
- components/mandala-personal-session.module.css — компактная мобильная сетка;
- lib/mandala/personal-session-model.mjs — чистые функции, typed JS/TS declaration при необходимости;
- tests/mandala-personal-session.test.mjs — модель и measurement;
- scripts/verify-mandala-personal-session-browser.mjs — Chromium/WebKit E2E с синтетическими данными;
- P2: lib/app/video-therapy-repository.js и небольшой route-handler в существующем app/api/app namespace только после schema/RLS review.

**State machine:** idle → intro → t0 → video → exercise → t1 → meditation → t2 → result → completed. Возможны paused/stopped. SKIP двигает только этап, не создаёт выдуманную оценку. AFTER COMPLETE редактировать прежние immutable результаты нельзя: «Повторить» создаёт новый run UUID и attempt_number. BACK до завершения допускает изменение собственного ответа, с полной переоценкой neutral chart, не ретроактивно.

Поля приложения (schema draft):

```typescript
type Phase = 'T0' | 'T1' | 'T2';
type SessionStep = 'intro' | 't0' | 'video' | 'exercise' | 't1' | 'meditation' | 't2' | 'result';
type Status = 'in_progress' | 'paused' | 'stopped' | 'completed';
type ExerciseResult = 'tried' | 'partly' | 'read_only' | 'skipped' | 'uncomfortable';
type VideoAccess = 'not_created' | 'local_ready' | 'private_ready' | 'unavailable';
type AudioAccess = 'text_only' | 'device_tts' | 'approved_audio';

type CurrentRating = {
  definitionId: 'difficulty_now_v1' | 'resource_now_v1' | 'readiness_now_v1';
  phase: Phase;
  value: number | null;          // 0..10 integer; null=skipped, never zero-fill
  definitionVersion: '1.0';
  timeframe: 'right_now';
  answeredAt: string | null;     // UTC ISO
};
type SessionAttempt = {
  id: string;                    // client UUID / idempotency key
  planId: string | null;         // guest null, no cloud save
  planRevision: number;
  templateVersion: string;
  sessionNumber: number;         // 1..8
  step: SessionStep;
  state: Status;
  ratings: CurrentRating[];
  videoConfirmedWatched: boolean;
  exercise: ExerciseResult | null;
  meditationMode: AudioAccess | null;
  feedback: 'helpful' | 'partly' | 'no_change' | 'uncomfortable' | null;
  feedbackText?: string;        // max 500; private only
  revision: number;             // optimistic write concurrency
};
```

**Measurement definitions fixed for all three phases:**
1. difficulty_now_v1: «Насколько выбранная трудность мешает мне прямо сейчас?» 0 — не мешает, 10 — очень сильно мешает. Larger = more difficulty.
2. resource_now_v1: «Насколько доступна мне опора прямо сейчас?» 0 — почти не ощущаю, 10 — очень доступна. Larger = more support.
3. readiness_now_v1 optional: «Насколько я готов(а) сделать один маленький шаг?» 0 — совершенно не готов(а), 10 — вполне готов(а). Larger = more readiness.

**Ни одной mandatory actual rating.** Опциональный ответ integer 0..10 или null; NaN, строка, float, отрицательные, 11, другое шкальное описание — reject. T0/T1/T2 сравниваются только при одинаковом definitionId, definitionVersion, timeframe и одном runId. Показывать не «улучшился на 40%», а буквально «T0 7; T1 6; T2 6» и текст о субъективной моментности. Self-checkins не равны validated psychometrics, XP, video completion, treatment outcomes.

План собирается из **одной подтверждённой основной сложности + одной цели + до 2 дополнительных акцентов**, language/theme/stage safe-scene/avoid terms. Старые scores — только отдельные ссылки на (instrument ID, version, resultID, source date, direction) и только при явном opt-in. Никаких демографических заключений по фото. Внутри существующего video engine четыре жизненные сферы Energy, Work/Money, Relationships, Meaning/Goals и больше сценических тем; **Goals — не пятая отдельная self-rating life domain**.

### 5. Правила работы помощника и выбора материалов

**Phase P1 = deterministic guide, не внешний LLM.** Prompt construction из источников:
- сначала последние **явно принятые пользователем** цель, запрос, акценты, предпочтения;
- опционально self-report из его сохранённых результатов после protected GET /api/app/bootstrap?view=portrait + отдельного unchecked checkbox. Использовать существующие buildPsychPortrait/selectVerifiedCourseEvidence; проверять версия/права/дата, 366 дней как лишь maximum software window, не все тесты актуальны весь год;
- надёжная подпись: «В тесте [имя/версия] от [дата] вы отмечали [шкала и балл]. Это прежнее измерение; его нельзя напрямую считать сегодняшним состоянием». Если нет пригодного результата: «Пока нет сопоставимого прошлого измерения — можете оценить состояние сейчас»;
- если source flagged for professional review / acute risk — no automated interpretation, no clinical suggestion/upsell, neutral stop/human route.

**Stage function registry v1:** 1 ориентировка/выбор (луг), 2 ресурсы (сад), 3 темп (ручей), 4 опора (дерево), 5 границы (дом/двери), 6 маленький шаг (тропа), 7 выбор без давления (мост), 8 интеграция (горизонт). Одна явно разрешённая безопасная сцена на стадию; список «не хочу воду/ночь/лес» ведёт к альтернативе из разрешённых assets, не заставляет человека смотреть избегаемый образ. Все восемь сессий должны быть различны по функции, а не по наложенному заголовку. Шаблоны утверждённые RU/EN/ES, reproducible content hash.

**Exercise selection:** маленький OPORA-вдохновлённый шаг на 2–4 минуты, no forced breath, EMDR, exposure, trauma recall, compulsory contact. Навигация tried/partly/read_only/skipped/uncomfortable. Этап T1 после практики добровольный, без предположения эффекта.

**Meditation:** persona + цель + функция сессии + выбранная безопасная метафора + пользовательский тон + до двух акцентов из набора «спокойствие / опора / принятие себя / границы / ясность / связь / энергия / маленький шаг». Начало/завершение мягкое; никаких обещаний исцеления и скрытых кадров. Текст доступен всегда. «Слушать» только с verified playable author master либо явным ярлыком «Голос устройства» (speechSynthesis); браузерная речь не является MP3/AI-клоном. **PR #2522** генератора текста медитации на 29.10 остаётся открытым; после merge интегрировать его, а до merge не создавать дублирующий генератор.

### 6. Контроль реального видео и аудио

Статус медиаматериала отдельный от готовности сценария: planned / local_exported / video_verified / reviewed / private_delivered / inaccessible. Клиентский плеер может читать **только** current Blob, confirmed local download или собственный подтверждённый ready MP4 с owner-scoped signed URL. Никакого предположения, что sceneId — URL фильма или что 8 storyboard IDs означают 8 файлов. Film #1 — существующий бесплатный короткий ролик, реальная WebM/MP4 кодировка зависит от браузера и нуждается в physical iPhone QA. #2–#8 остаются «сценарий / нет готового видео» до фактического asset QA.

Хранение готового пользовательского MP4: existing app_private.personal_videos (через flag и consent), только если соответствует ограничениям. Для будущего длинного полного видео/профессиональной озвучки — отдельный protected media asset manifest + QA, проверка настоящего размера, MIME/codec, права, locale, контроль checksum и signed read. Не поднимать лимиты до 50MB автоматически, не грузить приватные ролики на Unlisted/Public YouTube, не включать HeyGen/Kling без точных прав и отдельного разрешения на расходы.

При STOP/video leave: video.pause(), audio.pause(), speechSynthesis.cancel(), остановить таймер/отозвать playback session. Нет autoplay. Клик Play не равен watched, звук «включился» не означает listen complete, очередной step не является выполненным упражнением.

### 7. P2: защищённая архитектура данных (план, не миграция)

**До любых SQL изменений** проверить фактические app, app_private схемы и права в Supabase; существующие legacy data и issue #1223 не трогать. По production source видим, что current academy_course_progress специализирован на конкретном Reiki/Principles course_key, growth_courses ориентирован на 14/28 дней, personal_videos содержит MP4 metadata. Для нового independent 8-session/3-checkpoint contract требуется отдельное узкое **дополнительное** owner-scoped хранилище, если не обнаружится совместимая существующая таблица:

**A. app_private.video_therapy_plans** (proposed): id UUID PK, account_id UUID FK app.accounts, plan_version, plan_revision integer, theme public non-sensitive enum, state draft/active/archived/deleted, encrypted_content TEXT для main difficulty, goal, goals, preferences, optional source-backed evidence references, stage scripts; consent_event_id, created_at/updated_at/deleted_at, UNIQUE(id,account_id).

**B. app_private.video_therapy_session_runs** (proposed): id UUID PK, account_id UUID, plan_id UUID, session_number CHECK between 1 and 8, attempt_number >=1, run_version, template_version, state, step_key, payload_ciphertext TEXT для T0/T1/T2, exercise, meditation, feedback и timestamps; revision integer ≥0, started_at/updated_at/completed_at. Composite FK (plan_id,account_id) to plans(id,account_id); UNIQUE(plan_id,session_number,attempt_number); partial unique index на одну активную попытку per plan/session, чтобы double clicks не создавали два незавершённых run. Нет health text/score в plain indexed fields.

**Защита:** ENABLE+FORCE RLS, no grants public/anon/authenticated/other service roles, минимальные hh_app_backend SELECT/INSERT/UPDATE/DELETE и server session identity; owner policy account_id=auth.uid() AND app_private.account_active(), проверки чужих media references. Encryption: существующие seal/openSealed из lib/app/crypto.js с AAD accountId+rowId+fieldName. Backend transaction(config,actor), ошибки без сырого содержимого. Revocation должен очищать consented evidence/UI и предотвращать новые reads/writes; delete для плана/записей без удаления чужого или общего MP4.

**Consent:** профиль — отдельное explicit off-by-default read consent; приватное сохранение T0/T1/T2/медитации — отдельное explicit off-by-default save consent. Добавлять новое purpose в CHECK app.consent_events.purpose только безопасной additive миграцией, не присваивать новому курсу personal_video_cloud_save_v1 (тот относится исключительно к MP4). Отдельные teacher-sharing и external AI согласия независимы/выключены.

#### Предлагаемые API (ещё НЕ существуют)
Все на уже имеющемся Next app/api/app server, без нового сервиса. Следовать patterns app/api/app/personal-videos/route.js: createRequestAuth.verified(), requestOrigin/requireSameOrigin, PRIVATE_HEADERS, readBody с лимитом, consumeRate, transaction(config,actor), safeError, no-store.

| Endpoint | Значение и безопасность |
|---|---|
| POST /api/app/video-therapy/plans | После согласия создаёт зашифрованный owned plan; 201 planId/version/revision |
| GET /api/app/video-therapy/plans | List только своих plans без raw notes, ограниченный вывод |
| GET /api/app/video-therapy/plans/:id | Только owned plan и доступные в реальности assets; unknown/foreign 404 |
| POST /api/app/video-therapy/plans/:id/runs | Создать/восстановить active attempt с idempotency UUID; 200/201 |
| PATCH /api/app/video-therapy/runs/:id | Action+expectedRevision, валидация фаз/0..10/locale/длины текста; 200 persisted revision; 409 concurrent edit |
| GET /api/app/video-therapy/runs/:id | Verified SELECT readback; только тогда «Сохранено» |
| DELETE /api/app/video-therapy/plans/:id | Приватное deletion по owner, no double deletes, actual receipt |

Никакие accountId, роль, entitlement, дата теста, score или confirmed payment из body клиента не становятся доверенными. Если API/RLS/миграция не готовы — UI работает локально, кнопка «Сохранить в My House» честно недоступна, без 200-fake. 401=login, 403/404 чужой ресурс, 409 revision/consent, 422 invalid rating/status, 503 storage unavailable. Offline retry bounded и идемпотентный.

### 8. Реализация на сайте: отдельные PR и gate

| Этап | Изменения, порядок | Критерий готовности (exit gate) |
|---|---|---|
| **P0 · source freeze** | Сверить production SHA, AGENTS, #2518/#2520/#2522; снять snapshot 8 старых IDs, consent, 6 themes и actual film export; проверить My Courses/DB/RLS | Нет конфликтов и дублей, задокументирована baseline версия |
| **P1 · Session 1 за $0** | Чистый reducer, новый компактный child player внутри existing studio, Intro/T0/video/exercise/T1/read-or-device-TTS/T2/result, STOP/Skip, локальное состояние | Доказанный browser Session 1 E2E с 3 optional замерами, реальный video/fallback; ноль новых API/DB/платных вызовов |
| **P1b · content/assistant** | Взять existing source-backed result discussion, versioned exercise registry 8 stages, адаптацию целей/медиатекста; подключить #2522 только после merge | 8 разных корректных и безопасных пакетов текста/упражнений, не выдавать за 8 готовых фильмов |
| **P2 · сохранение** | Schema audit → 2 narrow tables + consent-purpose при необходимости, RLS/crypto, private API, My Courses/My Progress read model, guest/live split | Реальный user A save/reload/delete и user B denied, DB RLS и consistency PASS, no fake save |
| **P3 · полный мастер-пакет** | 8 авторских видео/audio masters, лицензии/QA, approved EN/RU/ES озвучка, protected storage, checksums/signed access | Восемь фактических playable mastered assets **для заявленного языка**; доступ только владельцу |
| **P4 · проверенная услуга и продажа (отдельное разрешение)** | Цена продукта утверждена, clinical/rights review, реальные receipts/entitlement/refunds, отдельный E2E | Реально подтверждённая оплата/доставка; никакого обещания покупки от клика |

**Не делать в рамках этого ТЗ:** merge, deploy, платный рендер и оплату. Каждый будущий функциональный PR получает только один согласованный слой, не размножает route/editor/API. Сначала P1 без нового DB, затем только P2.

### 9. Подробные проверки, тест-кейсы, блокеры

**Node unit/contracts:**
- Скрипты 8 фиксированных стадий/ID стабильны; язык/сценарий не меняет old plan data без новой версии; нет 8 дублей одной сцены.
- 0/10 valid; null skip; undefined means missing; 11/-1/float/NaN/строка -> reject. Один definitionId/timeframe на T0/T1/T2; сравнение только внутри одного run.
- Состояния START/BACK/STOP/PAUSE/SKIP/COMPLETE корректны; Play не меняет completion; stop немедленно завершает аудио/видео; no speech synthesis -> Text only.
- Negative case «T1 хуже T0» и «без изменений» не превращается в диагноз или failure; ни одна оценка не придумывается.
- Source-consent off / withdrawn / stale / other-user / version mismatch → no private score in message; no recommendation from professional-review flagged scales.

**Browser/real media:** Chromium/WebKit, iPhone widths 320/354/375/390/430; 320×568 and 390×844; keyboard/safe-area/font/contrast, VoiceOver, reduced motion, no autoplay. «Гость → программа → Session1 → T0 → настоящий local film/fallback → practice → T1 → text/TTS → T2 → итог», pause/background/refresh (guest clearly loses ephemeral state), full error/retry, no photo or private notes network. ffprobe real encoded output with synthetic content; physical iPhone Save-to-Files and audio QA отдельно.

**P2 DB security & E2E:** account A/B wrong UUID 404, direct RLS, CSRF/origin, revoked consent, logout before write, two tabs expectedRevision conflict, repeated POST idempotent, SQL migration dry-run/backup, genuine Supabase saved readback and delete. Защита private payload в logs/pixels/URLs/third-party. No personal videos stored in CRM; only anonymized and non-sensitive aggregate metrics if separately approved.

**CI/release:** node --test, ESLint, tsc, Next build, dedicated Playwright Chromium/WebKit/mobile and licensed media checks on exact PR head; merge ONLY after CI/diff. Independently verify Vercel project READY **with exact production merge SHA** plus holistichouse.vercel.app alias, then actual authenticated browser/iPhone scenario. Green CI, HTTP 200, mock browser, merge or Vercel READY alone не доказывают клиентский E2E. Обновлять books #2503 по каждому фактическому gate.

**Rollback:** feature flag для local Session Player отдельно от existing video editor; private-save flag отдельно от local P1; при ошибке RLS/secret/storage отключать запись, сохранять зашифрованные пользовательские данные для контролируемого исправления, не выполнять destructive rollback. User-owned media не удалять при откате интерфейса.

### 10. Необходимые решения владельца и честный статус

**Для документирования и бесплатного P1 никаких новых денег, внешних API, аккаунтов, секретов или действий владельца не требуется.**

До публичного названия полноценного курса «терапия» — профессиональный клинический/этический review сценариев; для полного медиапакета — реальные оригинальные master assets по языку и права; для внешнего Kling/HeyGen и любого платного видео — отдельное разрешение на конкретный расход; для оплаты — отдельно утверждённая цена/провайдер и подтверждённый E2E. Тарифы €50/30 min и €100/60 min — только отдельные личные консультации, не автоматически цена курса.

**DoD бесплатной первой сессии:** пользователь действительно проходит измерение T0 → фильм или честный fallback → добровольную практику → T1 → медитацию для чтения/голоса устройства → T2 → итог; есть STOP/skip, EN/RU/ES mobile, нет клинических/экономических обещаний и скрытой передачи данных.  
**DoD cloud:** приватное одобренное согласие, реальная запись/чтение/удаление с owner RLS, сохранённый прогресс в одном My Courses, а не дублированный кабинет.  
**DoD полного курса:** 8 фактических approved narrated videos, а не 8 планов; защищённая доставка; методический review; права и платёжный gate, если он когда-либо включён.

**Текущий факт:** создана/обновляется только документация в PR #2523. Код Session Player, новые таблицы, API, 8 masters, production SHA этого изменения, CI и real user iPhone E2E **не реализованы и не должны маркироваться PASS**.
