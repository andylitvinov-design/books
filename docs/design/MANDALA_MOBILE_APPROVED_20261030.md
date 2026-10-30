# Holistic House — owner-approved native mobile Video Studio

**Approved visual:** the last compact, large-type iPhone mock in the owner's 30 October 2026 ChatGPT conversation (*“Да, сохрани этот макет и внедри у нас на сайте”*). The image remains attached to that conversation. This specification preserves its implementation intent independently of the generated screenshot. It **supersedes the entry layout** described in `MANDALA_VIDEO_FIRST_MOCK_SIX_PANELS_20261029.md`, not the actual features developed there.

**Target and parity:** canonical `/{ru,en,es}/holistic-support/mandala`; anonymous, browser-local **video editor** in the existing Holistic Support shell, not the practitioner dashboard, private client cabinet or a separate preview/demo. Base production branch `codex/public-book-library`, not GitHub's default `codex/bootstrap-books`. Widths: 320, 354, 390, 430px iPhone Safari plus 768/1440px desktop. The reference is a conceptual tall phone mock with different pixel density; don't claim raw pixel equality to an actual viewport.

## Approved hierarchy and component map

| Block / primary order | Mobile visual requirement | Existing state and verifiable action |
| --- | --- | --- |
| **One native app header** | Compact ivory Holistic House logo + back/settings above editor, only **one** five-destination fixed dock, no promotional diagnostic banner on mobile | `HolisticSupportMandalaDock` in page composition, existing locale switch and links; unchanged desktop `PublicSiteHeader` |
| **Hero** | Big left-aligned title, concise benefits, nature-themed visual, Smart match button, cream/eucalyptus background | `MandalaFreeVideoStudio`, nonpaid `suggestScene` / first-party `recommendMandalaAudio` |
| **1 Direction** | Six visually distinct image-backed selections with readable labels; horizontal rail, local goal remains optional | `theme`, `selectCategory`, `moneyScene` / `otherScene`; energy/body, money/career, relationships/love, goals/motivation, life/meaning, wellbeing/balance |
| **2 Format** | Free / Smart / Pro cards, status clearly visible; no fictitious balance or functional paid CTA until real entitlement source exists | Free keeps real `createVideo` / `MediaRecorder`. Smart and Pro are **visually present but unavailable**; no API, paid render or invented counts |
| **3 Real video and covers** | Large 16:9 native MP4 preview with central Play, current 30s and aspect badges; tappable horizontal cover rail directly underneath | One `premiumVideoRef` with genuine locally hosted H.264 master (`activeFilm`); changing `activeTemplates` changes `moneyScene/otherScene`; actual final export remains via existing Canvas and recorder |
| **4 Visual styles** | Six photographic visual thumbnails; selected style visually outlined | `quickPickStyle` changes `brightness`, `speed`, and real scene ID; original full template filters remain |
| **5 Customize** | One goal text field and four large controls for optional affirmations, photo, voice, music | `wish` stays local; `affirmations` opt-in; `onPickPhoto`, consent; audio/voice opens existing private local audio picker, not a fake TTS action |
| **Create** | One prominent emerald sticky create CTA above fixed app dock and short privacy text | Existing `createQuickVideo` → rights/photo/premium-ready checks → `startFromHero` → `createVideo` → actual downloadable file |
| **More settings** | One accessible collapsed disclosure beneath main CTA | Original full six-panel deep editor, 8-session symbolic guided course, audio attach/mic, timing/aspect, hypno, photo and output download remain mounted and operable; no duplicate rendering pipeline |

At every width, target titles 18–29 CSS px, body >=13px, 44px+ minimum touch targets, 320px cards never clip page horizontally, vertically scrollable native view, landscape/portrait media and safe-area dock. Selection must update actual video source or renderer state, not merely the card highlight. No autoplay; preview starts only after visitor action. No browser-chrome screenshot comparison.

## Credit honesty, privacy and professional claims

The mock's example balances **50 Free / 1 Smart / 0 Pro** are *illustrative only* and may not correspond to any verified owner/client wallet in production. Before any real count, purchase or charge, implement and test account-scoped credit ledger, idempotent debit, verified payment/receipt, cancel/refund, insufficient-balance UI, RLS/IDOR and provider cost caps. Do not turn labels into backend state or enable paid calls based on these mock counts. In this implementation Free is available without credits; paid tiers show unavailable.

The existing anonymous editor does **not** automatically read an authenticated profile, clinical data, test results or plan of correction; current personalization uses client-chosen goal/theme. Any later private-profile import needs explicit consent, server-side auth, owner-only RLS and guarded data flow. Client images must not leave the browser for Free export. No data in tracking pixels, YouTube, CRM or outside providers.

“25th frame / hypnoaffirmations” must be described as **experimental**, never as a clinically proven belief-correction method or guaranteed health, money or relationship outcome. No diagnosis, treatment promise or subliminal efficacy claim. Prefer clear opt-in and on-screen selectable phrases; never hide undisclosed content.

## QA and release gates

- Keep existing specialist `holistic-support-mandala.yml` real Chromium+WebKit 320/354/390/430 checks, actual preview/change-source, audio attach, native photo/consent, 8-session course and recorded MP4/WebM with ffmpeg/ffprobe. Capture synthetic approved layout screenshots and compare visually with this hierarchy, not to a different page.
- New focused contracts check one canonical editor, native header before it, hidden promo on mobile, one working Free format, two honestly unavailable paid formats, one same-origin master, photo protections, all language strings and sticky CTA.
- Required: focused Node tests, ESLint, `tsc --noEmit`, Next build, applicable specialist CI and `release-ready`; screenshot visual review and real-device Files/share still separate.
- Release is confirmed **only** after safe PR merge to production, GitHub SHA reconciliation, Vercel READY + canonical `holistichouse.vercel.app` alias, RU/EN/ES behavior checks and iPhone manual QA where relevant. A PR/build alone does not prove live operation.

## Evidence ledger

- **Source of visual truth:** attached owner-approved generated image in 30 Oct 2026 conversation, not an external stock photograph; assets in UI are existing site-controlled posters and footage.
- **Branch for implementation:** `feat/mandala-mobile-video-studio-approved-20261030`.
- **CI, live and real iPhone status:** to be recorded from exact-head release checks / production verification; not asserted by this design note.
