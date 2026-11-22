# Meaning-axis support phrases — creative revision v2 (22 Nov 2026)

**Scope:** This is a content rewrite of `data/video-catalog/meaning-axis-energy-phrases-512-v1.json`, not a replacement video generator, endpoint or clinical assessment. Previous 512 scenario IDs and original 256 storyboard IDs stay exactly as published. Keep the `lib/mandala/meaning-axis-energy-phrases.mjs` public contract unchanged.

## Concrete editorial upgrade

The previous 7,680 RU / EN / ES lines were structurally unique mainly by appending the same topic prepositional phrase to one of 15 axis/tier templates (e.g. `... при стрессе`, `... в семье`). That is formally unique but unconvincing, especially for trauma, loss of joy and money. The owner requested genuinely topical, attractive, concise video support copy.

V2 now makes each option a short **two-part film-and-human couplet**, relating a tangible scene cue to one soft meaning-axis message. Material reused:

- 512 reviewed-for-structure 14-second short-film concepts; each supplies stable IDs, four physical visual beats and already localized EN/RU/ES film descriptions.
- 64 unique topic cue motifs, plus 128 original short context vignettes independently written and localized EN/RU/ES for this revision.
- 192 distinct meaning-axis × readiness supportive texts per locale (8 axes × 3 tiers × 8 alternatives), 120 short caption intentions per locale.
- 75 additional copy/caption alternatives per locale with specific semantic handling for sensitive relationships, body, loss, trauma, financial/professional topics.

**The resulting combinations are not 7,680 individually hand-reviewed creative works.** They are 7,680 distinct topic-matched, composed **editorial drafts** per locale; on-screen captions are also globally unique per locale, each ≤36 Unicode code points. Do not call them clinically validated or reviewed by a native-language editor. A large number of phrase pairs are better grounded and less monotonous; this is not a substitute for listening to actual playback in context.

## Tier progression

| Self-selected tier | Meaning | Constraints |
|---|---|---|
| low | Recognition, gentleness and permission to stop | No forced action or healing assurance |
| medium | One optional gesture, choice or request | No guaranteed transformation |
| high | Boundaries, mutuality and self-directed continuation | No moral hierarchy, no compulsory achievement |

The user's tier is voluntary and may vary by day. It is **not** psychiatric or medical maturity, diagnosis, personality rank, score or statement about psychological fitness. UI continues to require explicit choice; no automatic detection, profiling or external communication.

## Demonstration (RU)

**Stress relief × Grounding × low:** «Стикеры заполнили край рабочего стола. Пауза тоже заслуживает места.»  Caption: «Стикеры · право на паузу».

**Childhood adversity × Agency × medium:** «Человек отодвигает альбом и ставит рядом карточку помощи. Выбери жест, который тебе посилен.» Caption: «Прошлое · посильный жест».

**Loneliness × Connection × high:** «Одна чашка стоит рядом с карточкой контакта. Выбирай взаимность без давления.» Caption: «Две чашки · беречь взаимность».

## Release gates and exclusions

- Local Node syntax/QA: run `node --test tests/meaning-axis-energy-phrases-512.test.mjs tests/meaning-axis-energy-phrases-style-512.test.mjs` and independent full JSON audit for 512 × 3 × 5 × 3; compare stable canonical IDs and all captions to the production editor's 36-codepoint hard limit.
- Real editor/renderer wiring is not introduced here; `requiresUserApproval:true` and `canRender:false` stay as before.
- Before public captions, manually review native-level English, Russian and Spanish idiom, all sensitive scenarios and spoken timing; existing media need verifiable rights and relevance.
- No HeyGen, no paid credits, no photo storage, no automatic personal-data transfer, no render claims and no new Vercel workflow. Production release remains the protected hourly publisher after required CI.

**Status:** full-catalog computational structural/uniqueness pass; human aesthetic review and physical iPhone/MP4 acceptance still open.

## P0 editorial pass v4 — 22 November 2026

A targeted, individually authored **first-ranked** rewrite covers **144 phrase IDs**:
6 priority topics (panic-attacks, childhood-trauma, apathy, low-mood, breakup-recovery,
abandonment-wounds) × 8 meaning axes × 3 voluntarily selected levels × 1 first-ranked phrase.
Original 48 proposals are incorporated and 96 new context-specific RU/EN/ES texts are added.

- **Canonical IDs:** All 512 scenarios, 256 original MyTube storyboards, 3 × 5 levels,
  and 7,680 total spoken lines per locale remain unchanged in count and order.
- **Actual edits:** Only the spoken `[ru,en,es]` fields at position `tierPhrases[low|medium|high][0]`
  for 48 selected scenarios. Previous captions at positions `[3..5]` remain unchanged.
  They need human confirmation against their revised spoken text before public use.
- **QA:** Local proposed-source focused tests 4/4 PASS. Full-catalog unique spoken/caption
  counts remain 7,680/7,680 per locale. Distinct sentence fragments after this pass:
  RU 799, EN 801, ES 802. This is only a partial diversity improvement;
  **7,536 spoken lines per locale still await individual literary review.**
- **Safety:** No efficacy claims, medical or psychiatric scoring, automatic tier selection,
  content approval, provider requests or paid generation. `canRender:false`, and
  `editorial_draft_native_language_review_required` remain in effect. A passed unit test
  does not certify natural-language fluency or rendered iPhone media.
- **Follow-up:** Native language editors review all 144 proposals and associated captions,
  then expand beyond six priority topics. The current PR does not change the Video Studio UI.
