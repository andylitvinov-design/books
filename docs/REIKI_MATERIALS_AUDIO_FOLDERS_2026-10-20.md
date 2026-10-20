# Holistic House — Materials / Audio / Reiki Practitioner folders

Implemented October 20, 2026. Extends the existing audio-introduction feature (PR #1289) without recreating storage or changing learner progress IDs.

## Master cabinet navigation

1. [Materials](https://holistichouse.vercel.app/admin/materials)
2. **Audio / Аудио** — actual folder index: \`/admin/materials/audio\`
3. **Reiki Practitioner** — course folder: \`/admin/materials/audio/reiki-practitioner\`
4. Five lesson subfolders inside the course:
   - 01 — Flight to the Sun / Полёт к Солнцу (\`flight\`)
   - 02 — Tantra Reiki (\`tantra\`)
   - 03 — Kundalini Reiki (\`kundalini\`)
   - 04 — Reiki Yggdrasil (\`yggdrasil\`)
   - 05 — Personal Initiation / Личная инициация (\`initiation\`)
5. At the top, switch **RU / EN** to choose where each recording is stored and which learner-language slide it may appear on.

The old \`/admin/reiki-audio\` link redirects to the canonical course folder, while the existing owner-only \`/admin/reiki-audio/data\` API remains unchanged for uploads and publish requests.

## Inside each folder

- Clearly display the chosen **lesson and language**.
- Show all valid uploaded audio originals for that slot, up to 100 at a time, with date, size, and availability. This list is visible only to the authenticated admin.
- Choose a saved recording, listen to it, and explicitly press **Use on learner slide** to make it the active audio for that lesson-language pair. Old recordings stay in the folder.
- Upload a new MP3/M4A/WAV (up to 20MB) via the original short-lived signed Supabase URL, preview the file, then publish separately.
- Explicitly unpublish without deleting any saved file.
- Highlight the active recording. Folder list shows publication status for RU and EN separately.
- Five lesson intro audio players are optional; no autoplay, no API voice synthesis or HeyGen credit cost.

**Legacy data compatibility:** The same public educational bucket \`hh-reiki-course-audio\` and \`intro-manifest-v1.json\` are preserved. Existing four-lesson object keys and published entries are unchanged. Lesson 5 gets a new optional slot \`initiation:{en|ru}\` connected to the existing \`paths-01\` opening slide. All 69 slide IDs and encrypted learning records remain untouched.

## Security boundaries

- Both nested folder pages and the audio inventory API require owner admin authentication; same-origin checks remain on all writes.
- Inventory listing is scoped to one whitelisted lesson and one whitelisted language; malformed paths or MIME metadata are discarded.
- The audio storage bucket is **public for educational media**. Any uploaded object can technically be accessed by someone holding its exact direct URL, whether or not it is featured on the lesson. Never upload private client data, consultations, private initiations, or contact details.
- The only student-visible audio path comes from the separately owner-approved published manifest; unpublished inventory never appears in public responses.
- A changed language/folder unmounts the prior draft editor; no crossover between EN/RU file selections. Admin folder controls disable during active upload/publish.
- CSP allows direct Supabase upload/playback on the exact canonical folder route, not across unrelated private pages.

## QA

Run:
- \`node --test tests/reiki-lesson-intro-audio.test.mjs\`
- \`npm run build\`
- dedicated Reiki 69-screen EN/RU browser checks
- verify security/public routes and canonical Vercel production SHA/alias.

Human-end-to-end after login: upload an owned, non-sensitive sample into Lesson 1 RU; confirm it appears in the RU folder but not EN or student player; select/publish and verify in RU lesson; unpublish and verify it disappears; ensure older upload remains available for reuse.

No actual Andrey audio recording was provided with this folder-navigation change. Do not claim a real audio file was uploaded, publicly posted, or successfully played by a student until verified.
