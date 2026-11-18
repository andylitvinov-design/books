'use strict';
/**
 * Exact trusted core-lint-types-build *source* contract step names.
 * This registry is shared by the signed Watchdog source-handoff receipt
 * and Commander test-failure router. These are diagnostic scopes only:
 * the existing signed HEAD reservation, changed-source allowlist, isolated
 * local reproduction, independent patch verifier, and publisher still gate
 * every actual source write. Specialist/merge/policy failures are excluded.
 *
 * Keep legacy names for inflight Core runs on older exact HEADs. The current
 * production workflow names the Mandala step with its version suffix.
 */
const VERIFIED_CORE_SOURCE_CONTRACTS=new Set([
  'Mobile Dock Core geometry and iPhone keyboard contracts',
  'Commander PR served-LIVE provenance contracts',
  'Fast Mandala release contracts',
  'Fast Mandala release contracts (HH_MANDALA_FAST_RELEASE_V1)'
]);
module.exports={VERIFIED_CORE_SOURCE_CONTRACTS};
