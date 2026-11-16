# Holistic House Video Studio — Meaning → Motif → Film Scenario v1

**Owner decision, 2026-11-05.** The canonical six-level editorial catalog and
Auto Video Director user flow: **Category → Subcategory → Topic → Meaning axis
(one of 8) → Motif (one of 4) → Film scenario (one of 4)**.

The eight canonical axis IDs, RU/EN/ES labels and 11 nuanced facets remain
in `data/video-catalog/meaning-emotion-ideas-v1.json`. The shared axis-to-motif
mapping is `data/video-catalog/mytube-meaning-motifs-v1.json`, used by the
existing Meaning × Emotion → Film handoff and by the new normalized catalog API.

Public module `lib/mandala/mytube-meaning-hierarchy.mjs` exposes
`listMyTubeMeaningAxes`, `listMyTubeMeaningMotifs`,
`listMyTubeMotifScenarios`, `getMyTubeTopicMeaningTree` and
`validateMyTubeMeaningPath` with a deterministic editorial `pathId`:
`topicId::meaningAxisId::motifId::scenarioId`. Unknown or mismatched parent
choices fail closed. The render catalog still has immutable 256 legacy scenario
IDs, their 1,024 independent four-plot variants and original topic/search IDs.

A single topic potentially navigates 8 × 4 × 4 = **128 editorial combinations**;
64 existing topics yield **8,192 editorial paths**. This is NOT 8,192 new
handwritten film scripts, rendered videos, or licensed MP4s. Four existing
topic-specific film templates are reused as editorial options for each motif.
All new contextual combinations require semantic/editorial suitability review.

Different concepts:
- `Meaning axis`: one of the eight human meaning directions.
- `Confirmed meaning idea`: separately confirmed statement of narrative purpose.
- `Motif`: symbolic image class from the selected meaning.
- `Film scenario`: narrative template selected within the motif.
- `Emotional scenario`: nonclinical state progression (Now → Want).
- `Scene scenario`: concrete four-beat timeline with source MP4 and durations.

Visual style is an **optional orthogonal filter**. Any export still needs four
distinct approved, correctly oriented, licensed MP4 and review of actual
visual fit and rights. No false promise of clinical effects or paid rendering.
New choices reset their child state; old five post-scenario motifs remain
available solely for compatibility with earlier consumer code.

No new paid provider, background job, data-storage bill, or CI workflow.
Verify Node scenario/motif and UI tests, TypeScript/Next build, mobile locale
checks and existing exact-HEAD Core/Specialist/Guard. GitHub protected merge
is distinct from Vercel READY production SHA and iPhone Safari functional LIVE
acceptance.
