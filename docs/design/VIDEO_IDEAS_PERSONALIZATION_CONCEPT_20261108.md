# Video Studio Ideas — Personalization + Concept · 2026-11-08

## Screen identity and source

- Canonical route: `/{ru,en,es}/holistic-support/mandala`; same guest/authorized Video Studio, one hero video, six top workspaces, one global mobile dock.
- Owner reference: two 2026-11-07 iPhone screens in conversation, with original Montage/Concept and Ideas/Text/Voice. They show the **source view before relocation**, not a pixel-identical target. Do not compare different workspaces as the same screen.
- This task changes two Ideas subtabs, **not** the top six tabs, renderer, payment, consent, cloud media, or login.
- Reuse the existing Goal clarification questions prepared in open #3782; user now wants them inside Ideas instead of a second Goal screen. Reuse the **single original** `MandalaVideoConcept` previously rendered in Montage, so upcoming compact Concept #3939 changes remain applicable.

## User journey and handlers

1. Goal request, category and topic remain unchanged, including existing **Generate video** and **Proceed to personalization** actions.
2. **Ideas → Personalization** (first tab): three illustrated question groups, current/desired mood choices (up to three each), meaning axes (up to three), current energy and desired level, back to Goal and next to Concept.
3. Beneath the questions is the same existing local phrase selector; current/desired meanings and axes feed `suggestMeaningPhrases` and the already-persisted session-only `ideasDraft`. Manual edits, five-selection threshold, preview, voice settings and explicit Create / Add Effects still use the existing callbacks.
4. **Ideas → Concept** (second tab) displays the **single** `MandalaVideoConcept` instance, retains Goal/transcript/photo/style/phrases/ownerFields, draft approval, signed-in editing, and guest sign-in overlay. Approval preserves existing scene overlays and goes to **Montage → Style**, without export or debit.
5. **Montage** displays **Style / Audio / Settings** (formerly four tabs); existing soundtrack, narrator, format, timeline, draft import and saved media flows are not deleted. The PRO `Go to Montage` callback still activates the Montage workspace, never Hypno.
6. Optional voice advanced disclosure remains accessible under Personalization while the separate Audio workstream is unfinished. Voice and background music are separate signals. Concept does not contain an unusable voice shortcut.
7. Any real export/credit change occurs **only** inside unchanged explicit Create handlers with existing rights/auth/credit guards. Navigation, Concept approval, personal answers and tab switches are local only.

## Visual requirements

- Ivory/cream canvas, near-white cards, nature photography from existing first-party `film-collection-v2`, dark readable typography, emerald primary CTA, no decorative page duplicate.
- 320 / 354 / 390 / 430px mobile: **two equal-width Ideas buttons without horizontal overflow**, one visible active panel, three question cards, tap targets ~44px, safe-area/global dock not obscured. Montage three equally sized controls.
- EN/RU/ES visible parity and native disclosure/pressed states. Screen reader tab labels match the selected content; keyboard + reduced-motion work. No new autoplay or media calls.
- A rendered screenshot of the same route, locale, guest/auth state and selected subtab must be compared for visual acceptance; DOM/source/tests alone are not pixel QA.

## Regression and release gates

Focused test: `node --test tests/mandala-ideas-personalization-concept.test.mjs tests/mandala-ideas-voice-compact.test.mjs tests/mandala-video-concept.test.mjs`. Existing real WebKit/Chromium acceptance script `scripts/verify-affirmation-voice-browser.mjs` now navigates both Ideas tabs, confirms guest editing gate and approved Concept, checks 320–430 widths, and tests optional narrator/consent.

Dependencies: open #3935 may reorder Goal/Montage/Ideas; #3943 adjusts goal-specific Love phrases, #3939 compacts Concept. Reconcile on merge, do not duplicate their code or bypass active owner leases. Old #3782 Goal-only UI must not be merged wholesale on top of new page order.

**Release is not proved by this specification.** Final acceptance needs exact-head Core + Specialist, protected merge, Vercel READY/ancestry and real mobile interactive screenshots on the canonical domain. No paid render or provider call for testing.
