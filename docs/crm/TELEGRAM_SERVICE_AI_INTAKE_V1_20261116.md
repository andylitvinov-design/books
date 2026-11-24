# Telegram AI service interview v1 · tracking #4764

**Partial first implementation slice only; NOT a verified complete LIVE order or booking.**

Existing five first-party `[HH-REQ:service:locale]` manual account drafts are upgraded to the verified existing `@holistichouse_bot` only when the public bot endpoint confirms `available && aiInterviewAvailable`. All other messenger CTAs remain manual. Telegram `/start hhservice_<service>_<locale>` is a public code only, not proof of identity or client consent. The existing signed V3 bot handler stores the selected code in its owner-encrypted context, asks for separate AI processing consent, conducts adaptive one-question-at-a-time interview, then asks for separate explicit CRM handoff confirmation.

On confirmed Send, the existing CRM Telegram encrypted thread receives a stable HH correlation reference, exact selected service title, user answers and client-confirmed AI draft. The client gets an acknowledgement; this does not create an appointment, payment, signed website account or a separate `app.public_service_enquiries` row.

**Still required before owner's full goal can be called LIVE:** (1) practitioner-scoped structured enquiry row and exactly-once status with RLS/STOP safety, (2) reconcile owner `@Andydotbot` notification for this private-bot path with existing #4615 and delivery receipts, (3) owner CRM-to-bot reply round trip, (4) device E2E with a consenting second customer account, and (5) exact-HEAD protected CI, release via the single scheduled `hh-hourly-vercel-production.yml`, Vercel READY canonical alias SHA and public acceptance. Do not bypass the owner 15 Nov one-channel Vercel policy or turn on Telegram Business Chat Automation from this PR.

No new bot, paid AI provider, secrets, queue, workflow, database, marketing or direct Vercel deployment.
