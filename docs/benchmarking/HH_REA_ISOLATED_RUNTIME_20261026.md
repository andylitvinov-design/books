# Holistic House — REA 6.8.0 isolated runtime remediation

**Date:** 2026-10-26 · **Track:** G0 / BENCH-01 · **Status:** CI PASS; local Mac experimental MCP validated, but binaries removed after critical disk exhaustion, so REA currently NOT LAUNCHABLE.  
**Program:** https://github.com/andylitvinov-design/books/issues/2058  
**Already delivered:** Remaster / Playwright PR #2066, merged SHA `e573c8b535fc8c44f4c935c0ea6c3fccaa3659b5`, targeted browser 24/24 PASS in GH Actions #40272500985.

## Actual macOS evidence (26 October 2026)

- Desktop Commander `MacBook-Air-Andrii-3.local` connected successfully. The original checkout `~/projects/books` had local changes; **untouched**.
- Existing global Node `v22.22.3` remained unchanged. Official portable `node-v22.23.4-darwin-arm64.tar.xz` downloaded from nodejs.org and verified against the official HTTPS SHA256 manifest and pinned digest (detached PGP signature verification was not performed) `037650d0839f457747396f052073fb48333d31bf5abd3c98b74da20d89ebb1ad`. Extracted into an isolated private research folder; Node reported `v22.23.4`. Node readiness tests: **3/3 PASS**; `bash -n` PASS.
- The *actual npm tarball* for `rea-agents@6.8.0` independently matched the pinned SHA-512 SRI above. A private, zero-secret npm workspace installed 149 dependencies with `--ignore-scripts --omit=optional`; Frida and all provider engines were omitted. REA CLI v6.8.0 returned a structured result; Codex dry-run returned `status=planned`, with **no actual config write**.
- In a separate experimental `CODEX_HOME`, an explicit REA MCP registration (not `~/.codex`) returned `setup status=ready`. `rea doctor --client codex --json` returned `healthy=true`, checks `node=PASS` and `registration:codex=PASS`; `codex mcp list --json` showed `rea` enabled. The production stdio adapter `rea mcp doctor --json` returned **HEALTHY**, **229/229 tools**, **6/6 prompts**, matching catalogue digest, and a target-free `binary_session` call **PASS**. This is a real MCP handshake and tool-discovery test; it is **not** a model-driven Codex tool call or an analysis of a private application.
- The experimental Codex profile is *not* logged in; its ordinary Codex agent session therefore still requires the owner's separate sign-in. No credentials or existing `~/.codex` contents were copied.
- **Critical disk blocker:** other builds consumed nearly all Mac space: observed free space fell from ~8 GiB to 121 MiB, with multiple unrelated npm builds still running. To protect active user work, **only our own** portable Node runtime (187 MiB) and REA package installation (156 MiB) were deleted. The experimental profile's configuration, evidence JSON, and launcher metadata remain under `$HOME/.local/share/holistic-house-research/rea-6.8.0`, but cannot launch until the binaries are restored. Global Node and site files were unchanged. Final measured free space after cleanup ~513 MiB, which remains **critical**.
- **GitHub Actions:** isolated REA workflow [run #40332102358](https://github.com/andylitvinov-design/books/actions/runs/40332102358) returned **SUCCESS**. The CI probe deliberately expects an unregistered temporary Codex profile; its `doctor` exit 1/registration `config_drift` is not a successful active MCP registration and must never be labelled healthy. Later Mac tests above performed separate registration and verified actual MCP readiness.

**Restore gate:** free **at least 5 GiB** on Mac and let concurrent builds finish before restoring the disposable binaries.

**Restoration implementation:** `scripts/benchmarking/rea-mac-restore.sh` is a fail-closed one-shot Mac restore script (separate from the disposable CI probe). It demands the existing audited experimental Codex profile and exact absolute binary paths; macOS arm64, >=5 GiB free **and no active npm/Next/Turbo builds**, before any network access. It verifies official Node 22.23.4 arm64 SHA256 and REA 6.8.0 tarball SHA512, installs with `--ignore-scripts --omit=optional` only in its private staging directory, and rechecks disk/build processes before committing into the previously registered research profile. It **never** writes `~/.codex` or site dependencies and requires an actual healthy scoped REA doctor and stdio MCP catalogue (229/229 tools, 6/6 prompts) before announcing success. `--check` makes no changes; use `--restore` only after the space/build gate passes. On Mac a validated, project-independent copy of this script is under `$HOME/.local/share/holistic-house-research/rea-6.8.0/rea-mac-restore.sh` (do not confuse a ready script with restored REA binaries). The latest read-only Mac preflight reported ~3.1 GiB available and an unrelated `npm run build` active: **restore was not run**.

To run in the authorized macOS terminal once disk and builds are safe:

```bash
"$HOME/.local/share/holistic-house-research/rea-6.8.0/rea-mac-restore.sh" --check
"$HOME/.local/share/holistic-house-research/rea-6.8.0/rea-mac-restore.sh" --restore
```

The experimental Codex profile can then be launched through its separate `run-codex-with-rea.sh` wrapper. Model use requires a separate Codex login to that profile; authenticating is not automatically performed by the restore script. Do not delete arbitrary caches, other worktrees, user files, or alter the site's global Node just to enable REA. The preserved experimental config uses an absolute portable Node/REA path, and restoring the package at the same location should restore the verified MCP profile. Re-run `doctor`, MCP stdio `tools/list`, and Codex registration checks. No code from competitors was analyzed.

## Root cause and exact fix

REA `rea-agents@6.8.0` requires Node `^22.23.4 || ^24.22.1 || >=26.12.1`; local Mac Node `v22.22.3` is **not supported**. Official Node 22.23.4 and 24.22.1 were published on 2026-10-21. Use **Node 22.23.4 in an isolated research process**, without changing Holistic House's Node setup or its `package.json`.

REA is a materially different product from Remaster: MIT-licensed 6.8.0 is a ~49 MB unpacked release with extensive transitive dependencies, optional native `frida`, and native providers. A compatible Node version is **necessary but not sufficient** to prove REA and Codex MCP work. The prior independently audited REA tarball SRI from issue #2058 is:
`sha512-9QDeRnGqEDzABZyr04eLnBXBv/c6I9/TWu/6M0MD4pEfkySI/BIgwTODIbAReX3C1x6hjw9+Jlx4A2yUSPZ9ww==`.

## What's new in this change

1. `scripts/benchmarking/rea-node-readiness.mjs`: no-network, no-dependency exact semver check; rejects prereleases and Node 23/25. `--strict` returns nonzero on unsupported Node.
2. `tests/benchmark-rea-node-readiness.test.mjs`: boundary tests, including old Mac Node 22.22.3 and all three supported release floors.
3. `scripts/benchmarking/rea-sandbox-probe.sh`:
   - **Default `--check`:** read-only, no download or shell configuration changes.
   - **Explicit `--probe`:** requires a compatible Node runtime, downloads *only the exact* `rea-agents@6.8.0` tarball into a throwaway workspace, independently calculates SHA-512 and requires exact SRI equality before package code executes. Installs without lifecycle scripts or optional Frida, with a scrubbed environment, no prod secrets and no project dependencies. Runs REA version, `setup --client codex --skill=false --dry-run --json` and `doctor --client codex --json` with a temporary `CODEX_HOME`, refusing any created Codex configuration file.
   - Entire temporary workspace is cleaned afterwards. No Hopper/Ghidra/IDA downloads, no REA MCP registration, no external targets, no production writes. This is an *experimental smoke*, not a security certification of transitive dependencies or an OS security boundary.
4. `.github/workflows/hh-rea-sandbox-probe.yml`: opt-in/scoped PR and manual GitHub runner with `actions/setup-node` exactly 22.23.4; **never** changes production runtime.

## Mac procedure (when an authorized local shell is available)

No nvm/fnm/Volta was found on the observed Mac. The actual successful run used a portable **official Node.js tarball** verified via HTTPS SHASUMS256 and extracted to the isolated folder. On another Mac, an existing reputable version manager is also suitable; the following nvm example must not be run unless nvm is already present:

```bash
# In an isolated clean checkout of andylitvinov-design/books:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
# If nvm isn't already installed, use an approved official Node distribution
# or an already installed version manager; do NOT curl | bash.
nvm install 22.23.4
nvm exec 22.23.4 node -v
nvm exec 22.23.4 bash scripts/benchmarking/rea-sandbox-probe.sh --check
# Only after reviewing the pinned release/transitive package exposure:
nvm exec 22.23.4 bash scripts/benchmarking/rea-sandbox-probe.sh --probe
```

**Do not** `npm install` into the Holistic House app, use `sudo`, change the production Node, run REA setup on all detected agents, or use an unpinned `rea-agents@latest`. Do not enable a native analysis engine as part of this first diagnosis.

If isolated doctor is healthy, next decision is whether **REA is required for a specific own/authorized binary** (e.g., the owned Capacitor client). Run the REA `setup --client codex --skill=false --dry-run` *in an independent Codex profile* and explicitly review paths and changes before enabling MCP. Record an actual new-session REA tool discovery and harmless first-party sample test. No competitor binary/API extraction, no copies of private customer data.

## Acceptance and remaining limits

| Gate | Meaning |
| --- | --- |
| Node patch | `NODE_PASS_ONLY` from checker; **not** installed REA |
| Pinned published tarball | Real downloaded bytes SHA-512 equal independently reviewed SRI |
| Isolated REA CLI | `--version`/`doctor` return structured results, optional native providers may be unavailable |
| Codex sandbox plan | `--dry-run`, no Codex config file created |
| Local Mac doctor | **PASS BEFORE CLEANUP**, now temporarily **BLOCKED_DISK**; require doctor readback again after reinstall |
| Actual MCP | Experimental profile registration **PASS before cleanup** (229/229 tools, 6/6 prompts); now **NOT LAUNCHABLE** until reinstated; normal Codex untouched |
| Public competitor UX research | Use existing Remaster + Playwright clean-room process, **not** REA binary analysis |
| Production | No app code/DB/API/payments/analytics changes; nothing to deploy or promote |

For the first authorized UX observation, compare public, non-account flows only: current Holistic House test landing to its own guest explorer and the **public** Truity/16Personalities free-entry pattern already referenced in the source matrix. PR #2067 previously implemented the guest-first CTA; measure current behavior rather than duplicating that fix. Keep evidence labelled `PUBLIC_DOCS` unless independently observed in browser. Never copy proprietary content/assets or assert a conversion lift without measurement.

## References

- Official REA: https://github.com/morluto/rea/tree/rea-agents-6.8.0 ; https://github.com/morluto/rea/blob/main/docs/installation.md
- Node.js 22.23.4: https://nodejs.org/en/download/archive/v22.23.4
- Existing source/evidence ledger: `data/benchmarking/reference-patterns.json` and issue #2058.
