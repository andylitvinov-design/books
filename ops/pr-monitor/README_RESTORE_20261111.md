# PR Monitor recovery — November 11 baseline (2026-11-12 Toronto)

Owner instruction: restore the formerly working complete PR Monitor and original Agent Commander, not the two-graph-only substitute.

Verified rollback without rebuild:
- Production deployment: dpl_3aiyhwb7JQfV5pshLZ3Er89U3YuM (complete 164-file Nov 7 source).
- Project Routes: restored Nov 11 20:54 Toronto 18-rule routing snapshot 30e91ed4-dc93-4f79-95c1-e2e1d38a5500, published as version 23553762-9be1-4324-80d2-5bcb84585765; later 41-rule overlays removed.
- Root / stays the 707-byte original Commander briefing page; /briefing.html must be an actual working route.
- Legacy /pr-monitor.html still displayed a 687-byte loading stub and four JS/CSS returned 404 after rollback. A raw rollback alone is not complete.

This source change mechanically compiles the exact archived 11 Nov pr-two-screen-boot.js and legacy.html into an immediate first-paint PR page. It preserves 31 original deferred scripts: both graphs, PR lifecycle/CI, error funnel, recommended repairs, and Commander navigation. No document.open/write, old loading spinner, or parser-blocking JS. The original 25 stylesheet placements (24 unique) are consolidated in cascade order into one first-party CSS file with the Commander shell import inlined. No metric calculation, API, authentication, or worker is changed. The four missing assets ci-jobs-bridge.js, pr-lifecycle-ribbon.js/css and pr-error-funnel.css are restored from first-party versioned GitHub paths.

Safe release after protected merge: stage existing Vercel project routes for /pr-monitor.html and /pr-monitor-full.html to immutable merged pr-monitor-yesterday.html, /pr-monitor-yesterday.css to immutable merged CSS, /briefing.html to unchanged Commander source, and the four missing assets to immutable first-party sources. Stage-check all assets, actual PR/CI APIs and agent pages, then promote without replacing the complete underlying production deployment. Root/index remain the original Commander. Keep automatic assignment of new incomplete builds off.

Gate now prevents root from being replaced by PR Monitor or vice versa. It rejects fake READY/200 loading stubs, incompatible schemas and missing release files. No new paid services or CI jobs. Browser-level iPhone Safari painting must be checked separately from HTTP correctness. Latest pre-rollback routes version 87005096-0c81-4af5-aab1-3a8c6601f7b2 is available for fallback.

GLOBAL_PR_ONE_PUBLISH_V1: prepare source and tests before one protected push, exact HEAD CI and separate production proof.
