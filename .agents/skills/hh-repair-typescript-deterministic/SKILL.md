---
name: hh-repair-typescript-deterministic
version: 1.0.0
description: Review-only recipe for bounded type-only import codemods and TS verification
---

# Scope

Reproduced TypeScript failure on the exact current PR HEAD, allowlisted source and signed existing Repair Worker lease. An unrelated failed check is not sufficient.

# Procedure

Use the trusted `ci-pr-repair-deterministic.cjs` TypeScript import transformation only inside the existing no-secret runner. Compare baseline to changed diagnostics; reject any introduced TS/ESLint errors. Re-run full TypeScript and direct-import focused tests; independently verify the patch and remote branch SHA before the single authorized publish.

# Stop / no shortcuts

Do not weaken TypeScript compiler flags, suppress tests or edit sensitive source/config/CI policy. No additional provider, token or workflow. A candidate remains review-only; CI on the new HEAD remains mandatory.

## Agent Commander compatibility
This skill is `review_only`: finding or reading it does not grant source-write authority. Follow all original authenticated Worker and independent-approval gates.
