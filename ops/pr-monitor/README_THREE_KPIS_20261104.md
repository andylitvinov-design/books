# PR Monitor — Error → Repair, CI First Pass, Green → Merge

**Comparison:** two 24-hour windows, one ending now and another ending exactly two calendar weeks earlier at the same Toronto local clock, including the 2026-11-01 DST change. All durations are in wall-clock minutes, not runner compute/billing minutes.

Existing read-only source: [Core CI issue #3419](https://github.com/andylitvinov-design/books/issues/3419) and authenticated GitHub Actions bot shards. The API reads historical shards up to 16 days back, max four GitHub pages, no new schedule or CI run. The historical audit [#3394](https://github.com/andylitvinov-design/books/issues/3394) lists a 20–21 October PR cohort but had zero attributable Core CI paths and covers a different clock window. It is context only, never a source of synthetic KPI durations.

## Measured contracts

| KPI | Start evidence | End evidence | Cohort | Evidence caveats |
| --- | --- | --- | --- | --- |
| **Error → Repair** | First failed required Core job with verified completed_at and exact PR/HEAD | Authenticated HH_PR_STAGE_V1 repair_started on same PR/HEAD and after failure | Repair start in 24h window | Repair receipts reside in PR discussions, not Core archive; verify up to five on explicit click. No pair → missing, not zero. |
| **CI First Pass** | Earliest saved Core workflow on PR with attempt=1 | Required Core, Specialist, and Merge Gate jobs fully concluded | First saved PR wave completes in window | Incomplete historical Actions may omit earlier wave. Display approximate observed archived wave percentage ONLY, not verified true first-ever CI First Pass. |
| **Green → Merge** | Last verified hh-merge-check successful job AFTER successful Core+Specialist jobs on same HEAD | Actual archived GitHub merged_at following PASS | Merge occurs in 24h window | Only linked merged PRs with complete three required job proof and current SHA are included; show n, mean, p50, p95 and evidence. |

**Denominators:** each KPI has its own phase-completion cohort and exact n. These are not additive PR pipeline durations and cannot be added together. Historical two-week column shows an explicit dash when original event data is missing, never 0%, 0 min or improvement.

**API schema:** HH_PR_THREE_KPI_V1; one read-only 5-minute cached GET for existing Core issue. The explicit Repair verification button can fetch at most five PR discussions; no sweep of the backlog, CI rerun, cron, token or paid provider. The original graph and all previous sections remain visible.

**Future history:** GitHub shards in issue #3419 persist. Dates two weeks after November 4 can reuse these stored CI records through the 16-day window, while historical Error→Repair requires authentic older Repair receipts and the same evidence contract.
