# My Coaching Plan — Life Plan bridge v1

**Статус:** implementation slice / not production-live  
**Дата:** 2026-11-09  
**Связано:** #4055, #4018, #4014, #4019

## 1. Цель

Добавить серверный слой для чтения существующего My Coaching Plan и импорта выбранных клиентом подтверждённых действий из сохранённого Report v2. Не создавать новый план, отдельный список задач или копию базы.

## 2. Production schema confirmed

Все таблицы находятся в app_private и уже развернуты:
- coaching_life_plans — одна активная запись на account.
- coaching_life_plan_areas — 8 сфер, уникальных внутри плана.
- coaching_goals — encrypted title/outcome, report/session provenance, stable idempotency key.
- coaching_action_items — encrypted action details, client_confirmed_at constraint, unique source_report_id + source_action_key.
- coaching_life_plan_changes — encrypted append-only change snapshots.

All owner read/write/delete policies use hh_app_backend, auth.uid() and active-account validation. The client never queries these tables directly.

## 3. Service boundary

New server-only module: lib/app/coaching-life-plan.js.

Exports:
- readCoachingLifePlan(config, actor, {locale})
- importCoachingReportActions(config, actor, input)

API endpoints in the existing authenticated Next.js catch-all route:
- GET /api/app/coaching-life-plan?locale=en|ru|es
- POST /api/app/coaching-life-plan/import

The verified actor is passed by existing server auth; header X-HH-Account-ID is only an account-switch guard, never an authority source.

## 4. Read contract

readCoachingLifePlan returns:
- plan: null with exactly eight empty domains when the owner has not created a plan;
- otherwise one plan, the eight domains, goals and action items.

Empty read is non-mutating: it does not create a plan or area rows. Missing self-ratings remain null. Sensitive fields are decrypted server-side with account-bound and record-bound AAD; ciphertext is never returned.

## 5. Import contract

Input is limited to:
- reportId — saved private report UUID;
- reportRevision — immutable current revision expected by the client;
- areaKey — one of the eight allowed areas;
- candidateIds — 1–3 accepted report action IDs.

The browser cannot submit candidate text, report JSON, confirmation timestamps, actor/account IDs, goal titles, due dates or evidence.

Server flow:
1. readCoachingReport authenticates the owner's private report archive and verifies immutable/current ciphertext hashes.
2. Require report status=reviewed and review.status=confirmed.
3. Match each requested ID to a saved candidate with status=accepted, origin=client_selected, valid acceptance timestamp and matching client_action_acceptance evidence.
4. Begin a transaction; lock and re-check active owner and the exact saved report revision/content hash.
5. Create/reuse the owner's single plan and the user-selected life area. Existing domain content/rating is never overwritten.
6. Create/reuse one goal per account + report + area using a deterministic UUID idempotency key. Goal title comes only from the report's explicit desired outcome, focus or saved request.
7. Insert only selected accepted actions using the source_report_id + source_action_key unique key. Store description encrypted; set status=accepted and the exact saved client_confirmed_at.
8. Append encrypted coaching_life_plan_changes records for new goal/action rows and increment plan_version only when something new is inserted.
9. Repeated submissions return existing rows without duplicate audit entries or version bumps.

## 6. Idempotency and privacy

- Goal idempotency key is deterministic for account + report + area.
- Action idempotency uses the database unique key source_report_id + source_action_key.
- Existing area state, ratings, goals, and actions are not replaced.
- If the same action is attempted in a different area after import, server returns a conflict rather than duplicating it.
- Goal title, outcome and action description are encrypted with their own record IDs and field-specific AAD.
- Audit snapshot is encrypted using change-record ID and coaching.life_plan_change AAD.
- No reminders, due dates, calendar events, CRM leads, bookings or practitioner shares are created.
- No separate table or migration is introduced in this slice.

## 7. Boundaries still to implement

This bridge is the server/data layer only. The following remain separate work in #4055:
- mobile My Coaching Plan route and navigation entry;
- eight-domain cards and editable current/desired state/obstacle/rating forms;
- saved report archive and explicit Add to my plan picker with domain selection;
- progress timeline and follow-up UX;
- real PostgreSQL integration tests with two real Auth identities and RLS;
- mobile Safari E2E and production deployment.

Do not label the Life Plan as LIVE until these UX and DB integration gates pass.
