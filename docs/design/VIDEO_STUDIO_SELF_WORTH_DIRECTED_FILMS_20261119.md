# Video Studio · eight additional individually authored self-worth films — 19 November 2026

## Scope
Adds 8 individually staged 30-second, six-action films in RU/EN/ES:
4 original Self-Acceptance films and 4 Low Self-Esteem films.
The 256 scenario IDs and the separate 1,536 four-beat MyTube plots remain unchanged.
Each screenplay is a fictional editorial concept, not an inferred personal history,
a clinically validated outcome, or a claim that a photo/video actually depicts it.

### Four acceptance stories
- s1 garden: stop measuring crooked stems; different plants need different conditions.
- s2 mirror: exchange judgmental sticky notes for neutral observable statements, no forced positive self-talk.
- s3 mixed feelings: two transparent colors coexist; the conversation may wait.
- s4 seedlings: record real care rather than condemn a seed for not meeting a calendar deadline.

### Four self-esteem stories
- s1 critic: check a harsh glass-board verdict against factual completed work.
- s2 unseen effort: make backstage work visible without inventing public applause.
- s3 comparison: a gallery exhibition hides the artist's practice; use one small sketch revision.
- s4 numbered badge: remove a public scorecard, retain specific actionable feedback and human dignity.

## Quality truth, media gates
Film engine `film-256-editorial-overrides.mjs` reuses the original 256-film
screenplay route for Ideas → Story → Montage, exact sceneId, sourceStages and 6×5s times.
The catalog after this PR contains **20 individually directed scene treatments**
(including earlier 12) and **236 formula-composed drafts** awaiting rewrite/review.
No manual owner approval or physical scene media is certified by these tests.
Every source is still `editorial_only_unverified` until actual media visual, license,
orientation, attribution, native codec and iPhone playback checks pass.

Acceptance:
`node --test tests/film-256-self-worth-editorial.test.mjs tests/film-screenplay-256.test.mjs tests/mytube-coverage-quality.test.mjs`.
Keep exact protected Core+Mandala CI, native AutoMerge, existing hourly Vercel deploy,
no new provider/bucket/cron and no paid generation. Follow-up issue #5113.
