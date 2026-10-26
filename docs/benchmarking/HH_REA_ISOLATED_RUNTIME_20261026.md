# Holistic House — REA 6.8.0 isolated runtime remediation

**Date:** 2026-10-26 · **Track:** G0 / BENCH-01 · **Status:** validation in progress, not a Mac REA installation.  
**Program:** https://github.com/andylitvinov-design/books/issues/2058  
**Already delivered:** Remaster / Playwright PR #2066, merged SHA `e573c8b535fc8c44f4c935c0ea6c3fccaa3659b5`, targeted browser 24/24 PASS in GH Actions #40272500985.

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

Use an existing, reputable version manager, if one is already present. Example with nvm, without changing the machine default Node:

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
| Local Mac doctor | **NOT VERIFIED** until independently performed on macOS |
| Actual MCP | **DISABLED** until scoped registration and new-session tool discovery |
| Public competitor UX research | Use existing Remaster + Playwright clean-room process, **not** REA binary analysis |
| Production | No app code/DB/API/payments/analytics changes; nothing to deploy or promote |

For the first authorized UX observation, compare public, non-account flows only: current Holistic House test landing to its own guest explorer and the **public** Truity/16Personalities free-entry pattern already referenced in the source matrix. PR #2067 previously implemented the guest-first CTA; measure current behavior rather than duplicating that fix. Keep evidence labelled `PUBLIC_DOCS` unless independently observed in browser. Never copy proprietary content/assets or assert a conversion lift without measurement.

## References

- Official REA: https://github.com/morluto/rea/tree/rea-agents-6.8.0 ; https://github.com/morluto/rea/blob/main/docs/installation.md
- Node.js 22.23.4: https://nodejs.org/en/download/archive/v22.23.4
- Existing source/evidence ledger: `data/benchmarking/reference-patterns.json` and issue #2058.
