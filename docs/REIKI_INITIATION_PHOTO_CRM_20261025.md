# Reiki Practitioner · photo for initiation and private owner CRM · 25 Oct 2026

## Request
After the Lesson 5 closing practice, insert a penultimate EN/RU photo-upload slide before `end-02`. Preserve all existing answers, course progress and separate consent flows. The student can reopen the photo from **My Courses**. A complete application in **/admin/reiki-leads** must include contact details, free/optional Reiki paths, preferred work time/timezone, motivation, all lesson answers and the private photo.

## Implementation in PR #1953
- Existing fixed p10 course sequence gets `init-photo-01` between `intention-04` and `end-02`. Keep version `2026-10-20.p10` because there is no DB schema change; historical encrypted progress and the deployed CHECK constraint remain valid.
- The mobile browser re-encodes an uploaded image as a resized JPEG (EXIF/GPS removed client-side); the server also rejects JPEGs with embedded EXIF/IPTC/comments; request capped to **2,500,000 bytes**; accepted extension/content checked server-side, with basic JPEG header/trailer validation. There is no camera permission until the student chooses a file.
- Reuse existing **private** Supabase bucket `hh-remote-goal-photos` (not the public Reiki audio bucket). Deterministic service-only key `reiki-initiation/{account_uuid}/photo.jpg`; one current image per account, no new bucket, no public Storage RLS grant. GET is an authenticated two-minute signed URL. POST is same-origin, checked account ID/slide progress, rate-limited, mime/size bounded; no client Storage secret returned.
- The penultimate slide and the My Courses course card link both expose the student's saved photo. Protected from account crossover. After an application is submitted, the attachment cannot be silently replaced.
- `apply` requires both the already validated full course reports and a verified account-bound photo. The existing encrypted `app_private.reiki_course_leads` **application** (no duplicate CRM contact) includes `initiationRequest`, `answers`, and an opaque storage photo reference; only an explicit owner action signs/displays that photo (without holding a database transaction open).
- EN/RU share text explicitly names the photo and full answers. No photos or sensitive answers in WhatsApp, Telegram, GA/Meta pixels, e-mail, push or public media. Narrow CSP allows signed image origin only on course reader and owner Reiki leads page.
- Learners can remove course data; the existing delete flow now also removes the account-bound photo.

## Quality gates — not equivalent to production E2E
Automated unit/regression contracts cover slide order (64 including 3 intro screens), existing answer integrity, scoped auth, consent, MIME limits, signed URL bounds, encrypted CRM content, and mobile uploader. Browser tour expected screen count changed from 63 to 64. GitHub Actions / Vercel production READY and a real learner → admin delivery test must pass before declaring live.

## Manual E2E checklist (with a consenting test learner, no real personal photos)
1. EN and RU: complete the course, upload a test image on 320–430px iPhone; confirm signed image loads from My Courses and wrong-account access gets 401/403/409.
2. Application without photo is rejected by API, and the finish screen requests it. Explicitly consent, submit; verify one `application` lead with all answers, free/optional initiation, preferred local time/timezone, photo in `/admin/reiki-leads`. No outbound personal data.
3. Re-login: photo persists; submit again returns the existing lead (no duplicate); replacement after application is blocked; delete course removes private photo and lead.
4. CI build/typecheck, lint, security contract; Vercel READY matches production SHA and `https://holistichouse.vercel.app/en/academy/principles-of-energywork/learn`.

Status 25 October 2026: PR #1953 merged, Vercel READY. Follow-up PR #1971 fixes lazy CRM photo signing/refresh, strengthens server JPEG metadata screening, and uses a synthetic canvas JPEG for browser QA. **Synthetic browser upload does not prove real provider delivery; real two-account E2E remains unverified.**
