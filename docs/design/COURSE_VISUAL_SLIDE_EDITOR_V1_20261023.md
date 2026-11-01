# Holistic House — Visual Slide Canvas V1 · 2026-10-23

## Owner-approved visual direction
Source: supplied iPhone screenshot of the existing blank-field editor and a subsequent approved cream/wood/teal mobile concept with a rendered, editable course page. Implement **on the existing master Courses workflow** in My Practice; no second admin, no duplicate course database. English is the default UI; Russian and Spanish are complete mirrors.

## Shipped implementation scope
- **Create / edit:** existing account/activated-master course builder, optimistic \`expectedRevision\`, first text slide, existing author-only private media upload, signed preview and explicit publication.
- **Authoring:** six contextual element buttons (Text, Photo, Audio, Video, Question, Link/CTA); visually rendered page card with replaceable photo header, inline heading, learner question, instructional copy and optional button. A question is **for reflection** and **does not collect, store or transmit learner answers**. This is intentional until a separately reviewed learner-answer storage contract exists.
- **Slide navigation:** actual course slide thumbnails, inline add, duplicate, up/down, remove, next, visible save/publish; no sample/fake customer slides or images. Hero placeholder is a CSS-only landscape and never appears on the published learner page until an actual signed photo is uploaded.
- **Media:** independent optional \`coverAssetId\` on non-image slides; legacy \`assetId\` is preserved for audio/video/image. Switching media kinds requires confirmation before disconnecting an existing recording; source files remain private, not automatically deleted. Existing YouTube/Vimeo and separately owner-gated YouTube uploader preserved.
- **Persistence:** additive optional slide JSON fields \`question\` (max 500), \`coverAssetId\` (UUID), \`ctaLabel\` (max 90), \`ctaUrl\` (max 900, validated internal route or safe HTTPS). Existing \`app.practitioner_courses.draft/published\` JSONB and revisioning; **no migration or new tables**.
- **Security:** publication verifies every cover asset is ready, belongs to the same approved practitioner/course, and has \`kind=image\`. Anonymous media access checks **published snapshot** for either primary or cover asset ID and existing active/approved master guard; no draft media served to anonymous learners. CTA cannot be a \`javascript:\`, \`http:\`, network-local, userinfo or custom-scheme destination. Public CTA opens in a separate tab with \`noopener noreferrer nofollow\`.
- **Learner:** the existing public course player renders the same photo → title → reflection question → practice instructions → audio/video/embed → optional CTA sequence. Media is user-initiated, with no autoplay. Legacy published slides still render.
- **Mobile:** 6 compact tile toolbar, visual page card, thumbnail strip and existing sticky save/publish above PWA nav. A narrower 320px design uses text wrap and horizontal filmstrip (not page-wide overflow). Keyboard focus keeps CTA input and slide body accessible; review at 320, 375, 390, 430px.

## Release checks
- [ ] Node contracts: \`tests/practitioner-course-visual-canvas.test.mjs\`, builder / quick start / mobile materials.
- [ ] Scoped ESLint (editor, public player, contract, repository), TypeScript, Next production build, relevant CI workflows.
- [ ] Production: GitHub merged SHA matches READY Vercel deployment and \`https://holistichouse.vercel.app\` live alias.
- [ ] E2E **using a real activated practitioner**: edit title/question/body/CTA; upload a real photo from iPhone Files and check signed private preview; save/reload; duplicate/reorder; publish; verify public link and photo/question/CTA playback in anonymous EN/RU/ES; unpublish and verify revoked anonymous access. Without this, report technical release as LIVE but user-flow E2E pending.
- [ ] Accessibility: focus, touch 44px+, no x-scroll, no sticky toolbar over text when keyboard opens; avoid unintended server save/publish after switching accounts.

## Known exclusions
- No learner answer submission or results in CRM.
- No paid API, image generation, HeyGen rendering, mass messaging or payment changes.
- No automatic publication or stock photos. Existing owner-only Reiki Practitioner course editor remains separate and protected.

Related: books #1484, merged #1574, open phone-audio PR #1563 (touches the same generic editor; resolve conflicts before its future merge).

**Rollback:** revert the isolated UI/API-contract PR. New optional JSON fields are ignored by the older player; no destructive database changes.