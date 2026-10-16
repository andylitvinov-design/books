# Original reflection v2 split: release checklist

New definitions: hh-money-pressure/v2, hh-overthinking-loop/v2, hh-screen-saturation/v2, each EN/RU.

- Money: items 1–3 difficulty (mean 0–4), items 4–6 available coping (mean 0–4).
- Overthinking: items 1–5 difficulty (mean 0–4), item 6 reported interruptibility (0–4, one observation).
- Screens: items 1–5 difficulty (mean 0–4), item 6 perceived offline relief (0–4, neutral context).
- No reverse coding, shared overall total, invented clinical cutoff, validated subscale claim or cross-version trend.
- All six responses required, integer 0–4; no missing-answer imputation. Existing configured:v1 mean engine rounds outputs to two decimals; new content, translation and result identities are v2.
- Original v1 definitions are unchanged and remain registered. Old saved course selections resolve to their exact old dimension/guide. Old mixed totals remain ineligible for new automatic priorities; no old result is rewritten or cast as a v2 score.
- Existing public account/guest consent and report contracts are unchanged.

## Release gates

No database operation is performed by this patch. The code catalog switches these three keys to v2; therefore publish/activate it only after all six exact registry rows have been verified. The append proposal is a separate reviewed deliverable, not an automatically executed migration.

1. Verify original ownership/electronic-use permission for both languages. Original-HH source status and a previous catalog cleared flag are provenance indicators, not independent legal proof.
2. Review all six explicit item maps, directions, content hashes, UUIDs and exact scoring identity. Retain configured:v1; do not silently modify the common arithmetic engine.
3. In one insert-only transaction, check every proposed ID and key/version/locale is absent. On any existing identity, including an identical row, stop and reconcile; no ON CONFLICT overwrite/skip. No UPDATE, DELETE, schema, RLS, permissions or client-data query.
4. Append the six definition JSON payloads and matching technical registry fields. Validate full definition JSON and metadata readback, not just row counts or hashes.
5. Activate this exact tested code only after readback passes. Verify account and guest v2 runs and old stored-result view/selected-course continuation without using real client answers in logs.
6. Rollback of code activation must not delete rows or results; preserve all identities and histories.

## Limits

These are authored, nonvalidated self-reflection questionnaires. Mechanical tests do not establish psychometric validity, English/Russian equivalence, clinical sensitivity or specificity. Money coping combines three distinguishable self-reported resources, so the report encourages examining responses separately. Offline relief does not establish whether screen exposure caused overload or whether more relief is better.

## Verified original-content continuation basis (2026-10-16)

Repository provenance was verified against original owner-repository commit [58fa858a76a0dded7112de1f0f26e519fb825dfb](https://github.com/andylitvinov-design/books/commit/58fa858a76a0dded7112de1f0f26e519fb825dfb), dated 2026-10-06, and [PR 184](https://github.com/andylitvinov-design/books/pull/184), which identifies these questionnaires as original Holistic House engaging checks, separately from licensed professional forms. The current owner explicitly approved the three specific splits on 2026-10-16.

Independent technical review confirmed that all question text, item IDs, required flags, response anchors and response ranges remain exactly unchanged in all six EN/RU editions. The changes introduce separate score dimensions and project-authored descriptive guidance; no third-party instrument wording, manual material, norms, clinical cutoffs or new translation of third-party material is introduced. All 210 preexisting definitions remain byte-equivalent under canonical JSON serialization. Exhaustive independent scoring of 15,625 response vectors per new definition passed, 93,750 vectors in total.

The verified repository provenance, owner authorization and unchanged original content support continuation of the project's existing authored material for this narrowly scoped release. This is not independent legal certification, a claim that a catalog rights flag proves ownership, or evidence of psychometric or clinical validity. Registry insertion and exact readback remain a separate activation gate; this documentation update performs neither.
