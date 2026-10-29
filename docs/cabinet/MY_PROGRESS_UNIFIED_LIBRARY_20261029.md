# Holistic House · My Progress — unified live entry and historical category library

Owner screenshot, 29 Oct 2026. Target screen: private \`/{en,ru}/app/progress\` (existing component \`components/app/my-progress.jsx\`). Source of incorrect navigation: public \`/{locale}/holistic-support/mobile\` bottom dock previously linked to \`#support-progress\`, which was **not** the account history. Production branch: \`codex/public-book-library\`; PR #2558 (follow-up to merged #2501).

## 1. One source per domain — no duplicate services or database

| Feature in existing site | Original source & verified route | On My Progress |
| --- | --- | --- |
| Google account, private profile | Existing \`/api/app/bootstrap\`; \`/app/portrait\` | Profile link and saved assessment count; no new profile |
| Submitted and unfinished tests | Existing \`bootstrap.results\` and \`bootstrap.runs\` | Tests horizontal newest-first rail, details and repeat/resume via real IDs |
| Personal courses / OPORA 14/28 days | Existing \`/api/app/course\`, \`/app/course?view=courses\` | Course/confirmed practice rails; no fake lesson completed |
| Free Reiki practitioner programme | Existing \`/api/app/academy-energywork\`, \`/academy/principles-of-energywork/learn\` | Original enrolled/completed status |
| 90-day business course | Existing \`/api/app/business-coaching\` | Neutral updated date and link, no private goals or answers |
| Development Path | Existing \`/api/app/development-goals\`, \`/app/portfolio\` | Neutral saved date and link; original Insights remains authoritative |
| Videos opened/watched | Existing \`/api/app/video-progress\` with private RLS | **Explicit** marks from original Academy and now mobile Support player; never infer from Play |
| Personal video mandalas | Existing \`/api/app/personal-videos\`, \`/app/videos\` | Only status \`ready\` saved MP4s; signed, owner-scoped playback |
| My orders / private correspondence | Existing \`/api/app/messages/my-orders\`, \`/app/messages?section=orders&order=...\` | Deduped with saved consultation requests, public offering title, unread count and factual status; no payment claim |
| My services (practitioner) | Existing role-protected \`/app/practice?panel=services\` | Only role-gated shortcut; never expose another master's private clients |
| Saved reports/documents/session material | Existing owner bootstrap + protected detail routes | Date-only cards navigating original materials |
| My laboratory reports | Existing \`/api/app/labs\` | Neutral date/id only, original encrypted lab values remain in Lab results |
| Notes and mood observations | Existing bootstrap history/context events | Date and neutral label; no private text |

New \`/api/app/progress-extras\` merely adapts three **existing** server repositories (labs, development goals, business coaching) to tiny neutral date/ID records. No new schema, email, CRM sync, external media storage or paid APIs.

## 2. Real mobile navigation and Google continuation

- From public mobile Support, bottom "My Progress" must be a real \`Link\` to \`/{locale}/app/progress\`, not \`#support-progress\`. The former local widget is clearly labeled "On this page" and remains transient.
- Signed-out users get one existing Google sign-in. Allowlisted \`continueTo=progress\` survives server-side OAuth start/callback; success goes to the original Progress page, not default Portrait. No untrusted return URL or patient data in OAuth.
- Existing private authenticated app dock still shows Profile/Practice/Messages/Progress/Settings without a second independent floating dock.
- The private account route currently supports EN/RU only; ES public Support points to EN private until ES login/cabinet is implemented as a separate release.

## 3. Topic & site-section history layout

- One topic selector: **All / Energy / Money & work / Relationships / Goals & meaning**. Only confirmed editorial tags from original assessment catalog, published meditation catalog, course topic tags and mandala themes. Unknown topics remain absent rather than guessing from test answers or personal goals.
- Separate horizontal rails by original site rubric, oldest content to the **right**: Videos, Courses, Tests, Practices, Mandalas, Orders, Reports, Notes, Labs and Development Path. Each card is dated, opens original resource, truthful status. Video thumbnails only from existing verified YouTube IDs; private mandala media never receives a public URL.
- Full date-sorted timeline exists below an explicit disclosure for users who want all cross-category items. Keep original account CTA, resume only true unfinished course/test, no day-based top-level chapters.
- With empty account, show working original section links, not fabricated records/counters/appointments.
- Compatible RU/EN/ES copy; compact 320–430 mobile style matches Holistic House green/cream, horizontal touch scroll and reduced-motion preferences.

## 4. Safety, release and acceptance

- Unit/source validation: \`tests/my-progress-unified-navigation.test.mjs\` and existing \`tests/my-progress.test.mjs\`. Also check age/owner/role gates and that temporary self-ratings and photos are **not** persisted.
- Real flow A: anonymous Support mobile -> "My Progress" -> Google -> personal Progress with the correct account, not local 0/4 widget -> opening Tests/Courses/Messages -> return.
- Real flow B: signed-in mobile Support -> original verified video Play (no server write) -> voluntary "I watched" POST -> reload the Progress videos rail -> legitimate YouTube Watch Again.
- Real flow C: own Orders link -> owner-scoped order and messages, foreign user denied; practitioner-only My Services link gated.
- Real flow D: saved lab/development/business data dates shown without values; authorized owner opens original source; data from second account never appears.
- Real flow E: saved ready MP4 -> signed read URL -> playback on actual iPhone and route closes; pending/deleted videos excluded.
- Run focused tests, lint, typecheck and production build; Chromium/WebKit at 320/354/390/430, EN/RU, safe-area/no-overflow, touch scroll. Keep screenshots synthetic/owner-private.
- GitHub PR merge into verified **production** branch only when required CI/QA passes. After merge, verify Vercel READY, exact branch/deployment/domain SHA and browser actions. Merge, HTTP 200 or green synthetic tests are **not** real OAuth/privacy/provider E2E.
- Vercel Preview is currently intentionally disabled by \`scripts/vercel-ignore-build.mjs\` for spending control; do not override build-ignore or initiate paid build without approval. If CI queued, mark release **BLOCKED, not LIVE**.

## 5. Status at file creation

PR #2558 contains the code and extra regression tests. The neutral adapters have been evaluated with a synthetic owner-scoped projection without leaking private markers; 9/9 static/projection assertions passed. Exact-head CI, build and real owner iPhone sign-in/E2E remain outstanding. Latest production deployment and SHA must be reread at release; do not copy stale IDs into future success reports.
