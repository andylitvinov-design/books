# Video Studio feature lab — ready-to-run (Canva documentation reference)

This is a **first-party Holistic House implementation planning tool**, not a Canva scraper, Canva editor automation, or a source-code copy tool. The referenced Canva Help Center articles are used only as public product descriptions. Canva's terms restrict benchmarking for competition, service/API reverse engineering, scraping, and code/asset extraction. **Never navigate Canva with Remaster/Playwright for competitor research without explicit permissions**.

## Current prerequisites (independently verified 26–31 Oct 2026)

- `@thenavidm/remaster@0.2.1` was installed and started by local Codex on an isolated Mac checkout 26 Oct. This is historical evidence, not proof today's Mac is connected.
- On Mac Playwright Chromium/WebKit binary downloads succeeded; restricted process sandbox blocked *browser launching*. This is not a site failure.
- `rea-agents@6.8.0` has not been installed; it is not required for independently implementing video workflows.
- Desktop Commander Remote is exhausted and the Mac is offline in the remote-device dashboard. GitHub CI execution does not depend on the Mac or this quota.

## Run without network, logins, additional packages, or Mac

From a checked-out `andylitvinov-design/books` on the working production-source branch `codex/public-book-library`:

```bash
node --test tools/video-feature-lab/run.test.mjs
node tools/video-feature-lab/run.mjs
node tools/video-feature-lab/run.mjs --json
```

The result separates **own source path exists** from **working feature**. None of the features is marked implemented, browser-tested, exported, or LIVE solely by static inspection.

## Remaster execution independent of the Mac

The narrowly scoped GitHub Action `HH Video Studio feature lab (official docs, no competitor access)` has a `workflow_dispatch` option and a path-filtered PR trigger. It checks an independently audited, pinned Remaster 0.2.1 npm integrity hash, installs into `$RUNNER_TEMP`, and runs:

```bash
HH_REMASTER_BIN="$RUNNER_TEMP/hh-video-remaster/node_modules/.bin/remaster" \
  node tools/video-feature-lab/run.mjs --remaster
```

It initializes Remaster in **feature mode for our own site**, records three Help Center links as citations, and invokes the real Remaster source/feature/parity gates. Missing independent implementation and E2E evidence must produce `not shippable`. The runner intentionally makes **zero requests to Canva**, uses no account/browser cookies/tokens, does not invoke any paid video provider or build Next.js, and only uploads the anonymous JSON result with short retention.

## Local Mac first-party UX diagnosis

```bash
bash scripts/benchmarking/mac-codex-research-tools.sh --check
```

If Remaster is present, open a **new** Codex session and use its `$clone` skill in `feature` mode **only against our own video page** to improve the established Auto Director → selected scenes → preview → independent MP4 export user journey. Do not run unauthorized browser or terminal work in the OS-restricted sandbox. Work in a separate clean worktree, no `.env`/client credentials, and commit only original code and a small PR. Existing on-demand first-party Playwright browser CI is the fallback; it does not prove actual mobile browser export.

## Delivery priorities

1. **P0:** user wish → changing local/AI-consented prompt → actual available scenes → working downloadable video; probe downloaded video streams and duration and test actual iPhone behavior.
2. **P0:** independently enabled voice/music/caption overlays in the actual export, not just in preview; keep EN/RU/ES content matched.
3. **P1:** optionally expose timeline/trim/transition/audio waveforms *after* the one-confirmation Auto Director works. The advanced editor must not become the primary path.

No Canva branding, assets, proprietary API, user content, or binary inspection is part of this work.
