# Video Studio Ideas — Personalization + Concept · 2026-11-08

## Screen identity and source

- Canonical route: `/{ru,en,es}/holistic-support/mandala`; same guest/authorized Video Studio, one hero video, six top workspaces, one global mobile dock.
- Owner reference: two 2026-11-07 iPhone screens in conversation, with original Montage/Concept and Ideas/Text/Voice. They show the **source view before relocation**, not a pixel-identical target. Do not compare different workspaces as the same screen.
- This task changes two Ideas subtabs and restores a distinct Montage storyboard subtab. Neither concept replaces the other; the top-level tabs, renderer, payment, consent, cloud media and login remain intact.
- Reuse the existing Goal clarification questions prepared in open #3782; user now wants them inside Ideas instead of a second Goal screen. Reuse the **single original** `MandalaVideoConcept` previously rendered in Montage, so upcoming compact Concept #3939 changes remain applicable.

## User journey and handlers

1. Goal request, category and topic remain unchanged, including existing **Generate video** and **Proceed to personalization** actions.
2. **Ideas → Personalization** (first tab): three illustrated question groups, current/desired mood choices (up to three each), meaning axes (up to three), current energy and desired level, back to Goal and next to Concept.
3. The existing phrase editor remains **in Montage → Text** (one copy), and the selected Personalization answers refine its taxonomy-aware `suggestVideoGoalPhrases` without overriding Goal/Love or losing manually approved words in `ideasDraft`. Choose Phrases opens Montage → Text; voice/My Voice remain optional inside Personalization.
4. **Ideas → Concept** (second tab) is the *written/editorial concept*: the single `MandalaVideoConcept` instance, retaining Goal/transcript/photo/style/phrases/ownerFields, draft approval, signed-in editing and guest sign-in overlay. Approval preserves existing scene overlays and goes to **Montage → Style**, without export or debit.
5. **Montage → Storyboard** is a separate *video concept*: the existing `MandalaCinematicDirector` sequence planner, with connected shots, per-shot local visual-source choices, timing and format. It remains in the Montage workspace; PRO links to the same canonical Montage storyboard instead of mounting another director.
6. **Montage** keeps **Style / Text / Effects / Settings** and adds **Storyboard** as a fifth compact subtab. The Montage Settings quick action opens this visual storyboard, never the written Ideas concept. The shared multitrack editor, optional advanced audio, format, draft and timeline tools remain unchanged.
7. Optional voice advanced disclosure remains accessible under Personalization while the separate Audio workstream is unfinished. Voice and background music are separate signals. Concept does not contain an unusable voice shortcut.
8. Any real export/credit change occurs **only** inside unchanged explicit Create handlers with existing rights/auth/credit guards. Navigation, Concept approval, personal answers and tab switches are local only.

**Non-substitution rule:** Textual Concept belongs to **Ideas → Concept**. Video storyboard belongs to **Montage → Storyboard**. Keep both independent; never route one action to the other or remove either.

## Visual requirements

- Ivory/cream canvas, near-white cards, nature photography from existing first-party `film-collection-v2`, dark readable typography, emerald primary CTA, no decorative page duplicate.
- 320 / 354 / 390 / 430px mobile: **two equal-width Ideas buttons without horizontal overflow**, one visible active panel, three question cards, tap targets ~44px, safe-area/global dock not obscured. Montage five compact controls (Style / Text / Effects / Settings / Storyboard) remain in one row.
- EN/RU/ES visible parity and native disclosure/pressed states. Screen reader tab labels match the selected content; keyboard + reduced-motion work. No new autoplay or media calls.
- A rendered screenshot of the same route, locale, guest/auth state and selected subtab must be compared for visual acceptance; DOM/source/tests alone are not pixel QA.

## Regression and release gates

Focused test: `node --test tests/mandala-ideas-personalization-concept.test.mjs tests/mandala-ideas-voice-compact.test.mjs tests/mandala-video-concept.test.mjs`. Existing real WebKit/Chromium acceptance script `scripts/verify-affirmation-voice-browser.mjs` now navigates both Ideas tabs, confirms guest editing gate and approved Concept, checks 320–430 widths, and tests optional narrator/consent.

Dependencies reconciled against the current protected production code: #3939 compact Concept, #3943 Love/Goal phrases, the later Style/Text/Effects/Settings Montage and PRO Standard shared timeline, Voice/My Voice. Do not merge older #3782 Goal-only questions into Goal or overwrite current Montage or payment changes. No cost-incurring video generation in tests.

**Release is not proved by this specification.** Final acceptance needs exact-head Core + Specialist, protected merge, Vercel READY/ancestry and real mobile interactive screenshots on the canonical domain. No paid render or provider call for testing.


## Implementation correction — 2026-11-09

- At the ten-selected-phrase cap, explicitly choosing another phrase replaces the last selected phrase instead of silently refusing the click. The hard maximum remains ten and the existing localized replacement message is shown.
- WebKit acceptance retains the chosen phrase's stable source index across the state change; it no longer re-evaluates a dynamic `aria-pressed=false` locator after the click.
- The same rule applies to the single Ideas/Montage Text editor; audio approval and stale-spoken-audio protection remain unchanged.
- A new exact-head release wave is required after the latest production-base advance. A base-change rejection is fail-closed and is not treated as product-test success.
