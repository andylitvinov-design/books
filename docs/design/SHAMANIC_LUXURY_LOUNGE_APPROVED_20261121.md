# Shamanic Alchemist’s Cabinet — owner-approved luxury mobile layout (21 November 2026)

## Exact reference and state
- Reference: the latest owner-approved generated Shamanic phone mock with the six cards in the updated order.
- Target: anonymous personal /en/shamanica (also /ru/shamanica and /es/shamanica), **not** the business page, category results, or signed-in editor.
- Width: mobile content around 390 CSS px; reference is 850×1850 pixels including device chrome, which is **not copied into the web page**.
- Interactions: existing category URLs, three-offer results, working three-step quiz and real local video; business switch; existing shared seven-target bottom dock, its iOS keyboard handling and Profile/Help.
- The eight small generated WebP images were cropped/optimized from the approved picture solely as decorative illustrations; the room is not claimed as a real venue.

## Measured page geometry (390 CSS px approximation)
- Safe top/header: 47px; olive leaf and ivory serif Holistic House wordmark; gold-outlined EN/help/profile.
- Gold crescent / golden face symbol, two-line cream Georgia title and italic subtitle above lounge/fireplace with two leather chairs: hero ~292px.
- Emerald For Me / ivory For Business pill ~82% width, 46px height.
- Six 2-column real links, 3 rows, 101px tall each and 11px row / 10px column gaps, 20px radii; each card has a cropped scene photo with gold frame, cream title strip, green icon.
- Row-major order: Hints / Rituals; Remedies / Mysteries; Reiki Support / Academy.
- Bottom dock remains the same one global seven-way component with dark emerald theme, golden AI halo and active Shamanic tab.
- At width ≤354: hero 250px, cards 96px; at desktop: single centered narrower cabinet with 132px cards and no second dock.

## Accessibility and review
- Real English/Russian/Spanish texts and links; no static full screenshot replacing controls; decorative photos alt empty; text remains HTML; large clickable cards and clear focus treatment. Longer subtitles remain accessible visually hidden.
- Required visual verification after CI: WebKit 320/354/390/430, Chromium at 390, compare overlays on the same guest route/locale and content crop. Test both switch destinations, all 6 links, drawer and last quiz action. Check footer safe area, horizontal overflow and focus.
- Until screenshots are captured from the actual candidate, do not claim pixel-perfect QA. Await protected exact-HEAD GitHub checks; ordinary LIVE publishing only through the existing hourly Vercel release (no manual deploy).
