# My Coach · distinct photographic cast · 13 November 2026

**Owner issue:** Mira / Sofia and Max / Alex visually reused the same faces on the phone catalog. Eight WebP filenames alone did not guarantee eight distinct people; subsequent `!important` hero/rail overrides could also show a different face than the session.

**Editorial identity map** (original synthetic/fictitious people; never identify as real clinicians):

| Coach | Unique visible identity | Focus |
| --- | --- | --- |
| Mira | Dark wavy hair, olive blouse and gold earrings | Gentle clarity |
| Max | Short natural curls, dark skin, cream linen | Action and momentum |
| Sofia | Straight dark bob, peach blouse | Relationships and boundaries |
| Alex | Silver hair, salt-and-pepper beard and glasses, navy | Career and business |
| Lea | Bright copper curls, freckles, lilac | Values and meaning |
| Noah | Swept black hair, forest-green shirt | Habits and small changes |
| Iris | Silver curls, mustard top, gold earrings | Strengths and perspective |
| Ray | Dark bun, glasses, coral shirt | Creativity and possibilities |

**Assets:** `public/images/holistic-house/my-coach-motion/{id}-living.webp` (6 very subtle camera/micro-motion frames, repeat; under 200 KB each) and `{id}-still.webp` (nonanimated under 70 KB). All eight originals were generated independently of photographs of real users/practitioners. This is ambient movement; NOT lip-synchronized speech and not proof of a live human.

**Distribution:** same ID maps the phone All coaches/Featured/Favorites cards, profile detail, first-screen hero and swipe rail, as well as the chosen voice coach and immersive dialogue. Previously stronger `!important` hero overrides for four personas now use their per-ID motion assets, with an explicit `prefers-reduced-motion` still override. Cards/session retain `cover` to crop naturally without distortion. Human practitioner portraits remain unchanged. No new providers, service, account, DB or CI workflow.

**QA:** view `/en/my-coach`, `/ru/my-coach` and `/es/my-coach` as a guest on 320/354/390/430 px; identify 8 different faces, no stretch, correct top portrait and Favorites/Suggested behavior. Open About coach, Start session for Max/Alex and Mira/Sofia and confirm the same face throughout; check reduced-motion media, voice/mic/transcript unaffected. Required exact-HEAD checks, protected merge and Vercel READY/SHA plus public mobile screenshots remain distinct release gates. Tests guard unique file hashes, six frames, sizes and links; human visual review guards resemblance (byte hashes alone do not).

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
