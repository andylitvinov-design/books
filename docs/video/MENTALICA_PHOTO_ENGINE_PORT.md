# Holistic House — Mentalica Photo Mandala Engine Port

Source of truth: `andylitvinov-design/reiki-yggdrasil`, `src/pages/profile-lite/ProfileLitePowerPlaceModuleBase.jsx` and `src/profileMandalaWorkspace.css`.
Target: `andylitvinov-design/books`, `/{locale}/holistic-support/mandala?mode=photo` (RU/EN/ES).
This is a client-side port, not a Vite/Supabase cabinet replacement.

## Scope implemented in this patch

1. Source-exact client/mandala 15 layout maps: 2, 4, 6, 8, 12 sources in styles 1/2/3, preserving `client-N` image IDs and existing local projects.
2. Central layout registry for 8 original constructor families: client, altar, business, zodiac, star, chess, dao and dao-layout. Shared `mentalicaPhotoLayout` produces slots with IDs, coordinates, diameters, shapes, guide paths, frame shape, center geometry; non-client layouts are adapted from the original JSX/CSS, not copied as a full pixel-perfect skin.
3. Variants: 1/3 business zones, 2-ring Zodiac, 5/10 star, 4 chess layouts, DAO styles and scroll crowns. Six palette themes.
4. Single layout registry used by interactive HTML preview and local PNG export; image crop uses cover/position/rotation/zoom in both paths. Rectangular and square backgrounds get their own crop.
5. 2048px client-side PNG output, resized 2048px originals quality .86, stripping EXIF/GPS; local IndexedDB and JSON import/export preserved.
6. Full default video editor and existing navigation remain untouched. No external upload of personal photos, cloud media, AI service or paid plan required.

## Verification and source-faithfulness boundaries

- Core geometry source coordinates and slot IDs are exercised in `tests/mentalica-photo-mandala.test.mjs`.
- Non-client layouts are responsive approximations that preserve source semantics. Advanced native Mentalica surface assets, DAO Fulu contours, talisman details, multi-layer Zodiac ribbon, true video motion, Supabase saved libraries, PDF and high-fidelity original print layouts are NOT yet imported. Do not claim a pixel-perfect 1:1 clone of the full legacy application.
- Local preview and PNG share geometry; differences in shadow/anti-aliasing, HTML rounded-rectangle crops and SVG line rasterization may remain. Require image-based regression across variants before calling pixel parity complete.
- Real iPhone Safari HEIC import, single and two-finger gestures, download/share, saved project reload and phone memory pressure must be verified on an actual device. WebKit preflight is not real iPhone E2E.
- Check safe area 320/354/390/430px and desktop widths; disable any production promotion if current exact-HEAD CI, release rules, deployment readiness or no-additional-spend policy are not satisfied.

## Follow-on fidelity tasks

- Move precise **non-client** decorative layers into a single renderer with identical preview/export SVG/canvas structure: pentagram strokes, Zodiac glyphs/ribbon, DAO talisman borders, altar ribbons, business triangles, chess original tiles.
- Optional original Mentalica project import adapter must validate and strip private Supabase references; no automatic server-side data sharing.
- Documented separate opt-in video mode with explicit browser constraints; no mock MP4 output.
- Visual golden-reference tests (desktop, iPhone) for every constructor + background + rotated/cropped image.
