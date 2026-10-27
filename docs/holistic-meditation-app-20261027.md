# Immersive Meditations & Courses · 2026-10-27

## Decision
The long Holistic Support page stays available for discovery and separate consented service requests. The public meditation poster opens \`/{en,ru,es}/meditations?video={verifiedId}\`, a fixed, one-screen app surface with no page-level vertical scrolling. Click opens a real 16:9 \`youtube-nocookie.com/embed\` with **native YouTube seeking controls immediately visible** (no poster→smaller iframe jump). Playback is still initiated by the user's Play click, never autoplay.

- Four directions: Health & Energy, Business & Money, Relationships, Magic & Development.
- Traditions: All, Egypt, Maya, Reiki, Greek. Changing tradition switches to Courses and retains a compatible direction.
- View switch: Meditations / Courses; native accessible drop-downs for course and video selection; back/next; original YouTube source fallback.
- RU meditations: existing seven verified original RU PsiMaster IDs from \`freeMeditationVideos\`; EN/ES: one original English Sun video with language disclosed. No fictional translation or extracted audio.
- Egyptian Priesthood: seven existing Osiris video lessons, passed from the actual Academy curriculum. Maya: existing Academy course / archive link only, **not** a fabricated video. Reiki and Greek also link to real existing Academy routes.
- Topics for existing meditations are editorial discovery only, not claims of clinical treatment. No payment, media upload, backend mutation, extra providers or tracked playback.
- Existing gallery remains a concise discovery component; the photo opens the app rather than contracting into an iframe.

## Verification
Run \`node --test tests/holistic-support-meditations.test.mjs tests/meditation-immersive-app.test.mjs\`, TypeScript, scoped lint, \`next build\`, and mobile browser interactions at 320 / 390 / 430px (both first render and subsequent YouTube video changes). Verify exact GitHub merge SHA, Vercel READY for the production branch and \`holistichouse.vercel.app\` alias. Manual YouTube video play/seek remains an external E2E check if interactive browser tooling is unavailable.
