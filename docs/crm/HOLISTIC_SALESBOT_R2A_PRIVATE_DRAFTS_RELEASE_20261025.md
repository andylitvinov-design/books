# Holistic SalesBot R2a — private owner draft persistence
25 October 2026 · Release runbook · NO AUTOMATED DISPATCH

## Included
- Extend existing CRM Automations panel (R1, PR #2068).
- Save encrypted owner drafts under current authenticated account in the existing CRM transaction role. Separate from CRM Contacts, Client Cabinet, inbox, course or billing.
- New table app.crm_salesbot_flows with encrypted draft and approved-preview graph snapshots, status, revision, version and flow key.
- Owner GET/POST /api/app/crm/salesbot/drafts: list, create/edit, approve_preview, pause. Existing /api/app/crm/salesbot remains simulation only.
- FORCE RLS, current account-active requirement, only hh_crm_backend grants, nonce-bound AES-GCM, strict allowlisted validation, optimistic version conflict and 30-scenario limit.
- Editing an approved-preview graph automatically pauses it until explicitly reapproved; prior encrypted snapshot is preserved. Approved preview does not publish to visitors or send messages.
- EN/RU/ES and compact 320–430px controls, account switch resets local editor and aborts pending fetches.

## Migration
supabase/migrations/20261025192412_hh_crm_salesbot_owner_drafts_20261025.sql

Review against current production migrations, then apply by controlled Supabase migration only after code checks. Confirm table and index, relrowsecurity AND relforcerowsecurity, GRANT scope, and all three policies under hh_crm_backend. Verify anon/authenticated and another-owner negative SELECT, UPDATE and INSERT, plus positive authorized owner create/save/pause under rollback transaction. No data API grants.

## Release gates
1. Run node --test tests/crm-salesbot-flow.test.mjs.
2. Run node --conditions=react-server --test tests/crm-salesbot-drafts.integration.mjs.
3. Lint all new files and affected CRM component, typecheck and Next.js build.
4. Review all migration/RLS changes, no secret/medical data exposure, no side effects, check GitHub CI checks.
5. Signed-in owner UI path: /ru/app/practice?panel=crm&crmTab=automations. Save -> reload -> restore -> edit -> approve preview -> pause; second-tab stale revision must fail with 409. Other master must not read flows. Test 320, 390, 430 pixels, WebKit and Chromium, EN/RU/ES. Guest API 401, mismatched account 409, other-master denied. Never treat a mock as signed-in E2E.
6. Merge into actual production branch codex/public-book-library only after safe gates. Verify Vercel READY exact merged SHA and canonical holistichouse.vercel.app alias. Update #985 with evidence.

## Rollback and limits
- Migration is additive; do not drop draft data as part of code rollback.
- If API/UI fail, revert the PR; encrypted records remain inaccessible to client-facing roles.
- No paid AI, ads, customer messages, Telegram/WhatsApp/Meta activation, phone calls, public bot engine or payment implementation included. Do not lift privacy hold.
- Later phases #985, #990, #1302, #1519 require official providers, explicit consent, E2E and budget gates.

References: PR #2062 clean-room SalesBot plan; PR #2068 R1.
