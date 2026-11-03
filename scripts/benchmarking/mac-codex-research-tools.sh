#!/usr/bin/env bash
# Holistic House / Codex research-tool bootstrap for macOS.
# Safe by default: no downloads, installs, network requests, or config edits on --check.
set -euo pipefail

REMASTER_PKG='@thenavidm/remaster@0.2.1'
REMASTER_VERSION='0.2.1'
REA_VERSION='6.8.0' # reference only; REA installation intentionally NOT implemented
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
SKILL_DIR="$REPO_DIR/.agents/skills/clone"

usage() {
  cat <<'TXT'
Usage: bash scripts/benchmarking/mac-codex-research-tools.sh [--check|--install-remaster|--rea-plan]

--check             Read-only local environment and skill check (DEFAULT).
--install-remaster  Explicit, project-only Remaster 0.2.1 install on macOS after registry gate.
--rea-plan          Read-only REA prerequisites and pinned suggested doctor/dry-run commands.

Never run these commands in production or with production credentials.
TXT
}

present() { if command -v "$1" >/dev/null 2>&1; then command -v "$1"; else printf 'NOT INSTALLED\n'; fi; }

node_compatible_rea() {
  command -v node >/dev/null 2>&1 || return 1
  # Deliberately strict for rea-agents 6.8.0 documented supported lines on 2026-10-25.
  node -e '
    const [major,minor,patch] = process.versions.node.split(".").map(Number);
    const ok = (major===22 && (minor>23 || (minor===23 && patch>=4))) ||
               (major===24 && (minor>22 || (minor===22 && patch>=1))) ||
               (major===26 && (minor>12 || (minor===12 && patch>=1)));
    process.exit(ok ? 0 : 1);
  '
}

check() {
  printf 'Holistic House research toolchain — READ ONLY\n'
  printf 'OS: %s\n' "$(uname -s)"
  printf 'Project: %s\n' "$REPO_DIR"
  if command -v git >/dev/null 2>&1 && git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf 'Git branch: %s\n' "$(git -C "$REPO_DIR" branch --show-current)"
    printf 'Git origin: %s\n' "$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || printf '(none)')"
  else
    printf 'Git: checkout not detected\n'
  fi
  for prog in node npm codex; do
    printf '%s: ' "$prog"; present "$prog"
    if command -v "$prog" >/dev/null 2>&1; then
      "$prog" --version 2>/dev/null | head -n 1 || true
    fi
  done
  if [[ -f "$SKILL_DIR/SKILL.md" ]] && grep -q '^# Remaster' "$SKILL_DIR/SKILL.md"; then
    printf 'Remaster Codex project skill: PRESENT (%s)\n' "$SKILL_DIR"
  elif [[ -e "$SKILL_DIR" ]]; then
    printf 'Remaster Codex project skill: CONFLICT — non-Remaster folder present\n'
  else
    printf 'Remaster Codex project skill: NOT INSTALLED\n'
  fi
  if [[ -e "$REPO_DIR/node_modules/@playwright/test" || -e "$REPO_DIR/node_modules/playwright" || -e "$REPO_DIR/node_modules/playwright-core" ]]; then
    printf 'Playwright local package: DETECTED (browser readiness not verified)\n'
  else
    printf 'Playwright local package: not found (may be available elsewhere)\n'
  fi
  if node_compatible_rea; then
    printf 'REA Node requirement: PASS (not proof that REA is installed)\n'
  else
    printf 'REA Node requirement: BLOCKED or node unavailable; use a documented supported patch release\n'
  fi
  printf 'Network/installation: NOT ATTEMPTED\n'
}

install_remaster() {
  [[ "$(uname -s)" == 'Darwin' ]] || { printf 'BLOCKED: --install-remaster requires macOS\n' >&2; exit 2; }
  command -v git >/dev/null 2>&1 && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 || { printf 'BLOCKED: git, node, and npm required\n' >&2; exit 2; }
  node -e 'const major=Number(process.versions.node.split(".")[0]);process.exit(major>=18?0:1)' || { printf 'BLOCKED: Remaster requires Node >=18\n' >&2; exit 2; }
  git -C "$REPO_DIR" rev-parse --show-toplevel >/dev/null 2>&1 || { printf 'BLOCKED: run from a Git checkout\n' >&2; exit 2; }
  origin="$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || true)"
  [[ "$origin" == *'andylitvinov-design/books'* ]] || { printf 'BLOCKED: wrong Git repository origin\n' >&2; exit 2; }
  if [[ -e "$SKILL_DIR" ]]; then
    if [[ -f "$SKILL_DIR/SKILL.md" ]] && grep -q '^# Remaster' "$SKILL_DIR/SKILL.md"; then
      printf 'PASS: Remaster already present. Not overwriting. Restart Codex to reload if needed.\n'
      return 0
    fi
    printf 'BLOCKED: another skill exists at %s; will not overwrite\n' "$SKILL_DIR" >&2
    exit 2
  fi

  # Fail closed unless an independent supply-chain review provides an immutable SRI.
  # Never fill this variable automatically using npm view in the same command.
  approved_sri="${HH_REMASTER_APPROVED_SHA512:-}"
  if [[ ! "$approved_sri" =~ ^sha512-[A-Za-z0-9+/]{86}==$ ]]; then
    printf 'BLOCKED: set HH_REMASTER_APPROVED_SHA512 to the independently reviewed npm tarball SHA-512 (SRI); do not copy it blindly from current registry metadata.\\n' >&2
    exit 2
  fi

  # Metadata check does not execute package code. Version MUST be literal/pinned.
  # Avoid install scripts of ALL dependencies, including future transitive additions.
  printf 'Checking pinned npm registry metadata (%s)...\n' "$REMASTER_PKG"
  meta="$(npm view "$REMASTER_PKG" --json)" || { printf 'BLOCKED: npm registry unavailable\n' >&2; exit 2; }
  printf '%s' "$meta" | HH_REMASTER_APPROVED_SHA512="$approved_sri" node -e '
    let raw=""; process.stdin.setEncoding("utf8");process.stdin.on("data",x=>raw+=x);
    process.stdin.on("end",()=>{
      let p;try{p=JSON.parse(raw)}catch{process.exit(2)}
      const repo=(typeof p.repository==="string"?p.repository:p.repository?.url)||"";
      const lifecycle=["preinstall","install","postinstall","prepare","prepublish","prepublishOnly"];
      const scripts=p.scripts||{};
      const safe=p.name==="@thenavidm/remaster" && p.version==="0.2.1" && p.license==="Apache-2.0" &&
        repo.includes("github.com/thenavidm/remaster") && p.dist?.integrity===process.env.HH_REMASTER_APPROVED_SHA512 &&
        !lifecycle.some(k=>Boolean(scripts[k])) && Object.keys(p.dependencies||{}).length===0;
      if(!safe){console.error("BLOCKED: release identity/SRI/dependencies/install scripts differ from independent security approval");process.exit(2)}
      console.log("PASS: exact approved SRI, pinned publisher metadata, Apache-2.0, zero dependencies, no lifecycle scripts");
      console.log("Registry integrity: "+p.dist.integrity);
    });'

  printf 'Staging Codex skill in an empty temporary working directory with a scrubbed environment.\n'
  sandbox="$(mktemp -d "${TMPDIR:-/tmp}/hh-remaster.XXXXXXXX")"
  # Cleanup on both success and failure; sandbox is an owned mktemp directory only.
  trap '[[ -z "${sandbox:-}" ]] || rm -rf -- "$sandbox"' EXIT
  mkdir -p "$sandbox/home" "$sandbox/work" "$sandbox/npm-cache"
  (
    cd "$sandbox/work"
    env -i HOME="$sandbox/home" PATH="$PATH" TMPDIR="$sandbox" npm_config_cache="$sandbox/npm-cache" npm_config_ignore_scripts=true \
      npm exec --yes --package="$REMASTER_PKG" -- remaster install --agent codex --project
  )
  src="$sandbox/work/.agents/skills/clone"
  [[ -f "$src/SKILL.md" ]] && grep -q '^# Remaster' "$src/SKILL.md" || {
    printf 'FAIL: staged vendor skill not found/mismatched\n' >&2; exit 2;
  }
  mkdir -p "$REPO_DIR/.agents/skills"
  # npm's Node process resolves macOS /var through /private/var. Canonicalize
  # both paths before rewriting the vendor-installed absolute skill path.
  src="$(cd "$(dirname "$src")" && pwd -P)/$(basename "$src")"
  SKILL_DIR="$(cd "$REPO_DIR/.agents/skills" && pwd -P)/clone"
  cp -R "$src" "$SKILL_DIR"
  # Remaster substitutes the absolute skill path in SKILL.md at install time.
  # Rewrite that one path to our project directory after copying.
  REMASTER_SRC="$src" REMASTER_DEST="$SKILL_DIR" node -e '
    const fs=require("node:fs");
    const p=process.env.REMASTER_DEST+"/SKILL.md";
    const value=fs.readFileSync(p,"utf8");
    fs.writeFileSync(p,value.replaceAll(process.env.REMASTER_SRC,process.env.REMASTER_DEST));
  '
  [[ -f "$SKILL_DIR/SKILL.md" ]] && grep -q '^# Remaster' "$SKILL_DIR/SKILL.md" || {
    printf 'FAIL: skill not installed or mismatched\n' >&2; exit 2;
  }
  # Local-only ignore. Do not commit vendored skill files or modify the repository .gitignore.
  git_exclude="$(cd "$REPO_DIR" && git rev-parse --git-path info/exclude)"
  [[ "$git_exclude" == /* ]] || git_exclude="$REPO_DIR/$git_exclude"
  mkdir -p "$(dirname "$git_exclude")"
  touch "$git_exclude"
  if ! grep -qFx '/.agents/skills/clone/' "$git_exclude"; then
    printf '\n/.agents/skills/clone/\n' >> "$git_exclude"
  fi
  printf 'PASS: Remaster %s skill installed project-only. Restart Codex; invoke $clone in a new session.\n' "$REMASTER_VERSION"
  printf 'Uninstall: from project root, npm_config_ignore_scripts=true npm exec --yes --package=%s -- remaster install --agent codex --project --remove\n' "$REMASTER_PKG"
}

rea_plan() {
  printf 'REA %s: NOT INSTALLED by this script; native engines and MCP remain opt-in.\n' "$REA_VERSION"
  if node_compatible_rea; then
    printf 'Node patch requirement: PASS\n'
  else
    printf 'Node patch requirement: BLOCKED (22>=22.23.4 or 24>=24.22.1 or 26>=26.12.1).\n'
  fi
  printf 'Only AFTER separate supply-chain approval, consider:\n'
  printf '  npx --yes rea-agents@%s doctor --client codex --json\n' "$REA_VERSION"
  printf '  npx --yes rea-agents@%s setup --client codex --dry-run --json\n' "$REA_VERSION"
  printf 'Do not apply MCP setup or install Hopper/Ghidra/IDA without separate review.\n'
}

case "${1:---check}" in
  --check) check ;;
  --install-remaster) install_remaster ;;
  --rea-plan) rea_plan ;;
  -h|--help) usage ;;
  *) usage >&2; exit 2 ;;
esac
