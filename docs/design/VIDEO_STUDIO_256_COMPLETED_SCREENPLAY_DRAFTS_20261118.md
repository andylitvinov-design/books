# Video Studio — 256 completed editorial screenplay drafts (2026-11-18)

## Problem and source

The established `data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json` is the **unchanged** single source for 4 categories × 4 subcategories × 4 topics × 4 scenarios = **256** individually named scenario concepts in RU/EN/ES. Its four-beat storyboard metadata is **not** a cinematic screenplay, nor proof that footage is available.

The previous generic film engine had 18 plots and a strong structural check. Scoring 35/35 did not establish independent artistic authorship or originality. Merely substituting a prop in a shared story template is not enough to claim human editorial review.

## New additive layer

- `lib/mandala/film-256-props.mjs`: a separately defined visual anchor for each of the 256 original scenario IDs (64 × 4) with localized wording.
- `lib/mandala/film-256-editorial-overrides.mjs`: individually directed 30-second six-shot films in RU/EN/ES for all four motivation-drive variants, each with its own actor action, dramatic event and resolution.
- `lib/mandala/film-256-beat-actions.mjs`: a local scenario-aware physical action composer for the remaining plots. Three central shots are linked to the scenario's original source beats. Sensitive themes use present-oriented and non-coercive visual actions.
- `lib/mandala/film-screenplay-256.mjs`: 256 original catalog IDs; localized Main Idea, short pitch, narrative, continuity, unique visual anchor, four source stages, **exactly six 5-second camera events**, persistent `sceneId`, a four-phase emotional arc, provenance, story/source pairing and structural review.
- The existing `video-creative-directions.mjs` uses four complete films for the selected topic and picks **two** under `rankFilmOptions`. Two previously individually curated subjects (anxiety-no-reason and ready-relationship) remain compatible with their existing quality-gated directions.
- Montage gets exactly the shot actions attached to the chosen story; no second story generator, no random unrelated stock footage and no new payment/render provider.

## Editorial quality and acceptance

**Automated structural status:** 256 × 3 languages = 768 records; 6 distinct story scenes each, 30s total, 256 distinct scenario titles and narratives per locale, exactly the same scene IDs in concept and storyboard, all candidate media unverified. Source stage intent is retained in every shot. Strict footage source verification remains an independent montage requirement.

**Human editorial status (not certified by tests):** four motivation-drive variants have separately written screenplay actions in three languages. The other 252 have completed screenplay **draft structure** composed from unique original source beats, one unique per-scenario visual anchor and topic-linked physical staging. Those 252 are *not* certified as 252 individually written, independently reviewed high-art scripts. A deterministic high-score is structural only; do not label them 'human reviewed'. A follow-up individual editorial pass can rewrite weak scenes without changing identifiers, narrator/visual continuity or export safety.

**Do not mark LIVE** from GitHub PR success alone. Required: protected PR merge, Vercel Production READY serving exact merged SHA, RU/EN/ES current/goal personalization showing two film choices, 6×5s parity in Montage, and real iPhone WebKit where available. Do not auto-attach a clip when its depicted actions, source rights and visual quality are not verified.

No new external model, paid API, cron, bucket or provider. Do not infer clients' biography or mental condition; ranking uses only confirmed voluntary preference IDs.
