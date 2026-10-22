# HH Growth Studio — Public page → social draft (P2.1), 20 Oct 2026

**Status:** code on review branch; not proof of LIVE browser behavior or external posting.

## Purpose
Turn a **public, anonymously readable article/service/Academy/event page** on the owner's approved brand domains into **editable** social draft title/caption/source reference without copying, exposing or deriving private client records. This is a differentiator beyond a generic Publer composer, but not an AI translation/publishing integration.

## Owner workflow
1. Log in to the practitioner administration on https://holistichouse.vercel.app/admin/growth-studio.
2. Choose the brand. In the Composer, enter a public landing URL such as \`/en/academy\` or the exact full URL on that same brand domain. URL must have HTTPS and no query, fragment or encoded private path. For another brand, first switch the brand.
3. Click **Read published page / Взять текст с сайта**. The server, not the phone, fetches the public HTML head only, with a 7-second timeout, 96-KiB cap, no cookies, no secrets, no redirects, no private routes and an explicit same-brand origin.
4. Review the returned public title, short description, language and canonical URL. If the current form is nonempty, replacing it requires owner confirmation.
5. Click **Use in draft / Добавить в черновик** to fill only the editor. Check accuracy, claims, copyright, target platform, locale and media rights. No image is attached automatically, even if the source contains \`og:image\`. No translation is inferred. **Saving is a separate owner step**; approval and public posting are even later separate actions.
6. An existing saved post that changes text will automatically return to **draft** and require reapproval through the existing optimistic-CAS edit logic.

## Security/validity contract
- Action \`previewPublicGrowthSourceAction\` must call \`requireAdminRequest()\` before any network request.
- Input is closed to exactly \`{brand,sourceUrl}\`; server verifies origin using \`GROWTH_BRANDS\` and \`normalizePublicSource\`.
- HTTP status must be 200, MIME \`text/html\` or XHTML; \`noindex\` in header or head causes rejection; all redirects are blocked.
- Only extract \`og:title\` / \`twitter:title\` / \`title\` and \`og:description\` / \`twitter:description\` / \`description\`; optional valid EN/RU/ES language. Do not extract body, scripts, cookies, images or external API keys.
- Response is a small redacted metadata object; network errors never expose private upstream responses/credentials.
- Limit data/time/bytes. Test private/off-brand URLs, redirects, noindex, non-HTML, overlarge head, missing metadata, XSS strings, and owner auth before release.
- Only public marketing/safe educational content allowed. The assistant does not assert the clinical truth of material merely because it's live on the site.

## Delivery and user-visible truth
No social network or HeyGen video call is triggered by this feature. A social network configured in ChatGPT (e.g. Metricool) does not imply a site runtime publishing token. This feature supports editorial productivity, **not** Publer auto-scheduling parity. Keep Publer active until provider receipts and scheduling E2E acceptance are confirmed.

## Test commands
\`node --test tests/growth-studio-source-preview.test.mjs\`
\`node --test tests/growth-studio-editorial.test.mjs tests/growth-studio-source-preview.test.mjs\`
\`npm run build\`

After merge, verify exact READY Vercel SHA and real owner browser access; then test public page fetch/edit/save/reload and 400/401/403/500/redirect rejects on iPhone WebKit and desktop.

## Existing authoritative decisions
- [Growth Studio product](https://github.com/andylitvinov-design/books/issues/1214)
- [Master publishing SOP](https://github.com/andylitvinov-design/ai-projects-brain/issues/219) — approved Andrey Digital Twin, Drive master and YouTube/Metricool public release; private client videos in private authenticated storage, never generic YouTube.

---

## 20 октября 2026 — Контент-радар: публичные материалы → безопасные черновики

**Расширение существующего Public Source Preview**, не второй редактор, не агент соцсетей и не новый storage/API. Маршрут: `/admin/growth-studio/content-radar`, вход только `requireAdminRequest()`, `noindex`; ссылка находится внутри текущего блока «Взять текст с сайта» Growth Studio.

**Как работает:**
1. Владелец нажимает «Найти материалы», выбирает EN/RU/ES. Сервер делает **один** ограниченный GET только `https://holistichouse.vercel.app/sitemap.xml`: не более 850 КБ, 10 секунд, без cookies, без перехода по редиректам и без доступа к CRM. Это не платный фоновой cron и не запрос к внешнему провайдеру.
2. Доступны не более 12 кандидатов в выбранной локали из узкого allowlist открытых Academy, опубликованных Articles, будущих публичных Events (если остались в sitemap) и нескольких известных публичных Services. Никаких `/api`, `/app`, `/client`, `/tests`, `/reports`, `/payments`, профилей, адресов с параметрами или сторонних доменов. Отображаемый `lastmod` — **не доказательство** свежести или публикации.
3. Перед созданием владелец отдельно подтверждает выбранную страницу/канал. Сервер **ещё раз проверяет** наличие в текущем sitemap, затем существующий `previewPublicGrowthSource` проверяет прямой HTTP 200, `noindex`, отсутствие редиректа и читает только ограниченный `<head>` (title/description, без приватного тела/скриптов).
4. Создаётся ровно **один неизменённо редактируемый `status=draft`** через существующий `prepareGrowthBulk` + атомарный Redis `batchCreate`, идентификатор детерминирован по canonical `sourceUrl+channel`. Повторная команда или сетевой retry возвращает имеющийся черновик, не создавая дубль. Существующий отредактированный черновик никогда не перезаписывается.
5. Пост можно открыть из текущего Growth Studio, проверить язык, название, факты, права на изображения и ограничения площадки. Только отдельное ручное согласование может перевести черновик в `approved`; отдельные официальные provider permissions требуются для фактической отправки. Ни один внешний провайдер не вызывается этим радаром.

**Тесты:** `tests/growth-studio-content-radar.test.mjs`, добавлены в существующий `HH Growth Studio editorial checks`. Проверяют таймауты/лимиты sitemap, приватные и чужие URL, статус и язык, metadata-only preview, idempotency, отсутствие отправки/PII и owner-auth.

**Ограничения:** радар не переводит контент автоматически, не показывает чужие сайты, не подтверждает реальную дату последней правки, не генерирует платное видео, не запускает Meta/Google Ads и не отправляет сообщения клиентам. Пользовательское сохранение в real production Redis и мобильные Safari клики должны быть проверены в авторизованной сессии; зелёный CI не заменяет E2E.
