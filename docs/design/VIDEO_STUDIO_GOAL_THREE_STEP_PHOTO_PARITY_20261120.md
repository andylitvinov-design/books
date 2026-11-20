# Video Studio Goal — unified three-screen iPhone journey (approved 20 Nov 2026)

- Reference: three owner's conversation screenshots and revised visual mocks from 20 Nov 2026; **private owner images not uploaded to GitHub**.
- Identity: `/en/holistic-support/mandala`, `/ru/holistic-support/mandala`, `/es/holistic-support/mandala`; guest, MyVideo → Goal; existing Video Studio, not separate generator/editor.
- Step 1: same editorial hero, large editable “Describe your goal or wish…” composer, Free/Pro, Guide me and real microphone/aspect controls; two-column grid of 4 actual photo-backed Life/Work category choices.
- Step 2: preserve the **same composer and four exactly equal-sized photo cards**, now canonical subcategory options. Keep compact Step 2/3 progress and Back. Tapping a card advances to step 3 via the original handler.
- Step 3: preserve the **same composer and photo cards**, now 4 canonical topic options; selected state mint + check; show equal-sized **Express video** (actual protected video generation, credit/codec checks) and **Personal video** (existing Ideas personalization) side by side above the persistent site dock.
- First-party art: reuse `/images/video-goal-art/{stress,love,energy,growth}.webp` on all stages; no external requests, new providers or generated images in production.
- No duplicate controls, page, API, renderer or payment/credit logic. Keep EN/RU/ES, keyboard/accessibility, iPhone 320–430px; short screens may scroll rather than clipping vital buttons.
- Acceptance: inspect rendered matching guest view in Chromium + WebKit at 320/354/390/402/430px and short-height iPhone; check one composer stays editable across 3 steps, no sideways overflow, four photo cards match sizes, selected/Back functionality, both CTA sizes and reachability above dock; verify **no video render or credit charge** merely by navigating. Real iPhone Safari export and actual generation remain separate E2E gates.
- Static source assertions are not visual or LIVE proof. Only protected exact-HEAD CI and current production SHA/READY+canonical host can establish release; actual served guest interaction must be verified.
- Cost: existing protected CI and hourly Vercel publisher only; no preview/manual production build, paid media, or new API.
