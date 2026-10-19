# Reiki Practitioner course review lifecycle

Updated: 2026-10-18. Course: `/{en|ru}/academy/principles-of-energywork/learn`.

## Student flow
- Four after-meditation review slides require only a written observation of **15+ Unicode characters** (maximum 1600). Numerical feedback is removed; longer writing is encouraged.
- Guests may preview but do not save. Signed-in learners who explicitly accepted private journal storage save under `app_private.academy_course_progress.answers_ciphertext`; the existing AES-GCM journal and RLS stay unchanged.
- `/{en|ru}/app/course` → **My Reiki course reviews**. Read/save via the existing authenticated `academy-energywork` endpoint. Saving an older slide keeps current course position; optimistic revisions protect against concurrent edits.
- Legacy `Feeling:N/10\n<text>` entries show only the review text; student editing stores a clean written response.
- Teacher CRM: **separate** opt-in, either during enrollment or in My Reviews. `app_private.reiki_course_leads` lead 1 receives a fresh encrypted course-journal copy after each successful save. No student receives an automatic marketing message.

## Public testimonial lifecycle
1. Student saves a valid private review, checks a **separate public consent** checkbox and explicitly submits that saved review.
2. The app copies only that individual review to the private, encrypted `app_private.reiki_course_public_reviews` table, initially `pending`.
3. Owner's PIN-protected `/admin/reiki-leads` has the review moderation queue; only a pending submission may be approved or rejected. Owner should reject reviews containing contact details or other private information.
4. `/api/reiki-course-reviews` reads approved records only; output contains just ID, lesson, language, text and publication time. **No name, account ID, email or other journals.** The bottom of `/{en|ru|es}/academy/principles-of-energywork` renders approved participant quotations anonymously, in the original response language.
5. The student can withdraw public consent at any time from My Reviews. Editing a saved review **in the same DB transaction** removes any previous public approval; the changed review must be submitted and approved again. Course deletion also removes associated submissions. Account deletion cascades.

## Deployment gate
- Additive SQL migration: `supabase/migrations/20261019030943_hh_reiki_course_public_reviews_20261019.sql`.
- Live Supabase project: `holistichouse` (Canada), FORCE RLS; `anon`, `authenticated` and `service_role` have zero table grants.
- No client records have been copied to this new public-review table.
- Run tests: `node --test tests/reiki-course-reviews-public.test.mjs tests/energywork-ai-course-preview.test.mjs tests/energywork-ai-course-private-save.test.mjs tests/reiki-crm-leads.test.mjs`.
- Run existing 53-screen Chromium/WebKit EN/RU course browser QA and Next production build.
- Validate with **synthetic** signed-in enrolled account: save a 15-character review, reopen `/app/course`, edit and save, verify lead 1 updates *only after consent*, submit public consent, approve via admin, verify anonymous feed, withdraw and confirm immediate removal. Never use a real client's private responses for production testing.
- Verify Vercel production deployment SHA and `holistichouse.vercel.app` alias before claiming LIVE.
