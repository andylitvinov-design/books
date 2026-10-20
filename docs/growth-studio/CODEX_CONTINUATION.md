# Codex continuation — HH Growth Studio (Publer+), 19 October 2026

## Read first
1. Product issue: https://github.com/andylitvinov-design/books/issues/1214
2. Start from the **actual** Vercel production branch/commit for holistichouse.vercel.app; last verified repository is \`andylitvinov-design/books\`, branch \`codex/public-book-library\` (not default \`codex/bootstrap-books\`). Re-resolve live head, Vercel alias, open PRs, CI and repo-local instructions on every execution.
3. Existing project source of truth: \`ai-projects-brain#218\` (video architecture), \`#219\` (video publishing SOP, **latest dated comment**), \`books#223\` (growth strategy), \`books#988\` (verified marketing attribution), \`books#371\` (CAD 5/day optional paid pilot), \`books#801\` (event referrals), \`books#985/#991\` (CRM), \`books#306\` (SEO); TorontoTantra event publisher existing PR #72.
4. Inspect first implementation PR linked to #1214; **reconcile, do not duplicate**: owner-only \`/admin/growth-studio\`, \`components/growth-studio.jsx\` and scoped CSS, \`lib/growth-studio/model.mjs\`, \`lib/growth-studio/store.js\`, server actions, regression tests, owner navigation. This initial UI is a **manual editorial calendar**, not a published scheduling engine.

## Required immediate completion: stabilize the current PR
- Audit saved module and UI against the **current** production branch, not stale snapshot. Run \`node --test tests/growth-studio-editorial.test.mjs\`, \`npm run build\`, \`npx tsc --noEmit\` where applicable, lint changed files and relevant auth tests. Fix all new regressions without changing unrelated clinical/sensitive data or weakening guards.
- Verify server actions enforce \`requireAdminRequest\` on **every** read/write; page redirects to /admin/login; no public route, sitemap, or OpenGraph leak. Test admin authenticated, unauthenticated, expired, refresh and new-device sessions. No credential/token ever in client code or logs.
- Validate Redis REST atomic CAS and serialization in an isolated test fixture. The existing \`PRESCRIPTIONS_KV_REST_API_*\` server-only backing is reused in a *dedicated namespace* (not Cloudflare Workers KV). A missing/failed store must clearly block writes, not pretend browser-local success. Cover conflicts, lost connection, malformed saved data, excessive records and duplicate save/retry.
- Run responsive browser QA 320/375/390/430/768/1280px, both EN/RU admin labels, EN/RU/ES content selection, calendar DST in \`America/Toronto\`, CSV formula-injection protection, accessibility and screen-reader labels.
- Do not call "LIVE" until exact GitHub head checks, production branch merge, Vercel deployment READY at merged SHA, actual owner session, confirmed Redis save/reload and iPhone interaction are verified. Vercel has recent concurrent production build errors; review current failure causes before merging.
- Keep any new public copy legally compliant and avoid diagnosing, dosing, cure guarantees, professional title exaggerations, medical efficacy or private user-health data.

## Phase 2: real platform publishing adapters
Implement provider-agnostic types, not scattered ad-hoc API calls:
- \`SocialAccount\` with owner + brand + provider + channel ID + scopes + connection health + encrypted refresh token reference. Never infer account/channel from language or logged browser user.
- \`ChannelVariant\`, \`Approval\`, \`PublishJob\`, \`PublishedPost\`, provider delivery receipts/audit timestamps. Store actual provider status and ID/url. Approval is invalidated by edits to caption, media, destination, language or channel.
- Adapter interface: \`validateVariant\`, \`checkAuthorization\`, \`schedule\`, \`publish\`, \`reconcile\`, \`cancel\`; capabilities table because providers differ in scheduling/media/account requirements. Modes: official API, authorized Metricool bridge, or explicitly assisted/manual. Do not automatically use browser scraping or unsupported APIs.
- Durable worker queue on the existing approved infrastructure; strongly idempotent \`ownerId+variantId+channelId+occurrence\`, atomic claim, backoff/rate limits, bounded retries, dead-letter and outbox. For unknown responses, reconcile status before retry so no duplicate posts.
- First live channel: validate existing Metricool brand (one linked RU YouTube brand was visible to ChatGPT on 2026-10-19) OR authorized Telegram channel; don't assume social accounts connected. Prefer reusing the existing mobile YouTube uploader with guardrails. Always require owner approval of a **specific target channel, text/media and publish date** before any real external write.
- Implement one synthetic, owner-approved end-to-end post with real provider ID + URL readback, and ability to stop/retry safely. No claims of publication from a scheduled local calendar record.
- Facebook/Instagram business account + Meta permissions/review, YouTube OAuth target verification, LinkedIn API, Pinterest/Threads/Bluesky/TikTok approved scopes are independent activation gates.
- Use \`torontotantra\` official event-publisher integration for Eventbrite/Meetup; if Luma/Meetup APIs cannot legally/operationally post, provide manual-ready export and honest status (no fabricated success).

## Phase 3: content and video intelligence
- Source picker for **public/published-only** articles, services, Academy courses and real verified events. Do not pull client sessions, consultations, tests, chat notes or private cabinet files. Record canonical public URL and source revision.
- Create separate platform-specific caption/media/cropped previews, safe UTM links and SEO descriptions; bilingual EN/RU and independent ES editorial review. Preserve the author's warm personal voice.
- AI text drafts with deterministic template-based fallback for unreachable AI provider; display prompt/source disclosure and never mark generated claims as verified. Editorial approval before posting.
- Reuse \`#218/#219\` HeyGen verified **private Andy Digital Twin / Look / cloned voice / room**, 1080p, Video Avatar IV vs V quality/credit policy, website 16:9, Shorts 9:16; 15–20s tests for new setups. No paid video generation until specifically approved. Google Drive = canonical archive, never website CDN; public video via YouTube/Metricool after QA and approval; client/private video never normal YouTube.
- Media deduplication, accessible alt-text, captions, version history, rights/licensing checks, file-size safety, no oversized media in GitHub.

## Phase 4: true growth analytics, without privacy leaks
- Follow \`books#988\`: first-party allowed UTM -> actual server-verified lead -> qualified -> booking -> captured payment -> repeat/refund. Clicks, outbound WhatsApp launches, course starts and event RSVPs are NOT confirmed leads/payments. Report unmeasured values as "Not measured" rather than 0 or fabricated ROI.
- \`PUBLIC_ANALYTICS_AVAILABLE=false\` remains in force until separately reviewed and approved privacy/consent activation; NEVER inject GA4/Meta Pixel in client/medical routes. No audience building/retargeting based on health, stress, tests or therapy history.
- Read Metricool/network provider analytics only with verified linked brand permissions, cache sparingly and respect quotas. Reuse CRM entity/attribution model; do not build a second contact database.

## UX / quality gates
- Owner landing in My Practice and /admin with safe deep link, mobile-first calendar, content composer, per-platform post preview, media picker, reviewer approval, manually planned vs actually scheduled/published status distinction.
- Tests: authenticated/anonymous; content private/public separation; CAS conflict; idempotent real and timeout retries; missing/revoked OAuth; DST; invalid URLs/UTM; multi-account isolation; rate-limited providers; EN/RU/ES copy; mobile WebKit/Chromium; accessible keyboard navigation.
- CI + preview + exact production tree match and Vercel READY + owner real-store readback before marking milestone released. Do not bypass necessary tests or hidden/private security gates.

## Reporting template
For each PR and release: branch/head/PR, files changed, CI/tests and missing checks, verified provider connections and **actual** post IDs, environment/Redis state without secrets, iPhone/browser QA, deployment SHA/URL, costs (CAD), no new paid renders/posts/ads unless explicitly approved, remaining blockers with exact next steps.
