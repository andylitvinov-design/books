# My Practice — owner report and practitioner express report (2026-10-25)

## Scope
- **Owner Andrey only:** existing full clinical report, homeopathic remedies, prescriptions and the legacy client archive. The owner-only email hash + verified Google identity + short-lived server admin session remain the only bridge into /admin/reports and /admin/consultations.
- **Any activated practitioner including owner:** separate **Express diagnosis / Express report** inside My Practice. This is a private, nonmedical situation review. Reuse the original report's sequence (situation, observations, resources, practical next steps, follow-up, before/after scores); **no remedy, potency, dose or prescription fields**.
- **Verified client:** sees only explicitly published reports for requests created from the same authenticated account in My Reports. Drafts are not visible.
- Anonymous public enquiries are excluded: no verified client account to deliver a private report to.

## Storage/permissions
- New app.practitioner_express_reports table with app backend RLS. Each document references one existing verified consultation request, one exact assigned practitioner, and the requester's app account.
- All authored text including title is AES-256-GCM encrypted with the app's existing key and authenticated context binding to (client_account_id,report_id). No CRM contacts or legacy owner clinical profiles are merged.
- Master draft/save requires owned request; optimistic revision guard; explicit publish; publish is immutable (new report for follow-up) or revoke. Client has read-only published access.
- Do not send report content in emails, Telegram, WhatsApp, push, analytics, tracking pixels or URL queries. No new AI or paid provider.
- Owner full report remains unchanged; no downgrade or migration of existing prescriptions.

## Acceptance / release gates
1. Contract rejects medicine/homeopathy-specific structured fields and invalid input. UI contains no remedy controls.
2. Nonowner cannot use /api/app/practitioner/open or /admin/*; cannot retrieve/update another master's reports; client cannot see other accounts or drafts; exact request RLS.
3. Authenticated A→master draft→save→publish→client read; revoke immediately hides the report. Client data stays private.
4. EN/RU translation and compact iPhone width check.
5. Migration applied once, checked with pg_policies and grants, PR checks green, Vercel READY SHA matches canonical alias, authenticated browser E2E before claiming full live completion.
