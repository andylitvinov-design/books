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