# Reiki Practitioner · Private two-stage CRM funnel

**Date:** 2026-10-18. **Course:** `/en|ru/academy/principles-of-energywork/learn`.
**Owner dashboard:** `/admin/reiki-leads` (existing protected admin session).

## Data ownership and storage
- The student retains one versioned course progress row in `app_private.academy_course_progress`; `answers_ciphertext` is AES-256-GCM (server-side, per-record AAD). Never store course answers in localStorage, GitHub, YouTube, Drive share links, public analytics, or unprotected CRM contacts.
- The **separate** `app_private.reiki_course_leads` table contains at most two records per signed-in student, uniquely `(account_id,stage)`. Each lead's contact, responses and letter are encrypted in `payload_ciphertext` with a different record UUID/AAD. A PostgreSQL role with BYPASSRLS must not be used to serve client requests.
- Force RLS and scoped backend policies restrict a student to their own leads. A separate `hh_app_inbox` role can list or change follow-up status only after existing `requireAdminRequest()` proof and fixed practitioner ID setting, through `/admin/reiki-leads/data`.
- Do not automatically move this material into the marketing CRM contacts table or email marketing. No automatic mail send. New lead appears on the board, not in the student's public profile.

## Student journey
1. Anonymous guest: try lessons without saving; no lead is created. To save and request initiation, sign in with Google to the existing private account.
2. New enrolled account: accept private saving (required for saving). Separately, optionally accept **teacher sharing**. Only this second explicit choice creates **lead 1 — course start**, with contact, position and shared answers. There is no forced sharing for studying privately.
3. Progress writes: existing guarded/encrypted course transaction also updates the lead 1 encrypted copy after each successfully saved answer/lesson, if sharing is authorized. The live class position and 0–10 meditation feedback are visible to the teacher. Private-only students never enter this inbox.
4. Existing active student with private-only progress can opt into sharing at any point inside the course. Prior answers are shared only after the new opt-in.
5. Fifth-stage `end-01`: final letter asks why the student wants personal initiation. The letter is stored as the student's own answer. The course finishes normally on `end-02`.
6. At the final review, **lead 2 — personal initiation request** is created only after: authenticated account, separately authorized sharing, all five reports + five lesson answers, completed 53-step course, minimum-length motivation letter, and the student's explicit confirmed application click. API validates all conditions server-side and inserts only once.
7. Owner sees contact, lead 1/lead 2 date and status, saved material, 0–10 meditation reports and the letter. Status actions `new → contacted → closed` are independent for both stages, revision-checked; status does **not** imply initiation occurred.

## Consent, privacy and revocation
- Starting in private-only mode is possible. Existing progress is not silently backfilled to a lead.
- No public student listing, no arbitrary learner-ID endpoints, no automatic app email or social sharing.
- Student course Delete action explicitly warns that course progress, answers and both lead records (including the letter) are deleted in the same transaction. Account deletion cascades through the foreign key. If the owner separately retains correspondence after a later direct consultation, that remains subject to a distinct retention policy.
- Owner dashboard is `noindex`, force-dynamic, private/no-store and authenticated via the existing practitioner administration PIN session. Never store student answers in Vercel logs.
- RLS relies on the existing `hh_app_backend` and `hh_app_inbox` roles, not a newly provisioned database or customer-facing Supabase service key.

## Release and QA
- Apply additive SQL migration `20261018184658_hh_reiki_course_private_crm_leads_20261018.sql` to the **existing** Holistic House Supabase project. Verify FORCE RLS, policies, grants, unique stages, and that no rows were seeded.
- CI: 53-slide EN/RU Chromium & WebKit guest journeys, source tests, TypeScript, Next build, plus owner-only lead contract and migration checks.
- Full sign-in/start/share/submit/owner-status QA requires isolated synthetic authenticated users. Do not submit any application on behalf of a real customer.
- Only mark **LIVE** after Vercel points `holistichouse.vercel.app` to the tested merged source SHA; separately distinguish tested code from an end-to-end real signed-in enrolment.
