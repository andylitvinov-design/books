# Versioned interpretation release: C2 candidate

This is the database package following the [semantic audit and C1 repair](./interpretation-v2-follow-on.md). Its presence in a branch is not evidence that production has received these rows or that hosted rendering has passed.

## Exact source and immutable history

- Source commit: `040b45e9a641f2c55b953e4cc6627f57f64f2caa`; tree: `ae0be6eb32c0ebb439e36a3efeaecff457bf9784`.
- The non-truncated recursive GitHub tree was checked against all 98 exporter/semantic/package source inputs. The export is verified and non-draft.
- New stored version: `2026-10-17.v2`; rules: `2026-10-17.v12`.
- Exactly 230 registered forms × EN/RU reports = 460 new rows: 440 active and 20 historical-form rows. These are technical definitions and interpretation templates, not client records.
- All 460 historical v1 approval entries retain their exact identities and digest values. The existing v1 seed and release descriptor are byte-unchanged. The combined allowlist has 920 entries; each release gate independently requires its exact 460-entry subset and rejects malformed or unknown-version extra entries.
- The new records file SHA-256 is `dfb6d1e33edfb3b6ad5be6b0a9568a864b34d900b69cb586cf9316496c7b4317`.

## Bounded, INSERT-only transport

The original compact generator exceeds its existing 12 MiB limit for these richer payloads; some uncompressed single records exceed the 512 KiB batch limit. Neither limit is increased.

`scripts/compact-interpretation-v2-sql.mjs` deduplicates literal JSON string fragments at sentence boundaries. It preserves every canonical UTF-8 byte and payload digest. It uses the exact existing C1 PostgreSQL decoder and INSERT projection. The SQL consists of literal CTEs, concatenation and plain INSERT, enclosed in transactions. It creates no staging table, function, extension, policy or schema object, and contains no upsert.

The committed v2 seed is 11,104,134 bytes, SHA-256 `ff0c859ba1bc26de6f6f3c9349c25b290e5b4e11fff5bf1fafb7f2bc8de0f7d1`. The separately reviewed bounded transport has 24 transactions, at most 523,873 bytes each. Both encodings reconstruct the same 460 canonical payloads. No existing interpretation is replaced.

Before an authorized application, recheck all 230 technical definitions and the absence of all new identities. Stop on any conflict. Read back exact identities, source provenance, canonical payload bytes and digests after every bounded transaction. An unknown outcome requires readback before any retry. After all batches, verify exactly 920 total rows, both 460-row versions, unchanged v1 rows, and unchanged technical definitions/security. Do not activate a partial package or modify existing rows to resolve a conflict.

## Verification and honest release gates

The source-pinned exporter passed all 33,100 finite score/report-locale comparisons. Eight focused transport/isolation tests passed. Isolated PGlite 0.5.10 passed the complete seven-stage v2 database case bodies, including full seed reconstruction, all 33,100 runtime database/code comparisons, exact 920-row preservation, negative integrity cases, backend-only access, immutability and optional-read isolation. A separate fresh PGlite database applied all 24 bounded batches and independently compared every stored field with the original export; replay failed with a uniqueness conflict.

Synthetic response projection covered 460 low/high results: the largest EN/RU pair was 333,195 bytes. A 230-result history used 32 reads and 515,229 bytes, within the unchanged 32-read/512-KiB limits. No client data was read or generated for this verification.

**PGlite is not native PostgreSQL 17.** The existing isolated database workflow runs all 12 historical v1 checks first, including the explicit v1-only/current-code-fallback check, then seven additional v2 checks in the same fresh service. Its artifact must report all seven v2 stages passed and `databaseParityForRuntimeVersion: true` before native v2 parity is claimed. Transport guards, fresh-service identity checks, workflow permissions and connection restrictions are unchanged.

At preparation on 17 October 2026, native v2 CI, authorized production insertion/readback and hosted rendered-report checks remain pending. Current consumers still reject stale or missing rules and use verified code fallback when an exact approved v2 row is absent. This package does not establish clinical validity or remove the audit's documented GAD-7 RU and continuous-score limitations.
