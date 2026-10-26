# Growth Studio — benchmark-informed quick composer (26 October 2026)

Status: **IMPLEMENTED ON FEATURE BRANCH; CI / MERGE / LIVE / SIGNED-IN E2E NOT YET VERIFIED**. Relates to #1214 and #2058. This is one existing-module enhancement, not Publer parity.

## Public source ledger and limitations

| Source | Checked / purpose | Allowed take-away |
| --- | --- | --- |
| [Publer supported channels](https://publer.com/help/en/article/what-social-networks-are-supported-including-how-many-based-on-each-plan-npoun1/) | 26 Oct 2026 · official help page | A multi-network composer must distinguish draft *targets* from connected accounts |
| [Publer platform](https://publer.com/) | 26 Oct 2026 · published product overview | An owner benefits from drafting, a calendar, a queue, bulk posts and review, but these need not all occupy the first screen |
| [Remaster](https://github.com/thenavidm/remaster) | 26 Oct 2026 · publicly documented `feature` mode | Apply one clean-room UX pattern to the existing product, without copying a competitor's code, layout or media |
| [REA setup](https://rea.tools/get-started/) | 26 Oct 2026 · official runtime requirements | REA is not needed for public product research; it is reserved for authorized own/licensed artifacts |

**Evidence boundary:** This improvement is informed by the public benchmark and current Holistic House source inspection. **No Remaster runtime capture or REA run happened for this PR.** The authorized Mac was offline and the prior browser sandbox blocked launch; REA is not installed. There are no third-party screen measurements, private screenshots, binaries, extracted JS, copied UI assets or copied competitor code. No unverified conversion lift is asserted.

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

Remaster `@thenavidm/remaster@0.2.1` was audited and installed in an isolated Mac Codex checkout under #2058/#2066. When the Mac and browser sandbox are available, perform a **public, read-only `feature` mode** screen-flow evaluation, record the mobile benchmark and run the after/before checks. Do not automate scraping, login or copying protected assets.

REA 6.8.0 requires Node 22.23.4+ on Node 22, or Node 24.22.1+, or Node 26.12.1+; previously observed Mac 22.22.3 is unsupported. REA is deferred until a compatible isolated runtime, separate dependency/security approval and a **first-party HH app/SDK analysis target**; it is **not** to reverse engineer Publer's closed code/API or run on Vercel production.
