# Holistic House — dated coaching-session PDF reports (2026-10-24)

**Scope:** existing coaching runners, not a new course, database, CRM pipeline, or external reporting provider. Source branch: `codex/public-book-library`.

## User-facing wording
- Signed-in Personal Coaching and Egyptian/Greek Planning: after each editable response, explain that **submitted** answers are saved to the private account and a PDF report becomes downloadable on completion.
- Guest Coaching Lounge: never claim account persistence. Explain that notes exist in the current browser tab only and the user must download a PDF before leaving.
- EN/RU/ES versions are authored separately. Controls remain within the single-question mobile layout, with the PDF action on the completed summary (and in completed history for account courses).

## Contents / source of truth
- A4, dated report; Holistic House / Academy branding and method/title.
- Exact persisted session questions, the client's own saved answers, skipped-item labels, optional authored-follow-up reflections, and **only client-confirmed** action plan if available. Include client topic/question when supplied.
- Date is derived from the selected session's `completedAt || startedAt`, never today's date for re-downloaded history. Guest uses completion time captured within the tab.
- Historical Personal Coaching uses each historical session's **own** `schemeKey` to resolve its original questions from the catalog; Egyptian and Greek histories stay on separate template-scoped tracks.
- Export only for completed private sessions; no invented interpretation, diagnosis, coach signature, clinical claims, or artificial scores.
- Filename: `holistic-house-{scheme}-{YYYY-MM-DD}.pdf`.

## Privacy and technical design
- Reuse account authentication, owner-encrypted `app_private.personal_coaching_sessions`, existing revision protection and RLS. No SQL migration or new grants.
- `lib/personal-coaching/session-pdf.js` builds an actual, multi-page PDF 1.4 Blob from browser-generated, high-resolution A4 image pages. Unicode RU/ES glyphs are rendered by the device's system fonts; no external font, image, PDF vendor, AI provider or API call.
- The browser receives the account's own already-authorized session, paints pages only when the user taps Download, and launches the native browser download. PDF bytes are **not** uploaded to Vercel, Supabase, CRM, messenger, analytics, or Drive.
- The local downloaded file is a personal copy; it is not server-side encrypted. User controls their own device/backup and any subsequent sharing.
- Layout wraps long text, handles missing answers, spans multiple pages and uses modest JPEG compression.
- **Known limitation:** pages contain legible bitmap text and are not searchable/selectable or tagged for screen readers. A future reviewed Unicode-font PDF implementation could improve PDF accessibility without introducing a provider. Current interactive in-app summary remains readable/searchable to assistive tech.

## Test plan and release gates
1. `node --test tests/coaching-session-pdf.test.mjs`: PDF signature, xref offsets, page count, i18n text painting, long-answer page breaks, dates, download MIME, UI copy and private/guest distinction.
2. `npm run test:coaching:release`, lint, `tsc --noEmit`, Next.js build.
3. Inspect PR against current actual production branch; merge only after focused tests or explicitly report unavailable CI.
4. Verify Vercel READY deployment has exact merge SHA and canonical `https://holistichouse.vercel.app` aliases.
5. Owner-account E2E: Greek 10-step and Egyptian 11-step with real persisted input; reload/re-login, then download, open PDF, inspect dates, all answers, Unicode, history download and opposite-account isolation. Repeat for Personal Coaching and guest, plus iPhone Safari at 320/390/430 px. Test download/save-to-Files behavior on a physical iPhone.
6. Until real authenticated/physical-device checks succeed, mark release **code merged / deployed**, not verified end to end. Never treat a build or mocked canvas as a real user's downloaded/opened PDF.

Related: #1708, PR #1706, PR #1707, PR #1886.
