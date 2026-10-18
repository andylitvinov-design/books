# Holistic House CRM — owner workflow R1 (18 October 2026)

## Purpose
The existing owner-only CRM stores contacts, lifecycle, marketing consent and gated email sends but did not support next steps. This first release adds a practical owner workflow without creating a duplicate clinical database.

## Delivered source features
1. Contact origin: manual / website / referral / event / academy / other. Labels are chosen by the owner and are not verified marketing attribution. Existing contacts default to manual.
2. Next business action: reply, call, share details, booking discussion, check in, other. Each has a date-only deadline and open / completed / canceled states.
3. Owner dashboard: manually chosen lead/client stages, overdue and due-today tasks using America/Toronto business dates, and a practical follow-up queue.
4. Append-only non-clinical business activity: contact created, stage changed, promotional suppression, manually recorded contact/call/offer/booking discussions.
5. EN/RU/ES compact controls in the existing My Practice → CRM Contacts screen.
6. No automatic email, reminders, advertisements, subscriptions, payments or client account linkage.

## Security and persistence
Every read and mutation requires verified Supabase user, existing legacy owner email allowlist and active session. The CRM repository switches to restricted hh_crm_backend. New app.crm_followups and app.crm_activity tables have FORCE RLS, owner_id = auth.uid and account_active checks, composite (contact_id,owner_id) FKs and no anon/authenticated grants. Activity is append-only. A trigger prevents reopening or rewriting completed/canceled actions. Business task types are fixed: no clinical notes, test scores or private report contents.

## Limits and future phases
Contacts list is currently first 100, followups first 300, and activity latest 100, while overview metrics count the entire owner DB. Full encrypted-contact pagination, opt-in existing service-enquiry handoff, editing contact addresses with re-verification, portability/retention controls, and owner-authenticated browser E2E are next independent tasks. Cross-account merges and inferred purchases are forbidden without separate consent and verified billing evidence. Resend production onboarding remains issue #980.

## Release gates
Run focused unit/contract tests, reviewed SQL dry-run against a transaction, and owner/scoped isolation checks. Apply migration before merging source. Require exact-SHA READY Vercel and anonymous CRM 401 smoke. No real contacts may be seeded for QA.

Schema source: supabase/migrations/20261018183403_hh_crm_followups_activity_sources_20261018.sql. Applied in Supabase Production migration history version 20261018183403 after reviewed dry run.
