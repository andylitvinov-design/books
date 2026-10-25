# Academy video publication audit — 2026-10-24

## Release rule
The practitioner course editor must have one ready, authenticated video asset in private storage or a validated YouTube/Vimeo external URL. Text, audio and pictures remain valid draft elements but cannot count towards public video-course release. The server checks the published immutable snapshot and media readiness; client shows EN/RU/ES guidance.

Imported Academy records classified as video courses need at least one traceable 11-character YouTube media ID to appear in public discovery, routes and sitemap. This presence check does **not** verify provider playback; live YouTube click-through and iPhone tests are a separate release criterion. Withholding decisions are version-controlled in `data/academy/withheld-video-courses.json` and covered in the mandatory prebuild test.

## Findings
- **8** source-record families are labelled video courses; **7** have archived source-backed video records. Among the latter, **45 PsiMaster lesson records** (41 unique IDs) belong to the seven original video series.
- `videos/sun-meditations` has **zero** source-backed video items. Withhold its public video-course route, discovery link and sitemap listing until original media is recovered and provider-tested.
- Other Academy programmes without video are primarily textual historical reference materials, rather than declared video-course families; preserve them as reading/history, not advertise as ready video lessons.
- Egyptian Priesthood/Osiris already has seven source-backed IDs, originally published on every day's third slide, not on the day introduction visible in the owner's screenshot. **Every day introduction now displays its corresponding poster-first video**, without altering the 51-screen sequence or locally saved slide IDs. Existing dedicated video slide remains available.
- Connected Supabase `holistichouse` read-only audit on 2026-10-24: `app.practitioner_courses` contains **1 draft and 0 published courses**; no historical practitioner publication needs rollback.

## Boundaries and next release checks
Code and manifests establish course references, not actual watchability: test selected videos through browser interactions; verify 320–430 px layouts, playback, YouTube player errors and private vs public access; Vercel READY and domain SHA; EN/RU/ES pages; PR checks. No video generation, no credit spend, and no assumed ownership of third-party videos.
