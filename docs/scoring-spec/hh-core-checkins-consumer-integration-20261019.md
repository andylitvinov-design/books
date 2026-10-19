# Core check-in consumer integration (inactive)

Pinned source: canonical 07eec015930cd33c5dcc5e0608262ce03cea89dc, preserving the separately reviewed PR1213 analysis and ingestion patches. This stage layers on the unchanged inactive core-definition draft.

## Complete-result contract

The existing runner and raw-dimensions scorer still require every answer. Persisted partial, null, sparse, fractional, forged-source or incompatible results do not gain an interpretation. New forms are recognized by exact candidate IDs/version identities and then verified against the immutable definition and scorer. Claiming a candidate identity with invalid provenance fails closed instead of falling back to legacy prose.

Real report, gauge, profile, history and dynamics consumers use original instrument-language facet labels. The detailed report preserves definition order; ProfileOverview retains its existing axis/source-name alphabetical grouping rather than score ranking. Values and endpoint labels remain raw ordinal responses. There is no total, severity band, normalized percentage, automatic lowest-facet focus or score-derived recommendation. An explicitly requested valid facet can be highlighted.

Comparisons retain account, source/version/locale/timeframe and time-order verification. Current-state difficulty and interference are never automatically compared because the saved records do not establish that the subject is the same. Other differences are descriptive arithmetic, with no clinical significance, improvement or causal inference. Recall windows may overlap. Invalid/latest records do not promote an older observation into the current score.

Legacy definitions, catalog entries and legacy interpretation paths remain unchanged. The separately reviewed ingestion validator is preserved; the new comparison branch is applied only after its ordinary validation and compatibility checks.

## Remaining activation prerequisites

This is not an activation release. No catalog, database registry, migration or production data change is included. Conditional monthly items and the next-five forms need a separately reviewed missing-aware answer/scorer/result/runner contract. Draft analysis can represent absent answers as null, but persisted submission still rejects incompleteness. A numeric zero must remain distinct from skipped, not applicable, no relevant occasion, cannot recall and prefer not to answer. Existing null-as-delete behavior must not be reinterpreted silently.

The proposed next-five complete-calendar-week window also needs explicit frozen date boundaries/timezone, distinct from rolling core recall. Existing report/history consumers must be tested with that eventual contract before activation. Empirical validation and translation/cognitive testing are not established by software tests.

## Validation limitations

Synthetic tests exercise actual scorer, source verification, report/profile/history/dynamics modules and React-rendered components. Native browser acceptance and the full application build remain required. The local verified consumer overlay is incomplete for a full Next build, and available overlay disk space is below the previous build output size; hosted checks should provide full-build evidence after independent review.

Two unchanged broad consumer tests already disagree with the current professional-additions catalog: the active-key inventory and the recommended completion test. The exact baseline summary reproduces its recommendation failure. Five existing professional-additions definition content hashes also disagree with their semantic payloads. None of these baseline defects is hidden or repaired by this patch.
