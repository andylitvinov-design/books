# My Practice → Marketing — navigation and legacy-inventory decision (2026-10-21)

Source: canonical `codex/public-book-library`, not repository default. This change consolidates **navigation**, not customer data or marketing backends.

## Owner workflow
1. Open `/ru/app/practice` or `/en/app/practice` through verified Google.
2. Tap **Marketing / Маркетинг**. Compact hub: Growth Studio, SEO, Campaigns & enquiries, Website videos, YouTube upload.
3. Tools use the existing `/api/app/practitioner/open` server-controlled destination allowlist. Scoped admin session is issued **only** after verified owner identity and practitioner role.
4. Direct Growth Studio link uses `/admin/login?destination=growth`. Bounded Google OAuth continuation restores exact selected route, not legacy `/admin`.
5. Growth Studio header links back to new My Practice, not the old cabinet. SEO and Campaigns back buttons do the same.

## Legacy inventory (do not delete code or data)
- Old client records, private consultation reports, prescriptions, invoices, Reiki leads, audio, practitioner moderation, video upload and historical document attachment remain owner-only on existing guarded routes. Some are linked in **More practitioner tools** in My Practice.
- Business CRM Contacts and private clinical client profiles stay separate. No schema, migrations, copy, new DB or marketing opt-in is made here.
- Legacy `/admin` is retained as maintenance navigation and must not be presented as a second main home.
- Marketing reports: clicks ≠ received leads ≠ bookings ≠ paid orders. No ads, pixel, external publishing, OAuth scope expansion or paid services enabled.

## QA/release gates
- Focused source regression tests, lint, typecheck and build; verify real owner login on iPhone 320–430px.
- Direct unauthenticated `/admin/growth-studio` should route to Google then Growth Studio. Non-owner cannot open owner tools.
- Check Vercel READY exact source SHA and canonical domain. Build and HTTP status do **not** prove signed-in Google, Redis save/reload, social publishing or paid funnel.
