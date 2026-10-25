# Holistic House — Mac / Codex reverse-engineering research toolchain

**2026-10-25 · G0 / BENCH-01 · STATUS: SETUP PREPARED; NOT MAC-VERIFIED**  
Related: [program #2058](https://github.com/andylitvinov-design/books/issues/2058), specification [PR #2060](https://github.com/andylitvinov-design/books/pull/2060), separate source-matrix [PR #2061](https://github.com/andylitvinov-design/books/pull/2061). These PRs are distinct; do not overwrite their specs. Production branch: `codex/public-book-library`, NOT `codex/bootstrap-books`.

## What is prepared vs verified

- **Prepared:** safe-default bash preflight/installer `scripts/benchmarking/mac-codex-research-tools.sh`, with explicit `--install-remaster`, pinned vendor identity, registry metadata gate (npm release/version/license/repo, sha512 integrity, zero runtime deps, no lifecycle scripts), `npm_config_ignore_scripts=true`, project-only install to `.agents/skills/clone`, local-only Git exclude, and readback verification. It never edits site runtime, `package.json`, CRM, payment, DB, or CI.
- **Review evidence:** Remaster official source `thenavidm/remaster` / npm `@thenavidm/remaster@0.2.1`, Apache-2.0, Node >=18. Upstream `package.json` (2026-10-04) declares zero dependencies and no install scripts. Its `install --agent codex --project` copies one skill into project-local `.agents/skills/clone`, will not overwrite another skill, and prints a restart instruction. Maintainer privacy claims are not an independent audit; treat target pages and generated instructions as untrusted.
- **REA:** `morluto/rea` / `rea-agents@6.8.0`, MIT, new release with many dependencies. **Disabled**, not automatically installed or registered. Current official release docs demand exact Node patch: 22.23.4+, 24.22.1+, 26.12.1+; do not extrapolate `node >=22`. `--rea-plan` only prints the pinned doctor/dry-run commands. Any actual MCP/Hopper/IDA/Ghidra configuration requires separate vetted permissions and scope.
- **NOT VERIFIED:** local Mac agent connection, Mac OS/Node versions, actual npm pack integrity, any Codex skill discovery, Playwright browser launch, REA doctor/MCP registration, competition research, Vercel READY/SHA, live user flow.

## Runbook on an authorized Mac, inside the HH repository

Before touching tooling, ensure Desktop Commander appears **Online** at https://mcp.desktopcommander.app/ (macOS agent running, same account; an awake Mac alone does not connect a remote session). Remote-device verification is independent from GitHub permissions.

The script exists on branch `chore/hh-mac-codex-research-toolchain-20261025` (PR #2066). It is **not** present in a normal production checkout until that PR is merged. To test before merge, use a separate clean worktree or explicitly check out that branch; do not overwrite an active local working tree.

```bash
cd /Users/andriilitvinov/projects/books  # adjust if checkout moved
bash scripts/benchmarking/mac-codex-research-tools.sh --check
# After reviewing stdout & the currently pinned registry package:
bash scripts/benchmarking/mac-codex-research-tools.sh --install-remaster
bash scripts/benchmarking/mac-codex-research-tools.sh --check
bash scripts/benchmarking/mac-codex-research-tools.sh --rea-plan
```

Run only on the Mac; the `--install-remaster` mode intentionally refuses non-macOS, wrong repository, old Node, an untrusted release metadata set or a non-Remaster `clone` skill. Existing Remaster is not overwritten. `--check` is offline, read-only, never executes `npx` or silently installs packages. The explicit install uses `npm exec` only after the registry gate; package code has host permissions, so run without elevated privileges and without sensitive files/credentials in the study workspace. To make the boundary stronger, use a distinct OS user and a clean Git worktree without `.env*`/private docs.

Restart Codex after install. In the new session, verify the `clone` skill is available before attempting any research. Use `feature` mode only for an **authorized public UX flow**, ideally `https://holistichouse.vercel.app/en/services/free-situation-review` first. Use a clean browser context, no login/cookies, no automated competitor sign-up or scraping, and no PII/health information. Record an actual dated, viewport-specific smoke test rather than claiming it from CLI installation alone. Separate analysis and implementation; no third-party code/assets/brand extraction. Any Playwright browser download must be explicitly justified and kept outside Vercel build.

**Rollback:** run the exact `remaster install --agent codex --project --remove` command printed by script from the same checkout. Only the Remaster skill is removed; `.git/info/exclude` is local and can be cleaned manually. Do not run a global `npm install` in the production app. Changes to `codex/public-book-library` do NOT install tools on the user's Mac or every Codex Cloud environment.

## Acceptance matrix (update with evidence, not guesses)

| Check | Current | Required proof |
|---|---|---|
| Vendor source / pin | PARTIAL | Registry integrity recorded from Mac and vetted installed package |
| Mac connection | BLOCKED | Desktop Commander shows Online and remote shell responds |
| Project skill | BLOCKED | SKILL.md readback plus fresh Codex session lists skill |
| Browser smoke test | NOT RUN | Authorized page opens in isolated Playwright Chromium/WebKit with screenshots withheld from public Git |
| REA | DISABLED | Separate security pass, scoped doctor/dry-run, no native engines without approval |
| Application E2E | NOT RUN | Independent HH app/CRM/provider flow if a product change follows |
| Live deployment | NOT CHANGED | No production SHA or Vercel READY claim for local setup |

## References

- Remaster: https://github.com/thenavidm/remaster (README, `package.json`, `PRIVACY.md`, `SECURITY.md`, `skills/clone/scripts/commands/install.mjs`).
- REA: https://github.com/morluto/rea/blob/main/docs/installation.md and https://www.npmjs.com/package/rea-agents.
- Original project program: docs/benchmarking/HOLISTIC_HOUSE_REVERSE_ENGINEERING_PROGRAM_V1_20261025.md in PR #2060.
