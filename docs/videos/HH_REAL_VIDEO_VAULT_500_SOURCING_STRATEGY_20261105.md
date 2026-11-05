# HH Real Video Vault 500 — progressive legal sourcing, research intake (2026-11-05)

## Do not conflate inventory layers

- **732 MP4 catalogue entries** as observed on 5 November: 48 licensed/previously approved filmed/composed clips and 684 procedural animations.
- 48 is an upper bound for already-published individual camera masters, **not 48 independently reviewed originals**. Strict physical/local audit and R2 HEAD/GET/SHA are separate.
- PR #3575 has 25 researched Dareful source pages, 15 technical passes and nine editorial shortlisted sources. Until approved, imported and verified, these increase **zero** countable R2/production masters. Portrait crop from a landscape film is not a native portrait original.
- The read-only research planner below never outputs generator-eligible true and never downloads copyrighted MP4/HLS media.

## Priority: cover missing stories, not just abstract scenic footage

| Category | Target independently filmed | Early source emphasis |
|---|---:|---|
| people/emotions/meditation | 100 | first-party, creator grants; check model release |
| relationships/family | 50 | creator grants; check all depicted people |
| work/city/achievement | 50 | creators, releases, logos, property |
| heritage/temple/power places | 75 | Wikimedia Commons individually checked CC0/CC BY; cultural and property rights |
| water/rain/sea | 100 | Dareful; Mixkit Free per clip |
| nature/forest/light | 125 | Dareful; first-party/Commons/Mixkit Free |

Native source orientation: **300 landscape 16:9** and **200 portrait 9:16**, no double-count for derivative crops; video generator default remains 16:9.

## Research-only source planner (no CI/cron)

Use locally saved source metadata from the existing research queue or draft PR #3575; the script makes **no network request**:

```sh
node scripts/plan-video-vault-sourcing.mjs --input=/private/authorized-candidates.json --json
node scripts/plan-video-vault-sourcing.mjs --input=/private/authorized-candidates.json --csv > /private/research-queue.csv
node --test tests/video-vault-sourcing-queue.test.mjs
```

Input must be a JSON array or object with `sources`, `candidates`, or `rows` array. Example:

```json
{"sources":[{"id":"source-camera-001","provider":"dareful","sourcePage":"https://dareful.com/river-forest-landscape/","visualTags":["river","forest"],"durationSeconds":41}]}
```

The planner verifies source-page shape and provider hostname; removes duplicate canonical pages and source IDs; classifies research candidates conservatively by visible tags (not aspirational `suggestedTheme`); treats native aspect as **unknown** unless explicitly verified; and prioritizes people/relationships/work/heritage before water/nature. `researchCandidates` never means approved footage. Output deliberately omits stream URLs/credentials and does not accept publication booleans as proof.

The script is a **planning aid**, not a licence adjudicator: its source-category suggestions require video review. It does not scrape sources, download/redistribute clips, verify Cloudflare credentials or access DB/R2. The existing trusted importer and physical audit stay sole gatekeepers.

## Weekly handoff and staged acquisition

1. Curate 40–60 research URLs/source IDs per editorial week, tagged with original provider and category, no prohibited systematic copying.
2. Validate rights for each source. Dareful: CC BY 4.0 attribution + adapted notice; Commons: specific file licence, author, date/source; Mixkit: **Stock Video Free** only. Pexels/Pixabay: no systematic bulk download absent explicit permission; retain links as unapproved candidates. Separate identifiable subject/model/property releases.
3. Download only by a permitted operator-controlled channel. Human-watch actual motion, not posters alone; verify native aspect and 1080p original detail, 5–15s useful trim, 4/5 beauty, composition, semantic object match and no logo/watermark.
4. Use original source identity, raw+normalized SHA256, frame-based near-duplicate review. One source/crop family increments **one** count when fully eligible.
5. Only after R2 account-wide monthly usage and billing/free headroom checked, private bucket/credentials verified, and explicit per-file approval, run existing `scripts/import-scenario-video-batch.mjs --target=r2 --dry-run` → `--apply`. Cap ≤20 per batch; verify physical PUT+HEAD+GET SHA and Supabase row before enabling client selection.
6. Verify iPhone Safari and Chromium preview/export of four distinct videos, correct 16:9/9:16, audio duration, signed URL/Range/CORS and accurate attribution; exact production SHA independent of CI/merge.

**Milestones (not promised deadlines):** 20 unique approved + actual mobile demo → 100 diversified → 250 meaning/scene coverage → 500 independently filmed and LIVE verified. A sustained intake of 12–20 accepted clips/week would require roughly 25–42 weeks from zero, depending on rights, artist review time and acquisition source availability. Never reduce rights/beauty gates to meet dates.

## Why not add another hourly service

Reuse current `scripts/import-scenario-video-batch.mjs`, `scripts/video-vault-ingest.mjs`, `scripts/audit-mytube-filmed500.mjs`, Supabase `app.video_vault_assets_v1` and current Auto Video Director. The film library is an editorial/provenance asset ledger, not another stock-media API or independent video product. No new provider subscription, worker, paid automation or per-video pull request is required.

- Project source of truth: [HH VIDEO VAULT 500 full implementation spec](https://docs.google.com/document/d/1TwOGKqhkk-3dFOgShyXVPXXd2o4hJ06X4kaSwFn5JKk/edit)
- Existing release tracker: [Issue #3586](https://github.com/andylitvinov-design/books/issues/3586)
- Candidate screening: [PR #3575](https://github.com/andylitvinov-design/books/pull/3575)
- Internal loop fix: [PR #3597](https://github.com/andylitvinov-design/books/pull/3597)
- Source policies: [Dareful](https://dareful.com/about-dareful-completely-free-4k-stock-video/), [Pexels terms](https://help.pexels.com/hc/en-us/articles/900005880463-What-are-the-Terms-and-Conditions), [Mixkit Free vs Restricted](https://mixkit.co/free-stock-video/), [Wikimedia Commons](https://wikimediafoundation.org/what-we-do/wikimedia-projects/commons/), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

**Cost gate as of 5 November:** The six `HH_VIDEO_VAULT_R2_*` *environment-variable names* are present in Vercel Production (values not read). Bucket access, provider billing headroom, R2 objects and rights remain unverified; no R2 PUT or generator activation is authorized by the existence of these names.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=focused_unit; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
