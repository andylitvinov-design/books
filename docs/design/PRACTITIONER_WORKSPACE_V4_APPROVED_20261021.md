# Holistic House — approved practitioner workspace V4 · 2026-10-21

**Status:** Owner-approved visual direction, implementation contract. Production branch `codex/public-book-library`; canonical domain `https://holistichouse.vercel.app`. Original 10-screen composite was approved in ChatGPT conversation on 2026-10-21 (see conversation attachment `a_wide_collage_board_of_mobile_app_ui_mockups_in_a.png`). This specification preserves the visual intent without guessing unreleased product data. **Do not replace functioning modules with mock data or duplicate databases.**

## Approved ten-screen family

1. **My Practice dashboard** — condensed brand header + real approved/partner state, short copy, primary 2x3 navigation with real counts, clear Materials CTA, delayed community promotion.
2. **Materials hub** — one compact cream panel containing **Articles, Services, Courses, Audio, Video** and live scoped search; one section visible at a time; no stacked duplicate material libraries.
3. **Reiki Practitioner course** — reuse the **existing real owner-only** five-lesson editor, RU/EN folders, and encrypted learner course; do not fabricate additional courses or lesson publication statuses.
4. **Lesson audio** — reuse 5 existing folders × RU/EN; private signed audio upload, preview, explicit publication to a single learner slide. Never auto-publish.
5. **Add material** — short form with title, type, file/URL, language and metadata; preserve real supported format constraints and provider permissions.
6. **Articles** — existing practitioner articles and moderation workflow.
7. **Services** — existing marketplace service records and service editor, quotas and moderation; real prices only.
8. **Audio** — intro audios per lesson, no impersonation of extra music libraries; preserve original formats, file sizes and privacy.
9. **Video** — public YouTube/Vimeo practitioner presentations separate from private client-report media. Reuse existing moderation and private library.
10. **Shared shell/navigation** — warm beige wood / cream / deep brown, restrained teal highlights. Existing 6-item PWA bottom navigation remains the single global bottom bar; admin links back to My Practice.

## Style tokens

- Page parchment: `#F6EFE4`; card ivory: `#FFFCF7`.
- Ink: `#352A22`; secondary copy: `#756759`.
- Border: `#E3D4C3`; teal primary: `#0B7A78`; selected soft teal: `#DAEFEB`.
- Warm highlights: `#EAD9C4`; optional photo overlays only where approved source assets exist.
- Headings: Georgia/serif; functional UI: system sans; no font binaries.
- Card radius 14–19 px, tap target >=44 px, compressed vertical padding, 320–430 px iPhone Safari first.
- EN default; Russian full mirror; ES mirrors labels, but **do not fake RU/EN audio in Spanish**.

## Mandatory product/security behavior

- Render authentic service, client, article and media data, **never sample titles/counts** from the illustrative 10-panel sketch.
- Authorized teacher path: `/[locale]/app/practice?panel=materials&materialTab=courses` → same existing `practitioner/open` owner check → `/admin/materials/courses/reiki-practitioner`.
- Nonowner practitioners only see enabled workflows; no unofficial course/audio editing without backend authorization.
- Articles and public profile videos remain moderated; client/session media must never be shown in public buckets; RLS and consent untouched.
- Audio public release only by explicit teacher action after private preview; no generation/video render and no large upload by automation.
- No new payment methods, medical claims, fake bookings, notifications, Drive uploads or external spend for this design-only change.
- Preserve existing `/admin/materials/audio/*` bookmark redirects and EN/RU localization.

## Acceptance

- [ ] My Practice main dashboard key actions and Material editor accessible without a giant community card above the fold.
- [ ] Five main material types switch within one compact panel (owner), Articles/Services/Videos work for normal practitioners.
- [ ] Existing course audio flow reachable with signed owner session, correct lesson/language, private draft before manual publication.
- [ ] Existing service and articles editors continue saving, no public client data leak.
- [ ] Responsive at widths 320, 375, 390, 430 px; primary CTA not behind PWA bottom nav; no horizontal overflow.
- [ ] Focused unit tests + eslint + tsc + Next build / required CI checks.
- [ ] Vercel deployment READY at exact merged production SHA, correct `holistichouse.vercel.app` alias.
- [ ] Real authenticated owner phone upload + playback is a separate E2E acceptance and must not be claimed by CI alone.

## Rollback / maintenance

Scoped UI changes only; revert design PR to restore the old shell without altering persisted datasets. Keep this doc as the approved design baseline for further screens and do not invent future functionality from the illustrative artwork.
