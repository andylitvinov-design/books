# Lab activation checklist (no production changes)
- [x] Isolated Vercel project and SSO all-deployment protection.
- [x] Static smoke deployment READY (not a working copy of Holistic House).
- [x] Fail-closed preview policy and offline diagnostic.
- [ ] Durable shared lease / atomic quota accounting in a separate service, with concurrency tests.
- [ ] Isolated Supabase database and synthetic seed; no production customer data.
- [ ] Verified no side effects: payments, CRM, emails, SMS, webhooks, scheduled tasks, media generation.
- [ ] Real Vercel spend source; billing endpoint currently returns Plan not found.
- [ ] Build and smoke the full Next.js application in preview.
- [ ] Wire agent workflow to centrally verified release gate.

The existing Vercel deployment API defaults to preview when target is omitted. Do not set target='preview' in the API: it rejects that literal. Verify returned target is null and never 'production', and verify the project ID before proceeding. Never confuse a static READY deployment with app readiness.

Security: do not rely on HH_LAB_* booleans as proof of isolation. Do not set VERCEL production credentials or Supabase production URL in Lab.
