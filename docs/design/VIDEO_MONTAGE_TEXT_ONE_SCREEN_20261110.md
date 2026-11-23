# Montage → Text · approved one-screen layout, 10 November 2026

Canonical view: \`/{en,ru,es}/holistic-support/mandala\`, Holistic House Video Studio → Montage → Text; owner screenshot EN, 5/7 selected, iPhone portrait. This is an edit to the real editor, not a separate route or demo.

Visible at rest: site brand/nav, Montage five tabs, single phrase card with title and counter, seven selectable/previewable/editable phrases, existing More phrases / Write a phrase / Record a phrase, and only Generate Video / Add Effects at the bottom. Hide font-size slider, explanation, Clear, Fine-tune, and only the duplicate outer pricing/CTA pair (not the parent footer) in this tab; retain visible mandatory narration/phrase-reapproval warnings in the footer. The original video preview is hidden until deliberate Play. On deliberate preview, show the still-mounted Canvas player. Retain the original consented voice recorder, renderer and payment/credit logic.

Target phone: 390×844 CSS px; 7×44 px touch rows with small spacing; 3×44 px phrase-action buttons; 2×51 px CTAs; do not obscure native bottom navigation. At 320/354 widths or short phone heights, scroll only the phrase list to keep actions in view. Keep RU/EN/ES visible text and wrapping intact.

Source contract tests: \`tests/mandala-montage-text-one-screen-20261110.test.mjs\`. Before LIVE acceptance: CI Core + WebKit mobile 320/354/390/430, same-view screenshot overlay, real clicks for More / Write / Record / Edit / Play / Generate / Effects, Vercel Production READY with served SHA. Source/static tests alone cannot verify pixel fidelity or functional browser E2E.

GLOBAL_PR_ONE_PUBLISH_V1: all cohesive edits staged before one branch publication; no new service or new CI workflow.
