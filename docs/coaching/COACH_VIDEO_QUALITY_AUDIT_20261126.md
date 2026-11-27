# All-coach video quality audit · 26 Nov 2026
Owner goal: high-quality public previews and live dialogue; preserve original performances, acting roles, same-camera continuity and zero new spending.

Actual public media audit: 31 reaction MP4s and six pinned openings, all SHA/Git blob verified, 6,458 decoded frames (5,714 reaction frames), all 24fps. All reactions have 1080 short edge. Openings Mira/Alex/Sofia/Max 480x672; Merlin 768x1152; Harry 768x1344; Samir neutral-only; Caesar no released video. All 83 ordered within-camera endpoints including self-loops have zero downscaled luma MAE. Exact endpoints alone do not guarantee quality. Original->neutral last/first MAE at common 480px: Mira 31.32, Alex 9.04, Sofia 10.46, Max 18.00, Harry 15.10; Merlin changes aspect ratio to 1080x1440 alternate. No claim of seamless original handoff. V4 build intentionally blended fixed anchor and moving face, causing some detail losses. Natural pose/texture changes can also affect the metric.

Half-second (12 frames) worst moving mean of Laplacian variance in fixed upper-central ROI at 480px divided by median per clip. 19/31 below .80, 14/31 below .70, 10/31 below .55. Representative flagged-frame contact sheets reviewed; not full iPhone playback. A low ratio is a provisional review flag rather than proof of blur.

| Block | Worst ratio | Start seconds |
|---|---:|---:|
| MIR-01 | 0.663 | 9.583 |
| MIR-02 | 0.525 | 0.000 |
| ALX-01 | 0.719 | 3.375 |
| ALX-02 | 0.351 | 2.958 |
| SOF-01 | 0.357 | 3.042 |
| SOF-02 | 0.691 | 1.375 |
| MAX-01 | 0.613 | 3.958 |
| MAX-02 | 0.730 | 9.583 |
| MER-01 | 0.523 | 0.000 |
| HAR-01 | 0.900 | 0.000 |
| HAR-02 | 0.947 | 0.000 |
| HAR-03A | 0.473 | 5.083 |
| HAR-03B | 0.900 | 7.792 |
| HAR-03C | 0.666 | 8.000 |
| SAM-01 | 0.927 | 0.000 |
| SAM-02 | 0.923 | 6.083 |
| SAM-03A | 0.781 | 0.250 |
| SAM-03B | 0.789 | 0.250 |
| MIR-A01 | 0.926 | 0.958 |
| MIR-A02 | 0.321 | 1.625 |
| ALX-A01 | 0.900 | 0.417 |
| ALX-A02 | 0.521 | 1.375 |
| SOF-A01 | 0.740 | 0.583 |
| SOF-A02 | 0.197 | 2.625 |
| MAX-A01 | 0.924 | 0.000 |
| MAX-A02 | 0.265 | 1.000 |
| MER-A01 | 0.884 | 0.000 |
| MER-A02 | 0.462 | 2.542 |
| HAR-A01 | 0.953 | 0.000 |
| SAM-A01 | 0.957 | 0.000 |
| SAM-A02 | 0.947 | 0.000 |

Runtime protection: digest-bound audit, provisional hold of 10 severe flags for automatic dialogue selection. Existing same-camera director fallback preserves acting roles; original archive untouched. Public Mira temporarily uses MIR-01, explicitly registered primary presence, instead of MIR-02; this is not perfect (ratio .663) and not a new original. Other neutral clips unchanged. Unknown/replaced bytes fail closed until audit. No session fallback to another camera or legacy SD; verified HD anchor on exhaustion. Frame callback gate plus Safari actual progress fallback; exact duration and geometry. Presentation cannot return from HD to prior SD opening after error. Keep original 480/768p one-shot until approved higher-quality performance derivative imported. Static hold on failures is intentional; no fake HD or all-clips perfection claim.

Remaining: separate versioned media remaster/import per camera; avoid full-face crossfade; check every internal and cross-block seam and relative detail, approve same-camera opening-to-idle handoff on physical iPhone, maintain one-shot greeting and original hashes. No extra Vercel sandbox, new provider, workflow or paid generation. Full protected CI and canonical LIVE evidence required.
