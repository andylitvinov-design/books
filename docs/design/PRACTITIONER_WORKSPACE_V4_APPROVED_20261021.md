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

## V4.1 mobile fidelity follow-up (2026-10-21)

The original 10-screen visual remains the design authority. The already-implemented owner dashboard and Materials panel needed a tighter mobile presentation than their first deployment:
- Keep the real, scoped six-button overview; use existing approved art in the hero and knowledge CTA.
- Flatten the double "My materials" heading/card, retain the global PWA navigation and keyboard-sized 5-format switcher. Selecting Materials should scroll to the library on phones.
- Put the **real** owner-only Reiki Practitioner (5 lessons, RU/EN audio) above the *optional* new course constructor. Do not label the separate Reiki course as a published new-builder record.
- Mount the new-builder UI on user request for the owner, preserving the actual API, persistence, authorization, private uploads, and explicit publication. A failed fetch must show translated retry guidance rather than a raw `NOT_FOUND` next to a false "No courses yet" state.
- Make the course list read as readable vertical rows on 320–430px, keeping only server-confirmed draft/published labels.
- No data duplication, migration, new provider account, or mass import.

### Verification gates
- [ ] CI source/UI smoke tests, lint, typecheck, Next build
- [ ] Responsive visual QA at 320/375/390/430px
- [ ] Protected signed-in phone: Courses → Reiki lesson → private audio upload/save; new course → server persistence and reload
- [ ] Exact production READY SHA and canonical domain alias checked

**Status:** implementation pending PR/CI and authenticated owner E2E. A static test or HTTP 200 is not proof of saving or publishing.


## V4.2 action-first Materials mobile update · 2026-10-21

Owner supplied five real iPhone screenshots of **Articles, Services, Courses, Audio and Video**. Each screen had the correct warm style but excessive vertical copy, a search box ahead of primary actions, and workflow triggers too low in the viewport.

- Keep one existing **Materials** hub and five tab switcher; no new storage or duplicated admin screens.
- Directly under active tab put a **high-contrast, >=44px primary action**: New article / Add service / Create course / Upload audio / Upload video; audio also has Record, owner video also has Add link. Non-owner Video remains moderated link editing.
- After the action, show 0–2 real content rows, count/status and a compact "All ..." disclosure when applicable; search and article folders/filters are opt-in. Do not hide useful errors or fabricate articles.
- The real Reiki Practitioner course and protected five-lesson RU/EN audio folder remain. New-builder is mounted only after the Create course action. Editing article hides its list; video editor likewise prioritizes the active form.
- Article API `SERVICE_UNAVAILABLE` is translated into recoverable error + Retry; **a friendly message is not a fix to backend service availability**.
- Owner audio Record uses microphone permission and local `MediaRecorder` only when native M4A is supported, with private preview and a **separate explicit server upload**. Owner gate remains `/api/app/practitioner/open`; publishing still requires independent confirmation. Unsupported devices get an upload fallback; never infer live recording support from static tests.
- Owner video Upload reuses the existing authorized uploader handoff. Personal Google OAuth/two-channel upload E2E remains tracked in #623 / PR #1488 and must not be marked complete here.
- EN/RU/ES UI labels, existing service editor, public moderation, protected client reports, bottom navigation, auth/RLS and prices are unchanged.

### V4.2 acceptance checklist
- [ ] GitHub CI: source contracts, existing materials/article/reiki audio suites, TypeScript, lint, Next production build
- [ ] Mobile view: 320/375/390/430 px, action visible immediately beneath tab switcher, no x-scroll or overlay with bottom navigation
- [ ] Real signed-in master on iPhone: Create course → slide → save/reopen; Add article → draft save/reopen; Add service → editor; Audio Record → preview → private upload → refresh; Video public link → moderation
- [ ] Vercel production READY on exact merged SHA, canonical `holistichouse.vercel.app` alias
- [ ] Investigate/retest articles API if SERVICE_UNAVAILABLE persists

**Status:** implementation under review; authenticated live owner E2E not established by source or build tests.
