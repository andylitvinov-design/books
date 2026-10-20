# PC-PTSD-5 dormant runtime support

Status: dormant source support, **NOT activated**. No database writes, definition
registration, public catalog entry, starter plan or automatic repeats are included.
A draft PR or source publication does not authorize registration or activation.

## Immutable identity

- Definition UUID: `24a5a88c-3d1a-5e8a-8f10-ee39a3110a49`
- Identity: `pc-ptsd-5 / v1 / en / original-en-2022`
- Content hash: `sha256:599d94b7d3f4d1ef7d3a93737c16d335d76a08ed4488dd24aa400de080197b85`
- Official form: https://www.ptsd.va.gov/PTSD/professional/assessment/documents/pc-ptsd-5-v6.pdf
- Rights source: https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd.asp

The new frozen candidate module preserves the exact reviewed definition body.
Every runtime exception verifies the full canonical definition against that
trusted constant. A matching key or a client-supplied hash alone is insufficient.
Existing trusted registry resolution remains in the public scorer and both
repositories. The candidate is deliberately absent from that registry.

## Implemented support

1. One exposure question is applicable initially. YES makes all six applicable;
   NO completes a one-question attempt. Missing/null never becomes zero.
2. Shared account/guest and quick/guided question selection and progress helpers.
3. Both save repositories and the pure run lifecycle use a shared atomic reducer.
   Explicit YES-to-NO/reset clears all five stale symptoms in the same answers
   and progress update, under existing revision and operation-id guards.
   Contradictory supplied symptoms are rejected rather than silently accepted.
4. Submitted answers reject stale symptom keys. Complete YES answers count the
   five symptom YES responses, never the exposure response.
5. The dimension retains `responseState: answered | structurally-skipped`.
   This is result metadata, not a definition/provenance modification. Reports
   distinguish structural zero from five answered NOs. Shape/provenance guards
   reject missing or forged state. Snapshot verification preserves this field,
   and skipped/answered states do not produce a symptom-change comparison.
6. Neutral source-bound EN/RU report copy and a count-only gauge: no universal
   cutoff, severity bands, probability, diagnosis, treatment action or positive/
   negative-screen classification. Other UI locales fall back to English copy;
   no translated questionnaire is introduced.
7. A separate immutable, exact-version administration policy adds adult,
   non-diagnostic and non-monitoring acknowledgements. These are product
   safeguards, not additional scored questions or proof of professional care.
   No personal event narrative is requested.
8. `PC_PTSD5_RELEASED` and the policy's release flag are both false. Both repository
   availability checks explicitly reject PC while disabled. The new tests are
   included in the existing `test:app` command.

## Synthetic validation

All checks use source files and invented answers only. No account, client record,
production database, or live authenticated assessment was used.

- 25 new tests passed: all 32 complete YES answer combinations, NO branch,
  missing/null/invalid input, exact identity tampering, stale answers, atomic
  pruning, four audience/mode transition models, policy gates, reports, snapshots
  and actual JSX front-matter/examples/count-gauge execution.
- 119 targeted tests passed, including existing PCL/ITQ, app assessment,
  guest-migration, result-experience and guest-navigation tests.
- TypeScript no-emit check passed.
- Changed JavaScript modules/tests passed targeted ESLint. The repository ESLint
  configuration ignores `.jsx`; all four modified JSX files additionally passed
  TypeScript JSX parsing. The component execution tests are not a browser test.
- Paired broader source-based regression on the same `58b0210a` base:
  baseline 132 passed / 73 failed; patch 154 passed / 73 failed. The exact same
  failures were reproduced: 72 guest-scale report label expectations and one
  tantric scale-level expectation. They are pre-existing and not fixed here.

Example targeted command:

```sh
node --conditions=react-server --test \
  tests/pc-ptsd5-runtime.test.mjs tests/pc-ptsd5-render.test.mjs \
  tests/trauma-screening-integration.test.mjs tests/trauma-screening-candidate.test.mjs \
  tests/trauma-catalog-activation.test.mjs tests/trauma-scale-meaning.test.mjs \
  tests/app-assessments.test.mjs tests/app-guest-report-migration.test.mjs \
  tests/assessment-result-experience.test.mjs tests/guest-single-via-family.test.mjs \
  tests/guest-result-navigation.test.mjs
```

## Remaining gates, not claimed complete

- Independent dormant-scope review passed. Exact changed files were reconciled
  through `34fde0ad`; fresh PR CI and concurrent-base reconciliation remain required.
- Confirm an actual qualified-professional follow-up pathway and release
  administration policy. A checkbox or disclaimer does not establish that path.
- Real browser source-to-UI verification for both audiences and modes, including
  interrupted saves, reload, retry/revision conflict, backtracking, mode changes,
  accessibility and mobile layout, using an approved isolated test fixture.
- Approved isolated persistence/end-to-end coverage for both repositories,
  including structural-skip metadata round trip and result/history import.
  Static wiring assertions and a pure reducer are not a database transaction test.
- Separate registration/activation review and exact readback if later authorized.
  The already approved production `validate_run` exception is not changed or
  repeated. No registration SQL or migration is included.
- Full application build, full unit suite, CI and live deployment were not run
  for this local-only patch. Focused and paired checks are not a whole-site pass.

Do not enable the definition or remove the release hold merely because the
arithmetic tests pass.
