# Video Studio / Story continuity bug — screenshot acceptance, 18 November 2026

## Evidence
Screenshots supplied by the owner show **Being Real** selected in Ideas with its script about receiving a message after a difficult day, while Montage → Story shows **Making Room for Love**, with suitcase and two chairs. The latter is a different film, not an illustration of the former. The mobile storyboard also truncates action sentences and icons misread "watches the rain" as a clock.

## Root causes
- Ideas and Montage independently called suggestVideoConcept, so even slight differences in input or state could produce different base signatures and creative-direction rankings.
- Montage modified selectedTopic.brief with a music-video pitch; that modified the signature and caused sameIntent(draftConcept) to fail. It then silently chose getVideoCreativeDirections(suggested)[0], disregarding the selected film.
- The creative selection was local to Ideas; Montage had no authoritative selected-direction ID.
- Scene graphic vocabulary matched "watches" to a physical clock; shots in the 66px mobile cards truncated the complete action.

## Corrected contract
1. Studio derives exactly ONE suggested concept for both tabs, from the same goal, explicit selected topic, phrases, voice transcript and confirmed personalization. Music director text does not rewrite the client's chosen film.
2. The selected direction ID lives in Studio parent state keyed by the canonical intent signature. Both Ideas and Story receive it and render the same actual script without requiring prior approval.
3. Story resolves the draft with first priority only when it has the same direction and intent; a stale draft can never displace the explicit selected ID.
4. If an explicitly selected direction is unavailable for current preferences, show an honest state and navigate to Ideas; never silently default to a different film.
5. Each compact storyboard card can expand the full, exact shot action. Schematic icons improve concrete prop matching (transport, phone, typing, rain, exhale); illustrations never claim footage is verified.
6. No new image/video provider, payment, API, worker, deployment or storage. Existing protected GitHub merge and hourly Vercel release mechanism only.

## Acceptance
- Select Being Real in Ideas, with or without Approve. In Montage → Story, verify the same title, all six actions, and 00:00–00:30 timecodes.
- Switch to Making Room for Love and confirm the entire Story swaps accordingly. Switch back and confirm no previous shots remain.
- Change personal state or goal: former story must not be silently reused.
- Test EN/RU/ES, phone screen and landscape as appropriate, and verify that missing footage is labeled instead of random photos.
- Publishing requires successful exact-head CI, protected merge and a production deployment containing the merge SHA, followed by a real mobile visual check.
