# Holistic Video Studio · Cinematic Director / six-module delivery

> **Версия документа v2.0:** объединены ранее реализованный бесплатный редактор и новая подробная инженерная программа в разделе ниже. Baseline: merged интеграционный PR #2534; исходный PR #2518 закрыт как superseded. Частные сохранения/платные AI jobs/8 готовых мастеров не считать завершёнными.
**Product:** Holistic House · **Owner:** Andrey Litvinov · **2026-10-29**  
**Source of truth:** [books #2397](https://github.com/andylitvinov-design/books/issues/2397); personal eight-session course [#2503](https://github.com/andylitvinov-design/books/issues/2503); Kling pilot [#2256](https://github.com/andylitvinov-design/books/issues/2256).  
**Canonical route:** `/{en,ru,es}/holistic-support/mandala`; **Production Git branch:** `codex/public-book-library` (not repository default).

## Intent and six requested modules

A client can describe a desired visual journey, adjust four compact fields, choose an aesthetic direction, preview a safe storyboard and record a real four-scene moving montage without third-party transfer or credits. AI Premium is a **separate, quote-first, owner- and receipt-gated workstream**, not a hidden paid button.

| Module | Existing assets reused | Current implementation / gate |
| --- | --- | --- |
| 1. Director / prompt compiler | `personal-video-intent.mjs`, `mandala-free-video-studio.tsx` | `cinematic-director.mjs`: deterministic human-readable four-shot storyboard, curated safe prompt, local goal-based scene selection; no AI inference, diagnosis or private external prompts |
| 2. Style library | Existing six themes + original scene catalog | Four visual identities (Golden hour / Nature / Dream / Minimal); consistent light/camera, EN/RU/ES; user can specify imagery to avoid |
| 3. Provider router | Owner `kling-video.mjs`, `kling-avatar.mjs`; HeyGen Digital Twin | `cinematic-production.mjs`: free local and candidates Kling 2.5 Turbo, newer Kling, Runway, Higgsfield, HeyGen owner-only. No fabricated price; client-private content blocks all providers |
| 4. Jobs & spend governance | Existing owner Kling admin explicit consent and manual task readback; payment infrastructure | Quote/owner/rights/payment decision and state machine `draft→quoted→approved→payment_verified→submitted→provider_ready→qa_passed→delivered` with verified proof placeholders. **Pure contract only**: no new provider execution endpoint or persisted job table until commercial and E2E gate |
| 5. Montage & QA | Existing first-party Canvas + MediaRecorder, original audio and affirmations | Local four-shot animated montage now uses the original recorder with preview and export; offline owner-only FFmpeg command can combine separately approved real source clips into Full HD H.264/AAC with optional permitted narration/music/captions and ffprobe QA. Not hosted on Vercel |
| 6. My House | Existing `app_private.personal_videos`, private Supabase bucket `hh-client-private-media`, RLS, `/{locale}/app/videos` UI | Reuse existing owner-account gallery; no duplicate storage model. **Production cloud-save flag remains OFF** until production migration/owner RLS/E2E/iPhone and storage budget are verified. Never silently upload generated photos or videos |

### Client UX (same editor, not new route)

- A small **Cinematic Director** card expands inside the existing editor after optional audio/affirmation controls.
- **Four main rows**: Topic, Main challenge, Desired change, **My profile** (not connected by default). Visual style and excluded imagery live in a secondary advanced disclosure. One compact summary, one reusable accessible edit sheet.
- Current topic is synchronized when entering. My profile opens a separate **unchecked** permission; only a user click triggers first-party `GET /api/app/bootstrap?view=portrait`, validates source through existing `buildPsychPortrait` and `suggestGuidedGoalsFromProfile`, then presents optional themes to accept manually. No scores/gender/diagnoses are exposed in provider prompts, URLs, JSON export, logging or the new video storage. Revocation invalidates in-flight reads. Sign-in/refresh links reuse current My House/My Tests. Each row opens the same mobile sheet; short 320px phones can scroll naturally.
- Format 16:9 / 9:16 / 1:1 and 20/30/60 s. Button `Create storyboard` generates four **distinct** and sequential local scenes. A screenshot/card is NOT a rendered movie.
- Each of four shots can now be individually replaced with a **trusted pre-existing local scene** or swapped with another shot. All choices are allowlisted and pre-filtered by excluded imagery; a swap cannot duplicate a scene. A changed shot invalidates any previously applied montage until the client explicitly reapplies the new plan.
- `Use as free moving montage` configures the existing recorder: local Canvas draws scenes in the correct order, with a mild dark dissolve on cuts. Client must separately tap the existing **Create video** action. User photo, narration, ambient audio, consent and affirmations stay independently controlled; changing manual template/duration resets the planned montage.
- EN/RU/ES and keyboard focus/reduced motion/mobile widths 320–430px. Nothing starts on mount, auto-submits or auto-plays.
- The owner may download a de-identified, provider-safe storyboard JSON. It contains only curated symbolic scene IDs/camera/prompts and timecodes, **not** the raw challenge/wish/profile.

### Provider privacy and cost boundaries

- `buildCinematicStoryboard` only uses client-entered text in browser memory to choose one of preapproved symbolic scenes. `providerPrompt` is **recomputed from trusted catalog content**, never interpolates personal words. `safeCinematicPrompt` rejects tampering.
- Private client faces, medical data, test results, reports, goal text and identity must not be sent to Kling, Runway, Higgsfield, HeyGen or external analytic pixels. A client photo may be composited locally only after opt-in and image permission.
- HeyGen: previously verified owner's private Digital Twin + approved language voice only. No stock avatars and no new paid render without the owner's separate current approval.
- Current Kling server switches remain OFF: `HH_KLING_PAID_GENERATION_ENABLED`, `HH_KLING_AVATAR_PAID_ENABLED`, `HH_KLING_PREMIUM_RENDER_ENABLED`. API key presence does **not** prove valid paid package or allow client generation.
- Runway was authenticated 2026-10-29 in ChatGPT but its **free workspace had zero available video models**, no brand kits/workflows. Connecting an assistant Plugin is NOT equivalent to server API integration. Higgsfield not yet connected; no extra paid subscription, aggregate router or duplicating requests.
- No external job until live provider quote (currency, expiry, receipt ID), owner-approved maximum, commercial rights and server-verified order/payment. A browser checkbox must never be sole cost authorization; idempotency receipts must be stored before retry and duplicate payment must be prevented in database transactions.
- For private videos, My House uses authenticated, scoped and expiring signed storage; never public YouTube/Metricool/Telegram/WhatsApp. The user's first free clip stays local until explicit account consent and independently validated upload.

### 8-session guided-imagery path

Existing `MandalaGuidedCourse` / `personal-guided-course.mjs` remain the sole eight-session planner. Each approved session should eventually have a distinct connected storyboard, reviewed script, **real** audio master, actual video master, subtitles and checksum. Only the first short free preview is currently deliverable locally; sessions 2–8 are not unlocked products. A professional must review personalized therapeutic scripts. No AI diagnosis, compulsory trauma recall, cure/income/love promise, or autonomous clinical treatment.

### Owner-only offline assembly (optional, no provider costs)

`node scripts/cinematic-video-assemble.mjs ./approved-cinematics/manifest.json output/master.mp4`

Example input (all referenced files must be within the manifest directory and rights-cleared):

```json
{
  "version":"hh-assembly-1","locale":"en","aspect":"landscape",
  "audioMode":"narration_with_music",
  "clips":[
    {"file":"01.mp4","seconds":5,"rightsConfirmed":true},
    {"file":"02.mp4","seconds":5,"rightsConfirmed":true},
    {"file":"03.mp4","seconds":5,"rightsConfirmed":true},
    {"file":"04.mp4","seconds":5,"rightsConfirmed":true}
  ],
  "narration":{"file":"narration.wav","rightsConfirmed":true},
  "music":{"file":"music.wav","rightsConfirmed":true},
  "subtitles":{"file":"subtitles.srt","rightsConfirmed":true}
}
```

The command validates input files and local directory boundaries; requires explicit rights; normalizes 1080p/fps and mixes voice/music at separated levels; optional subtitles use MP4 mov_text; outputs H.264 and AAC when a soundtrack is supplied. `ffprobe` verifies video, duration, and expected audio. This is an **offline owner batch tool**, not an HTTP render service. For long therapeutic videos, reuse cleared scenic masters and combine with unique scripts instead of spending credits on 8×10 min AI footage.

### Future server-side delivery gates (not activated)

1. Real provider account, API contract, commercial license and one controlled non-client render, plus exact cost from provider.
2. Persistent owner-scoped `render_jobs` DB with unique external ID, cost/approval/payment receipt, idempotent status reconciliation; privilege-checked endpoints and queue/worker distinct from expensive Vercel request time.
3. Approved media ingestion with checksum, FFmpeg QA, archive, private RLS storage, signed read links, lifecycle and deletion.
4. Authenticated owner-only 8-session review and entitlement from **real** paid order; non-sensitive progress in My Courses/My Development Path.
5. Independent real iPhone Safari (320/354/390/430) video+audio+download, RLS/account-switch, network error, retry/idempotency, GitHub exact-head CI + Vercel READY exact SHA/domain and provider media readback.

**Honest status:** the zero-cost director/storyboard/montage and offline assembler are actual code, subject to CI/browser QA and production readback. The extended paid-cloud pipeline, server job persistence, auto Drive ingest, eight delivered films and account upload E2E must not be labeled complete until verified.


### Client-prompt acceptance refinement · 29 October

The previously chosen **four base scenes per theme** are preserved as the default film. An explicit supported wish may now replace shot **3** with another **already approved** visual from the existing first-party library. Examples (all on-device, no external image creation): RU `оплата` → `money-magnet`, EN clients/partners → `partners`, RU `отдых и расслабление` → `light-waterfall`, EN mountain-air → `mountain-air`, EN blooming flowers → `wildflower-dance`, ES rest → `gentle-falls`. Additional safe scene descriptions are part of the trusted visual prompt catalog; the raw client wish remains private. The other three stages, duration and user photo/music permissions are retained.

**New release proof:** focused Node tests assert all six localized mappings, unique four-stage order and non-disclosure; the existing Chromium RU390 actual recorded montage scenario now decodes the **first and fourth saved video frames** with FFmpeg and compares real pixels in addition to validating a genuine media container. These tests require exact-head CI SUCCESS and must not be confused with physical owner iPhone Safari playback or unlimited AI text-to-video. No paid API, job, CRM event, storage migration or duplicate editor was introduced.



### Avoidance and styles — rendering acceptance

The owner-requested visual exclusions (water, trees/forests, night) are now enforced without making four copies of a single allowed image. When the chosen theme lacks four distinct safe motifs, the plan finds other **already approved first-party scenes**, keeping each shot's actual `theme` so Canvas paints the correct motif. It never silently reintroduces excluded visual cues or invents unavailable licensed footage. The main topic remains unchanged for the visitor, while individual storyboard shots may use visually compatible neighboring themes. Pure executable checks covered 54/54 theme/locale/duration combinations, all six detailed prompt examples and four distinct acceptable shots for water/tree/night exclusions.

Four named visual style filters (**Golden hour / Nature / Dream / Minimal**) now apply separate Canvas color/light grades to the same moving frames in both preview and actual MediaRecorder, rather than affecting only hypothetical AI-provider prompts. Browser-output video and real recorded pixel comparison remain mandatory CI gates; the on-device source tests do not establish physical iPhone Safari export.
---

# Инженерная программа v2.0 — Holistic Video Studio: от подробного запроса к проверенному видео
**Дата фиксации:** 29.10.2026, America/Toronto. **Статус:** техническое задание и программа поэтапного внедрения; не разрешение на платный рендер, оплату или публикацию. **Единый epic:** [books #2397](https://github.com/andylitvinov-design/books/issues/2397). **Проверенная интеграция v1:** [PR #2534](https://github.com/andylitvinov-design/books/pull/2534) (merged); прежний PR #2518 закрыт как superseded и повторно не мержится. **Зависимый проект персональных сессий:** [#2503](https://github.com/andylitvinov-design/books/issues/2503) и [его инженерное ТЗ](./PERSONAL_VIDEO_THERAPY_TECHNICAL_DESIGN_AND_ROADMAP_20261029.md). **Видео HeyGen SOP:** [ai-projects-brain #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219); при каждом запуске проверять последний датированный комментарий, не копировать изменяемые идентификаторы.

## 1. Цели, приоритеты и границы

**Результат для клиента:** на существующей странице /{en,ru,es}/holistic-support/mandala человек формулирует задачу, получает внятную связанную раскадровку, редактирует каждый кадр, смотрит действительно движущийся предпросмотр, записывает и сохраняет видео с разрешённой музыкой/аффирмациями, при желании и отдельном согласии — кладёт готовый MP4 в свой кабинет. Путь к оригинальным AI-кадрам отдельно требует фактической сметы, подтверждения прав, финансового разрешения, реального выполнения и QA.

**Три разных предложения — не смешивать:**
1. **Free Original Mix** — нулевая стоимость AI: лицензированные собственные видеосцены + локальный Canvas/MediaRecorder + эффекты, текст, выбранный звук. Это новая комбинация, но **не** новые кадры, синтезированные внешней генеративной видеомоделью. Правдивая подпись «Создать бесплатно из имеющихся видео и анимации».
2. **Cinematic AI Background** — действительно новое короткое безличное видео по безопасному визуальному шаблону, с проверенной ценой и отдельным разрешением. Фото клиента/данные тестов никогда не передаются внешней модели; финальный персональный слой — локально либо в собственном защищённом worker после отдельного согласия.
3. **Guided 8 Sessions** — отдельный последовательный продукт: 8 разных терапевтически безопасных сценариев и в перспективе 8 настоящих видеомастеров и озвучек после проверки специалистом. План на восемь сессий не равен восьми произведённым MP4. Не дублировать Session Player/T0–T1–T2 из #2503.

**Не входит без отдельного решения:** новый сайт/вторая студия, автономный клинический психолог, обещания терапевтического/денежного результата, распознавание возраста/пола/диагноза по фото, face-swap клиента, отправка приватной истории внешним LLM, включение подписки на API, Stripe/PayPal Business «по умолчанию», массовая публикация и автоматическая реклама.

**Приоритет:** сначала проверенное качество и доступность бесплатного маршрута; потом безопасное My Videos; лишь затем один одобренный внешний AI-пилот и продукционный оркестратор. Не интегрировать Kling + Runway + Higgsfield одновременно ради самого количества интеграций.

## 2. Верифицированный baseline и точная карта повторного использования

| Слой | Существующий конкретный модуль | Что делать дальше / что НЕ заявлять |
| --- | --- | --- |
| Публичный интерфейс | components/mandala-free-video-studio.tsx; components/mandala-cinematic-director.tsx и CSS; app/[locale]/holistic-support/mandala/page.tsx | Сохранить одну страницу, формы, тему, фото, локальный recorder. Предстоящий мобильный PR #2566 с «мандала сначала + один accordion» сверять перед любой UI-правкой. Сам факт open PR — не live. |
| Режиссура | lib/mandala/cinematic-director.mjs; personal-video-intent.mjs; holistic-video-themes.ts; film-collection-v2.ts | Шесть сценических тем, четыре базовых стадии, выбор и замена безопасных сцен, EN/RU/ES. Сейчас deterministic intent matching, а не универсальное понимание свободного текста. |
| Рендер и музыка | Canvas/MediaRecorder; local-video-music.ts; cinematic-money-video.ts; scripts/cinematic-video-assemble.mjs | Есть браузерный экспорт и офлайн FFmpeg-склейка. Видео может иметь WebM/MP4 в зависимости от поддерживаемого реального кодека; фрагменты только из лицензированной библиотеки. Новые аудиотреки из PR #2550 не считать существующими, пока он не merged/live. |
| Защищённый профиль | GET /api/app/bootstrap?view=portrait; buildPsychPortrait; selectVerifiedCourseEvidence | Только после отдельного opt-in, source/version/freshness проверок. Клиент принимает совет; результат теста не вставляется в AI prompt. |
| Мой кабинет | lib/app/personal-videos.js; app/api/app/personal-videos/route.js и [id]/route.js; components/app/my-personal-videos.jsx; app_private.personal_videos | Текущая модель **MP4 only, ≤12 000 000 B, 3 видео, ≤36MB на пользователя, ≤180MB глобально, 6 попыток в день**; хранилище hh-client-private-media приватное. Разрешённые темы в этой таблице: money, relationships, energy, goals — НЕ все 6 тем режиссёра. Флаг HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED и фактический user A/B E2E проверить до активации. Лимит bucket 50MB **не** отменяет API limit 12MB. |
| Внешний рендер owner-only | lib/kling-video.mjs; lib/kling-avatar.mjs; app/admin/videos/kling-actions.js; app/api/admin/kling-avatar/route.js | Уже есть пилот Kling 3.0 text / 2.5 Turbo image и отдельный аватар владельца. Нет права превращать это в клиентскую платную кнопку без backend order/approval. Текущий код не означает подключение Kling 4.0. |
| Провайдеры и статусы | lib/mandala/cinematic-production.mjs | Есть **чистый** каталог/правила, quote-first decision и state machine, но нет достоверного server-owned оплаченного job ledger / worker / провайдерского master readback. |
| Программа 8 сессий | MandalaGuidedCourse; personal-guided-course.mjs; docs/videos/PERSONAL_VIDEO_THERAPY_* | Отдельное ТЗ #2503 определяет саму сессию, T0/T1/T2 и My Courses. Не писать ещё одну клиническую систему в видеомодуле. |

**Проверяемые внешние ограничения (не цены заказа):** [Kling API updates](https://kling.ai/document-api/updates/api?date=2026-02-11) сообщает о модели 4.0 (28 октября 2026, до 30с и новом API), но её availability, коммерческие права и стоимость **данного аккаунта** не проверены; сохраняем работающие 2.5/3.0 adapters до pilot gate. [Higgsfield API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api) использует отдельный prepaid US-dollar баланс, отличный от подписки сайта/плагина. Runway ChatGPT-аккаунт ранее был подключён, но на проверенном бесплатном workspace список доступных **video models был пуст**; site-backend API не подключён. HeyGen через ChatGPT и HeyGen API на Vercel — разные соединения. Все цены и кредитные лимиты переснимать server-side непосредственно перед конкретной заявкой. Не переносить прошлые балансы, ID или рекламные «free credits» в продукт.

### 2.1 Важные функциональные расхождения, которые надо устранить

- **Free montage ≠ unlimited free text-to-video.** На странице показывать честный источник: «собственные сцены», «новый AI-кадр», «только сценарий», «готовый проверенный MP4».
- **Шесть тем режиссёра ≠ четыре темы существующего private MP4 API.** Не открывать cloud-save для Life/Health без явной additive schema/API/UI миграции и RLS/лимитов E2E; до этого предложить локальное скачивание, не подменять тему в БД.
- **Один основной master video элемент != четыре разных master MP4.** В текущем локальном четырёхкадровом режиме используются Canvas-функции сцен. В новой asset-registry явным полем отмечать real_mp4 / procedural_canvas / provider_ai_approved, чтобы не обещать реальную нарезку из 4 HD-файлов, когда рисуются Canvas сцены.
- **Поддерживаемый MediaRecorder MIME != готовый облачный MP4.** Если браузер даёт WebM, разрешить download, а cloud-save честно заблокировать; не выдавать файл с расширением .mp4 путём переименования WebM.
- **PR #2566/фото iPhone, #2550/новая музыка, #2472/защищённые фото** — параллельные работы. Любой следующий кодовый PR обязан сверить их точные исходники и не регрессировать вошедший код.

## 3. Клиентский контракт: UX, состояния и точные действия

### 3.1 Ввод — компактный мобильный бриф

В уже существующей мобильной студии под видео-превью:
1. **Тема:** Money/Work, Energy, Relationships/Love, Goals/Meaning + Life/Health в дополнительных; единое canonical theme ID и EN/RU/ES labels.
2. **Сложность:** одна основная краткая формулировка, до 160 графем; примеры по темам без диагноза.
3. **Желаемый результат:** одно добровольное изменение/навык, до 160 графем; не считать обещанием эффекта.
4. **Мой профиль:** default «Не подключён». Отдельный выключенный checkbox на чтение собственных тестов + подтверждённый authenticated bootstrap. Отдельно статус «Подключён» / «Нет подходящих результатов» / «Войти» / «Недоступно». Никакого автоматического чтения тестов после загрузки страницы.

Стиль (Golden hour / Nature / Dream / Minimal), нежелательные образы, формат 16:9 / 9:16 / 1:1, длительность 20/30/60с, фото, музыка и аффирмации — дополнительные компактные редактируемые настройки, а не 12 видимых экранов сразу. В каждом поле единый mobile bottom sheet; Back/Done, Escape и focus return; весь CTA на высоте touch target ≥44 CSS px. Для 320×568 разрешён scroll с safe-area, не уменьшая основной шрифт.

**Последовательность UI:** ввод → «Сформировать раскадровку» (пока без расходов) → четыре видимые карточки с реальными названиями кадров и временной шкалой → изменить/поменять местами кадр → «Применить бесплатный монтаж» → живое превью → отдельный tap «Создать видео» → progress/cancel → реальный Blob + playback + download/share → опционально «Сохранить в My Videos» при выполнении всех gate. Показывать отображаемое происхождение футажа и музыку, не навязывать фото и не включать автозапуск.

### 3.2 Конечный автомат локальной студии

Состояния: editing → planned → applied → previewing → recording → recorded → local_verified → downloaded; альтернативы invalidated, cancelled, unsupported_codec, media_error. Переход recording требует **человеческого нажатия**, не изменения флага. Любая правка scene/style/theme/aspect/duration/photo/audio/affirmations после finished должна инвалидировать предыдущий Blob/доступный download или показывать как **старую версию** с её hash; не выдавать прежний результат за текущий.

При screen-hide или account switch — корректно остановить capture tracks, playback, speechSynthesis и очистить object URLs; не терять полностью клиентскую работу до подтверждённой перезаписи. При back/forward не сохранять чувствительное в URL, localStorage, sessionStorage, CRM или telemetry. Восстановление гостевого редактирования: только текущая активная память страницы; закрытие вкладки может потерять draft, UI предупреждает об этом.

**Definition of Done для Free:** Chromium AND WebKit создают downloadable видео с декодируемыми динамическими кадрами; звук либо действительно слышен и есть audio track, либо пользователь выбрал Silent. Клик, screenshot, 200 или Blob(size>0) сами по себе — не достаточное доказательство.

## 4. Режиссёрский движок v2: детерминированный контракт и живое качество

### 4.1 Версионированная модель (предложение, не существующий API)

~~~ts
type CinematicBriefV2 = {
  version: "brief-v2"; locale: "en"|"ru"|"es";
  primaryTheme: "money"|"energy"|"relationships"|"goals"|"life"|"health";
  difficulty: string; desiredChange: string; // local, max 160 graphemes each
  preferredStyle: "warm"|"nature"|"dream"|"minimal";
  exclusions: string[]; // categorized + confirmed by client
  aspect: "landscape"|"portrait"|"square";
  durationSec: 20|30|60;
  useTestSuggestions: boolean; // UI-only opt-in; scores never serialized to provider
};
type ShotV2 = {
  index: 1|2|3|4; sceneId: string; sourceTheme: string;
  sourceType: "procedural_canvas"|"licensed_mp4"|"approved_ai_asset";
  approvedAssetId: string|null; licenseId: string|null;
  role: "arrival"|"support"|"possibility"|"integration";
  startMs: number; durationMs: number;
  visualKey: string; paletteKey: string; cameraKey: string;
  motionKey: string; transition: "soft_fade"|"hard_cut";
  promptTemplateId: string; promptTemplateVersion: string;
};
type CinematicPlanV2 = {
  version: "cinematic-plan-v2"; planId: string; revision: number;
  locale: string; visualStyle: string; aspect: string;
  shotCount: 4; durationMs: number; shots: readonly ShotV2[];
  renderer: "local"; externalRenderAllowed: false;
  contentSha256: string; requiresProfessionalReview: boolean;
};
~~~

В сериализуемом / экспортируемом **безопасном** плане нет свободных difficulty/desiredChange, фото, результатов тестов, медицинских слов, идентификатора пользователя, телефона/почты или client account ID. При пользовательском изменении создаётся новая revision и canonical hash (SHA-256 от versioned canonical JSON); старый hash/Blob/quote invalidated. В P0 hash может применяться только локально и без persistence.

### 4.2 Семантическая компиляция сцен

Шаги:
1. Показать клиенту его исходную формулировку локально; проверить допустимую длину Unicode/невидимые символы, не пересылать на сервер.
2. Разобрать только **визуальные предпочтения** (например вода, лес, высота, ночь, тепло/холод, интенсивность) через EN/RU/ES curated dictionary и явный выбор; не выводить диагноз, травму, экономический статус или личность по тексту.
3. Создать safe visual tokens: theme + visual/style/camera/motion + exclusions. Определить confidence: exact_category_match / related / fallback, показывать «почему этот сюжет».
4. Построить arc из четырёх функций: arrival (ориентировка), support (ресурс), possibility (добровольная перспектива), integration (мягкое завершение). Не дублировать кадры, выдерживать длительности и последовательность.
5. **Согласованность кадров:** одна palette/style, один вид темпа, одинаковый горизонт/крупность в соседних сценах по правилу continuity, ограничение резких вспышек/вызывающих качку движений. Смена sceneId не нарушает global style.
6. Проверить реальные allowed asset IDs, license/rights, supported aspect/render engine. Если подходящих четырёх нет, детерминированный разрешённый fallback **с явным объяснением**; никогда не возвращать запрещённую сцену.
7. Для шаблона возможного AI-фона пересобрать **только из серверного allowlist** promptTemplateId + version. Клиентский prompt не является доверенным; при поступлении с фронтенда сервер не должен принимать свободное поле providerPrompt. Подписывать/hash план на сервере в будущей админке.
8. Превью и MediaRecorder используют **тот же** ScenePlan, timeline и style; snapshot test пикселей первого/последнего кадра, а не отдельно созданный красивый poster.

**Избегаемые сценарии:** RU/EN/ES синонимы, опечатки, отрицания («не хочу море»), контекст («не тёмный лес, а утро»), комбинации исключений. Если выражение неоднозначно — спросить уточнение в UI, не угадать. Подтверждённый avoid-словарь важнее желаемого красивого кадра. Не допускать мелькания, резких склеек, strobe, непрошеных лиц/текста, псевдомедицинских обещаний.

### 4.3 Реестр ассетов — недостающий узел качества

Не загружать произвольный stock из URL «по поиску». Построить поверх существующих film-collection-v2/real-money-film-library один **манифестный индекс** разрешённых ассетов:

~~~ts
type VideoAssetDescriptor = {
  assetId: string; version: string;
  sourceKind: "first_party_canvas"|"licensed_master_mp4"|"approved_provider_background";
  src: string|null; posterSrc: string|null; languageNeutral: boolean;
  width: number|null; height: number|null; fps: number|null; durationSec: number|null;
  bytes: number|null; sha256: string|null;
  licenseId: string; commercialUse: "approved"|"review_required"|"blocked";
  rightsProofRef: string; attributionRequired: boolean; allowedSurfaces: string[];
  tags: string[]; aspectSupport: string[]; accessibilityRiskFlags: string[];
  approvalState: "draft"|"qa_verified"|"published"|"revoked";
};
~~~

Сканировать существующие собственные assets, не создавать вторые копии MP4. Исключить неподтверждённые лицензии. Регрессии: missing file/codec, silent music, 404 poster, wrong first frame, broken HD iPhone decode. Удаление/отзыв rights должен делать ролик недоступным для новой сборки, не ломая учёт ранее выданных лицензированных masters.

**Новые бесплатные визуалы:** сначала параметрические эффекты Canvas/WebGL по разрешённой конфигурации и мягкая анимация оригинальной графики; новые клипы только при наличии прав. Локальная диффузия/WebGPU — исследовательский spike с ограничением памяти/веса/поддержки iOS, НЕ обещать её доступной всем и не грузить большие модели на мобильные браузеры без согласия.

## 5. Точный серверный контур платного AI (проект, НЕ активировано)

### 5.1 Два независимых измерения конфиденциальности

**Background origin:** public_sanitized — обезличенная нейтральная сцена, которую разрешено отправить генератору после owner approval.  
**Final delivery:** client_private — готовая локальная композиция или защищённый master, доступный только собственному клиенту.

Эти статусы **не синонимы**. Запрещено брать client_private brief и просто менять флаг на public. Внешний provider adapter получает только утверждённый asset prompt и лицензированный starter frame, без client_id, тестов, фото клиента, голоса, метаданных профиля, сессий, IP и медиа. Клиент может получить персональный результат *после* безопасного фона через местное наложение; asset общего фона хранится как отдельный нейтральный ресурс.

**Роли:** guest может только Free без API; signed-in client может сохранить свой готовый MP4 после отдельного consent (если enabled) и создать запрос на расчёт без оплаты; owner/admin может управлять quotes, cost cap, approved public asset render. Действующий owner Kling admin не расширять на обычных пользователей напрямую.

### 5.2 Интерфейс адаптера (второй provider — только после одного проверенного pilot)

~~~ts
interface ApprovedVideoProviderAdapter {
  readonly providerId: string;
  capabilities(): Promise<{
    enabled: boolean; entitlementsVerifiedAt: string;
    models: {key:string;version:string;durations:number[];aspects:string[];resolution:string[]}[];
  }>;
  quote(art: SafeArtPlan, settings: RenderSettings): Promise<{
    providerQuoteId:string; amountMinor:number; currency:string;
    source:"provider_estimate"|"verified_owner_rate_card";
    rateVersion:string; expiresAt:string; rightsConfirmed:boolean;
  }>;
  submit(job: OwnerApprovedRenderJob): Promise<{
    externalTaskId:string; providerTaskId:string; status:"submitted"|"processing";
  }>;
  status(providerTaskIdOrExternalId:string): Promise<{
    status:"queued"|"processing"|"succeeded"|"failed"|"unknown";
    outputUrl?:string; chargedMinor?:number; errorClass?:string;
  }>;
}
~~~

**Реальная спецификация для adapters:** нынешние lib/kling-video.mjs (Kling 2.5 Turbo/3.0) и owner-only UI — первая база; endpoint/поля сверять с актуальными официальными docs **для доступной account model**. Kling 4.0 имеет отдельные пути и стоимость, его не «подменять» под 3.0. Runway выбирать лишь если доступна разрешённая video-модель в workspace/backend, а не просто ChatGPT Plugin. Higgsfield API — отдельные balance/key/estimate от consumer аккаунта; автопополнение выключено. HeyGen — отдельная owner-only presenter-полоса, только проверенный private Andrey Digital Twin, language-approved voice и real approved background, 1080p; не подменять его generic avatar и не показывать как дешевый B-roll provider.

**Источники верификации провайдера:** Kling https://kling.ai/document-api/updates/api?date=2026-02-11; Runway https://docs.dev.runwayml.com/guides/models/; Higgsfield https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api. Эти страницы — внешние ориентиры, а не подтверждение включённой платной модели в нашем аккаунте.

### 5.3 Плановые API — НЕ существующие endpoints

Все только в уже существующем Next server namespace, без нового ChatGPT/MCP-аккаунта клиента. Использовать createRequestAuth/requireSameOrigin/consumeRate/PRIVATE_HEADERS/safeError из работающих app API; для owner-only наследовать существующую server-side admin-authorize. Не принимать accountId, role, paid=true, price, callback URL, raw prompt от клиента.

| Маршрут (предлагаемый) | Роль / действие / ответ |
| --- | --- |
| GET /api/admin/video-render/capabilities | owner: какие модели реально доступны и разрешены; false/off если entitlement/rights не подтверждены |
| POST /api/admin/video-render/quotes | owner: передать только trusted artTemplate ID + model/settings; server пересобирает safe prompt; результат quoteId, exact currency/minor, rate source/version/expiry, canSubmit=false |
| POST /api/admin/video-render/jobs | owner: quoteId, server approvalId, verifiedOrderId (если клиентская продажа), Idempotency-Key, safePlanHash; сервер самостоятельно подтверждает цену/права/владельца/бюджет/платёж |
| GET /api/admin/video-render/jobs/:id | owner: status, timestamps, provider receipt, QA/asset readiness без содержимого клиента |
| POST /api/admin/video-render/jobs/:id/reconcile | owner/worker: read-only provider status/receipt query после unknown timeout; никакого второго billable POST |
| POST /api/admin/video-render/jobs/:id/approve-media | owner: отдельный QA/signoff на настоящий скачанный master |
| POST /api/admin/video-render/webhooks/:provider | только provider с проверенной подписью/временным окном/anti-replay; не выполнять платный генератор на входящий webhook |
| GET/POST /api/app/personal-videos и GET/POST/DELETE /api/app/personal-videos/:id | **уже существуют**: переиспользовать для собственных готовых MP4, не менять API без миграции/compat-тестов |

**Предлагаемые error-коды:** 401 auth_required, 403 permission_denied, 404 not_found, 409 revision_conflict/quote_expired/already_submitted, 413 media_quota, 422 invalid_parameters, 429 rate_limited, 503 provider_disabled/quote_unavailable. Не включать upstream raw provider error/secret/prompt в клиентский ответ; добавить opaque requestId и владельцу защищённый debug event.

### 5.4 Плановые таблицы (до миграции — аудит фактической схемы)

**Только если существующие таблицы не подходят**; app_private namespace, scoped RLS, минимальные grant для hh_app_backend/worker role, непрозрачные IDs и зачистка. Оставить текущую app_private.personal_videos **как есть** для self-service 12MB MP4. Не смешивать practitioner client_delivery_assets, Telegram, CRM и learning_video_progress.

~~~sql
-- ПСЕВДО-DDL ДЛЯ РЕВЬЮ, НЕ ГОТОВАЯ МИГРАЦИЯ.
-- Версию/типы FK/roles сверить с production схемой и Supabase advisors.
app_private.video_render_jobs (
  id uuid primary key,
  owner_account_id uuid not null references app.accounts(id),
  idempotency_key_hash text not null,
  art_template_id text not null,
  art_template_version text not null,
  safe_plan_sha256 char(64) not null,
  provider text not null, model_key text not null, model_version text not null,
  provider_quote_id text, quote_source text, quote_expires_at timestamptz,
  currency char(3), quoted_minor bigint, approved_cap_minor bigint,
  approval_id uuid, verified_order_id uuid,
  external_task_id text, provider_task_id text, provider_receipt_id text,
  state text not null, revision integer not null default 0,
  submission_uncertain boolean not null default false,
  approved_asset_id uuid, charged_minor bigint,
  created_at timestamptz, updated_at timestamptz, submitted_at timestamptz,
  provider_completed_at timestamptz, media_verified_at timestamptz
);
-- Уникальные индексы: (owner_account_id,idempotency_key_hash);
-- (provider,external_task_id) WHERE NOT NULL;
-- (provider,provider_task_id) WHERE NOT NULL.
-- Кредитные суммы BIGINT + проверки >=0; hard spend caps, timestamps, FK/order.
app_private.video_render_events (
  id uuid primary key, render_job_id uuid not null, ordinal bigint not null,
  from_state text, to_state text, event_kind text not null,
  provider_receipt_ref text, error_class text, actor_role text,
  created_at timestamptz not null,
  unique(render_job_id,ordinal)
);
~~~

**Главная инварианта:** один idempotency key = одна учтённая **внешняя** попытка. Сначала одна транзакция с owner/admin rights, UNIQUE lease, budget reservation, quote version/expiry, checked order receipt; затем durable outbox/claim worker вызывает provider. При timeout POST состояние submission_uncertain, запрет повторного платного POST до readback по external_task_id, сверки provider jobs и явного решения владельца. Нельзя считать, что provider idempotency гарантируется названием поля. Если двойное списание возможно, отключить auto retry. Переходы сравнивать ревизией и статусом атомарно.

**Cost guard:**
- Все платные feature flags default OFF; старые HH_KLING_PAID_GENERATION_ENABLED / HH_KLING_PREMIUM_RENDER_ENABLED / HH_KLING_AVATAR_PAID_ENABLED сохраняются как серверные gates.
- Первый пилот только owner-owned public_sanitized scene с явно утверждённым **максимумом** и model/version/seconds/resolution/currency. Никаких автоматических top-up, долгих мультирендеров или кросс-провайдерских «fallback за деньги».
- Для клиента server-verified реальная подтверждённая оплата и entitlement **перед** billable submit; пока у владельца нет подтверждённого платёжного бизнес-маршрута — только quote/manual owner pilot. Не подставлять Stripe/PayPal Business.
- Подтверждение цены не может быть строкой, NaN, Infinity, float; integer minor units, подходящая валюта и expired timestamp. Rate card и provider account credit readback не подменять произвольным локальным коэффициентом.
- Три лимита: per-job max, per-day/period total, per-provider budget; atomic reservations и остаток после actual receipt, no bypass by parallel worker.

### 5.5 Job state machine и эксплуатация

~~~text
draft → quote_requested → quoted → owner_approved
→ payment_verified (если нужна продажа) → reserved
→ submission_in_flight → submitted → processing
→ provider_ready → asset_ingested → media_qa_passed
→ approved_for_use → delivered / published_after_separate_approval
альтернативы:
quote_expired, cancelled_before_submit, submission_uncertain,
provider_failed, download_failed, qa_rejected, delivery_failed, refund_review.
~~~

Инварианты: client-private запрещено на выход provider; charged_minor только по реальному счёту/receipt; provider_ready без собственных байтов — не delivered; QA без playable media — не passed; release approval отдельный от генерации. Для неизвестного статуса от API не делать второй request наугад; корректный reconcile + owner-visible «Требует проверки». WEBHOOK verify signature + timestamp + replay ID + schema validation; webhooks только меняют state, но не становятся доказательством оплаты без readback. Polling bounded (например экспоненциальный backoff с jitter и hard retry count), переходы идемпотентны.

**Worker:** тяжёлый FFmpeg и большой provider-output download **не** выполнять на коротком Vercel HTTP request. P0 — существующая авторизованная owner-offline сборка; P3 — отдельный ограниченный owner-owned worker/queue, его стоимость и инфраструктура требуют одобрения. Vercel Cron/Next API могут выдать короткий signed claim/reconcile без heavyweight assembly, с auth/least privilege/timeout. Для Postgres claim SELECT ... FOR UPDATE SKIP LOCKED, fencing token + lease_until, max attempts; worker secrets недоступны клиенту. Без устойчивого worker завершение вручную и честный status, не fake ready.

## 6. Монтаж, QA и хранение результата

### 6.1 Видеоконвейер

1. Проверить реальное право использовать каждый исходник; взять verified source asset + poster и version.
2. Для provider output: только HTTPS доверенных provider/CDN origin, redirect disabled, запрет private/internal IP и SSRF, DNS/rebinding-защита, max download bytes/time/content type; не принимать произвольный URL от пользователя.
3. Ingest временно в isolated workspace; FFprobe metadata, MIME/magic, duration, frame dimensions, FPS, codec, audio track presence, corrupt/truncated file; SHA-256 от реально скачанных байтов.
4. Собрать 16:9 / 9:16 / 1:1 без обрезки главного лица/портрета; existing owner-offline FFmpeg использует blurred licensed original background для aspect fill, не чёрные поля. Вертикальные кадры проверить на overscan, safe margins, captions/неперекрытие.
5. Единая скорость/цвет и мягкие переходы, нормализация громкости музыки под реально присутствующей voice, независимый rights check для голоса и музыкального файла. Если клиент выбрал музыку — при потере аудио stop/error, не тихо выпускать silent.
6. Выход для общего/public master: H.264 yuv420p, AAC 48kHz если нужен звук, faststart, poster, optional SRT/VTT/soft subtitles, license manifest и checksum. 1080p — **целевая настройка**, а не доказательство, что каждый источник достаточно качественный; проверить upscale policy.
7. Сравнить реальные декодированные кадры в нескольких временных точках и фактическую звуковую PCM energy, размер/длительность и выбранный voice (для HeyGen — lip-sync, identity, язык, background). Только затем media_qa_passed.
8. Output archive: для одобренного публичного сайта owner-approved Drive master → отдельно owner-approved YouTube/Metricool; website embed ленивый, с poster, без autoplay. Частные клиентские клипы — private bucket и authenticated signed read, **никакого YouTube/Telegram/WhatsApp**.

### 6.2 Границы My Videos

Есть два разных класса:
- **Client self-service finished MP4**: уже существующий API и app_private.personal_videos, лимит ≤12MB/3 видео/36MB owner/180MB global. Доступ только по verified auth + owner-scoped key; signed upload TTL 2 часа, после DELETE учитывать оставшуюся жизнь токена и quota hold/re-cleanup. Проверить MIME=video/mp4, ftyp, фактические bytes и playable duration **перед** статусом ready. Результат и права другого аккаунта строго 404/403.
- **Professional session masters (>12MB, 8 эпизодов)**: **не** вкладывать в self-service gallery. Переиспользовать существующую session-delivery/media инфраструктуру лишь после аудита совместимости ownership/consent; если несовместимо, добавить узкий manifest+RLS для verified treatment/media assets и отдельную retention policy, без копии файла в YouTube.

При расширении тем Life/Health проверить согласованно DB CHECK, lib/app/personal-videos.js allowlist, EN/RU/ES My Videos UI и всех migrations/tests. Нельзя просто отправить theme="energy" вместо "health" ради прохождения API. WebM не переименовывать и не загружать туда, где разрешён только MP4; клиент получает локальную ссылку + честное объяснение.

**Consent matrix:** отдельное opt-in для чтения тестов; отдельное для приватного сохранения готового фильма; отдельное для передачи профессионалу; отдельное для public upload; отдельное, заранее согласованное owner approval для внешнего AI/paid генератора. Отзыв запрещает новые reads/exports, удаляет разрешённые private copies согласно policy и оставляет необходимый минимальный billing/audit record без личного содержания.

## 7. Интеграция с программой восьми сессий и кабинетами

**Не реализовать здесь второй Session Player.** Фиксированный контракт #2503:
- один source-backed planner: личная цель, возможные подтверждённые результаты после добровольного consent, 8 **разных** эпизодов (ориентировка → ресурс → гибкость → опора → границы → шаг → выбор → интеграция);
- Session 1: существующий short local film, если реально закодирован и проигрывается; #2–#8 сначала только script/storyboard с честной пометкой, не восемь оплаченных «готовых видео»;
- future mastered package: отдельный versioned manifest на **каждый** sessionNumber/locale/approvedScriptId/voiceId/realMP4/realAudio/subtitle/sha256/license/reviewerApproval/entitlementId;
- после реальных материалов использовать **тот же** клиентский защищённый видеоплеер и существующий My Courses/My Progress read-model, не записывать private course views как публичный YouTube или как Reiki course_key;
- T0/T1/T2 в одной сессии — добровольные одинаковые моментные шкалы из [#2503](./PERSONAL_VIDEO_THERAPY_TECHNICAL_DESIGN_AND_ROADMAP_20261029.md); не смешивать с клиническими тестами, не делать inferred treatment outcome;
- AI подсказки/медитации не дают диагнозы, гомеопатические назначения, принудительную работу с травмой и гарантии. Все 8 персональных терапевтических masters, озвучки и программа требуют отдельной проверки специалистом.

**Практическая стратегия качества/стоимости:** для серии используй 8 оригинальных проверенных сценариев и многократно допустимые лицензированные атмосферные footage/оригинальную музыку. Для отличительных переходов можно заказать **несколько** коротких публично-безопасных AI-сцен после одобрения, а не 8 × продолжительный дорогой provider render. HeyGen Digital Twin для утверждённого вступления/объяснения и только после отдельного согласия на рендер/расходы.

## 8. Security/RLS/privacy review и антидубли

**Ни один AI provider job не должен содержать:** имя, номер телефона/email, raw clientWish, фотографию/голос/лицо, protected test source/result, self-rating T0/T1/T2, врачебный/психотерапевтический отчёт, CRM contact/deal, сырые логи Session Player, персональный login JWT. По умолчанию GA4/Meta privacy hold не менять.

**Сервер:** verified actor из сессии, requireSameOrigin для write, no-store PRIVATE_HEADERS, ограничение body, rate limit, server-generated owned resource IDs и readback; owner-only роли отдельно; не доверять frontend requested provider/price/plan hash без серверной сверки. CSRF, SSRF, IDOR, race double-click, token reuse, revoked consent, expired quote, account-switch, 401/403, network timeout, object storage outage.

**БД:** RLS ENABLE + FORCE если модель доступа совместима, deny PUBLIC/anon/authenticated grants, explicit hh_app_backend owner policy USING/WITH CHECK + active-account проверка, защищённые worker capabilities; ни один SECURITY DEFINER/public view не должен обходить owner scope. Чувствительные тексты в private encryption/AAD согласно существующим app crypto conventions, не в plaintext индексах и не в analytics. Схему и RLS проверить через Supabase security advisors и пользовательские A/B сценарии прежде миграции. Все proposed DDL из §5 — лишь схемный набросок, не executable migration.

**Управление и конкурентность:** хранить статус job как authoritative server-side, optimistic revision, транзакционный reserve, unique provider external ID, monotonic event ordinal, no parallel billing charge; при запуске двух PR Sweep обновлять issue/lease и не создавать повторные render workers/медиа таблицы. При несовместимых PR — интегрировать в текущую ветку, никогда не мержить старый #2518 поверх #2534.

## 9. Операционная наблюдаемость и стоимость

**Privacy-safe telemetry:** event name, approved asset ID, provider/mode, error category, stage duration buckets, account-scoped **необратимый** внутренний count при необходимости, агрегат success/failure, checksum presence, provider paid_receipt existence. Нет raw prompts, scores, фото URLs, личных video URLs, payloads, JWT, клинического контента. Минимальная retention и логика удаления при user request.

**Dashboard владельца:** Free successful encoded exports, % audio-verified, mobile Safari failures; provider quote availability, task status unknown, unique paid submissions, actual chargedMinor vs approved cap, final QA pass/rejected, private delivery confirmed, unit cost of successful master, orphaned signed uploads/retry cleanup. Не отображать деньги «заработано» по клику, не считать PR merge доказательством доставки.

**Budget policy:** начальный предел платных AI tasks = 0 до отдельного owner approval; только ручная установка положительного cap и provider key. Если charge/availability неизвестны — route disabled. Отдельно контролировать затраты storage, Vercel functions/cron, egress и тяжёлого video worker. Не делать платные масштабные автоматические тесты.

## 10. План внедрения: зависимости, PR-разбиение и критерии выхода

Оценки ниже — **инженерная трудоёмкость**, не обещание даты и не разрешение на фоновые расходы. Каждый PR раздельный, максимально узкий; редактировать существующие модули и переиспользовать CI. Для code changes требовать точную актуальную production branch и AGENTS.md.

| Шаг / P | Deliverables и точные файлы | Зависимости | Exit gate / проверка | Оценка |
| --- | --- | --- | --- | --- |
| P0. Source freeze & QA | Вытянуть Vercel READY/SHA, #2534, #2566, #2550, #2472; source+rights inventory, WebKit failures; составить pinned baseline | GitHub/Vercel read-only | Нет конфликтующих UI изменений; утверждён список current vs planned | 0.5–1.5 dev-day |
| P1. Free Director v2 | Улучшить cinematic-director.mjs, intent matching, scene metadata, snapshot hash, visual exclusion & preview truth; components/mandala-cinematic-director.tsx | P0 | EN/RU/ES, реальные 4 разных shots, editing/avoid, zero network provider POST | 2–4 dev-days |
| P1b. Local render robustness | Один Canvas/MediaRecorder, audio attach guard, codec detection, cancellation/cleanup, blurred aspect, poster/metadata; scripts/verify-holistic-mandala-browser.mjs | P1, текущее audio UI | ffprobe/PCM/pixel diffusion test и WebKit 320/390/430, 1 real iPhone pilot | 2–5 dev-days |
| P2. Asset registry & rights | Single asset descriptors and license manifest over original library, checksum, poster/codec tests, no new second storage | P0 | Все выдаваемые assets реально существуют и подтверждены право/codec/provenance | 1–3 dev-days |
| P3. My Videos real save | Проверить existing signed upload token/DB/flag/RLS; расширить Life/Health **только additive**; profile/account switch; UI в существующем Cabinet | P1b; real account A/B; storage quota approval | Owner A upload/complete/play/delete/readback, B denied, 12MB/quota errors, no private public URL | 2–5 dev-days |
| P4a. Provider capabilities/quote-only | lib/mandala/cinematic-production.mjs + owner lib/kling-video.mjs adapter, server-only owner endpoint, commercial rights/entitlement/cost readback; no POST | P2, реальный provider account | Цена/currency/version/expiry показана достоверно; no billable call; all fail-closed tests | 1–3 dev-days |
| P4b. Durable jobs & owner pilot | Приватный job/event ledger, approval+receipt+cap, atomic reserve/idempotent outbox, one explicitly approved neutral short render, reconciliation/readback | P4a + отдельное расходное разрешение + ownership/RLS | Реальный provider task ID/charge receipt, повторный POST не списывает дважды; unknown outcomes reconciled | 3–7 dev-days |
| P4c. Worker & media QA | Приватный background ingest, ffprobe/FFmpeg/sha256/poster/music/voice, owner QA, controlled storage + cleanup | P4b + выбор/одобрение worker инфраструктуры | Реальный verified MP4 с нужным кодеком/длительностью, readback/rights/QA, failure/rollback | 3–6 dev-days |
| P5. Eight sessions | Reuse #2503, existing Script/meditation/audio/course modes; 8 distinct human-reviewed masters per selected locale, protected playback and progress | P1–P4 as needed; clinical approval, media rights | 8 playable files и реальные озвучки **по заявленному языку**, verified entitlement, user A/B | 5–12 dev-days + производство медиа |
| P6. Commercial rollout | Verified checkout/order/entitlement (только реально доступный provider), neutral private notifications, support/refund and cost dashboard | P4/P5, owner price, provider spend authorization | 1 real paid test charge → provider task → QA master → own cabinet → readback/delete/refund path | 3–7 dev-days |

**Идея экономии:** бесплатный P0–P3 даёт законченный ценностный продукт без внешних генеративных расходов. Оплачиваемый P4 — отдельная гипотеза, запускать после измерения спроса на Free и готовой доставки, а не делать обязательной зависимостью editor. Этапы можно дробить на небольшие PR, но нельзя отрезать idempotency/security тесты ради быстрого merge.

### 10.1 Разбивка задач без дублирования

- **#2397** — единый epic для Studio/Cinematic Director/Free/Private Save/AI Premium. В этом же issue вести acceptance evidence и зависимости.
- **#2256** — существующий owner Kling-пилот, не второй provider API с другими секретами.
- **#2503** — Session Player/T0-T1-T2/8 курсов/clinical review и собственное ТЗ. Здесь только контракт на media asset/status.
- **#990** — существующая платежная воронка и подтверждённый заказ; не создавать «клик=оплата».
- **#985** — CRM только по отдельному маркетинговому согласию; сырой сценарий и здоровье не попадут в contact timeline.
- **#623** — YouTube OAuth, сайт public video only после отдельного одобрения публикации.
- **#2566 / #2550 / #2472** — редактор мобильного iPhone/оригинальная музыка/фото; учитывать фактическую дату merge до UI правок.
- **#988** — реклама/атрибуция не получает личные тесты или самочувствие; privacy hold не обходить.

### 10.2 Обязательные acceptance tests

| Уровень | Проверяемые сценарии |
| --- | --- |
| Unit / locales | 6 тем × EN/RU/ES, четыре разных таймированных сцены; reason/exclusions/negations, trusted prompt never raw text; swap/replace no duplicates; invalid input Unicode; safe fallback or explicit user clarification |
| Render | Один реальный encoded stream, разные декодированные first/middle/last кадры; звук присутствует/слышим, отсутствие silent substitute; экспорт портрет/квадрат/landscape без обрезки; proper file extension MIME; pause/cancel/visibility |
| iPhone mobile | Browser Chromium+WebKit 320/354/390/430, реальный iPhone Safari отдельно; photo picker HEIC/JPG/PNG, permission, 44px touch, focus return, keyboard, safe-area, reduced-motion/VoiceOver |
| Privacy / RLS | Free before opt-in = 0 provider/analytics upload; protected profile only after consent; login A account switch B; A→B file IDOR denied, signed link 60s, deletion and unexpired upload token reappearance; private video never public |
| Cost / concurrency | Unknown/malformed quote, currency mismatch, expired rate, payment unverified, cap exceeded, daily budget, 2 simultaneous submits, timeout unknown with no blind retry, provider webhook spoof, provider receipt readback, revoked rights |
| Media / worker | Corrupt MP4, malicious URLs/SSRF, oversized output, bad codec, silent audio, expired provider URL, retry with lease fencing, checksum mismatch, partial upload cleanup, missing poster/subtitle, stale job records |
| Course | 8 IDs, differing narrative roles, only actual ready video/audio available, STOP/Skip, practitioner approval, same T0/T1/T2 definitions; private progress only after server readback |

**CI workflow:** сохранить текущий path-scoped .github/workflows/holistic-support-mandala.yml, добавить новые focused unit/TS/lint/build/Chromium+WebKit tests без дублирования длинных repo-wide job. Способ проверки: CI на **точном head SHA**, без предположения «queued = success»; избегать restart CI от бессмысленных commit. Не выключать cost-aware preview policy. Проверить git diff, TypeScript strict, ESLint, Next build; внешний платный provider — только один вручную approved smoke, НЕ в обычном CI.

## 11. Протокол релиза и отката

1. Перед правкой: чтение AGENTS.md, issue #2397 и связанные последние комментарии, реального Vercel prod branch/SHA, пересекающихся PR. Выбирать только необходимые файлы; без конкурирующей UI ветки и дубликатов.
2. Открыть короткий PR в **codex/public-book-library**, снимок exact head SHA, path-scoped focused tests, независимый check прав и новых зависимостей, перечень реальных пользовательских сценариев.
3. Тесты: Node focused tests, typecheck, lint, build, Chromium + WebKit с реально скачанным и декодированным видео; для БД RLS/owner A/B; для платного провайдера реальный receipt, но только после отдельной авторизации.
4. При merge проверять expected_head_sha и отличие target base, не auto-merge PR с конфликтующими UI. Для docs-only PR runtime E2E не представлять как выполненный. Merge SHA != deployed SHA.
5. После merge: Vercel deployment **READY**, ровно production commit SHA, alias holistichouse.vercel.app, EN/RU/ES actual routes, account auth, real click → media decode, mobile Safari. Production alias и preview URL не путать.
6. Мониторить ошибочные коды, rate/worker cost/privacy telemetry; откат — revert последнего ограниченного PR или server flags OFF без скрытого сброса клиентских платных job receipts. Не отзывать signed URLs «мысленно»; соблюсти срок жизни ключей, cleanup и user deletion.

**Отдельные доказательства:** (A) код/PR, (B) CI, (C) Vercel READY SHA+alias, (D) реальный пользовательский экспорт на iPhone, (E) внешний provider charge/MP4/QA, (F) confirmed checkout/delivery. Ни один пункт не заменяет соседний.

## 12. Открытые решения владельца — только когда соответствующий gate достигнут

1. **Нужен ли вообще платный внешний AI-рендер?** Если да: выбрать **одного** провайдера, модель/разрешение/длину, пробную смету и верхний бюджет на один owner-owned обезличенный кадр. До этого P0–P3 работают без расходов.
2. **Расширять ли приватное хранение сверх 12MB/3 MP4?** Решение после реального owner A/B и iPhone проверки, оценки Supabase egress/storage; не включать тариф и не менять лимиты заранее.
3. **Когда опубликована/продаётся серия восьми сессий?** Только после утверждения сценариев/голоса/прав, реальных восьми master videos, цены, проверенного доступного платёжного маршрута и профессиональной подписи; публикация каждого публичного материала отдельным QA/approval.

### 12.1 Точные критерии закрытия epic

- Free: живой устойчивый EN/RU/ES пользовательский сценарий с настоящим видеовыходом, мультимедийным QA и independent iPhone proof.
- Private Save: аккаунт A загрузил/скачал/удалил, B не имеет доступа; настоящие DB/RLS/storage события; consent+quota/codec ограничения проверены.
- Cinematic AI: конкретный одобренный provider/job/cost receipt, реальная новая обезличенная сцена, downloaded MP4/hash + owner QA + корректная утилизация/доставка без второго списания.
- 8 Sessions: восемь разных настоящих проверенных эпизодов с выбранным языком, проверенный прогресс/право доступа, а не только восемь карточек.
- Payment/Publication: отдельные confirmed billing/provider receipts, secure client delivery и разрешение публикации; отсутствие клик-фиктивных событий.
- **Если соответствующий gate не пройден — пункт остаётся «планируется/заблокировано», даже при зелёном build или закрытом PR.**

---

**Этот v2 раздел является программой реализации, а не декларацией о выполнении P2–P6.** Предыдущая v1 техническая документация и реальный код из merged #2534 сохраняются выше для трассировки. Продолжать работу по existing epic #2397, а не создавать параллельный продукт.
---

# Приложение v3.0 · Как перейти от монтажа готовых сцен к настоящей качественной AI-видеогенерации
**Зафиксировано 29 октября 2026 · ТЗ / gap analysis · НЕ код новой генерации, НЕ разрешение на оплату.**  
**Основной epic:** books #2397. Прежнее ТЗ v2 (разделы 1–12) остаётся в силе; этот раздел уточняет **критический путь получения НОВЫХ движущихся кадров из запроса клиента** и минимально необходимую инфраструктуру. Реализация бесплатной студии уже перенесена через merged PR #2534; старый #2518 закрыт и не должен возвращаться в production.

## 13. Диагноз: чего в существующей системе действительно нет

Сегодня MandalaFreeVideoStudio + cinematic-director.mjs делают новое сочетание уже существующих first-party video assets и процедурных Canvas-сцен; могут записать настоящий MP4/WebM в браузере, но **не создают новые AI-видеокадры по свободному тексту**. cinematic-production.mjs хранит потенциальные имена моделей и правила платной генерации в чистых функциях, а не реальный server-to-provider pipeline. Kling API owner-only уже имеет отдельный пилот, но фактическая оплаченная генерация на пользовательском сайте и E2E клиентская доставка не подтверждены. HeyGen для проверенного Andrey Digital Twin, не для общего генератора фантастических сцен.

Последний прочитанный Google Doc **Holistic House — Video Studio · 96 вопросов, 3 ответа + свой вариант · 5 разделов · ТЗ v1.2**:
https://docs.google.com/document/d/1UUyGu8cVcxD4qJpgv5BUTi-_57c7eMJAWX4epeMA3pM/edit
— **16 Personalization / 12 Principal / 18 Advanced / 34 Pro / 16 Extra = 96 стабильных ответов**, плюс **30 внутренних шкал**. Это UX-концепция, ещё **не** 96 работающих элементов сайта и не 96 параметров, поддерживаемых видеомоделью. Не заставлять клиента отвечать на все 96 вопросов ради одного 15–30-секундного ролика.

Отсутствующие реальные технические способности:
- **Computational generation**: оплачиваемый provider AI или действительно локальная GPU-модель, выдающая новые пиксели и движение (Text-to-Video / Image-to-Video / First+Last Frame).
- **Keyframe/reference/character consistency**: якорные изображения + единый паспорт героя/мира/цвета/камеры и преемственность между клипами.
- **Capabilities-aware compilation**: перевод 96 ответов в конкретные поддерживаемые настройки модели с честными fallback; неподдерживаемый virtual lens/fps/seed не выдавать за управление движком.
- **Trusted render runtime**: настоящая очередь, техническая готовность модели, лимиты GPU/стоимости, provider credentials, долгоживущий background worker, защита от повторного платного POST.
- **Verified production media chain**: приём новых байтов MP4, декодирование, дефекты, монтаж аудио/субтитров, приватное хранение и подтверждённая доставка.
- **Quality iteration**: просмотр опорных кадров ДО затрат, переписывание одного плохого shot, контроль похожести героя и художественной связности. Внешняя модель не обязана воспроизвести все 96 пожеланий одним prompt.

## 14. Один общий проект VideoProject вместо множества независимых генераторов

**Не начинать с UI-каталога моделей.** Выстроить единую нормализованную схему поверх уже имеющихся модулей:

~~~ts
type Answers = Record<string,{
  optionId?: "option_1"|"option_2"|"option_3";
  customText?: string; // ограничен по длине, local only, never provider
  origin: "manual"|"suggested_unaccepted"|"accepted_suggestion";
}>;
type VideoProject = {
  projectId: string; revision: number; locale: "en"|"ru"|"es";
  scope: "guest_local"|"client_private"|"owner_public";
  briefSchemaVersion: "hh-video-96-v1.2";
  answers: Answers; // ONLY in memory or explicit protected/encrypted account save
  supportedSettings: Record<string,unknown>;  // compiled, typed, no raw private data
  creativeSpecVersion: string; styleBibleId: string;
  shots: ShotRecipe[]; activePlanHash: string;
  workflow: "local_mix"|"self_hosted_ai"|"approved_provider_ai";
};
type ShotRecipe = {
  shotId:string; order:number; startMs:number; durationMs:number;
  semanticRole:"opening"|"resource"|"change"|"integration";
  subjectReferenceId?:string; environmentReferenceId?:string;
  startKeyframeAssetId?:string; endKeyframeAssetId?:string;
  cameraPresetId:string; paletteId:string; visualStyleId:string;
  permittedVisualTokens:string[]; blockedVisualTokens:string[];
  modelCapabilitiesRequired:string[];
  outputAssetId?:string; status:"planned"|"keyframes_ready"|"rendering"|
    "asset_verified"|"qa_approved"|"failed";
};
~~~

**Хранилище ответов и внешняя генерация разделены физически:**
A. PrivateBrief: запросы/цели/результаты тестов/собственные фото/предпочтения; guest = память браузера, signed-in = только opt-in protected encrypted records.  
B. SafeVisualRecipe: только vetted non-personal symbol/style/camera/lighting/shot reference IDs, без clientId, raw wish, test results, здоровья, CRM, фотографий и биометрии.  
C. ApprovedRenderRequest: **сервер вновь** собирает безопасные подсказки из allowlist по asset ID + версии; клиентский произвольный prompt и price не доверяются.

Схема запретов сохраняется даже если клиент выбирает «я волк/орёл/мифический герой». Безопасный внешний запрос описывает **вымышленного** персонажа, не конкретное лицо клиента; resemblance=0. Для likeness=3 по фото/голосу нужна **отдельная будущая** оценка биометрии/прав/приватности/разрешения, нельзя незаметно переслать оригинал в Kling. «Клиент будет похож на себя» нельзя обещать, пока нет законного, доступного и одобренного identity-preserving provider path. Andrey avatar — только заранее верифицированный private Digital Twin по действующей SOP.

### 14.1 Программное сопоставление 96 вопросов и 30 шкал

Один реестр с неизменными ID PERSONAL_01..16, BASIC_01..12, ADV_01..18, PRO_01..34, EXTRA_01..16. Для каждого: type, required=false (кроме выбранной цели/основного режима), defaults, constraints, question EN/RU/ES, options x3, customText, privacyClass, scope=global|shot|audio|delivery, capabilityKey, fallbackRule, costEffect. Внутренние 30 шкал — слой derived settings, а **не ещё 30 вопросов**.

Порядок разрешения конфликтов: explicit user override > explicit client choices > accepted recommendations > preset defaults. У каждого значения хранится source/provenance; AI suggestions никогда не считаются consent и не замещают ручное поле. На экране 4 компактных поля и 3–5 Principal вопросов, остальные открываются контекстно. При смене модели показывать «поддерживается / творческая подсказка / недоступно». Не сохранять сырые ответы в Analytics, URL или public localStorage.

Маппинг, который реально влияет на движок: aspect/duration/scene count → model-valid configuration; shot camera/motion/style → curated visual prompt или supported control; keyframes/reference/identity → только модели с доказанным reference support; голос/субтитры/музыка → post-production либо проверенные native audio capabilities; бюджет/публикация/профиль → **отдельные серверные permissions**, никогда prompt-текст.

## 15. Главный секрет качества — «сначала постоянные референсы, затем движение»

Простой prompt «красивый фильм о счастье, 20 секунд» даёт дрейф персонажей, непредсказуемую камеру и несвязанные кадры. Нужен управляемый **3-stage generation graph**:

**A. Director / shot planning (free, deterministic):**
1. Преобразовать тему в arc: открытие → образ опоры → перемена → интеграция; scenes 2–6 по выбранному duration и capability, не жёстко «всегда четыре» в будущем Pro.
2. Создать immutable **Style Bible**: палитра 3–5 цветов, материал/эпоха, свет, погода/время суток, допустимые объекты, темп, камера, ракурс, aspect, negatives и banned personal tokens.
3. Создать **Reference Pack**: окружение, образ абстрактного героя/животного, 1 ключевой исходный кадр и при необходимости 1 конечный на сцену; одни и те же approved fictional identity/style references для соседних кадров. Без клиентского фото вовне.
4. Выдать 4 раскадровочных stills и понятный prompt на рус/анг/исп; если в будущем provider принимает English, переводить **только** обезличенную художественную сцену, никогда личный wish.
5. Клиент смотрит сцены/референсы и подтверждает визуальную идею **перед** запуском дорогих движущихся кадров.

**B. Actual generation (needs compute):**
- **Text-to-Video** — когда нет референсов, абстрактный фон/уникальный B-roll; дешёвый короткий approved clip.
- **Image-to-Video** — основной управляемый маршрут: исходная утверждённая композиция + описанное движение/камера.
- **First/Last Frame** — при требовании совпадения соседних сцен; конец N связан с началом N+1, не отправлять случайно несколько несогласованных prompt.
- **Reference-to-Video / Omni** — только при подтверждённой поддержке конкретной моделью и разрешённых не-клиентских изображениях/видео; не предполагать переносимость reference IDs.
- Generate одного preview candidate на shot, возврат QA, **локальный retry только неудачной сцены** с новой ревизией. Не создавать по 3 дорогих варианта для всех кадров без нового cap.
- Если внешнего AI нет, показать честный Free Original Mix из approved existing masters, а не «новый AI-generated footage».

**C. Professional assembly:**
- Единый точный timeline с duration/hold/transition; небольшие мягкие переходы и consistent grade; различать оптический zoom/camera hint и реальную camera-path поддержку.
- Озвучка/текст/оригинальная музыка и субтитры собираются **после** приёма видеоклипов; избегать генерации надписей внутри диффузионного видеорендера.
- Плеер показывает реальный preview master; после записи отдельный verified download и возможное добровольное private-save. Вспомогательные posters никогда не представлять вместо настоящего MP4.

Для героев «животное / птица / вымышленный человек» сначала подтвердить **постоянный дизайн** (силуэт, одежда, цвет, две опорные позы), затем генерировать shot N. Риск «птичка превращается в другого героя» решать reference lock и asset QA, не только дополнительными словами в prompt.

## 16. Реальная инфраструктура генерации: две стратегии, без фантазии «бесплатный облачный GPU»

| Стратегия | Что реально генерируется | Ресурсы, ограничения, следующий шаг |
| --- | --- | --- |
| Free local mix — уже есть | новые комбинации уже снятых или программно нарисованных сцен, не new AI footage | Улучшить библиотеки, keyframe preview, editor/export/iPhone, лицензии; API cost = 0 |
| **Self-hosted LTX 2.5 Fast через ComfyUI** | новые видеокадры по text/image/start-end refs, действительно locally computed | Нужен **реально доступный** Windows/Linux NVIDIA GPU с достаточной VRAM либо совместимый мощный Apple Silicon; скачать модель/веса и принять лицензию, проверить коммерческие права/версии и нагрузку, выбрать worker. Не на iPhone и не в Vercel Serverless. Offline/local ≠ без затрат на оборудование, энергию и инфраструктуру |
| Kling owner neutral pilot | короткий уникальный public-sanitized B-roll | Уже существующий owner Kling adapter; Kling 4.0 28.10.2026 позволяет до 30s, 10 keyframes/Omni, но **для API требуется Flagship Resource Pack либо подтверждённый paid balance**. Owner approval + exact quote до render. Не включать массовый клиентский запуск |
| Runway/Higgsfield/иной aggregator | альтернативные новые видео при реальной entitlement | Runway ChatGPT workspace on 29.10: availableVideoModels=[] несмотря на image models и 500 plan credits. Plugin ≠ backend API. Higgsfield API использует отдельный prepaid баланс; не подключать оба до оценки первого рабочего канала |

**Документация на момент проверки:** Kling API https://kling.ai/document-api/updates/api?date=2026-02-11; LTX ComfyUI https://docs-dev.ltx.io/open-source-model/integration-tools/comfy-ui; desktop/аппаратные требования https://github.com/Lightricks/LTX-Desktop; Runway models https://docs.dev.runwayml.com/api/; Higgsfield https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api .

**Технический POC собственного AI без pay-per-call:** read-only аудит реального оборудования → выбрать локальную модель и pin checkpoint+dependencies → проверить отдельно license/commercial-use → установить isolated ComfyUI, авторизованный local API под VPN/loopback, без публичного 8188 → выполнить **один безличный тест text-to-video и один first/last-frame 5s** из искусственных референсов → ffprobe, время GPU/VRAM/ошибки, p95 и сравнение с текущим first-party montage. Текущий подключённый MacBook Remote Desktop был OFFLINE, инструментальный месячный лимит исчерпан; actual GPU/VRAM/OS memory не подтверждены. POC невозможен без доступного устройства или платного GPU хостинга. Никаких ожиданий, что iPhone или Vercel edge смогут воспроизводимо рендерить AI video.

**Честная стоимость:** у self-host возможно 0 оплаты внешнему видеопровайдеру, но ненулевая GPU/энергия/время/хранилище. Полностью бесплатная неограниченная облачная коммерческая генерация качественного видео **не доказана**. У платной стратегии цена определяется серверной quote конкретной модели, resolution, seconds, audio/keyframe refs, не таблицей рекламных тарифов. Для пилота выбираем **одну** модель, один художественный нейтральный 5s-клип, одну утверждённую сумму; остальные отключены.

## 17. Product + worker + cost ledger: реализация без дублирования инфраструктуры

**Вход:** клиент жмёт «Создать раскадровку» (0 credits), видит кадры и style Bible, выбирает «Free original mix» или «Новые AI-кадры» и **явно просит котировку**. Пока нет реального backend capabilities+price+payment/approval — показывать estimate unavailable, не создаём fake provider job.

**Сервер:** начать с расширения существующих lib/mandala/cinematic-production.mjs и lib/kling-video.mjs. Модель provider adapter должна отдавать capabilities (version, resolutions, ratios, maxDuration, supportsKeyframe/characterReferences/audio, commercialRights, cost, enabled) и fail closed. Генерация содержит только signed server-validated safe visual IDs; raw user prompt = NO. Долгоживущий task должен жить в DB, не в browser state/Vercel function.

**DB минимально:** видео-проект может остаться guest local и private encrypted только после save consent; для платного owner-neutral рендера по плану v2 app_private.video_render_jobs + events, unique (owner,idempotencyKeyHash), уникальные provider external task IDs; payment/owner approval/cost cap linked by server; content hash/version for every shot. Для видео-ассетов использовать существующий реестр как индекс и приватный bucket только для фактических client masters, не создавать новый публичный media bucket без нужды.

**Job sequence:** planned → keyframes_reviewed → quote_verified → owner_approved → payment_verified (только если заявлена клиентская продажа) → reserved → submitted → processing → downloaded → decoded → qa_passed → available_private/available_public_approved. При network timeout POST: submitted_unknown, только GET по внешнему request ID/reconciliation; **никаких слепых повторов платного POST**. Любой новый shot revision инвалидирует старую quote, а предыдущее оплаченноe задание не должно потеряться или списаться второй раз.

**Processing:** отдельный trusted worker со строго bounded CPU/GPU/storage, mTLS/VPN для self-hosted ComfyUI, short-lived signed source URLs, allowlisted ingress/egress для provider video URLs и SSRF защита, claim lease с fencing token. На Vercel Next API только авторизованный orchestration/status, не 30s full-model infer и не multi-GB FFmpeg. Stop = остановить новые задания, не «отменить» уже списанную генерацию без provider receipt.

**Приватная доставка:** текущий app_private.personal_videos принимает MP4 ≤12MB, 3 файла/user и 4 темы; canvas-webm сюда не выдавать, life/health не записывать под чужим theme. Если AI mastered video крупнее — отдельная оценка storage/egress/owner consent/entitlement и защищённый asset manifest, не поднимать caps втихую. Public-site assets архивируются Drive → только по отдельному QA и approval YouTube/Metricool, private никогда YouTube.

## 18. Качество как измеряемый acceptance, не «магическая» кнопка

**Автоматический media QA:** каждый output — реальные байты на собственном storage, проверка SHA-256, ftyp/container, video codec, duration±допуск, expected aspect/resolution/FPS, no broken/truncated frames, ffmpeg freezedetect/blackdetect/scene-change, измеренный звук/субтитры/громкость при выборе audio. Если источник 720p и output 1080p upscale — обозначать **upscaled 1080**, а не native 1080. Плавность переходов и отсутствие мигания/нежелательных кадров проверяются на извлечённых sample frames.

**Художественный QA (вначале человек):** оценка 1–5 по (a) соответствие заявленному визуальному запросу, (b) стабильность героя/среды/цвета, (c) естественность движения/камеры, (d) отсутствие грубых артефактов/текста/подмены, (e) звук/субтитры, (f) privacy/licensing. Низкий балл отправляет **только конкретный shot** на правку, а не весь ролик. Показывать пользователю реальные preview и возможность заменить/regenerate один кадр. Не обещать 100% точного исполнения свободного запроса.

**Репрезентативный пилот (только synthetic non-client prompts):**
A. 20-секундное атмосферное 16:9 видео «солнечный луг → свет через деревья → тропа → горизонт», без героя.  
B. 15–30-секундное 9:16 видео с **одним вымышленным** орлом и стабильным внешним видом между кадрами, без клиентского фото.  
C. 30-секундный сценический ролик в двух версиях стиля, с оригинальной разрешённой музыкой, RU/EN/ES безопасными субтитрами.  
Для каждого тестировать storyboarding/keyframes → real AI 5s clip (только после approvals) → master FFmpeg → ffprobe/PCM → private/public gate → actual iPhone 320–430. Отдельно тест без AI: все три сценария должны давать честный Free Original Mix, где нет unavailable assets.

**Предлагаемые KPI для решения о launch, не измеренные результаты:** 0 неразрешённых paid submits/PII uploads, 0 двойных оплаченных задач, 100% готовых файлов декодируются и имеют checksum, owner QA без серьёзных артефактов, корректная стоимость успешного MP4 и понятный процент повторной генерации кадра. Публичный click, storyboard или media GET 200 не означают завершённый фильм.

## 19. Конкретная очередь разработки: критический путь к «реально генерирует»

| Этап | Код/контракт в существующем продукте | Definition of Done |
| --- | --- | --- |
| G0 — baseline | сверить production HEAD/READY, #2534/#2566/#2550, 96-field Google Doc, current Kling flags, реальные 4 сцены/фильмы | один список truly implemented / proposed / gated, нет merge старого #2518 |
| **G1 — 96→VideoProject compiler** | versioned schema+registry, 30 scale mapping, provenance/consents, modelCapabilities, scene/shot overrides и safe prompt firewall в существующем lib/mandala | 5 категорий и 96 IDs тестируются; базовые 4 поля — быстрый UI, unsupported fields marked; no PII into safe JSON |
| **G2 — Style Bible + Keyframe Studio** | добавить утверждаемые 4 stills, first/last-frame manifest, 1 fictional character identity asset, visual do-not-use tags, scene revision/checksum | каждый shot имеет референс/визуальную причину, редактируется без уничтожения остальных |
| **G3a — Free moving render** | доработать текущий Canvas/MediaRecorder/FFmpeg, asset/source rights, audio/subtitles, safe frame transitions, profile privacy | скачанный MP4/WebM имеет реальный motion+audio, iPhone/WebKit acceptance; honest local-only label |
| **G3b — ONE true AI backend proof** | либо ComfyUI+LTX self-hosted capability/license/hardware POC, либо owner-approved Kling 4.0/2.5 neutral 5s, not both mandatory | **новый**, ранее не существовавший MP4 generated from synthetic prompt, provider/GPU receipt, actual decoded frames+QA |
| **G4 — trusted render queue** | server jobs/outbox/receipt, signed provider media ingest, concurrency/lease, 0 default budgets, callback/status, per-shot retry | timeout/retry never double bills; provider task ID + bytes/hash + account-appropriate delivery readback |
| **G5 — one real user film** | keyframes→1 or several actual new short AI shots→existing FFmpeg→sound/subtitles→cabinet opt-in+secure delivery | owner-approved sample plays from signed-in client account, user A/B privacy tests, actual iPhone playback |
| **G6 — scale + 8 sessions** | leverage #2503 approved scripts/voice/media; style bible per language, reuse licensed background clips, transparent entitlement and progress | 8 **actual** reviewed files for claimed locale, no false unlocked course or medical claims |

**Самые важные первые три программные задачи:** (1) единый проверяемый compiler для 96 вопросов и capabilities, (2) keyframe/reference pack + согласованная style Bible, (3) один фактически работающий T2V/I2V worker и реальный тестовый MP4. Пока пункт (3) не готов, продукт технически умеет только **ремикс**, даже если интерфейс назван AI Studio. Не тратить время на ещё 20 фильтров и дорогие генерации прежде этих трёх блоков.

## 20. Зависимости и разрешения владельца — отдельно, по достижении gate

- **Если выбираем self-hosted**: только read-only проверка владельцем GPU/VRAM/RAM/OS+SSD и license, подключённая машина/защищённый runtime; отсутствие готового оборудования = честный blocker. Устройство не подключено и GPU не подтверждён; не предполагать бесплатный сервер.
- **Если выбираем paid Kling pilot**: конкретная модель/доступ/правовая лицензия, реальный provider quote, отдельно согласованная верхняя сумма и один разрешённый клип без лица/личных данных; до этого НЕ включать платные флаги.
- **Для клиентской доставки и продаж**: отдельно privacy/save consent, A/B E2E, поддерживаемая оплата и specialist review для клинических программ; последующая публикация — самостоятельное explicit approval.

**Итоговый инженерный принцип:** Video Studio становится настоящим text-to-video продуктом лишь после прохождения G3b (новые байты AI-клипа + QA) и G4/G5 (безопасный повторяемый путь до пользователя), а не после добавления формы, ссылок на провайдеров, красивой карточки или успеха сборки сайта. Это приложение дополняет программу v2, не заменяет утверждённые бесплатные модули.
