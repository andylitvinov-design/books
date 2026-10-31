#!/usr/bin/env bash
# Restore the previously audited REA 6.8.0 experimental Codex profile on macOS.
# No writes to ~/.codex, the HH checkout, global Node, or other app worktrees.
set -euo pipefail

VERSION='22.23.4'
NODE_SHA256='037650d0839f457747396f052073fb48333d31bf5abd3c98b74da20d89ebb1ad'
REA_SRI='sha512-9QDeRnGqEDzABZyr04eLnBXBv/c6I9/TWu/6M0MD4pEfkySI/BIgwTODIbAReX3C1x6hjw9+Jlx4A2yUSPZ9ww=='
NODE_ARCHIVE="node-v${VERSION}-darwin-arm64.tar.xz"
ROOT="$HOME/.local/share/holistic-house-research/rea-6.8.0"
PROFILE="$ROOT/rea-scope/codex/config.toml"
RUNTIME="$ROOT/runtime"
REA="$ROOT/rea-scope/install/node_modules/rea-agents/scripts/rea.mjs"

fail() { printf 'BLOCKED: %s\n' "$*" >&2; exit 2; }
free_kib() { df -Pk "$HOME" | awk 'NR==2 {print $4}'; }
builds_running() {
  ps -axo comm | grep -Eq '(npm run build|next build|turbo.*build)' 
}

preflight() {
  [[ "$(uname -s)" == Darwin && "$(uname -m)" == arm64 ]] || fail 'macOS arm64 required'
  [[ -d "$ROOT" && ! -L "$ROOT" ]] || fail 'the audited isolated research directory is absent or linked'
  [[ -f "$PROFILE" && ! -L "$PROFILE" ]] || fail 'the experimental Codex profile is absent or linked'
  grep -Fq "$ROOT/runtime/bin/node" "$PROFILE" || fail 'profile does not target portable Node'
  grep -Fq "$REA" "$PROFILE" || fail 'profile does not target the pinned REA'
  [[ "$HOME" == /Users/* ]] || fail 'unexpected HOME; refuse to act'
  [[ ! -e "$ROOT/runtime" || -d "$ROOT/runtime" ]] || fail 'runtime path conflict'
  [[ ! -e "$ROOT/rea-scope/install" || -d "$ROOT/rea-scope/install" ]] || fail 'REA path conflict'
}

check() {
  preflight
  printf 'PROFILE=%s\n' "$PROFILE"
  printf 'NODE_SOURCE=official Node.js %s darwin-arm64\n' "$VERSION"
  printf 'REA_VERSION=6.8.0\n'
  printf 'FREE_KIB=%s\n' "$(free_kib)"
  if builds_running; then echo 'OTHER_BUILDS=ACTIVE'; else echo 'OTHER_BUILDS=NONE'; fi
  if [[ -x "$RUNTIME/bin/node" && -f "$REA" ]]; then
    printf 'INSTALLED_NODE=%s\n' "$("$RUNTIME/bin/node" -v)"
    echo 'REA_BINARIES=PRESENT'
  else
    echo 'REA_BINARIES=ABSENT'
  fi
  echo 'CHANGES_MADE=NONE'
}

restore() {
  preflight
  if [[ -x "$RUNTIME/bin/node" && -f "$REA" ]]; then
    echo 'REA binaries already present; rerun the doctor before using this profile.'
    exit 0
  fi
  [[ ! -e "$RUNTIME" && ! -e "$ROOT/rea-scope/install" ]] || fail 'partial install; preserve for manual review'
  [[ "$(free_kib)" =~ ^[0-9]+$ ]] || fail 'cannot measure disk free space'
  (( $(free_kib) >= 5 * 1024 * 1024 )) || fail 'less than 5 GiB free'
  ! builds_running || fail 'another build is running; do not compete for disk space'
  command -v curl >/dev/null && command -v shasum >/dev/null && command -v tar >/dev/null || fail 'required system tools missing'

  local stage='' actual='' installed_version=''
  stage="$(mktemp -d "$ROOT/.restore.XXXXXXXX")"
  [[ "$stage" == "$ROOT"/.restore.* ]] || fail 'invalid private staging path'
  trap '[[ -z "${stage:-}" ]] || rm -rf -- "$stage"' EXIT
  mkdir -p "$stage/home" "$stage/cache" "$stage/runtime" "$stage/install"
  chmod 700 "$stage" "$stage/home" "$stage/cache"

  curl -fsSL --retry 2 --max-time 180 \
    "https://nodejs.org/dist/v${VERSION}/${NODE_ARCHIVE}" \
    -o "$stage/$NODE_ARCHIVE"
  actual="$(shasum -a 256 "$stage/$NODE_ARCHIVE" | awk '{print $1}')"
  [[ "$actual" == "$NODE_SHA256" ]] || fail 'official Node archive digest mismatch'
  tar -xJf "$stage/$NODE_ARCHIVE" -C "$stage/runtime" --strip-components=1
  installed_version="$("$stage/runtime/bin/node" -v)"
  [[ "$installed_version" == "v${VERSION}" ]] || fail 'extracted Node version mismatch'

  local -a npm_env=(
    env -i HOME="$stage/home" PATH="$stage/runtime/bin:/usr/bin:/bin"
    TMPDIR="$stage" npm_config_cache="$stage/cache"
    npm_config_ignore_scripts=true npm_config_omit=optional
    npm_config_audit=false npm_config_fund=false
  )
  (cd "$stage" && "${npm_env[@]}" "$stage/runtime/bin/npm" \
    pack rea-agents@6.8.0 --ignore-scripts --json > "$stage/package-meta.json")

  [[ -f "$stage/rea-agents-6.8.0.tgz" ]] || fail 'pinned REA tarball missing'
  actual="$("$stage/runtime/bin/node" - "$stage/rea-agents-6.8.0.tgz" <<'NODE'
const fs = require('node:fs'), crypto = require('node:crypto');
const bytes = fs.readFileSync(process.argv[2]);
console.log('sha512-' + crypto.createHash('sha512').update(bytes).digest('base64'));
NODE
)"
  [[ "$actual" == "$REA_SRI" ]] || fail 'pinned REA tarball SRI mismatch'

  "${npm_env[@]}" "$stage/runtime/bin/npm" install \
    --prefix "$stage/install" --no-save --no-package-lock --ignore-scripts \
    --omit=optional --no-audit --no-fund "$stage/rea-agents-6.8.0.tgz"
  local staged_rea="$stage/install/node_modules/rea-agents/scripts/rea.mjs"
  [[ -f "$staged_rea" ]] || fail 'REA entry missing after install'
  "${npm_env[@]}" "$stage/runtime/bin/node" "$staged_rea" --version --json \
    > "$stage/installed-version.json"
  "$stage/runtime/bin/node" - "$stage/installed-version.json" <<'NODE'
const fs = require('node:fs');
const value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!JSON.stringify(value).includes('"6.8.0"')) process.exit(2);
NODE

  (( $(free_kib) >= 1024 * 1024 )) || fail 'less than 1 GiB after staging; cancel and clean our own stage'
  ! builds_running || fail 'another build started; cancel and clean our own stage'
  mv -- "$stage/runtime" "$RUNTIME"
  mv -- "$stage/install" "$ROOT/rea-scope/install"
  printf 'RESTORED=YES\nNODE=%s\n' "$("$RUNTIME/bin/node" -v)"

  local scoped_home="$ROOT/rea-scope/home" scoped_config="$ROOT/rea-scope/codex" scoped_xdg="$ROOT/rea-scope/config"
  local -a doctor_env=(
    env -i HOME="$scoped_home" CODEX_HOME="$scoped_config"
    XDG_CONFIG_HOME="$scoped_xdg"
    PATH="$RUNTIME/bin:/usr/bin:/bin"
  )
  "${doctor_env[@]}" "$RUNTIME/bin/node" "$REA" doctor --client codex --json > "$ROOT/rea-scope/doctor-restored.json"
  "${doctor_env[@]}" "$RUNTIME/bin/node" "$REA" mcp doctor --json > "$ROOT/rea-scope/mcp-doctor-restored.json"
  "$RUNTIME/bin/node" - "$ROOT/rea-scope/doctor-restored.json" "$ROOT/rea-scope/mcp-doctor-restored.json" <<'NODE'
const fs=require('node:fs');
const [registration,mcp]=process.argv.slice(2).map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const ok = registration.healthy===true && mcp.healthy===true &&
  mcp.inventory?.tools?.expected===229 && mcp.inventory?.tools?.observed===229 &&
  mcp.inventory?.prompts?.expected===6 && mcp.inventory?.prompts?.observed===6 &&
  mcp.request_flow?.ok===true;
if (!ok) { console.error('MCP checks failed: review scoped diagnostics'); process.exit(2); }
console.log('REA_READY=YES | MCP tools 229/229 | prompts 6/6 | target-free call PASS');
NODE
}

case "${1:---check}" in
  --check) check ;;
  --restore) restore ;;
  *) echo 'Usage: rea-mac-restore.sh [--check|--restore]' >&2; exit 2 ;;
esac
