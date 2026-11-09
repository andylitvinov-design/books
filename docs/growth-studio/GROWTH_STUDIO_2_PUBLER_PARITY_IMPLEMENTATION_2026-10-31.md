# Holistic House Growth Studio 2.0 — программа, архитектура и ТЗ замены Publer

**Версия:** 2.0 · 31 октября 2026 · **Статус:** утверждаемый план; не заявление о готовности внешней публикации.  
**Связанные задачи:** [#1214](https://github.com/andylitvinov-design/books/issues/1214), [#2058](https://github.com/andylitvinov-design/books/issues/2058), [#988](https://github.com/andylitvinov-design/books/issues/988), [#985](https://github.com/andylitvinov-design/books/issues/985).  
**Production:** repo andylitvinov-design/books, branch **codex/public-book-library** (GitHub default codex/bootstrap-books — НЕ production), https://holistichouse.vercel.app/admin/growth-studio.  
**Входные документы:** PUBLER_PARITY_AUDIT_2026-10-20.md, PUBLER_REMASTER_MATRIX_2026-10-26.csv, BENCHMARK_QUICK_COMPOSER_2026-10-26.md, CODEX_CONTINUATION.md. Этот документ дополняет их, не отменяя сохранённые факты и ограничения.

## 0. Проверенное состояние на начало программы

1. PR #2111 merged в production 27.10 UTC, код компактного редактора, owner auth, CSV/bulk, хранилище Redis с CAS, ручной календарь/ICS, Content Radar, импорт метаданных публичных страниц, согласование, evergreen **черновиков**, ручная очередь, безопасный Telegram send-now adapter сохранён.
2. На момент подготовки этого документа Vercel сообщил READY production deployment SHA e294dda58200f6d03890291b829edbeff3167576. Реальные owner Save→Reload→Edit, физический iPhone, права внешних аккаунтов и provider receipt **НЕ проверены** в этой сессии.
3. Матрица Remaster от 26 октября: 12 сравнительных строк, консервативная оценка 32,8%, **0/8 критических функций полностью приняты**. Это исторический, а не вновь пересчитанный score.
4. Подготовка черновика для 13 социальных семейств ≠ OAuth, внешняя публикация ≠ ручная отметка. Отдельные YouTube uploader / Metricool / Video Studio / CRM / Event Publisher должны переиспользоваться, не копироваться.
5. Нет подтверждения включённых HH_GROWTH_TELEGRAM_* на production и Facebook/Instagram publishing scopes; HYPD/Metricool ChatGPT-соединение не является серверным OAuth сайта. Запрещено считать эти подключения действующими без нового readback.
6. Публичная аналитика и пиксели остаются под действующими consent/privacy flags. Не отменять Publer до проверки реального маршрута каждой нужной социальной сети и явного решения владельца.

## 1. Цель, область и продуктовые принципы

**Цель:** один компактный mobile-first кабинет, который получает публичные материалы Holistic House / TorontoTantra / PsiTrends, готовит независимые EN/RU/ES версии для конкретных каналов, помогает согласовать их, ставит **в действительную надёжную очередь**, публикует **только в явно авторизованные аккаунты**, сверяет ответ провайдера, показывает историю и подтверждённые результаты. Дальнейший дифференциатор: цель кампании → AI Content Director → Video Studio/текст → approval → публикация → разрешённая аналитика → реально подтверждённая CRM-заявка/запись/оплата.

**Не цель текущего релиза:** публичная SaaS-платформа, массовая рассылка в личные сообщения, ретаргетинг по психологическим тестам, автономный рекламный бюджет, включение платных генераций или изменение подписок, публикация клиентских материалов, клонирование закрытого кода Publer.

**UX:** первый экран содержит одну основную CTA «Создать публикацию», «Мои публикации», счётчик подтверждённых каналов и компактный статус очереди. Auto Content Director предлагает один готовый вариант и один CTA «Проверить и одобрить»; все фильтры и технические сведения находятся в раскрываемых параметрах. Для профессионалов нужны brand voice, CTA, формат, профессиональная специализация, права на медиа, персональный стиль и отдельное подтверждение рекламных/медицинских заявлений.

## 2. Функциональные требования (ID / DoD)

| ID | Приоритет | ТЗ | Измеримый критерий приёмки |
|---|---|---|---|
| GS-001 | P0 | Owner-only авторизация, My Practice navigation, EN/RU UI и EN/RU/ES контент | Указанный owner имеет доступ; неавторизованный 307/403; no-store/noindex; 320/375/390/430 px |
| GS-002 | P0 | Сохранение/редактирование/копия/одобрение/архив Redis-постов | Реальный Save→Reload→Edit на owner-сеансе + CAS, отсутствие потери текста при сбое |
| GS-003 | P0 | Адресные рекомендации для выбранной сети (лимит текста с UTM, медиа, обязательные реквизиты, approval) | Правила выдаются как **advisory**; для manual каналов не выставляется «подключено» или «опубликовано» |
| GS-004 | P0 | Привязка аккаунтов через официальный OAuth/разрешения и серверную проверку | Хранится exact providerAccountId, права, срок действия; no secret values in client; disconnected fails closed |
| GS-005 | P0 | Редактируемая очередь scheduled delivery per account, честные статусы | Durable persistent job, owner approved, server-side UTC, retry discipline, one account/slot per job |
| GS-006 | P0 | Telegram pilot — существующий guarded publisher, verified channel, test receipt | Одно отдельно согласованное тестовое сообщение; точный channel+messageId+ссылка/подтверждение; без слепого retry |
| GS-007 | P0 | Контроль публикации и ручное восстановление неоднозначного исхода | Unknown outcome -> delivery_unknown/needs_reconcile; no blind repeat, verified source evidence before published |
| GS-008 | P0 | Остановка/снятие с очереди/повторный approval после редакции | Изменение caption/asset/account/time сбрасывает старый approval + invalidates pending jobs |
| GS-009 | P1 | Facebook Pages + Instagram Professional после approved Meta OAuth/scopes | Provider account identity, token validity, media type, test receipt separately for both |
| GS-010 | P1 | YouTube via **existing** owner uploader; YouTube Shorts + Video Studio | Check OAuth + exact channel + video rights, no client private media |
| GS-011 | P1 | LinkedIn, Pinterest, Threads, Bluesky, TikTok via official allowed APIs; others assisted | Per-provider integration contract, individual account/permission and exact result |
| GS-012 | P1 | Умный календарь, bulk/CSV, repeat/evergreen, RSS review queue | Only approved public sources; limits, DST safety, retries, no unintended auto-send |
| GS-013 | P1 | AI Content Director (goal→campaign→variants) | Typed JSON, factual/safety review, manual approval, provider/model cost bounded |
| GS-014 | P1 | Media library + transforms (image sizes, alt, MP4 aspect, thumbnail) | Real rights-cleared storage, dedupe, per-platform validation, no private-media leak |
| GS-015 | P2 | Publication/engagement analytics from provider receipts | Metrics tied to exact socialAccountId+postId; unmeasured is not 0 |
| GS-016 | P2 | Privacy-safe campaign→lead→booked→paid funnel | Consent checked; server-confirmed events only; GA4/Meta hold preserved |
| GS-017 | P2 | Workspace / team approvals and audit logs | Distinct owner/editor/approver roles, RLS, revisions; no cross-brand leak |
| GS-018 | P3 | Optional external multi-tenant SaaS and billing | Separate feasibility/permission/budget approval required |

**Критерии вне области текущей конфигурации:** no AI promises of clinical cure; no guessing provider limits when account tier is unknown; no real provider claims based on UI alone.

## 3. Архитектура и запрет дублирования

Reuse exact existing:
- UI: app/admin/growth-studio/page.js, components/growth-studio.jsx, growth-studio-{bulk,connections,source-picker,content-radar,evergreen,manual-inbox}*.
- Editorial business logic: lib/growth-studio/{model,store,channel-capabilities,bulk,csv,manual-calendar,source-preview,content-radar,evergreen,telegram,provider-readiness}*.
- Existing /admin/youtube-upload, /admin/videos, Video Studio render/export, My Practice, CRM #985/#991, public attribution #988, TorontoTantra Event Publisher. **Не создавать вторую таблицу клиентов, отдельный видеогенератор, новый кабинет или второй Telegram bot для клиентов.**
- Current Redis editorial records remain source for draft/history until reconciled migration. Durable scheduling requires **separate verified queue** (prefer existing authorized Supabase/Postgres with RLS/transactions; verify actual schema first) rather than an in-memory timer/serverless setTimeout.

**Pipeline:**
public content/approved owner input → sanitized ContentSource → independent ChannelVariant → validation/media rights → ApprovalSnapshot → ScheduleSlot → durable PublishJob → official provider adapter → immutable PlatformPost receipt → analytics snapshot / privacy-safe lead attribution.

**Adapter interface** (server only; each provider implements supported subset):
- getCapabilities(account): {formats,limits,requiresMedia,allowedScopes,deliveryMode} with source/version.
- readConnection(account): {state:not_connected|configured_unverified|verified|expired|manual_only, accountId, scopeNames,checkedAt}; never returns token.
- validateForPublish(variant,account): actionable errors; no mutation.
- publish(approvedImmutablePayload,idempotencyKey): {outcome:confirmed|pending|unknown|failed,providerPostId?,url?,providerEvidence?,retryAfter?}.
- reconcile(account,job): read remote by provider reference where possible; never blindly resend after unknown.
- refreshCredential/revoke, readInsights when scopes allow; keep unavailable methods explicit.
- Manual adapter returns only export/copy/official website handoff and manual_done_unverified, never provider-confirmed success.

## 4. Данные и миграция

**Предлагаемые сущности** (создать после real schema inspection; не добавлять ещё одну CRM):
- growth_workspaces/brands (existing brand keys, owner_id, locale, settings)
- growth_social_accounts (workspace_id, provider, provider_account_id, display_name, scopes, connection_state, checked_at, token_reference, disabled_at)
- growth_content_sources (safe public origin, canonical url, content hash, language, last reviewed)
- growth_campaigns (brand, goal, approved landing, safe UTM, owner)
- growth_channel_variants (draft_id/reference to Redis legacy post, provider, locale, version, text, asset refs, immutable hash after approval)
- growth_approvals (variant_id, approved_hash, owner_id, granted_at, revoked_at, cost_confirmed)
- growth_schedule_slots (variant, account, UTC schedule, Toronto display timezone, schedule_kind, cancel flag)
- growth_publish_jobs (account_id, variant+approved_hash, occurrence_id, state, due_at, attempt_count, lease_until, next_retry_at, payload_hash, provider_ref)
- growth_delivery_receipts (job_id, immutable provider post id/url/account id/status/raw minimal safe metadata, verified_at, source)
- growth_performance_snapshots (providerRef, metric names, interval, captured_at, source)
- growth_audit_events (actor, entity, allowed action, previous/new state, timestamps without secrets).

**Индексы/гарантии:** unique(workspace_id,provider,provider_account_id); unique(variant_id,approved_hash,account_id,occurrence_id); unique(account_id,providerPostId) when provider ID present. Atomic enqueue + approval verification; no uncaught duplicate posting. RLS owner on every table; worker uses minimal server role and validated workspace mapping. Tokens encrypted server-side by established secret infrastructure, never in Redis editorial text or logs. Retention, exports, backup, restores and revocation must be tested.

**Migration:** (1) inspect schema and active data; (2) additive migration only; (3) import/associate verified Redis editorial IDs idempotently; (4) dual-read behind flag, *no* dual publisher; (5) verify reconciled counts and rollback; (6) enable real queue only after approval and provider permission. Never delete existing Redis drafts on enablement.

## 5. Постоянная очередь и гарантии доставки

Separate states: draft → approved → queued_internal → claimed → sending → confirmed_published OR provider_pending OR retryable_failure OR delivery_unknown OR failed_final OR cancelled. **"planned_manual" остаётся существующим ручным календарём**, не равно queued_internal / provider_scheduled. State "provider_scheduled" разрешать только при provider-confirmed remote scheduling receipt.

1. Owner confirms exact account(s), locale, content, source link, media rights, UTC schedule and total AI/video cost (if any).
2. Immutable approval hash (content + account + assets + date) creates idempotent jobs transactionally. Owner edits, token expiry or asset change invalidate approval/jobs.
3. Scheduler locks one due job through transactional lease (no double worker). Recheck approval, account readiness, delivery mode, quota, visibility, rights, and rate limits. UI lists exact account and evidence.
4. Send only by official API. HTTP 429 → Retry-After; deterministic 4xx auth/permission → needs_attention/expired; 5xx and timeouts → **delivery_unknown** where provider may already have accepted; reconcile first. No blind retry if outcome unknown.
5. Store provider acknowledgment atomically, reconcile if response asynchronous, and mark **published** only on exact provider ID/URL/status matched to account; provider_pending until status verified. If platform cannot verify, show owner-verified manual state separately.
6. Logs never store tokens, sensitive captions from private clients, full provider headers or unredacted personal audience data.
7. Pause/kill switch per provider/account and globally; drain/no new jobs on rollback. Alert owner to unknown, expired, failed-final, too many retries and overdue posts; never announce success from cron HTTP 200 alone.
8. Cron/worker choice MUST reflect actual verified Vercel project tier. Vercel Hobby minimum once/day with imprecise scheduling; Pro per-minute cron is possible, but cron may overlap/skip retry, hence DB queue and idempotency required. Do not add an unsupported frequent cron or paid plan automatically.

**Service requirements:** tracked p95 schedule drift; no duplicate externally confirmed posts within test window; no unexpected publishing; UTC persistence with **America/Toronto** display timezone and explicit DST transition resolution; retry/lease/expiry tests across midnight and daylight-saving changes.

## 6. API, server actions and contracts

Keep existing owner-only actions for draft save/approve and public source preview. New surface proposed:
- POST /api/admin/growth/accounts/connect/start (owner-only CSRF/state/PKCE, exact provider allowlist)
- GET /api/admin/growth/accounts/callback (state/nonce verification; never user-supplied redirect)
- POST /api/admin/growth/jobs/quote (preview-only eligibility + optional cost, no publish)
- POST /api/admin/growth/jobs/create (approved snapshot, explicit account/time, idempotency)
- POST /api/admin/growth/jobs/:id/cancel (owner authorization, optimistic revision)
- GET /api/admin/growth/jobs (strict owner scope, safe fields)
- GET /api/internal/growth/worker (CRON_SECRET or equivalent server-only auth, rate limits, locks, no public invocation)
- POST /api/admin/growth/jobs/:id/reconcile (owner-gated read-only provider verification)
- GET /api/admin/growth/analytics (consent and provider scope gate; no fake 0)
Exact route names subject to existing repo route/Next convention; do not introduce unaudited public endpoints or arbitrary redirect destinations.

**Schemas:** input size limits, strict allowlisted fields, IDs/UUIDs, immutable approved_hash, providerAccountId must belong to workspace, UTC ISO timestamps, no user-supplied provider success, structured error codes not raw upstream bodies. OpenTelemetry/log trace ID per job, no identifiable healthcare data. Publish executor is not callable through a general client-controlled provider URL.

## 7. UX mobile-first: не перегружать 49 фильтрами

Start screen: «Создать публикацию» + «Мои публикации», verified channels summary and next due task. After entry:
1. Goal (привлечь клиентов / рассказать о мероприятии / представить курс / экспертный пост / видео / другой).
2. Content source (публичная страница, шаблон, самостоятельно, Content Radar), brand, language, audience and CTA.
3. **One recommended post or campaign** (AI or deterministic templates), with editable title/text/media; target platform previews and advisory limits.
4. Per-account connection status with only really verified targets selectable for API publishing; disconnected channels remain assisted/export.
5. Safe approval preview: actual account name and content, time America/Toronto + UTC, link/UTM, optional price, media rights and review label.
6. Manual schedule or publish-now (distinct actions); confirmation receipt timeline.
7. Posts screen: tabs Draft / Review / Queue / Manual / Confirmed / Needs attention; mobile compact cards 320–430 px; keyboard/VoiceOver; avoid large legacy admin header.
8. Auto Video Director/Professional Video Studio and brand templates reachable by one compact control; no separate duplicate renderer. Social platform aspect ratios (9:16, 4:5, 1:1, 16:9) selected by render requirements, not merely by CSS crop.
9. EN/RU/ES content with explicit translator state; UI initially EN/RU as currently implemented. Never silently overwrite approved copy with AI.

## 8. AI Content Director и контент-автоматизация

**Generation flow:** goal + brand voice + content source/confirmed public claims + channel capability + language + CTA + format + safety constraints → 1 suggested canonical campaign → 1–3 alternatives on request → reviewed per-network JSON variants. Use reusable templates for free mode; optional Gemini/OpenRouter for text only behind owner-approved provider selection/expense cap; if model fails, deterministic draft fallback. Do not generate paid HeyGen/video/voice without exact cost and approval; reuse Video Studio/Auto Video Director.

**Output schema:** {campaignGoal,publicSourceId,variants:[{channel,locale,caption,hashtags,cta,mediaBrief,altText,estimatedCharacters,claimsToVerify}],warnings,costEstimate,approvalRequired:true}. Validate schema, safe domains, claims, locale, length, platform differences, assets/license. No medical diagnoses, client profiles, private test results or treatment promises into public posts.

**Content Radar/RSS:** reuse current official public sitemap scanner; future RSS only allowlisted public domains and robots/compliant read, bounded fetch/redirect/size/timeout, dedupe by canonical+hash, manual approval default, predictable daily cap. Evergreen drafts currently generate repeat **drafts**, not auto-recycle; conversion to scheduled cycles requires separately approved count, expiry, duplicate prevention, provider permissions and pause controls.

**Media:** keep public source URL references now; later approved upload to existing appropriate secure storage/CDN, virus/file MIME inspection, ownership/provenance, EXIF privacy stripping, image/video conversions as separately tested asynchronous jobs; no client Cabinet asset reuse or remote public access to private uploads.

## 9. Аналитика, CRM и отчётность

Provider insight snapshots by exact channel account/post receipt; show "не измерено" if missing. Measures: published count, views/reach where available, engagement, link clicks, campaign source, verified enquiry, booked consultation/event, server-confirmed paid order. Separate impressions/views, clicks, leads, bookings and revenue; no attribution without permission and evidence. Optional "best posting time" only after sufficient actual platform data, with transparent sample size and uncertainty; fallback labelled editorial preset, never presented as proven optimal.

Respect existing PUBLIC_ANALYTICS_AVAILABLE=false/consent hold. GA4, HYPD, Metricool connector and third-party ads accounts are NOT website publishing permissions. Privacy/compliance review before deploying new pixels, analytics, audiences or automated outreach. Owner-only report exports CSV/PDF in later phase, with redaction and retention policy.

## 10. Release work packages (small PRs; avoid broad unrelated CI)

| Order | Package | Depends on | Deliverable / DoD |
|---|---|---|---|
| P0.1 | Editorial/browser gate | existing #2111 | Real owner Save→Reload→Edit, non-owner denial, iPhone, real Redis, no secret leakage |
| P0.2 | Per-network preflight | P0.1 independent | Counter includes UTM, Instagram conversion advice, Google Business video warning, alt text, EN/RU and Node tests; no provider API |
| P0.3 | Durable queue schema/worker dry-run | schema audit | Additive DB + queue contracts; synthetic adapter, transactional locks/idempotency/reconciliation, **flag off** |
| P0.4 | Verified Telegram end-to-end | P0.3 + owner-owned bot/channel rights | One separately approved safe channel post, remote receipt, reconcile, cancel, no duplicate |
| P0.5 | Account OAuth base | verified platform app | Secure scopes, identity readback, disconnect/refresh and audit; no automatic send on connect |
| P1.1 | Meta Facebook/Instagram adapters | P0.5 + scopes/audit | 1 verified post/account and targeted format QA; feature flag each |
| P1.2 | Calendar/queue/evergreen and RSS | P0.3/P0.4 | Real automatic slots/repeat with per-account approval, stop/resume, public-source only |
| P1.3 | AI Content Director | P0.2 + existing Video Studio | Typed draft suggestions/EN-RU-ES, cost quote, factual and safety checks, no unsanctioned send |
| P1.4 | Media uploads/transforms | approved storage | Licensed assets, thumbnails, aspect presets, conversion and privacy tests |
| P1.5 | Other network adapters | provider rights | YouTube uploader reuse, LinkedIn/Pinterest/Threads/Bluesky/TikTok staged |
| P2.1 | Analytics + CRM reconciliation | exact receipts + privacy review | Provable post/engagement/lead/booking/paid counters, provenance |
| P2.2 | Team role/workspaces/reporting | validated HH internal need | Multi-brand access, approvals, audits, exports |
| P3 | SaaS | separate economic validation | Multitenancy, onboarding, billing, support after explicit authorization |

**Разделение ответственности:** Codex can implement code, migrations in a reviewed branch, fixtures, simulations, QA and CI. External OAuth consent, real channel ownership and approval of any public test post must come from authorized account owner. One PR should contain one bounded feature with focused workflow. PR Sweep should count shared CI blockers, not blindly merge independent changes into giant PRs.

## 11. CI, E2E, security и приёмка

**Unit:** source normalization, media type/limits, alt, Unicode+UTM count, anti-SSRF/private-route guard, state transitions, approval invalidation, UTC/DST, duplicate idempotency.  
**Integration:** synthetic Redis CAS, queue concurrent workers, race/lease expiry, 429+Retry-After, auth-expired, network timeout after remote accept, unknown→reconcile, account mismatch, disabled flags, success only with real provider evidence.  
**Browser (Playwright):** 320/375/390/430/desktop, iPhone WebKit/VoiceOver navigation, EN/RU, saved-post edit/disclosure, simulated disconnected social, no external publish on page load; real owner auth E2E separately without publishing.  
**Release:** focused Growth Studio Node CI + pinned dependencies / React JSX render + Next build; production branch rebase check and Vercel READY exact SHA or descendant; role/secret/privacy readback. Never bypass required GitHub review/protection; no heavy unnecessary cross-project CI if paths do not affect them.  
**Live checks:** external provider status only if authorized; record actual account name, provider post id/url, timestamp, approval record and privacy review; rollback/kill-switch rehearsal before unattended sends. Explicit count of manual vs externally confirmed posts. No fake green badges.

**Go/no-go before canceling Publer:** at least all *needed* owner platforms (not necessarily all 13) connected/verified; queue repeatedly handles scheduled test posts without duplicate/miss, export/migration and support plan documented, provider + CRM truth audited, expenses known, explicit owner decision to cancel. Cancellation is NOT part of this task.

## 12. External dependencies, risks and costs

- First operational blocker: dedicated approved **public Telegram** bot/channel credentials, not HH_PRACTICE_TG client bot; owner channel admin rights and one explicit pilot approval. No keys in GitHub/ChatGPT.
- Facebook/Instagram: business/creator/Page and an approved Meta app with actual requested scopes and app review as applicable. YouTube: verify existing RU/EN uploader OAuth and target channel; Metricool website API entitlement not inferred from ChatGPT plugin.
- TikTok direct posting: creator consent, scopes, permitted privacy, app audit (unaudited clients have restrictions); no hidden/public auto-post claim.
- Vercel cron frequency depends on **actual Vercel project plan**; verify before choosing minute-level scheduler or paying.
- Content generation: estimate tokens/render credits and enforce hard caps; no purchase/ads/billing toggles implicit in development.
- Complexity priority: a robust queue + real first account is worth more than adding more draft-only social icons.

## 13. External public references checked 31.10.2026

- Publer networks: https://publer.com/help/en/article/what-social-networks-are-supported-including-how-many-based-on-each-plan-npoun1/
- Publer features/business: https://publer.com/help/en/article/what-is-included-in-publer-business-1c57hsq
- Publer post type limitations: https://publer.com/help/en/article/what-post-types-are-supported-and-their-limitations-1687rte/
- Publer RSS: https://publer.com/help/en/article/how-to-auto-schedule-or-auto-post-the-new-rss-feed-articles-1sr2pvy
- Telegram Bot API: https://core.telegram.org/bots/api
- TikTok Direct Post: https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs/usage-and-pricing and https://vercel.com/docs/cron-jobs/manage-cron-jobs

**Current PR scope:** GS-003 preflight implementation only + this documented program. GS-004..GS-018 are *requirements*, not features claimed as delivered.

---

## 14. Growth Intelligence 1.0 — Social SEO, Performance и Content Learning

**Версия:** 1.0 · 9 ноября 2026  
**Связано:** master scope [#1214](https://github.com/andylitvinov-design/books/issues/1214), attribution [#988](https://github.com/andylitvinov-design/books/issues/988), existing SEO monitor [#3061](https://github.com/andylitvinov-design/books/issues/3061), Instagram destinations [#3997](https://github.com/andylitvinov-design/books/pull/3997).  
**Решение по продукту:** Growth Intelligence — аналитический и рекомендательный слой **внутри существующего Growth Studio**, не второй Publisher, не новый кабинет и не отдельная CRM.

### 14.1. Назначение и границы

Growth Intelligence замыкает цикл:

`public content ightarrow platform draft ightarrow preflight ightarrow owner approval ightarrow verified publication ightarrow measured performance ightarrow evidence	ext{-}based learning ightarrow next draft`

Три слоя продукта:
1. **Social SEO Intelligence** — предпубликационная проверка обнаруживаемости и качества конкретной версии для конкретной сети.
2. **Performance Intelligence** — сбор подтверждённых метрик и ранжирование публикаций с учётом охвата, размера аудитории, формата и возраста публикации.
3. **AI Content Intelligence** — выявление повторяющихся сигналов в собственных публикациях, Content DNA и рекомендации для следующего контента.

**Не смешивать Website SEO и Social SEO.** Существующий `/admin/seo`, Google Search Console, sitemap и Lighthouse продолжают отвечать за поисковую видимость сайта. Social SEO анализирует конкретные публикации и правила социальных платформ. Связь между ними допускается только через безопасные публичные URL/UTM и подтверждённую privacy-safe атрибуцию #988; это не объединение сырых данных и не разрешение включить пиксели.

### 14.2. Фактическая исходная точка на 9 ноября 2026

На основании последнего commissioning readback в комментариях #1214:
- Существующий owner-only Growth Studio, редактор, EN/RU/ES варианты, календарь, Content Radar, preflight, Redis editorial storage и ручное планирование — базовая платформа для расширения.
- Redis очередь из #2711 остаётся **dry-run/simulation**. Она не вызывает внешний provider, не доказывает планирование поста и не означает автопубликацию.
- Владелец утвердил ровно два Instagram destinations: рабочий `@wizards.secrets` и личный профессиональный `@andy.therapist`. У каждого отдельные внутренние ID/brandKey, Meta OAuth credentials, approval, calendar, publisher delivery receipts и Content DNA. До фактической Meta identity/Page/scope-проверки оба профиля остаются `pending_authorization`; Insights и публикация не считаются включёнными.
- Последний Metricool readback показывает один бренд с YouTube; Instagram/Facebook не подтверждены. Metricool ChatGPT/MCP-соединение не является серверной API-авторизацией Vercel.
- Поэтому сейчас нельзя показывать настоящие Instagram Top Posts, сравнения аккаунтов, hashtag performance или выводы, будто AI уже обучился на результатах Instagram.

**Жёсткое правило UI:** демонстрационные макеты и synthetic fixtures всегда помечаются «Демо / synthetic». Реальные экраны показывают только полученные и проверяемые данные, включая статус источника и время последнего обновления.

**Instagram publishing baseline after PR #4006:**
- The existing Meta Graph API OAuth foundation and owner-confirmed JPEG Feed publisher are now in the production baseline. The publisher uses the selected `socialAccountId`, verifies the exact linked professional Instagram account and Page permissions, creates a media container, checks processing state, calls `media_publish`, then reads back the permalink/provider media ID.
- The direct publish action is owner-confirmed and server-gated by `HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED`, which remains OFF until the owner completes Meta authorization and a controlled acceptance test.
- The durable calendar/dry-run queue is still simulation-only. No unattended Instagram schedule worker or automatic reposting is enabled.
- The owner-approved account pair is `@wizards.secrets` (work) and `@andy.therapist` (personal). OAuth, approval, provider receipts and Content DNA are separate. Provider identity/Insights are not considered connected until actual Meta readback succeeds.

### 14.3. Единый контракт данных и статусов измерений

Перед миграцией выполнить read-only аудит действующей Supabase/Postgres схемы, Redis editorial store, текущих provider adapters и существующих analytics/attribution таблиц. Переиспользовать совместимую таблицу/модуль, если он уже существует. Не создавать параллельную аналитику, не мигрировать всё в Redis и не добавлять новую БД.

Каждое измерение должно быть привязано к:
- `workspaceId`, `brandId`, **точному socialAccountId**, provider/platform;
- точному provider post/media ID и подтверждённому URL, связанному с delivery receipt;
- нормализованному metric key + оригинальному provider metric name;
- значению и единице измерения, если поле реально возвращено;
- `periodStart`, `periodEnd`, `capturedAt`, `source`, `sourceVersion/apiVersion`, `freshness`;
- интервалу жизни публикации на момент замера (age bucket), формату и языку;
- статусу/причине отсутствия данных и, если возможно, безопасному коду ошибки.

Минимальный логический контракт (имена физических таблиц — только после schema audit):
- **PerformanceSnapshot** — неизменяемое наблюдение метрик на конкретный момент/период;
- **MetricAvailability** — состояние доступности метрики для аккаунта/provider/scope;
- **ContentFeatures** — извлечённые из собственной публикации признаки (hook type, тема, язык, формат, длина, CTA, тема ролика, длительность и др.);
- **ContentDNAProfile** — версионированная сводка закономерностей для одного бренда + социального аккаунта + платформы + языка/формата;
- **Recommendation** — предложение AI с исходной версией, предлагаемой редакцией, доказательствами, уровнем уверенности, статусом и решением владельца;
- **Experiment** — заранее определённая гипотеза, варианты, окно измерения и критерий завершения.

Статусы данных, которые UI обязан различать:
- `NOT_CONNECTED` — аккаунт не авторизован;
- `PENDING_AUTHORIZATION` — требуется действие владельца;
- `CONNECTED_NO_SCOPE` — подключение есть, необходимого read scope нет;
- `UNSUPPORTED` — API этой платформы/метрики не предоставляет;
- `NOT_PUBLISHED` — нет подтверждённого provider post receipt;
- `NOT_MEASURED` — замер ещё не выполнялся;
- `NO_DATA` — источник успешно проверен, но за интервал не вернул данных;
- `STALE` — последнее значение старше ожидаемого freshness SLA;
- `UNAVAILABLE` — временная ошибка/ограничение провайдера;
- `FRESH` — актуальное измерение получено и сохранено.

Отсутствующее поле, неподдерживаемая метрика и нулевое значение — разные ситуации. Только явный provider value `0` может отображаться как ноль. Не подменять `null`, ошибку, неполный scope или пустой ответ нулями. Не выводить производные rates, если знаменатель отсутствует или равен нулю.

### 14.4. Сбор статистики: адаптеры и проверка прав

Каждый provider adapter должен объявлять machine-readable capabilities matrix по каждой метрике: `supported / scope_missing / unsupported / temporarily_unavailable`, допустимые интервалы, задержку данных, единицу/определение метрики и endpoint/API version. Не предполагать, что все сети возвращают одинаковые поля.

Порядок интеграций:
1. **Instagram Professional / Meta** — только официальный Instagram Graph API / официальная Meta authorization либо уже одобренный и доступный Metricool API. Проверять Page ↔ Professional Instagram linkage, account identity и scopes по каждому аккаунту независимо. Не считать consumer/personal профиль подходящим. Read insights scope запрашивать отдельно от write/publish scopes, где Meta это позволяет.
2. **YouTube** — использовать действующую авторизацию владельца и официальный YouTube Analytics API; существующий uploader и публикационный workflow не дублировать. Учесть, что Analytics данные могут отставать примерно на 48–72 часа; актуальные оперативные счётчики (если нужны и разрешены) помечать отдельным источником YouTube Data API, не смешивая с Analytics reports.
3. **Metricool** — подключать server-side API только после подтверждения фактической entitlement/тарифа и наличия токена владельца. Текущая справка Metricool указывает API для Advanced/Custom, а MCP — отдельно и доступен на других планах; наличие MCP само по себе не даёт серверного доступа Growth Studio. Не покупать и не менять тариф без отдельного согласования.
4. Facebook, TikTok, LinkedIn и другие сети — добавлять только отдельные официальные read adapters по мере подтверждения разрешений, app review и нужных полей. Запрещены scraping, неофициальные endpoints и обход ограничений.

Секреты хранятся только в действующем server-side secret store; браузер получает только безопасные display поля. Не записывать токены и полные upstream headers/bodies в логи. Подключение аналитики read-only не должно автоматически включать publishing scopes или публикацию.

**Индивидуальные профили:** каждый аккаунт — отдельная единица измерения и Content DNA. Смешивать метрики двух Instagram аккаунтов или website brands только в явно обозначенном агрегате; сохранять drill-down до точного аккаунта/поста. Не считать бренд сайта социальным аккаунтом.

### 14.5. Snapshot schedule и история динамики

После подтверждённой публикации сохранять доступные snapshots по целевым окнам:
- около **24 часов** — ранний отклик;
- около **72 часов** — краткосрочная динамика;
- около **7 дней** — недельный результат;
- около **30 дней** — long-tail, если provider сохраняет и выдаёт такие данные.

Это цели измерения, а не обещание доступности/точного timing: worker должен учитывать API rate limits, data lag, недоступность метрики и account scopes. Фактические `capturedAt` и измеряемое `period` показывать пользователю; не переписывать прошлые snapshots «текущим» значением. При повторном чтении того же окна сохранять provenance и версию/правило дедупликации.

Никакой новой платной cron-службы или тарифа. Использовать только уже разрешённый job runtime/worker после проверки его реальных возможностей; до этого ручной owner refresh или уже доступная безопасная периодика. Параметры сбора — ограниченная частота, backoff, jitter, per-account budget, kill switch.

### 14.6. Метрики и честное сравнение постов

Каталог метрик включает то, что конкретный API действительно предоставляет:
- базовые: likes, comments, shares, saves, views/video views, reach, impressions;
- действия: profile visits, follows/subscribers gained, link clicks — только если provider возвращает их с понятной атрибуцией;
- видео: watch time, average watch duration, average percentage viewed, engaged views/completions — только при наличии определения в источнике;
- first-party funnel: campaign landing sessions, confirmed enquiry, booked appointment/event, confirmed payment — только из разрешённого источника #988 и с доказанным server-side событием.

Сохранять определения: `views` не равно `reach`; `impressions` не равно `unique viewers`; `link clicks` не равно `leads`; lead не равен booking; booking не равен payment. Не суммировать несовместимые метрики в единый engagement count.

Для сравнения использовать несколько видимых показателей, а не один скрытый «магический» балл:
- абсолютные реакции и охват;
- **engagement by reach** = (likes + comments + shares + saves) / reach, только если все компоненты и reach реально доступны и сопоставимы;
- saves/reach, shares/reach, comments/reach — отдельные rates при наличии полей;
- views/reach и retention/watch metrics — отдельная video-группа, не смешивать с engagement;
- actions per reach и follows per reach — только при согласованном numerator/denominator.

Рейтинг по умолчанию строится внутри сравнимой когорты: один provider, один social account, один формат или сопоставимая группа, тот же язык и окно возраста поста. Межаккаунтное и межплатформенное сравнение — отдельный режим с явной нормализацией и предупреждением, не raw likes leaderboard.

Учитывать разные audience sizes и reach. Follower count можно сохранять как контекстный snapshot знаменателя с датой; не подменять им reach. Не делать вывод о победителе на одном абсолютном лайковом счётчике.

### 14.7. Performance Dashboard и Top Posts

Раздел внутри Growth Studio, без нового кабинета:
- **Performance** — фильтры: бренд/соцаккаунт/сеть/язык/формат/кампания/диапазон/возраст публикации; статусы источников и свежесть;
- **Top Posts** — ранжирование внутри выбранной сравнимой когорты; карта поста содержит миниатюру/превью, первую строку, дату, формат, фактические реакции, reach/views, rates, источник и freshness;
- **Post detail** — timeline snapshots 24h/72h/7d/30d, подтверждённый URL и ID, составные метрики, изменения/дельты;
- **Topic Performance** — темы и форматы с количеством постов, медианами/распределением и выборкой, а не только средним;
- пустые состояния показывают точную причину (нет аккаунта, scope, опубликованного поста или provider data); synthetic preview всегда заметно маркирован.

Запрещено показывать выдуманные примеры как реальные карточки, «0 результатов» при неподключённом API или фиксированный рейтинг при малой выборке.

### 14.8. Social SEO Analyzer перед публикацией

Каждый draft анализируется отдельно для выбранной платформы и выбранного account target. Результат — **editorial readiness/advisory score**, а не прогноз алгоритмического охвата и не гарантия продвижения.

Компоненты оценки (вес/наличие — versioned per platform):
- ясность и сила первой строки/hook;
- соответствие теме и намерению аудитории;
- естественное употребление релевантных ключевых выражений в caption/on-screen title/description;
- соответствие формата и длины правилам сети;
- качество CTA и понятность следующего действия;
- полезность alt text/accessibility;
- релевантность ограниченного набора hashtags, если сеть и формат их поддерживают;
- для видео: понятность первого кадра и первых секунд по предоставленному сценарию/asset metadata; не заявлять фактический retention до получения video insights;
- брендовый голос, язык и безопасные фактические утверждения.

Показывать балл, факторы и конкретные исправления. Отсутствующий alt/ключевое слово не должен искусственно понижать score там, где поле не применимо. Правила платформ и версии весов хранить отдельно, с датой обновления и source URL. Не использовать одну оценку для Instagram, YouTube Shorts, LinkedIn и Facebook.

Hashtag suggestions — гипотезы релевантности и удобства поиска, не «трендовый рейтинг» без подтверждённых данных. Не перегружать пост хештегами и не обещать viral reach. Не выдавать неподтверждённые объёмы поискового спроса или keyword difficulty.

### 14.9. AI Recommendation Engine и Content DNA

AI анализирует только собственные публичные материалы/разрешённые метаданные и агрегированные performance snapshots. Не читать DM, private audience profiles, private client Cabinet, тесты, терапевтические записи, health data или приватные комментарии. Публичный текст комментариев не сохранять для маркетингового профилирования людей; counts достаточно для базовой аналитики.

Content DNA строится отдельно по:
- social account + brand;
- платформе;
- языку;
- формату (Reel/Short/carousel/image/text);
- тематическому кластеру и контентной серии.

Извлекаемые признаки: headline/hook structure, вопрос/утверждение/афоризм/список, тематический тег, длина caption, тип CTA, эмоциональная рамка (юмор/удивление/узнавание/любопытство и т.п.), visual/scene descriptors из авторского creative brief, язык, format, timing, hashtag groups. AI не должен анализировать лицо, личность или чувствительные характеристики зрителей.

**Два независимых Content DNA:**
- **Work — @wizards.secrets:** wizard-визуальность, юмор, загадки, короткие афоризмы, shareability и переходы к бесплатным тестам.
- **Personal — @andy.therapist:** авторский профессиональный голос, экспертные наблюдения, образовательные материалы и доверие к автору.

Не переносить тон, hooks и успешные темы одного профиля на другой без отдельного эксперимента и согласования владельца. Общие отчёты показывают метрики отдельно по каждому аккаунту; общий Content DNA не строится.

**Статистика и доверие:** каждый вывод содержит число наблюдений, временной интервал, сравнимую когорту и confidence label. Установить минимальные sample thresholds до включения рекомендаций; до достижения порога показывать `insufficient evidence`. Использовать медианы/распределения и shrinkage/сглаживание для малых выборок. Модель не делает причинный вывод «юмор вызвал рост», если не было контролируемого эксперимента; формулировка — «в наблюдаемой выборке юмористические публикации имели более высокий median share rate». Не смешивать разные окна/размеры аудиторий и не обучаться на synthetic examples как на собственных результатах.

Рекомендация хранит:
- исходный content version/hash и target account/platform/locale;
- краткое предложение и editable before/after вариант;
- причину и ссылки на конкретные наблюдения/посты;
- sample size, confidence, ограничения и expected metric (например, shares/reach);
- approval state и решение владельца (accept/edit/reject);
- фактический результат после публикации, когда он появится.

AI предлагает варианты, но не перезаписывает approved copy, не ставит в очередь и не публикует без владельца.

### 14.10. Content Experiment Lab

Эксперимент создаётся с одной гипотезой и одной основной изменяемой переменной: например, два hook варианта к одному и тому же разрешённому creative. Заранее фиксируются аккаунт, язык, формат, окно, primary metric и правила остановки.

Не публиковать идентичные дубли с коротким интервалом, если это может быть spam/нарушением платформы. Использовать поддерживаемый платформой native experiment/A-B feature, разнесённые и сопоставимые публикационные слоты или ручной controlled comparison. Учитывать день/время, paid vs organic, аудиторию и сезонность; при смешении условий помечать результат observational, а не controlled. Никакого автопоста вариантов без отдельного approval каждого аккаунта/слота.

### 14.11. AI Content Director

На основе подтверждённой Content DNA и результатов Performance предлагает недельный editorial plan:
- темы/рубрики и формат на каждый пост;
- повторное развитие проверенных тем без копирования один-в-один;
- новые гипотезы, помеченные как экспериментальные;
- account/language-specific variants;
- ссылки на source посты и причины рекомендации;
- ожидаемая основная метрика и confidence.

При недостатке измерений AI должен честно предложить разнообразный test plan, а не имитировать «обученный» контент-план. Генерация только в существующем Composer/AI flow; бюджетные и публикационные ограничения #1214 сохраняются.

### 14.12. Приоритет реализации и критерии приёмки

| Priority | Work package | Acceptance / evidence |
|---|---|---|
| P0.1 | Provider + metric capability inventory | Per-account matrix, actual read scopes, field definitions, latency and source version; no credential values in UI/log |
| P0.2 | Schema audit + snapshot contract | Reuse existing DB/storage; additive migration only after proof; no second analytics database |
| P0.3 | Read-only Insights adapters | One real authorized source end-to-end; raw provider metric provenance preserved; no publish permission implied |
| P0.4 | Performance + Top Posts | Real post receipt → snapshots → cohort ranking; missing fields shown unavailable, not zero |
| P0.5 | Sampling / freshness jobs | Target 24h/72h/7d/30d, bounded and observable, no paid scheduler; actual captured timestamps visible |
| P1.1 | Platform-specific Social SEO Analyzer | Platform-specific advisory score and actionable suggestions; deterministic test fixtures |
| P1.2 | AI Recommendations | Evidence-linked before/after variants, confidence/sample size, owner decision, no auto-edit/publish |
| P1.3 | Content DNA | Per-account/platform/locale/format cohorts with minimum sample and uncertainty handling |
| P2.1 | Hashtag + Topic Intelligence | Supported public/source data only; no invented search volume/trend claims |
| P2.2 | Experiment Lab | One controlled variable, preregistered hypothesis and primary metric, honest confounders |
| P2.3 | AI Content Director | One-week plan grounded in own measured content; exploratory plan when evidence is insufficient |

**Release requirements:**
- focused unit/contract tests for missing-vs-zero, scope matrix, provider pagination, freshness/stale, duplicate snapshots, rate limiting, timezone, metric denominators and per-account isolation;
- integration tests using clearly marked synthetic fixtures, plus at least one owner-authorized real read-only provider sample before calling an adapter operational;
- browser tests at 320/375/390/430 and desktop, Growth Studio owner/non-owner access, empty/no-data/stale states and account switching;
- exact-head CI, TypeScript/lint/production build as applicable, protected merge to `codex/public-book-library`, Vercel READY exact descendant SHA and authenticated owner route verification;
- no public post, OAuth grant, new paid service, plan change, analytics pixel, ads, client-data export or auto-publish without its separate existing approval gate.

### 14.13. Non-goals and cost/privacy guardrails

- No new product or SaaS, no second Publisher, no separate CRM, no parallel analytics cabinet.
- No Metricool Advanced/Custom purchase or subscription upgrade without explicit permission. Official Metricool docs: [API plan eligibility](https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u), [API integration guide](https://help.metricool.com/basic-guide-for-api-integration-r97af).
- No unapproved Meta scopes, no paid API, no new cron/runner spend.
- No private client material, therapeutic/health data, test results, private messages or audience-level profiling.
- No switching `PUBLIC_ANALYTICS_AVAILABLE=false`, consent gates, GA4/Meta pixels or public tracking as a shortcut.
- No claim that missing measurement means poor performance; no claim of causality from observational data; no publish state without exact provider receipt.
- Existing owner approval, source provenance, immutable approval hash, idempotency, kill switches, audit and rollback contracts in sections 3–5 remain mandatory.

**Implementation rule:** this section extends the existing Growth Studio 2.0 master specification and #1214. It is a specification, not evidence that Social Insights, account OAuth, AI learning or publication analytics are already implemented or LIVE.

### 14.14. Official API reference links checked 9 November 2026

- Meta Instagram API (official Meta Postman documentation; Professional accounts, Page linkage, publishing and insights): https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- YouTube Analytics API reference and OAuth scopes: https://developers.google.com/youtube/analytics/reference
- YouTube Analytics metric catalogue: https://developers.google.com/youtube/reporting/v1/reports/metrics
- YouTube Analytics data model and processing latency: https://developers.google.com/youtube/analytics/data_model
- Metricool API eligibility by plan and separate MCP availability: https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u
- Metricool official API integration guide: https://help.metricool.com/basic-guide-for-api-integration-r97af

These links are technical references, not evidence that any account is connected, that requested scopes have been granted, or that a paid plan is active.
