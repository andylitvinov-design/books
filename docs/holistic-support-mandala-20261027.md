# Personal Mandala Meditation Studio — 2026-10-27

Issue: https://github.com/andylitvinov-design/books/issues/2317

## Authoritative source

The original user-owned constructor lives in \`andylitvinov-design/reiki-yggdrasil\`, main @ \`3fd7960aa77862c38f8a5754b64c3a79f5e0c96a\`:
- \`src/pages/profile-lite/ProfileLitePowerPlaceModuleBase.jsx\` and \`ProfileLitePowerPlaceModule.jsx\`
- \`public/mandala-templates/place-power/stone-mosaic-01.svg\`
- \`docs/profile-lite-old-profile-gap-fix.md\`

This first public-facing support flow **adapts** the source template and families (Sun / Lotus / Star / Dao / Stone) rather than copying its master-only multi-slot editor, auth, CRM, RLS, service shop and data model. Later master-editor parity and private My Practice saves remain tracked on issue #2317.

## Product flow

1. Existing \`/{en,ru,es}/holistic-support\` → video meditations → **Create support mandala**.
2. Dedicated \`/{en,ru,es}/holistic-support/mandala\` screen.
3. Use a photo (self, a place, or an image representing a goal), or write a short intention as the center content.
4. Choose one of five decorative mandalas; optionally adjust crop/zoom.
5. Press Play on an existing original YouTube video. Keep video visible; no offscreen/hidden audio, extract/MP3, generated soundtrack, autoplay, new provider expense or false dubbed content.
6. Download 960×960 PNG locally.

The app uses \`freeMeditationVideos(locale)\` as single source of IDs and language policy (EN and ES show the English original; RU uses only the seven original Russian archive recordings). Theme filters are navigation aids, not verified treatment claims.

## Privacy contract

Photo upload is purely local: object URL from file input, Canvas preview and PNG download only. The photo and user goal are **not** sent to APIs, Supabase, CRM, YouTube or a third-party image processor. Object URLs are revoked on replacement/unmount. No account and no persisted image are created; the user saves their own PNG.

Future private account persistence requires separate authenticated Storage design + RLS + delete/export + consent. Do not copy \`profile_cabinet_*\` schema from Reiki Yggdrasil.

## QA / acceptance

- [ ] \`node --test tests/mandala-support-studio.test.mjs tests/holistic-support-meditations.test.mjs\`.
- [ ] \`npx tsc --noEmit\`, targeted ESLint and \`npm run build\`.
- [ ] PR checks and Vercel preview READY.
- [ ] Safe merge to \`codex/public-book-library\` only, then verify READY + exact SHA on \`holistichouse.vercel.app\`.
- [ ] Browser (including Safari/iPhone 320, 375, 390, 430px): photo selection, local-only network, template changes, crop, export, accessible controls, real YouTube playback while photo is in view.
- [ ] Issue update with real evidence; no promise of medical or guaranteed effects.
