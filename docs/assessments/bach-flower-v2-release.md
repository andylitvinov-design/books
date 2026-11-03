# Bach paired v2 release

## Authorized scope and provenance

On 2026-10-16 the owner confirmed that this is their authored questionnaire and authorized revision. This supports narrowly scoped continued web use of the authored EN/RU material; it is not independent legal certification. The declared legacy source is [report/src/data/mockData.js](https://github.com/andylitvinov-design/report/blob/main/src/data/mockData.js), inspected blob SHA 55b97f1a1fe83d8471f8619525cc20a8a3c40689. Its lines 304 and 354 contain the old RU wording. Thus this is an intentional new editorial edition, not correction to a verified English original.

The [Bach Centre Agrimony](https://bachcentre.com/en/remedies/the-38-remedies/agrimony/) and [Beech](https://bachcentre.com/en/remedies/the-38-remedies/beech/) descriptions support the traditional theme meanings used here. They are not evidence validating this questionnaire, its scoring, its translation equivalence or medical efficacy. No third-party questionnaire or clinical norm was introduced.

## Exact content delta

- EN bach.situation.36: I feel overly critical of others, irritable, or intolerant of differences.
- RU bach.situation.36: Я замечаю у себя чрезмерную критичность к другим, раздражительность или нетерпимость к различиям.
- RU bach.control.03: Поддержание внешней гармонии при сокрытии собственных трудностей.
- EN bach.control.03 is unchanged.

All remaining question text, all 115 item IDs, item metadata, required flags, ranges, anchors, 38 remedy mappings and bach-flower:v1 arithmetic are unchanged. Paired definition IDs, content hashes, translation versions and result versions are new. Historical v1 definitions, migrations and results are unchanged. The shared guides support explicit v1 and v2 retrieval. Cross-version comparisons must fail; matching arithmetic does not establish equivalent measurements.

## Activation gates

This patch prepares a catalog switch to v2. Do not deploy that switch until both exact registry rows are inserted and verified. No database action is performed by this patch.

1. Review exact EN/RU wording, identities and hashes against the separate two-row JSON proposal.
2. Execute the insert-only SQL proposal only against the verified authorized project. It checks both IDs and key/version/locale tuples first and aborts on any existing identity, including identical rows. Unique constraints protect against concurrent duplicates; there is no conflict skip or overwrite.
3. Verify the complete definition JSON and every explicitly inserted technical field through readback. Abort the transaction on mismatch. No client records, schema, RLS, access or expenses are involved.
4. Run isolated fixture/integration tests and the full release suite, then activate this exact tested code. Test guest/account starts with synthetic answers and old result retrieval without real client answers in logs.
5. A code rollback must preserve new rows and all saved results; never rewrite old runs or alias v1 as v2.

The SQL is a proposal under docs/assessments/registry-proposals, not an automatically applied migration.
