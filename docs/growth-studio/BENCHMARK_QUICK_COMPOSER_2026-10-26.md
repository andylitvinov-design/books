# Growth Studio — benchmark-informed quick composer (26 October 2026)

Status: **IMPLEMENTED ON FEATURE BRANCH; CI / MERGE / LIVE / SIGNED-IN E2E NOT YET VERIFIED**. Relates to #1214 and #2058. This is one existing-module enhancement, not Publer parity.

## Public source ledger and limitations

| Source | Checked / purpose | Allowed take-away |
| --- | --- | --- |
| [Publer supported channels](https://publer.com/help/en/article/what-social-networks-are-supported-including-how-many-based-on-each-plan-npoun1/) | 26 Oct 2026 · official help page | A multi-network composer must distinguish draft *targets* from connected accounts |
| [Publer platform](https://publer.com/) | 26 Oct 2026 · published product overview | An owner benefits from drafting, a calendar, a queue, bulk posts and review, but these need not all occupy the first screen |
| [Remaster](https://github.com/thenavidm/remaster) | 26 Oct 2026 · publicly documented `feature` mode | Apply one clean-room UX pattern to the existing product, without copying a competitor's code, layout or media |
| [REA setup](https://rea.tools/get-started/) | 26 Oct 2026 · official runtime requirements | REA is not needed for public product research; it is reserved for authorized own/licensed artifacts |

**Evidence boundary (updated 26 Oct):** This improvement is informed by public documentation and current Holistic House source. After the initial PR, **Remaster CLI was actually run on the reconnected owner Mac** in an isolated research folder, with bounded robots-respecting help-page fetch and a manually evidenced feature matrix (details below). **No Remaster browser measurement, screenshot, REA run, proprietary JS extraction, private-account access or conversion lift** is claimed.

## Existing feature inventory, reused not duplicated

`/admin/growth-studio` has server-side owner authorization, EN/RU editor, manual calendar/ICS, CSV/bulk, saved drafts and Redis CAS, public source picker / Content Radar, media URLs, evergreen *reviewable drafts*, platform capability notices, provider readiness, explicit-owner Telegram send with receipt/unknown-state protection, existing YouTube/Metricool handoff. These remain where they are.

Historical [one-link PR #1399](https://github.com/andylitvinov-design/books/pull/1399) remained unmerged and far behind the active production branch. This scoped UX enhancement incorporates its short-first-screen principle into the **current production components**; it does not transplant its obsolete auth/login changes.

## As-is → to-be (one bounded feature)

1. **Before:** on first open, a long provider/connectivity panel, metrics, six tools and all posting fields compete with the primary "create a draft" task. The default post target was Instagram even without permission.
2. **After:** one compact cream-toned task card: **Create draft** and context-only **Saved posts**. Durable draft creation is initially disabled until the existing real owner-only ephemeral Redis roundtrip confirms write/read/update/CAS. Connection details are collapsed, retry remains accessible.
3. **Fast composer:** channel, internal title, public caption. Brand, language, campaign, public media+alt, source picker, proposed time, and collision diagnostics remain under an accessible native **Extra options** disclosure. On editing a saved post, its extra options start open to avoid hiding previously entered data.
4. **Safety:** newly started posts use `manual`, never assume connected Instagram. Editorial `draft`, `approved`, `planned_manual`, unverified `manual_done` and verified `published` meanings unchanged. Telegram still demands separate owner confirmation plus provider rights and receipt.
5. **Mobile:** min 44px primary controls, single column on narrow screens, visible keyboard focus, reduced-motion aware scroll; EN/RU owner UI, original EN/RU/ES public content targeting preserved.

No database schema, storage namespace, external provider/API, privacy flag, OAuth scope, campaign tracking, scheduled delivery, paid AI, subscription or client data changes.

## Validation / release gates

- [ ] New `tests/growth-studio-benchmark-quick-compose.test.mjs` PASS: owner gate, compact-first flow, default manual, real Redis check, no hidden field loss, no fake publication, preserved bulk/calendar/media/evergreen and mobile CSS.
- [ ] Existing `.github/workflows/hh-growth-studio.yml` editorial-security suite PASS on exact PR head.
- [ ] Exact-head Next.js production build PASS.
- [ ] Signed-out GET cannot access private owner editor; keyboard plus 320/375/390/430px Chromium/WebKit browser smoke; signed-in owner saves a draft, reloads and observes same Redis record.
- [ ] Compare PR head against moving `codex/public-book-library`; merge only safe exact head; verify Vercel `READY`, Git SHA and `holistichouse.vercel.app` alias.
- [ ] Provider delivery is still independently unverified; never claim a queued manual task is remotely published. Never cancel Publer until real channel parity.

Rollback: revert the scoped composer JSX, connection callback and CSS changes while keeping existing Redis editorial records untouched. No migrations involved.

## Toolchain follow-up (not a production dependency)

Remaster `@thenavidm/remaster@0.2.1` is SRI-verified and **installed in the separate PR #2111 Mac test worktree**. In a separate disposable research directory, its **`remaster init https://publer.com/ --mode feature` and robots-respecting `remaster crawl --max 1–3` actually executed** and recorded six official public help documents. No interactive competitor login or browser measurement was done. A future mobile benchmark must use authorized, clean browser contexts and original work only.

REA 6.8.0 requires Node 22.23.4+ on Node 22, or Node 24.22.1+, or Node 26.12.1+; previously observed Mac 22.22.3 is unsupported. REA is deferred until a compatible isolated runtime, separate dependency/security approval and a **first-party HH app/SDK analysis target**; it is **not** to reverse engineer Publer's closed code/API or run on Vercel production.


## Actual Mac + Remaster evidence · 2026-10-26

- **Mac connection restored:** Desktop Commander 0.3.1 device Online, independent of Codex process sandbox. Original `~/projects/books` is an unrelated dirty `main` checkout; it was **not modified**. An isolated detached worktree checked out exact PR head `2b1398b71828a72dad32648e4e82b2aba44cadb5` for baseline tests.
- **Tests at that exact prior head:** all 124 of the workflow's Growth Studio owner-editorial/security/Redis/Telegram/CRM-navigation Node cases passed, 0 failed, on macOS ARM64 Node `22.22.3`. A later small follow-up fixes a default callback stability issue and hides expanded header until workspace open; its exact-head rerun is a separate requirement.
- **Remaster authenticity:** installer verified pinned `@thenavidm/remaster@0.2.1`, immutable reviewed SHA-512, publisher metadata, 0 runtime dependencies and no lifecycle install hooks. Installed in an isolated checkout only, not global/production.
- **Actual research:** `remaster init --mode feature`, bounded official-help `remaster crawl` against `publer.com/help/en/article` with robots.txt/rate-limit enforcement, six documented public pages, `remaster status --json`, and a 12-row `remaster parity --json` run. The source ledger is composed solely of first-party published Publer help URLs; no private features inferred.
- **Provisional conservative feature coverage:** **32.8%**, **0/8 must-haves fully done**, verdict **`not shippable` for replacement of Publer**. This is Remaster's weighted score from our manually reviewed source/code classifications, **not a measured conversion rate or actual provider success**. The exact reproducible input is [PUBLER_REMASTER_MATRIX_2026-10-26.csv](./PUBLER_REMASTER_MATRIX_2026-10-26.csv).
- **Research gate is still FAIL:** 6 source pages and 12 feature rows PASS, but zero cited user reviews, no pain-theme analysis, no screen recon or owner-approved verdict. Do not fabricate them or declare full Remaster research complete.
- **REA remains separate:** Mac default Node `22.22.3` and independently discovered `/usr/local/bin/node` `24.14.1` both fail REA 6.8.0's `^22.23.4 || ^24.22.1 || >=26.12.1` engine. No REA setup, native analysis, MCP registration, Hopper/Ghidra/IDA or dependency install was performed; do not modify system-wide Node just for this audit.

### Next measured acceptance

1. Repeat **exact current PR head** Node tests and compile/Next build; inspect CI outcomes, no forced release if queued or failing.
2. Compare base SHA, merge only after gates, verify Vercel READY/alias SHA; real signed-in owner Redis save/reload and responsive browser with user-provided session remain independent.
3. Close missing Publer functionality only in new scoped PRs after official account rights and provider schedule/readback: queue, OAuth, media handling, analytics; do not equate local drafts or manual plans with actual network publication.
