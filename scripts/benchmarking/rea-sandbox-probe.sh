#!/usr/bin/env bash
# Isolated REA 6.8.0 readiness proof; NEVER changes Codex or Holistic House config.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
PKG='rea-agents@6.8.0'
# Independently audited published tarball SRI in issue #2058 (2026-10-26).
EXPECTED_SRI='sha512-9QDeRnGqEDzABZyr04eLnBXBv/c6I9/TWu/6M0MD4pEfkySI/BIgwTODIbAReX3C1x6hjw9+Jlx4A2yUSPZ9ww=='

case "${1:---check}" in
  --check)
    exec node "$ROOT/scripts/benchmarking/rea-node-readiness.mjs" --strict
    ;;
  --probe)
    ;;
  *)
    printf 'Usage: %s [--check|--probe]\n' "$0" >&2
    exit 2
    ;;
esac

node "$ROOT/scripts/benchmarking/rea-node-readiness.mjs" --strict
command -v npm >/dev/null || { echo 'BLOCKED: npm unavailable' >&2; exit 2; }

# Fail closed before any package download when other builds are filling the disk.
# The first Mac pilot showed that parallel builds can use several GiB within minutes.
free_kib="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"
if [[ ! "$free_kib" =~ ^[0-9]+$ ]] || (( free_kib < 5 * 1024 * 1024 )); then
  echo "BLOCKED: REA sandbox probe needs at least 5 GiB free before npm install (observed KiB: ${free_kib:-unknown})." >&2
  exit 2
fi

# No checkout scripts, production secrets or user agent config in this workspace.
workspace="$(mktemp -d "${TMPDIR:-/tmp}/hh-rea-doctor.XXXXXXXX")"
trap 'rm -rf -- "$workspace"' EXIT
mkdir -p "$workspace/home" "$workspace/npm-cache" "$workspace/work" "$workspace/codex" "$workspace/config"
cd "$workspace/work"
safe_env=(
  env -i HOME="$workspace/home" PATH="$PATH" TMPDIR="$workspace"
  XDG_CONFIG_HOME="$workspace/config" CODEX_HOME="$workspace/codex"
  npm_config_cache="$workspace/npm-cache" npm_config_ignore_scripts=true
  npm_config_omit=optional npm_config_audit=false npm_config_fund=false
)

# npm pack from registry is a download, not a git/source build; ignore lifecycle.
"${safe_env[@]}" npm pack "$PKG" --pack-destination "$workspace/work" --ignore-scripts --json \
  > "$workspace/pack.json"

tarball="$workspace/work/rea-agents-6.8.0.tgz"
[[ -f "$tarball" ]] || { echo 'FAIL: pinned tarball not found' >&2; exit 2; }
actual_sri="$(node - "$tarball" <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const bytes = fs.readFileSync(process.argv[2]);
console.log('sha512-' + crypto.createHash('sha512').update(bytes).digest('base64'));
NODE
)"
if [[ "$actual_sri" != "$EXPECTED_SRI" ]]; then
  echo 'FAIL: independently reviewed REA tarball SHA-512 does not match. Nothing executed.' >&2
  exit 2
fi

# Install only in disposable workspace, omitting Frida and all lifecycle scripts.
# Transitive dependencies are NOT part of HH runtime or its lockfile.
"${safe_env[@]}" npm install --prefix "$workspace/work/probe" \
  --no-save --no-package-lock --no-audit --no-fund --ignore-scripts --omit=optional \
  "$tarball"

entry="$workspace/work/probe/node_modules/rea-agents/scripts/rea.mjs"
[[ -f "$entry" ]] || { echo 'FAIL: REA CLI missing from staged package' >&2; exit 2; }
"${safe_env[@]}" node "$entry" --version --json > "$workspace/version.json"

# Both actions are introspection only; DO NOT call setup without --dry-run.
"${safe_env[@]}" node "$entry" setup --client codex --skill=false --dry-run --json \
  > "$workspace/plan.json"

doctor_exit=0
"${safe_env[@]}" node "$entry" doctor --client codex --json > "$workspace/doctor.json" ||
  doctor_exit=$?

# Readback: setup MUST NOT register an MCP server or write the agent's config.
if [[ -e "$workspace/codex/config.toml" ]]; then
  echo 'FAIL: dry-run unexpectedly created Codex config' >&2
  exit 2
fi

node - "$workspace/version.json" "$workspace/plan.json" "$workspace/doctor.json" "$doctor_exit" <<'NODE'
const fs = require('node:fs');
const files = process.argv.slice(2, 5);
let data;
try {
  data = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
} catch {
  console.error('FAIL: REA --version, --dry-run or doctor did not return valid JSON');
  process.exit(2);
}
const [version, plan, doctor] = data;
const doctorExit = Number(process.argv[5]);
const nodeCheck = doctor.scope_checks?.find(check => check.name === 'node');
const registration = doctor.scope_checks?.find(check => check.name === 'registration:codex');
const expectedNoRegistration = doctorExit === 1 &&
  doctor.healthy === false &&
  nodeCheck?.ok === true &&
  registration?.ok === false &&
  registration?.classification === 'config_drift';
if (!expectedNoRegistration) {
  console.error('FAIL: isolated doctor is not in the expected unregistered Codex state');
  process.exit(2);
}
if (JSON.stringify(version).includes('"6.8.0"') === false) {
  console.error('FAIL: staged CLI did not identify as version 6.8.0');
  process.exit(2);
}
const planned = plan?.status === 'planned' && (!Array.isArray(plan.appliedActions) || plan.appliedActions.length === 0);
if (!planned) {
  console.error('BLOCKED: setup --dry-run is not a clean, read-only plan');
  process.exit(2);
}
console.log(JSON.stringify({
  rea_version: '6.8.0',
  node_runtime: process.version,
  immutable_tarball_sri: 'PASS',
  optional_frida: 'OMITTED',
  lifecycle_scripts: 'DISABLED',
  isolated_cli_version: 'PASS',
  codex_setup_dry_run: 'PASS',
  codex_config_written: false,
  doctor_json: 'PARSED',
  doctor_status: 'EXPECTED_UNREGISTERED_CODEX_PROFILE',
  doctor_healthy: false,
  doctor_exit_code: doctorExit,
  mcp_registration: 'NOT_PERFORMED',
  interpretation: 'CLI and scoped no-write diagnostics only. No active MCP profile is installed by this probe. A separate authorized Codex profile requires its own setup, tool discovery and testing.',
}, null, 2));
NODE
