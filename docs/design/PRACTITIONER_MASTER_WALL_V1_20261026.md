# Holistic House · Practitioner wall / Стена мастера · V1

**Date:** 2026-10-26. **Source:** approved product request; existing community backlog [books #1721](https://github.com/andylitvinov-design/books/issues/1721), Master Network [#715](https://github.com/andylitvinov-design/books/issues/715). **Release status:** source implementation prepared; CI/merge/deployment and real author→moderator→public E2E tracked separately. Do not label as LIVE until the exact deployed SHA and domain alias are confirmed.

## Scope

- Public `/{en,ru,es}/masters/{slug}` presents ONE chronological, compact wall below the header: **All / Posts / Articles / Photos / Videos / Audio / Courses**. Categories are grounded in item kinds or media metadata. Counts and empty states are based only on actual published records. Accessible keyboard buttons, visible focus, horizontal mobile chips (320–430 px), original content language displayed, responsive cards.
- Reuse existing public approved **article snapshots**, **approved course catalog**, **practitioner profile video materials**, and **public audio explicitly shared with sender consent**. Do not create a parallel feed database, courses table, or upload service. Preserve service cards and CTAs.
- Owner editor in **My Practice → Materials → Publications** offers a simple post textarea, EN/RU/ES language, media choice, **public** HTTPS photo/audio link or YouTube/Vimeo/direct video link, private draft save, submit for moderation. Existing full article editor remains available.
- Post drafts use the existing `app.practitioner_articles` and existing authenticated `/api/app/practice/articles` save/submit endpoints. Post data adds `kind:'post'` and validated `media` to the JSON draft; existing articles preserve backward compatibility. No DDL migration or new public role grants.
- Existing admin article moderator sees linked media source and may approve; only a published **snapshot**, never the draft or CRM/client assets, is returned on public routes. Existing public article-only index excludes post-kind snapshots; author's wall includes both.
- Legacy `#practitioner-meditations` / `#practitioner-articles` anchors are retained as aliases to the combined wall. No new permanent cabinet tab.

## Rights and media policy

- Author must be a real active practitioner; submitting requires approved practitioner status; moderator explicitly approves. No automatic cross-post to YouTube, Telegram, WhatsApp, Social or paid API.
- Public video URLs normalize known YouTube/Vimeo links; direct HTTPS media URL requires an approved-looking extension and DNS hostname, with a client-only player. No backend fetching of arbitrary URLs (no SSRF).
- **Do not accept user-supplied upload IDs or private client asset links** in this first stage. Direct image upload on the wall is NOT implemented until storage origin/ownership, publication copy, RLS, revocation, media scanning and privacy QA are validated. Authors may link an already-public photo on an HTTPS domain. No social auto-publishing.
- Do not show private client photos, direct-message audio without explicit publication consent, psychological test answers, health details, reports or claims of clinical efficacy.
- Only original EN/RU/ES published editions appear, with truthful language labels. No automatic translated copy.

## Verification and open acceptance

- Focused source/contract integration: `tests/practitioner-wall-feed.test.mjs` (post validator, URL/UUID blockers, public-only sources, reviewer visibility, author API). Regression: `tests/master-showcase-landing.test.mjs`, practitioner article folders, Mentor Community, Master Network, media/presentation.
- Run `tsc --noEmit`, ESLint on changed files, Next build and GitHub Actions on **exact PR SHA**. CI may run on a hosted Linux runner if local Mac lacks free disk space.
- Verify production Vercel READY commit SHA on `super10/codex-public-book-library`, GitHub branch `codex/public-book-library` (NOT default), canonical `https://holistichouse.vercel.app/{en,ru,es}/masters/andy-litvinov`, mobile 320/375/390/430, mouse/keyboard/filter, video manual-play. A 200 response is insufficient proof of any write.
- E2E must prove with real consented accounts: practitioner signs in → saves draft → requests review → authorized moderator opens source and approves → public reader sees new item in correct categories/language → archive/unpublish removes it (or hides the approved published snapshot according to current article policy). Never seed fabricated real user content in production.
- Product limitations requiring separate gates: direct photo/video/audio file upload from iPhone into the wall; category/tag taxonomy beyond media type; social likes/shares/follows, scheduled posts, external provider notifications, paid promotion. No claim of completeness for those.
- **Rollback:** revert the UI/JSON-contract diff; existing article and course tables and published snapshots remain intact. No DB migration or irreversible external send.

## Release notes (fill after deployment)

- Commit / PR: TBD
- Target CI run and result: TBD
- Vercel READY SHA and alias: TBD
- Real authorization+moderation+publish E2E: not yet verified
