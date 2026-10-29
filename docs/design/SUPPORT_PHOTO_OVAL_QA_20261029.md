# Holistic Support — photo picker and oval portrait (2026-10-29)

## Screenshot identity and routing
- Source: three owner-supplied iPhone Safari screenshots on 28–29 Oct 2026, showing the blank portrait circle on the older public dashboard, and a selected selfie displayed as a full rectangle behind Video Mandala copy. Photos are private user-supplied material: **never commit or attach the screenshots**.
- Screenshot browser address only shows `holistichouse.vercel.app`, not a path. Exact query/auth state therefore cannot be independently verified from screenshots. Compare component responsibilities, not screenshot pixels across presumed routes.
- Target source routes: public `/{en,ru,es}/holistic-support/mobile` (existing `HolisticSupportMobile`) and separate public `/{en,ru,es}/holistic-support/mandala` (existing `MandalaMeditationClient` → `MandalaFreeVideoStudio`). Do not confuse either with private `/{locale}/app/videos`.
- Top public dashboard: no account necessary to choose a photo; optional **explicit** private save requires authorized account. Ratings and viewing history stay local. Mandala editor: local photo processing and consensual video export, no automatic cloud upload.
- Verified before edit: production branch `codex/public-book-library`, live Vercel `super10/codex-public-book-library`; HEAD had advanced to `083b3c239d3fbfd14d6c16496140e46e9853a373` (BUILDING, previous READY `77c062c6122a60f82cc1492689bc3fade068fcb7`). PR #2472 head `8fb9c5656144ddabf035e540128714eba91cf33b`, behind production. Recheck both on release.

## Reference visual structure / actual defects
| Region | Source and intent | Target |
|---|---|---|
| Mobile three-column header | 1–10 ratings, small middle portrait circle, four tools | Keep all areas, colors, dimensions and bottom navigation; **full-circle native picker**, camera visible, no missing face after selection |
| Upper photo | iPhone selfie may have head high and shoulders lower | Round clip at all 320/354/390/430 widths; face-biased `object-position: 50% 34%`; border/inner radius visually continuous; camera should not obscure eyes |
| Video-mandala hero | Existing scenic clip, source photograph painted as giant rectangle under headline | Clip original photo to an **oval medallion only**, transparent outside mask so film remains visible; put portrait left of text within landscape hero; keep actual export and live preview on a shared painter |
| Separate mandala editor | Native Photos/Files picker previously disallowed HEIC | Preserve `prepareBrowserPhoto` JPEG normalization, error state and photo-local privacy; no fake success |
| Cabinet | Optional save to private bucket | Owner GET/POST/DELETE, short signed URL, no public bucket or automatic sharing |
| Bottom navigation | Existing five buttons | Keep original routes, no duplicate dock or clipped controls |

## Visual/behavior acceptance
- Public guest on iPhone: tapping visible center circle opens native file chooser, accepts JPEG/PNG/WebP and decodable HEIC/HEIF, displays a circular preview; choosing a file makes **zero server writes**. A signed-out Save attempt cannot succeed.
- Mandala: oval portrait in canvas (no `roundRect` photo); the scenic video surrounds it and text remains legible in a separate layout area. Same painter for real-MP4, procedural preview, recording and PNG when applicable. No synthetic face, stock avatar or paid AI. When input is not a portrait/has no detectable face, the oval is still a reversible framing choice, not a false identity claim.
- Responsive geometry: target widths 320 / 354 / 390 / 430 CSS pixels; no horizontal overflow, real iOS WebKit photo picker, aspect-correct render and visible CTA. Verify 768 and 1440 too if CI resources permit.
- Signed-in: opt-in Save → private Supabase bucket → URL → `/app/videos` → replace/delete; verify with real authorized fixture before claiming E2E.
- Owner reference screenshots cannot be published to GitHub CI artifacts; use synthetic sample.
- Visual reference/candidate overlay: **BLOCKED** until a browser capture of the exact same route/state/view is available; screenshot-only/CSS-only assertions do not establish pixel match.

## Release evidence tracker
| Gate | Current |
|---|---|
| Page-identity (code routing) | PARTIAL; screenshots hide URL paths |
| Source/contract tests | IN REVIEW |
| CI Chromium/WebKit | NOT RUN on final commit |
| lint/typecheck/build | NOT RUN on final commit |
| Vercel READY + canonical SHA | NOT LIVE |
| Private signed-in photo E2E | NOT RUN |
| Live visual Safari QA | NOT RUN |

Preserve issue/PR identity: `books#2312`, existing `PR #2472`; do not create replacement product/route/PR.
