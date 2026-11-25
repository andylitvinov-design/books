# CRM / Reiki migration ledger reconciliation (19 October 2026 UTC)

The canonical production history is `supabase_migrations.schema_migrations` in Supabase project `shervdixkaxurnaecioe`. This commit **does not execute SQL or mutate schema/data**. It restores source control parity for previously applied migrations so migration runners do not misinterpret historically applied DDL as new.

## Verified source ↔ live
The exact `statements[1]` persisted on Production was compared to tracked GitHub source via PostgreSQL string equality. Four migration bodies were **byte-for-byte identical** (email delivery, email FK indexes, Reiki private CRM leads and public reviews); those files were renamed to their applied versions without any body change.

Google Maps source had the same enum DDL but different SQL comments (682 vs 525 characters); source is now the exact **525-character** live statement under applied version 20261018230048. The missing marketing attribution source has been restored directly from the applied **4762-character** Production migration statement under version 20261018193559; no secrets or credentials exist in that SQL.

| Previously tracked | Applied version now tracked |
|---|---|
| 20261018160000 email delivery | 20261018131448 |
| 20261018171000 email FK indexes | 20261018131742 |
| 20261018215000 Reiki private CRM leads | 20261018184658 |
| 20261018224600 Google Maps source | 20261018230048 |
| 20261019031800 Reiki public reviews | 20261019030943 |
| No tracked marketing attribution migration | 20261018193559 |

The source test references and operations documentation were aligned. These six migration versions are **already applied in Production**. Do not replay the DDL, call apply_migration for these, seed data, or enable mail/messaging providers as part of a filename fix.

## Remaining audit
The repository also has many older, **non-CRM** migration-version mismatches relative to full Production history. They require a separate Codex/database migration review with exact statement comparison and dependency checks, rather than broad automated renames. See issue #1050 and keep them out of CRM release scope.
