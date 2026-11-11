# Holistic House — Mac / Codex reverse-engineering research toolchain

**2026-10-26 · G0 / BENCH-01 · STATUS: PARTIALLY MAC-VERIFIED; NO PRODUCTION CHANGE**
Related: [program #2058](https://github.com/andylitvinov-design/books/issues/2058), specification [PR #2060](https://github.com/andylitvinov-design/books/pull/2060), merged source-matrix [PR #2065](https://github.com/andylitvinov-design/books/pull/2065). These PRs are distinct; do not overwrite their specs. Production branch: `codex/public-book-library`, NOT `codex/bootstrap-books`.

## What is prepared vs verified

- **Remaster audit and install (PASS):** local macOS audit downloaded the published `@thenavidm/remaster@0.2.1` tarball without lifecycle execution. Its independently calculated SHA-512 SRI was `sha512-5spbVptne6xnojsUzdsRV/pMubuakCR1KofcKNTMshWK0SsiqrjY3hrdYMjBsemny22DDJeWOtvGhnsmJ885Dw==`, exactly matching registry metadata. The 139.4 kB tarball contains 77 files, is Apache-2.0, has zero direct/optional/peer/bundled dependencies and no `preinstall`/`install`/`postinstall`/`prepare` lifecycle script. `npm run check` passed and static review covered the installer, entrypoint, browser/network helpers and clean-room policy. The upstream GitHub `gitHead` is `10a59350a132d847df3d4568bb1f1e23f049e146` (GitHub reports it unsigned); npm registry signatures were present, but that GitHub signature status is recorded as provenance context, not proof of compromise.
- **Project-only Remaster (PASS):** with Node `v22.22.3`, npm `10.9.8`, Git `2.50.1`, and Codex CLI `0.164.0`, the fail-closed installer accepted only the exact reviewed SRI and installed `clone` into an isolated PR checkout. A fresh ephemeral Codex session invoked `$clone`, reported version `0.2.1`, and correctly stated the clean-room prohibition on reading target code. The installer now canonicalizes macOS `/var` and `/private/var` paths before rewriting `SKILL.md`; `tests/mac-codex-research-tools.test.mjs` reproduces that case without network and passes.
- **REA (BLOCKED; not installed):** `rea-agents@6.8.0` tarball SRI matched `sha512-9QDeRnGqEDzABZyr04eLnBXBv/c6I9/TWu/6M0MD4pEfkySI/BIgwTODIbAReX3C1x6hjw9+Jlx4A2yUSPZ9ww==`; it is MIT, 2,398 files / 49.3 MB unpacked, has 23 direct dependencies plus optional `frida`, and declares `prepare`/`prepack`. Its Node engine is `^22.23.4 || ^24.22.1 || >=26.12.1`; the local `v22.22.3` fails it. No REA command, MCP registration, Hopper, Ghidra, IDA, or external-code analysis was run.
- **Playwright browsers installed, local launch BLOCKED:** after deleting only a temporary audit cache, the isolated Mac environment downloaded Chromium/Chrome for Testing 155 and WebKit 26.6 (863 MiB combined). Direct Chromium launch failed before navigation with `MachPortRendezvousServer: Permission denied`; WebKit failed with `Abort trap: 6`. This is a macOS execution-sandbox process restriction, **not** a site failure. No Mac browser page opened; see issue #2058 comments `6408432306` / `6408470472`. A separate *read-only public* Chromium/WebKit smoke has now been authored for **GitHub Actions** (see next section); it does not prove Remaster itself can launch on the Mac.
- **NOT VERIFIED:** local Chromium/WebKit navigation from the constrained Mac shell, Remaster-driven browser research, REA doctor/MCP registration, competitor UI inspection, and any real CRM/payment client E2E. The remote Desktop Commander connection is separately OFFLINE (does not contradict the prior authorized local Mac shell run). Vercel `READY` for the currently deployed site is independently checked, **not** for this unmerged PR.

## Runbook on an authorized Mac, inside the HH repository

This run used a local macOS process; it did not verify Desktop Commander remote status. Remote-device verification is independent from GitHub permissions and is not needed for an already-local shell.

The script exists on branch `chore/hh-mac-codex-research-toolchain-20261025` (PR #2066). It is **not** present in a normal production checkout until that PR is merged. To test before merge, use a separate clean worktree or explicitly check out that branch; do not overwrite an active local working tree.

```bash
cd /Users/andriilitvinov/projects/books  # adjust if checkout moved
bash scripts/benchmarking/mac-codex-research-tools.sh --check
# Codex/supply-chain reviewer must first independently validate the exact
# npm release tarball and compare it to the official tagged source.
# Only then provide the reviewed SHA512 SRI through a local environment variable.
: "${HH_REMASTER_APPROVED_SHA512:?BLOCKED: supply-chain approval/SRI missing}"
bash scripts/benchmarking/mac-codex-research-tools.sh --install-remaster
bash scripts/benchmarking/mac-codex-research-tools.sh --check
bash scripts/benchmarking/mac-codex-research-tools.sh --rea-plan
```

Run only on the Mac; the `--install-remaster` mode intentionally refuses non-macOS, wrong repository, old Node, an untrusted release metadata set or a non-Remaster `clone` skill. Existing Remaster is not overwritten. `--check` is offline, read-only, never executes `npx` or silently installs packages. The explicit install **refuses to run without an independently approved SRI**, compares it by exact equality to the pinned npm metadata and uses `npm exec` only after that gate, in a private temporary working directory with scrubbed environment variables; it then copies the staged skill and rewrites its absolute reference. This reduces accidental access to project secrets but **is not an OS sandbox**: package code still has the user's filesystem permissions. Run without elevated privileges. To make the boundary stronger, use a distinct OS user and a clean Git worktree without `.env*`/private docs.

Restart Codex after install. In the new session, verify the `clone` skill is available before attempting any research. Use `feature` mode only for an **authorized public UX flow**, ideally `https://holistichouse.vercel.app/en/services/free-situation-review` first. Use a clean browser context, no login/cookies, no automated competitor sign-up or scraping, and no PII/health information. Record an actual dated, viewport-specific smoke test rather than claiming it from CLI installation alone. Separate analysis and implementation; no third-party code/assets/brand extraction. Any Playwright browser download must be explicitly justified and kept outside Vercel build.

**Rollback:** from the same isolated checkout, run `npm_config_ignore_scripts=true npm exec --yes --package=@thenavidm/remaster@0.2.1 -- remaster install --agent codex --project --remove`. Only the project Remaster skill is removed; `.git/info/exclude` is local and can be cleaned manually. Do not run a global `npm install` in the production app. Changes to `codex/public-book-library` do NOT install tools on the user's Mac or every Codex Cloud environment.

## Acceptance matrix (update with evidence, not guesses)

| Check | Current | Required proof |
|---|---|---|
| Vendor source / pin | PASS | Independently calculated tarball SRI exactly matched `HH_REMASTER_APPROVED_SHA512`; source/lifecycle/dependency audit recorded above |
| Local Mac / tools | PASS | Darwin, Node `v22.22.3`, npm `10.9.8`, Git `2.50.1`, Codex `0.164.0` read back locally |
| Project skill | PASS | Installed project-only, staging-path regression test passes, fresh Codex `$clone` response read back |
| Mac browser smoke | BLOCKED | Browser binaries downloaded successfully; process launch denied by the macOS execution sandbox before first navigation |
| CI public browser smoke | PENDING CI | New GitHub Actions job on permitted Linux runner: guest-only Chromium/WebKit × EN/RU/ES × 320/375/390/430; no POST, no third-party requests, no secrets or form submission |
| REA | BLOCKED | Node engine mismatch and large dependency/native-tool surface; no doctor/dry-run/MCP registration |
| Application E2E | NOT RUN | Independent HH app/CRM/provider flow if a product change follows |
| Live deployment | NOT CHANGED | No production SHA or Vercel READY claim for local setup |

## Alternative browser execution (no Mac sandbox bypass)

Rather than weaken macOS restrictions, `.github/workflows/hh-benchmark-public-browser.yml` runs a **separate** Playwright smoke job in an authorized, disposable GitHub-hosted Ubuntu environment. It is scoped to changes in the workflow or its script; it is not run for unrelated production commits. `scripts/benchmarking/public-browser-smoke.mjs` uses first-party, read-only GET requests against the existing `https://holistichouse.vercel.app` public pages. Network routing aborts POST/PUT/PATCH/DELETE requests and all off-site requests; browsers get empty cookie/storage and no private-account access. It checks a visible test CTA, no forced contact capture, its target route, touch size and horizontal overflow, and follows a public test-explorer navigation without answering any questions. Results are in the CI artifact `hh-benchmark-public-browser-results` and use `PASS/FAIL` only after runner execution.

**Evidence boundary:** this verifies actual public website behavior from Linux-headless **mobile emulation**. It is not a physical iPhone, not a macOS browser test, does not validate Remaster browser launching, does not access a logged-in client account, and is not an independent provider/CRM/payment E2E. If CI fails, report the exact failing engine/locale/viewport and repair the actual defect or adjust only a provably invalid test. Mac launch remains separately BLOCKED; do not disable SIP/sandbox restrictions or use unrestricted Codex access to bypass them.

## References

- Remaster: https://github.com/thenavidm/remaster (README, `package.json`, `PRIVACY.md`, `SECURITY.md`, `skills/clone/scripts/commands/install.mjs`).
- REA: https://github.com/morluto/rea/blob/main/docs/installation.md and https://www.npmjs.com/package/rea-agents.
- Original project program: docs/benchmarking/HOLISTIC_HOUSE_REVERSE_ENGINEERING_PROGRAM_V1_20261025.md in PR #2060.
