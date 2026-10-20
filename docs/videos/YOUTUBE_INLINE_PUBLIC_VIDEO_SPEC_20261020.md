# Holistic House — YouTube-first публичные видео внутри сайта
**ТЗ v1.0 · 20 октября 2026**

## 0. Решение владельца и границы

**При нажатии Play посетитель НЕ покидает сайт.** На публичной карточке первоначально видна лёгкая обложка, затем на том же месте создаётся настоящий YouTube iframe с точным утверждённым видео и `autoplay=1&playsinline=1&rel=0`. Ссылка «Открыть на YouTube» — лишь резервная, не основное действие. Исправление отменяет ошибочный «переход по всей обложке» из books PR #1383.

Реализовывать **в существующих компонентах**, без второго каталога, повторных загрузок и новых рендеров:
- `SiteVideoPlayer`: Home / Services / Homeopathy / About / публичные testimonials / управляемые слоты;
- `AcademyVideoPlayer` и `AcademyVideoLibraryClient`: занятия / медитации / YouTube-архив;
- `PractitionerVideoGallery` и `PractitionerPresentationVideo`: публичные видео мастера / услуги;
- owner-only `/admin/videos` и текущий `/admin/youtube-upload` для недостающих копий.

**Ограничение приватности:** персональные консультации, записи клиентов, материалы кабинета, тесты и сведения о здоровье остаются ТОЛЬКО в защищённом хранилище с авторизацией/RLS. Ни Public, ни Unlisted YouTube нельзя считать закрытым кабинетом. Видео других мастеров публикуется повторно лишь при проверенных правах и согласии.

## 1. UX и технический контракт (готовый P0)

1. SSR/первый экран: реальная обложка 16:9, название, кнопка Play, при необходимости продолжительность; **0 YouTube iframe и 0 тяжёлых YouTube scripts до Play**. Не рендерить несколько плееров на главной заранее.
2. После реального клика/tap по Play создаётся **один** iframe `https://www.youtube-nocookie.com/embed/<exact-id>?autoplay=1&playsinline=1&rel=0&hl=<locale>` (где доступен locale), разрешён autoplay *после действия пользователя*, fullscreen, encrypted-media, picture-in-picture; `referrerPolicy="strict-origin-when-cross-origin"`. iframe заменяет именно ту обложку, которую нажали, без полной навигации. iOS может потребовать дополнительный tap по контролу YouTube — это ограничение браузера, не повод для автоматической переадресации.
3. У существующих HeyGen-видео с **одобренной идентичной** YouTube-копией выбирается YouTube ID; сохраняются правильные постер, язык звука, транскрипт, авторство и оригинальный HeyGen-мастер.
4. Внешняя ссылка YouTube — небольшой вторичный fallback. Не подменять ролик другим видео; не ставить случайный ID; не создавать iframe со значением user-supplied URL. Парсить только допустимый видео ID.
5. При сворачивании аккордеона, переключении урока/языка, размонтировании компонента iframe удаляется и прежнее воспроизведение останавливается. Только один активный плеер внутри библиотеки курсов.
6. EN основная; RU/ES локализуют кнопки и подписи, но **не переименовывают язык аудио**. A11y: доступность с клавиатуры, видимый фокус, контрастный Play, alt="" у декоративного постера, читаемые подписи, мобильные ширины 320/390/430 px.
7. На сайте отсутствуют рекламные tracking pixels и preconnect к YouTube до действия пользователя, если нет отдельного privacy-approved решения. Учитывать CSP и Safari Error 153: тестировать реальный iframe со страницы, а не отдельно открытый embed URL.
8. Проверка фактической работы: браузерный click → exact iframe src → provider response → обработанные кадры/время без ошибок → проверка mobile/desktop. HTTP 200, наличие iframe и успешная Next-сборка сами по себе **не подтверждают** настоящий просмотр.

## 2. Подтверждённые зеркала — переиспользовать, не перезаливать

Ниже точная связка HeyGen original → YouTube ID (закреплена в `components/site-video-player.tsx`, подтверждена в [AI-video SOP #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219)):

| Публичный ролик | HeyGen original | YouTube ID | Статус |
|---|---|---|---|
| Home EN | `ed202847a43a96b918308aa972177b34` | `Y4K4piEwwA8` | Mirror approved |
| Services EN | `48105a2f2228e7cb3a67391e97acaf8b` | `s30Y42IwPcg` | Mirror approved |
| Homeopathy EN | `34df311e461509433b45929908a9097a` | `ILyRWyHtJoE` | Mirror approved |
| Home RU | `388a04b39ebf215ae656bcd22d0d0847` | `AE8Pelpo424` | Mirror approved |
| Services RU | `79c2845577865979cd95ac40a08fc01a` | `Cz6SxXJNZbw` | Mirror approved |
| Homeopathy RU | `0f984780d06948b1e78166e6e553e4e9` | `Q9NvYECKWuc` | Mirror approved |

Публичные видеоотзывы (включая Claire), медитации и многочисленные занятия Academy уже имеют собственные YouTube IDs. Использовать их в том же click-to-load player без создания новых видео.

## 3. Известные публичные видео БЕЗ проверенного YouTube ID (P1 backlog)

**Это НЕ завершённая миграция.** Не указывать фиктивные YouTube URL. До фактического переноса сохранять исходный плеер и transcript/fallback. Для каждого использовать оригинальный утверждённый MP4, без HeyGen-перегенерации:

| Слот / оригинал | Идентификатор HeyGen | Где мастер | Следующий шаг |
|---|---|---|---|
| About EN | `fd5fcead9b067f9a0649862675a38771` | Drive master: `1emF7Peqk8SFz0UVj3hm_k2RwUOa5xpi4` | Unlisted YouTube, проверить идентичность |
| About RU | `d4e55c984e54b40fbeb8a21f81d27694` | Drive master: `1tIxupc1YD8MYEMI9LqEhejkvGSKonpfK` | Unlisted YouTube, проверить идентичность |
| About ES | `2c251709aba74fd96ae8be43257a080b` | Drive source record: `1jOKgCvkaHsz8eJHY1VCH4DgH0cwK5-7U` | проверить master QA + Unlisted YouTube |
| Hypnotherapy method EN | `8c1634ce904434a91931429b6a7eefe1` | Drive source record: `1DwdqVVVxNyvakpHsicaWzXu6jwrkZXgN` | Unlisted, тот же метод |
| Constellations method EN | `7c6b243f048b9c0581ae29619a4a89fc` | Drive source record: `1MC2G4kvVB7nTBULcv59vwB26T_45g_Gk` | Unlisted, тот же метод |

*Верифицировать размеры, SHA, доступ к мастер-файлам и права перед конкретной загрузкой. В таблице Drive ID из текущих записей, это не подтверждение свежего скачивания в этом PR.*

Дополнительная категория: два исторических **публичных** native MP4 с PsiTrends в разделе `TantraVideoTestimonials`, `data/academy/tantra-native-assets.json`: `video_2024-01-16_11-06-01.mp4` (~46.9 MB) и `video.mp4` (~75.4 MB). До перевода нужно отдельно проверить разрешение участников на дублирование записи в YouTube, проверить файл и канал; нынешнее нативное воспроизведение не ломать. Пользовательские видео других мастеров и Vimeo-источники требуют отдельной проверки прав и не переводятся автоматически.

Отдельный **runtime аудит** также нужен для публикаций в Redis/базе, отличающихся от built-ins (возможны owner edits). Список выше = известные исходные публичные записи из репозитория, не глобальное доказательство, что больше источников нет.

## 4. Единственная цепочка миграции (P1/P2)

`действующий публичный видео-source → rights/consent → approved original + Drive SHA → выбранный owner-confirmed YouTube канал → Unlisted upload → provider readback → anonymous playback / embeddability → /admin/videos draft → owner preview → publish → production E2E`.

- **Не делать рендер** и не перезаливать 6 approved mirrors. Сопоставлять оригиналы по master SHA/HeyGen ID + locale; чекпоинт idempotency `(master SHA, channel ID, target locale)`, YouTube ID журналируется один раз. Если исход загрузки неопределён, сначала искать видео по provider readback, а не пробовать повторно.
- Текущий RU YouTube канал в Metricool: `UCjWq6NHZTQkUr3bC3WbXXcw`. Это НЕ OAuth-доказательство права upload сейчас. EN destination должен быть owner-verified (исторически оба языка были на этом канале), не назначать другой канал по догадке.
- Текущий uploader: [Owner iPhone YouTube upload](https://holistichouse.vercel.app/admin/youtube-upload), activation [#623](https://github.com/andylitvinov-design/books/issues/623). У владельца может потребоваться Google Web OAuth, согласие на RU/EN каналы, YouTube API audit, загрузка мастер-файла со своего устройства либо разрешённый Metricool bridge. Если API даёт Private вместо запрошенного Unlisted — остановка.
- Загружать только сайт-одобренные публичные ролики. Реалистичный AI disclosure ON, kids OFF по подтверждённому назначению. Unlisted по умолчанию, без уведомления подписчиков, без Public-публикации/рекламы без отдельной команды.
- Readback = точный `videoId`, `channelId`, `privacyStatus`, `processingStatus`, доступное встраивание, фактический просмотр гостем; не считать кнопку «Uploaded» доказательством.
- В редакторе `/admin/videos` выбрать нужный слот, заменить источник на YouTube URL при сохранении того же approved заголовка/языка/транскрипта/постера. Текущая модель записи допускает ровно один provider source: не смешивать HeyGen и YouTube IDs в одном публичном объекте. Оригинальные master IDs, SHA и соответствие хранятся в SOP/журнале оператора.
- При ошибке загрузки не скрывать работающую старую публикацию. После успешного перевода убрать прямое использование HeyGen с публичной страницы, оставить оригинал только для provenance/backup.

## 5. Реализация и проверка P0

- Восстановить в-site видеообласть по Play вместо main-poster external anchors из PR #1383.
- Использовать существующий стабильный `SiteVideoPlayer` и зеркала; не грузить YouTube JS до Play.
- На Academy lesson row сделать **главной кнопкой inline Play**, отдельную ссылку YouTube оставить второстепенной. На видео других мастеров вернуть встроенный iframe после Play; Vimeo и хранящиеся файлы не трогать.
- В owner-only `/admin/videos` показать счётчик HeyGen-only публикаций и конкретный migration warning + ссылку на существующий uploader, без создания второго сервиса.
- Тесты: `tests/public-youtube-inline-playback.test.mjs`, `tests/service-video-delivery.test.mjs`, `tests/page-video-release.test.mjs`, `tests/home-testimonial-poster-verifier.test.mjs`, browser `verify-site-video-browser.mjs`, `verify-page-video-release.mjs`, `verify-home-locale-switch.mjs`; Chromium/WebKit 320/390/430/1365; typecheck, eslint, Next build.
- GitHub CI → PR squash into **production** `codex/public-book-library` → Vercel READY/commit/alias → anonymous LIVE source and click check. Physical iPhone and real native full playback фиксируются отдельно, не заменяются mock и HTTP 200.

## 6. Definition of Done

**P0 (site player repair):** на главной, услугах, видеоотзывах, Academy и публичных карточках мастера клик по большому Play создаёт iframe *внутри сайта* с точным YouTube ID; до клика iframe отсутствует, кнопка не переадресует; EN/RU/ES, mobile, accessibility и existing privacy не регрессировали; PR CI и production SHA/URL проверены.

**P1 (complete public migration):** каждый допустимый публичный источник имеет документированную пару `source master → approved YouTube ID` либо явно отмечен `blocked: rights/OAuth/file/YouTube policy`; нет дубликатов; все перенесённые видео проходят полный provider readback и гостевой просмотр.

**P2 (steady-state):** новые owner-approved public videos проходят Drive→YouTube Unlisted→QA→editor→site автоматически лишь после явного approval и подключения OAuth; бизнес-процессы не публикуют личные/client-specific материалы.

Источники/контроль: [books #1014](https://github.com/andylitvinov-design/books/issues/1014) (видео-баг), [books #623](https://github.com/andylitvinov-design/books/issues/623) (upload OAuth), [AI architecture #218](https://github.com/andylitvinov-design/ai-projects-brain/issues/218), [SOP #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219), [старая поставка PR #1383](https://github.com/andylitvinov-design/books/pull/1383) — исправляется.
