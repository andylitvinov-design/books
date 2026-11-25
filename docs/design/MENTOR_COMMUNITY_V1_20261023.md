# Holistic House — Mentor Community v1 · 2026-10-23

## Product decision
Reuse the existing Holistic House **Master Network** and moderated author CMS for an editorial community, inspired by the supplied iPhone screenshots: compact rounded photo-left cards, horizontal topic selection, easy profile access, and a short master quick-access row. Do **not** create a second account, network, storage bucket, patient profile, forum, or payment provider.

- **Public:** `/{en|ru|es}/masters` shows a two-tab *Mentors / Articles* switch with the existing real practitioner filter and a small reviewed-article feed. The initial tab is Articles when a published article exists, otherwise Mentors. Existing `/{locale}/articles` is still the complete searchable archive.
- **Article read:** `/{locale}/articles/{slug}` continues to open from the feed; the public author link opens `/{locale}/masters/{practitionerSlug}`. No private Client Cabinet/CRM detail is included.
- **Master authoring:** `/{locale}/app/practice` gets two small quick actions, "Explore community" and "Write an article". The latter selects the existing `Materials → Articles` editor; new content needs existing moderation approval.
- **Topics:** Master filter uses established public area keys. Article topics are computed from real, approved published tags in the requested article language, with no taxonomy guessed from health/private test results.
- **Optional contact/payment:** existing profile→service→request remains unchanged; no synthetic booking, paid capture, ranking, feedback, or follow count.
- **Privacy:** `createArticleRepository().publicList(locale)` returns approved publication snapshots, not draft or private materials. `createPractitionerRepository().listPublicPractitioners(locale)` returns approved public profiles. No schema or RLS change.

## Editorial UI contract
1. EN/RU/ES interface; article body appears only in its authored approved language; no invented translations or stock practitioners.
2. Two tabs with `aria-selected` and `role=tabpanel`, Left/Right/Home/End keyboard handling, 44+px tap size.
3. Topic chip bar derives from actual article tags; search scans approved title/summary/author/tags.
4. Article cards use saved approved cover paths, or a neutral symbolic fallback (no broken/blank image). Author and title are internal clickable links.
5. On 320–430px the article photo stays left, copy/CTAs stay right or wrap, no horizontal page scroll, six PWA nav links unaffected.
6. Existing My Practice overview remains one active panel. Community shortcuts appear only in overview, not on expanded work panels.
7. Follow/subscriptions, personal messages, notifications, reviews, video posts, and payments require later separately approved scope. No auto messaging.

## Release and verification ledger
- Related master platform: [#715](https://github.com/andylitvinov-design/books/issues/715), earlier articles workflow PR #754; existing V4 [approved workspace](PRACTITIONER_WORKSPACE_V4_APPROVED_20261021.md).
- Feature tracking: [#1721](https://github.com/andylitvinov-design/books/issues/1721).
- Source-only checks: `node --test tests/mentor-community-v1.test.mjs tests/practitioner-articles-v4.test.mjs tests/master-network-v3.test.mjs`.
- Required independent verification: lint, typecheck, Next production build, CI, mobile 320/375/390/430, existing public profiles & article readback, no draft exposure.
- **Authenticated publish E2E** is separate: master creates draft → reloads → submits → admin approves → article appears in feed → client opens profile → real request. Do not label this pass without real accounts/provider readbacks.
- Production readiness requires exact GitHub merge SHA = Vercel READY git SHA and the `holistichouse.vercel.app` alias. No part is marked verified before actual evidence.
