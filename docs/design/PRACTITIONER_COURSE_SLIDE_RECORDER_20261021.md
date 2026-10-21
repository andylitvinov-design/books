# Practitioner course slide recorder · 2026-10-21

Status: implemented on feature branch; do **not** claim real owner/iPhone media E2E or YouTube OAuth upload until independently verified.

## User workflow

1. Open `/{locale}/app/practice?panel=materials&materialTab=courses`. The existing `PractitionerCourseBuilder` owns draft/title/description/locale and allows up to 60 reorderable slides (text, image, audio, video, safe YouTube/Vimeo link).
2. Choose an Audio or Video slide. Either upload a compatible file (same existing signed-upload path) **or** press **Record voice / Record video**. Browsers must grant explicit microphone/camera permission over HTTPS. Controls: Start → Stop → private Blob preview → Attach → Save draft. Recording is not saved until the owner explicitly attaches it, then saves draft; publication is separate.
3. On iPhone Safari capture MP4/M4A directly if `MediaRecorder` supports it; allow native camera capture as an alternative and allow file upload from Camera/Voice Memos/Files. Never change the file extension to hide unsupported WebM encoding.
4. Camera videos are 720p ideal / 1.4 Mbps target; **90 seconds max** in-browser, video size **25 MB** max. Voice records up to **240 seconds**, audio file **20 MB** max. Larger recordings should first be edited/compressed, or hosted at YouTube via an externally authorized account and linked as a video slide. Reuse existing 120 MB/course, 250 MB/practitioner storage budgets.
5. Uploaded originals stay in private bucket `hh-practitioner-course-media`, protected by `app.practitioner_courses` / `app.practitioner_course_assets` RLS and authenticated owner checks. Server validates content MIME and actual header, file length and size. Admin media/clients never enter this flow.
6. For video clips, an optional **Prepare for YouTube later** disclosure lets only the authenticated course owner download an original file via `/api/practitioner-course-media/[id]?download=1`. The server verifies the owner and generates a 90-second download-only signed Storage URL. After downloading, the user can independently choose a channel in the existing owner YouTube uploader (`/admin/youtube-upload`) or use YouTube Studio; no automatic transfer, no bypassed Google OAuth, no YouTube rendering/publication without explicit action.
7. Course share/public search remains independent: the master must explicitly publish a validated course; public player references only reviewed/approved course snapshots. The video download URL cannot be obtained from public assets without owner auth.

## Security & compatibility

- No new migrations, buckets, paid services, AI rendering or background activity. Existing storage/video publication controls remain.
- `MediaRecorder` unsupported/no MP4: show localized EN/RU/ES fallback text; NEVER upload WebM as `video/mp4`. Detect camera denied/missing; stop tracks on component unmount, stop timeout and after recording; revoke all Blob URLs.
- Disable course switching, slide removal/reordering, publication and editing while recording or reviewing an un-attached clip; reject too-short/oversized recordings.
- Scope `media-src blob:` to private course editor path in middleware, not public/guest/course readers.
- Preserve owner-only Reiki Practitioner audio folder and existing manual audio upload. Do not mix private client profiles with CRM/marketing or with course library.

## Acceptance checklist

- [ ] `node --test tests/course-slide-recorder.test.mjs tests/practitioner-course-builder.test.mjs tests/practice-course-materials-navigation.test.mjs` passes.
- [ ] Next build, ESLint, TypeScript and CI pass for changed code.
- [ ] iPhone 320/375/390/430 px: camera permission denied/allowed, record → stop → preview → attach → save → reload; microphone same; no autoplay or horizontal scroll.
- [ ] Browser: protected lesson recorded clip served correctly, manual owner download includes Content-Disposition; other user / guest download denied even if slide was published.
- [ ] Owner YouTube path requires independent login/selected channel and explicit publish; no pretend E2E.
- [ ] GitHub PR merged into production branch, Vercel READY at exact deployment SHA, canonical alias `holistichouse.vercel.app` points to that deploy.

Unlike the illustrative UI mockup, these functions connect to existing real data. Do not report full camera/device or YouTube delivery acceptance before actual device/provider verification.
