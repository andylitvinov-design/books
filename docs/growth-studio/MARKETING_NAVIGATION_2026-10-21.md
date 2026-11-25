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

## 21 October follow-up: one canonical owner cabinet (requires rollout confirmation)

- **Canonical page:** `/{ru|en}/app/practice`. Historical `/admin` is now an **authenticated redirect** into My Practice rather than a giant alternative dashboard.
- **Specialist maintenance:** new `/admin/tools` is a compact owner-only index that reuses the old `PractitionerCabinet` component and exactly the existing guarded endpoints. Its three disclosure groups are client documents, materials/courses, and operations. Marketing tools remain consolidated in `/app/practice?panel=marketing`; no parallel CRM, copies or publisher created.
- **Reachability:** My Practice → More practitioner tools → Additional administrative tools uses the verified `/api/app/practitioner/open` fixed destination `tools`, never a direct link that skips admin-cookie issuance. Direct expired-session `/admin/tools` uses `/admin/login?destination=tools` and allowlisted `practitioner-tools` PKCE continuation, with server-side email+practitioner verification. `/admin/login` retains a safe `cabinet` default, which now passes through the canonical `/admin` redirect.
- The historical consultation, private client, invoice, report, Reiki audio/course, video, Telegram and practitioner moderation routes remain unchanged. Nothing is deleted or copied. No new payment, social post, cron, OAuth scopes or third-party analytics activated.

### Critical verification
1. Confirm `/admin` redirects to the proper RU/EN My Practice only after a valid owner admin session; signed-out private access goes through Google and does not expose records.
2. In My Practice tap Marketing → Growth Studio, return back to Marketing, then open More → Additional administrative tools → a client document and Reiki course. Test 320/375/390/430px.
3. Confirm non-owner denial, cookie scopes, current Supabase RLS, all private deep links. Verify Google OAuth on a real iPhone. Source CI can verify contracts, not a real user's signed-in navigation.
4. Merge to fresh canonical production branch, require CI/build, Vercel READY and exact SHA alias. Do not treat an HTTP 200 as functional delivery evidence.
