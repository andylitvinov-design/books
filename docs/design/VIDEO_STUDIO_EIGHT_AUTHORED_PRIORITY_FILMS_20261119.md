# Video Studio — individually directed eight priority stories · 19 Nov 2026

## Scope
Existing MyTube taxonomy remains **4 categories, 16 subcategories, 64 topics,
256 scenarios**, with 6 distinct MyTube plot alternatives per scenario.
Video Studio's **film screenplay** format is separate: 6 × 5-second camera events.
No new scenario count or video generator.

This PR adds **eight individually authored, scene-specific film treatments** in
RU/EN/ES, 24 translated story versions and 144 original action descriptions.
These are editorial works, not claims about real clients or matching filmed footage.

- Money blocks (4): the invisible ceiling; naming a fair price; accepting
  agreed payment; beginning a difficult money conversation
- Couple conflict (4): an agreed pause; setting down a rope instead of
  winning; naming one's responsibility without demanding forgiveness;
  consent-based limits and a right to leave unsafe conversations

These treatments preserve exact scenario ID, topic owner, story beats, runtime
source IDs, 30-second timestamps and the **Ideas → Story → Montage** matching
contract. They retain sourceStatus=editorial_unverified; no automatic license,
rights or physical footage guarantee.

## Explicit honesty and editorial debt
The screenplay catalog previously contained 4 individually authored films
and 252 formula-derived drafts. This PR increases the authored count to
**12**; **244** remain structurally completed editorial drafts in need of
independent human-style rewrites and actual artistic review.
Do not call all 256 films human-reviewed or clinically effective.

## QA
`node --test tests/film-256-priority-editorial.test.mjs tests/film-screenplay-256.test.mjs tests/mytube-coverage-quality.test.mjs`
`node scripts/audit-mytube-creative-coverage.mjs`

Accept: 256 stable IDs, 1,536 four-beat plot variants, 256 × RU/EN/ES
six-shot Video Studio scripts, all 12 overrides using six original
visual actions, explicit low-confidence topic routing for ambiguous
client issues, no fabricated psychological history or miraculous outcomes.
Every concept must remain unverified media until each actual photograph/MP4
is frame-decoded, licensed, visually matched and render/playback verified.

## Next editorial wave
Prioritize the remaining 244 drafts by topic, starting with self-acceptance,
low self-esteem, relationship trust, emotional exhaustion, career and income.
Do not create a new LLM, bucket, cron, extra production deployment or
duplicate PR for iPhone MP4 (#5093). Use protected CI/AutoMerge and the
existing low-cost hourly production publisher.
