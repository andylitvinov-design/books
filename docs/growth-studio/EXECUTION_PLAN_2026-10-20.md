# HH Growth Studio — executable improvement plan, 20 October 2026

> Status as written: **P1 code in draft PR #1232; NOT LIVE, NOT PUBLER PARITY**. The actual Holistic House canonical source is repo \`andylitvinov-design/books\` branch \`codex/public-book-library\`, **not** its default branch. Recheck the production SHA and concurrent PRs before each merge. Nothing below approves ad spend, new SaaS subscription, real social publishing, HeyGen credit use, or deployment with failing security/build tests.

## Product outcome
Support the owner's current Holistic House, TorontoTantra and PsiTrends content with a convenient phone-first one-stop marketing tool. Do not duplicate CRM, HeyGen or event publishing modules.

Publer's current public help center (updated September/October 2026) documents 13 social network families, account-specific posting time slots, auto-scheduling, recurrent/recycled content, 500-row CSV batch import and analytics. We only claim parity after actual connections and end-to-end post/receipt testing. Our advantage will be **published public source → multilingual reviewed post → confirmed provider delivery → independently verified lead/booking/payment in first-party CRM**, respecting consent and privacy boundaries.

## Current capability inventory (no inflated status)

| Area | PR #1232 source | Real-site acceptance |
|---|---|---|
| Owner EN/RU editor, brand/lang/per-network variants and preview | Implemented | Unverified |
| Protected Redis draft storage, owner authorization, optimistic revision CAS | Implemented | Owner authenticated write + reload unverified |
| CSV bulk drafts, up to 500 rows, platform/public-asset validation | Implemented | Actual owner Publer export migration not verified |
| Editorial calendar & manual planning | Implemented | Manual only, **not externally scheduled** |
| Free-slot suggestions in Toronto (weekdays 10:00/17:00), DST gap/overlap safety, collision warning | Implemented in current branch | Manual-only calendar, in CI |
| .ics manual posting reminders (15-minute alarms, no captions/private notes, not auto-posting) | Implemented in current branch | iPhone Calendar/Google Calendar import not yet tested |
| 13 Publer network families + event-provider drafts | Capability catalog only | **No** provider connectivity implied |
| Telegram public Holistic House channel | Owner-approved send-now path, bot/channel permission preflight, ambiguous-delivery lock | Actual BotFather token, public channel, provider ID/URL and live replay test NOT verified |
| YouTube videos | Separate /admin/youtube-upload route already exists | Google OAuth + correct RU/EN channel and provider readback still separate |
| Metricool | ChatGPT connector can inspect one brand | No access transferred to server; API subscription entitlement must be separately verified |
| Meta/TikTok/LinkedIn/Pinterest/Threads/Bluesky/X/Mastodon/WordPress/GBP | Formatting + manual-ready copy | No confirmed production site OAuth/API access |
| Queue, recurring/recycling, RSS | Not built | BLOCKED on provider adapters/approval and durable worker |
| AI multimedia and HeyGen | Existing video SOP #218/#219 | Not in Growth Studio; no paid render approval |
| Revenue attribution | First-party CRM #988 already has work | Growth Studio has not proven joined, consent-valid paid ROI |

## P0 — release the actual safe editorial MVP (highest priority, 1–4 engineering days after CI capacity)
**Engineering:** Codex/ChatGPT. **Owner action:** none for code, later admin login for real saved draft acceptance.

1. Resolve exact PR head, current production base, other open PRs, \`AGENTS.md\` where present, Next branch rules. Preserve concurrent client/Academy/Reiki and security changes. No forced reset/preview-cost bypass.
2. Focused CI: \`node --test tests/growth-studio-editorial.test.mjs tests/growth-studio-csv.test.mjs tests/growth-studio-bulk.test.mjs tests/growth-studio-telegram.test.mjs tests/growth-studio-platforms.test.mjs tests/growth-studio-manual-calendar.test.mjs\`, ESLint for changed files, \`npm run build\`, safe URL and channel readiness tests. Include exact SHA evidence. A build passing on an older commit does not count.
3. Explicitly classify broad failures as **introduced** vs **same as canonical baseline**. Existing large-site suites include concurrent tests outside this PR. Never mark all green if they are not; don't disable checks to pass.
4. Browser WebKit/Chromium at 320/375/390/430/768/1280px, anonymous redirect, auth expiry, independent owner logins, RSS/private link rejection, CSV 500-row atomic replay, date/time input and time-zone consistency, .ics reminders import.
5. Merge reviewed source only if all new checks pass and no new high-severity security or privacy issue. Verify Vercel production **READY exact release SHA**, actual alias, \`/admin/growth-studio\` owner access, Redis new draft save/reload/conflict on two devices and **zero** unauthorized public routes. Roll back if verification fails.

**P0 Done:** screen recording or E2E test evidence for real owner saved draft, correct security, normal mobile browsing, no duplicate bulk imports, no private data, unique commit+deployment proof. Otherwise status BLOCKED.

## P1 — provider account credentials + audit contract (suggested 1–3 weeks)
Do not create a second CRM or store OAuth secrets in public JavaScript/Redis editorial records. Use workspace-owner scope, server-side encrypted secret references, minimum API scopes, provider account ID + handle + bot/Page/channel verification, expiration/revoke state and detailed provider capability status. For each channel show \`not connected\`, \`configured / unverified\`, \`verified\`, \`manual only\`, \`permission expired\`. Maintain a provider ID/URL and delivery receipt per actual posted item.

Prioritize:
- **Telegram:** owner provisions one bot via https://t.me/BotFather and adds it with Post Messages administrator right to a **public** HH channel, then three env settings per \`OWNER_CONNECTION_SETUP_2026-10-20.md\`. Read-only \`getChat\` + \`getMe\` + \`getChatMember\` preflight, one specifically owner-approved harmless test post, verify message ID and public URL.
- **YouTube:** reuse the existing owner iPhone uploader with *explicit RU/EN destination*, Google OAuth checks, Unlisted default for website. Video SOP \`ai-projects-brain#218/#219\`, Drive master archive and QA; no client videos on public/Unlisted YouTube.
- **Meta Pages/Instagram Professional:** official OAuth and rights, Business app review as required. Verify Page/Instagram account IDs and media type before scheduling. Do not target health/private assessment audiences.
- **Metricool bridge:** may be a useful adapter, but ChatGPT plugin connection is not the website token. Check actual account API entitlement/cost before proposing paid upgrade. If not available, stay manual or use approved direct network integration.
- **LinkedIn, Pinterest, TikTok, Threads, Bluesky, Mastodon, GBP, WordPress, X:** prioritize by what the owner actually uses. Build adapters only where terms/permissions permit; unsupported stay manual. Meetup/Eventbrite belong to their existing event source.

**P1 Done:** exact owner provider account and scopes read back, successful authorized test post with correct text/media/privacy, provider post ID and publicly verifiable URL where applicable. Wrong channel or ambiguous outcome must fail closed.

## P2 — real unattended scheduler and platform delivery (2–4 weeks after first provider verified)
- Design \`ChannelAccount\`, \`PostVariant\`, \`Approval\`, \`TimeSlot\`, \`PublishJob\`, \`PublishedReceipt\`, \`AuditEvent\`. Data is workspace-scoped; minimal disclosure.
- Approval **cryptographically binds** exact caption, media digest, brand, language, provider account ID, destination and requested time. Editing invalidates approval.
- Durable, server-side Postgres outbox/worker with UTC due-at, Toronto display, atomic lease/claim, maximum attempts and backoff only on provably pre-send failures. After a timeout/unknown provider outcome, **reconcile external post ID before any retry** to avoid duplicates. No busy polling that exhausts Vercel/Cloudflare quotas.
- Per-account weekly weekday/post-type slots, collision detection and queue reorder. Separate statuses: \`manual planned\` / \`queued locally\` / \`provider scheduled\` / \`published confirmed\` / \`delivery unknown\` / \`failed\` / \`cancelled\`.
- Owner opt-in per campaign, per-post pause, global kill-switch, historical audit and support export. No new recurring auto-posting unless the owner explicitly enables it for selected public materials.
- Provider-side media requirements and rate limits, post duration and account capabilities; never silently publish to another account or visibility.

**P2 Done:** two verified channels, 20 synthetic or owner-approved QA jobs each (planned, executed, failed, recovered), no duplicates; exact UTC/local clock behavior across DST transitions; correct external IDs, time and account. Actual posts require explicit approval.

## P3 — Publer parity for content, recurrence and media (2–4 weeks)
- Public article/service/course/event chooser reading only **published** website content; safe campaign identifier and clean UTM links (no tests, symptoms or clinical data). Multi-language independent drafts, presets, editorial review.
- Digital-asset rights metadata, safe upload/preview/alt text/captions; network-specific transforms without dropping video quality, Reels/Shorts 9:16 vs site/YouTube 16:9. No large MP4 in GitHub or Drive share links as playback CDN.
- RSS feed import **review-first**, dedupe by public canonical URL, per-brand allowlist, no ingestion of private pages. Evergreen/recycling only on platforms that permit repeated content; caps, expiring schedules and human opt-in. X, TikTok, YouTube, Pinterest, Google Business and WordPress **must not receive blind duplicates**. Refer to provider policies.
- Proper Publer migration: accepted CSV schema / labels/media mappings and explicit warnings for unsupported columns, timezone selection/DST guard, replay protection. Existing scheduled Publer posts continue running until independently reconciled; don't double-publish.

**P3 Done:** eligible public content generates separate accepted variants, passes mobile previews/media validation, schedules only after approval and obeys platform duplicate rules.

## P4 — growth intelligence and AI (2–4 weeks after delivery)
- Read-only social performance via verified network/Metricool scopes, cache and quota budgets. \`Views\`, \`likes\`, \`clicks\` and opened messenger apps **are not verified leads**.
- Follow \`books#988\`: source/UTM → confirmed enquiry → qualified → real booking → captured payment → repeat/refund. Where absent, show **Not measured**, not fabricated 0 or ROI. Keep \`PUBLIC_ANALYTICS_AVAILABLE=false\` until separate consent/privacy review.
- AI copy with non-corporate Andy voice and independent EN/RU/ES review; safe fallback templates where paid API unavailable. No unverified clinical claims.
- Only on explicit \`Generate\` approval run HeyGen with **verified private Andrey Digital Twin**, current Look/cloned voice/real room; default 1080p, Avatar IV normal education, Avatar V hero, 15–20s test for new setup, quote duration/credit usage and QA before Drive/YouTube/public distribution. Never silently use a stock avatar.

**P4 Done:** clear attribution to real paid business outcomes without private data flowing into advertising platforms; creator receives correct public content without duplicate expensive renders.

## P5 — separate SaaS only after internal validation
Multi-tenant permissions, billing, team approvals, roles, uptime/quotas, media cost accounting, provider app reviews and legal privacy review. Do not spend money on this until HH gains business value.

## Priority scorecard to compare honestly with Publer
- **Publication reliability:** 100% provider-target matches on acceptance sample, 0 unapproved sends, 0 duplicates in retries, no fake \`published\` label.
- **Content operations:** save/reload across devices; 500-CSV preview and 20-item atomic chunks with idempotent replay; EN/RU/ES independent review; accessible phone editor.
- **Automation:** per-channel confirmed scheduling and transparent failed/unknown/paused states; no ignored queues or expired OAuth silently interpreted as success.
- **Business benefit:** CRM **received** enquiries, bookings and captured payments distinguished from clicks/events; a cost and conversion report only where data is actually measured.
- **Safety:** no client/private cabinet data in posts, CRM attribution or social APIs; no clinically unsupported promise, no unsanctioned HeyGen expense.

## Current external dependencies / owner gates
1. Real admin sign-in to production after code release (ChatGPT connector cannot impersonate the owner).
2. Telegram BotFather token + named public channel admin permission, stored only in official Vercel production secret settings; do not paste tokens into chat.
3. Google Cloud Web OAuth client ID and explicit owned RU/EN YouTube channel authorizations where missing.
4. Official Meta / other accounts per provider, possibly app audit, billing/API entitlement. Never assume a connected ChatGPT Metricool plugin conveys API access to the website.
5. Explicit per-post or per-campaign publishing approval; ad spending and recurring paid services always separately approved.

## Linked material
- [Initial implementation PR #1232](https://github.com/andylitvinov-design/books/pull/1232)
- [Publer parity audit](./PUBLER_PARITY_AUDIT_2026-10-20.md)
- [Owner connection steps](./OWNER_CONNECTION_SETUP_2026-10-20.md)
- [Codex continuation](./CODEX_CONTINUATION.md)
- [CRM conversion truth #988](https://github.com/andylitvinov-design/books/issues/988)
- [Video architecture #218](https://github.com/andylitvinov-design/ai-projects-brain/issues/218) and [publishing SOP #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219)
