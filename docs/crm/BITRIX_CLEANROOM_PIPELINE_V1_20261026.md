# Holistic House — Bitrix24-style CRM, clean-room feature plan

**26 October 2026 · Toronto** · Tracking [CRM #985](https://github.com/andylitvinov-design/books/issues/985), [revenue #990](https://github.com/andylitvinov-design/books/issues/990), [analytics #988](https://github.com/andylitvinov-design/books/issues/988), [SalesBot #2068](https://github.com/andylitvinov-design/books/pull/2068), [SalesBot R2a #2078](https://github.com/andylitvinov-design/books/pull/2078). Branch **codex/public-book-library** (not GitHub default). Site: https://holistichouse.vercel.app.

## Scope and product decision

Copy useful **workflow concepts**, not Bitrix source code, screenshots, logos, icons, colors, text or APIs. Build with existing Holistic House components and owner-scoped CRM. This is a *feature* task in Remaster terminology, NOT a Bitrix24 clone. Keep commercial contact records separate from practitioner clinical profiles, self-check results and private client materials.

Authoritative public competitor references (read-only):
- Bitrix sales pipelines and Kanban: https://helpdesk.bitrix24.com/open/20739996/
- CRM item detail/timeline: https://helpdesk.bitrix24.com/open/22879716/
- Automation and triggers: https://helpdesk.bitrix24.com/open/24653112/
- Role-based permissions: https://helpdesk.bitrix24.com/open/24127550/
- Smart Process Automation: https://helpdesk.bitrix24.com/open/19141012/
- Remaster clean-room feature method: https://github.com/thenavidm/remaster
- REA official prerequisites/observability: https://rea.tools/get-started/

## Existing / gaps — no duplicate platforms

| Capability | Existing module | Next safe enhancement | Priority |
|---|---|---|---|
| CRM contacts, lifecycle, owner auth | My Practice CRM Contacts, contact search/export, FORCE RLS | preserve; don't copy into clinical Clients | DONE (code) |
| Follow-ups and history | CRM Tasks, full activity history, source/manual stage | ensure end-to-end with real owner/session and independent account | P0 acceptance |
| Unplanned leads | Leads triage, protected auto-plan for website/course | measure oldest unplanned across all pages, prevent silent omissions | P0 |
| Omnichannel inbox | Messages, consented individual channels | official provider test, real receipt and STOP; no bulk/health notifications | P0 acceptance |
| SalesBot | Existing flow preview and encrypted owner drafts R2a | provider-free test, then consent-gated manual dispatch separate milestone | P1 |
| **B2B web enquiry Kanban** | Existing app_private.business_consulting_requests, statuses and protected owner update | **This PR:** new Business pipeline tab, 4 columns and search | **Implemented in source** |
| All-service sales opportunity | CRM contact + public enquiry, no unified deal model | unique owner-scoped opportunity ID; link verified enquiry to one contact, independent of contact lifecycle | P1 |
| Offers and bookings | services and discussions, independent payments | require verified slot and provider/calendar confirmation; block double bookings | P1 |
| Payments and invoices | existing payment modules and provider limitations | status paid only from signed provider receipt; never infer paid from stage or click | P1 |
| Funnel KPIs | source/manual attribution, reports | server-confirmed enquiry → qualified → booked → attended → paid; dedup and privacy hold | P1 |
| Assistants/team | owner only | grant per-object role and revocation, audit, 403 on cross-practitioner access | P2 |
| Retention, AI summaries | partial | define retention with real deletion tests; explicit consent for any AI on client content | P2 |

## Increment shipped in this PR: visible *business* requests, not universal deals

Use existing **My Practice → CRM → Business pipeline**, not a new contact table. The board reflects only the **latest up to 100** owner-scoped business consulting enquiries read from the existing encrypted inbox. Four manually controlled stages: New, Contacted, Booked (manual), Closed. Unrecognized statuses are not silently mapped to New. Cards link to their current protected status action with optimistic revision conflict detection. Private response channels and customer question are closed in `details` until explicitly expanded. Existing Overview list stays intact. Local search only searches loaded name/format; no server search, network call or identifier in URL. EN/RU/ES and responsive single-column at <=600px with 44px targets.

**Non-goals:** contact/client merge, cross-site attribution, messages, marketing consent, provider delivery, booking, billing, appointments, refunds, paid API calls, AI decision making or automatic stage triggers. The manual Booked status is explicitly **not verified booking/payment**. Counts do not represent an all-time sales funnel, especially at the 100-row cap.

### Implementation and test gates

- `lib/crm/business-pipeline.mjs`: pure bucketing/sorting, explicit 100-row limitation.
- `components/app/crm-business-enquiries.jsx` and CSS: reuse current cards and mutations for board mode; preserve Overview list.
- `components/app/crm-manager.jsx`: new nav section, existing owner/data session.
- `tests/crm-business-pipeline.test.mjs`: stage integrity, unknown statuses, oldest first, partial boundary, no messaging/payment, ownership/optimistic revision source contract.
- `.github/workflows/hh-crm-source-check.yml`: exact PR head native Node tests, ESLint and Next.js production build.

Before calling it live: exact-head green CRM CI + build, review full PR diff and no unrelated changes, merge to true production branch, Vercel deployment READY with exact SHA and canonical domain alias. Then authenticated owner open/refresh/change stage, 409 concurrency, second-account denial, 320/390/430px browser/VoiceOver as applicable. Anonymous HTTP 200 and unit tests cannot replace protected E2E.

## Remaster / REA implementation status

**Remaster feature workflow:** public documentation reconnaissance and clean-room feature matrix completed; adapted to existing Holistic House style. Pixel measurement, interaction screenshots and Remaster CLI gates **not run in this session**: the owner's Desktop Commander Mac reports **Offline**, and there is no authorized signed-in CRM browser context. Preserve already installed isolated Remaster `@thenavidm/remaster@0.2.1`; don't reinstall duplicate agents or disable preview cost guard.

**REA:** not executed and not needed to inspect proprietary Bitrix code; only authorized first-party runtime tracing is appropriate. REA's official current requirements are Node 22.23.4+ / 24.22.1+ / 26.12.1+; previously reported Mac Node v22.22.3 does not meet them. Resolve with isolated Node 24 LTS and reviewed `npx rea-agents@latest setup` only once that computer is online and setup change has been approved. Do not upgrade project runtime or install native decompilers for a simple CRM UI feature. No claim that REA or Remaster executed is valid here.

## Next increments (independent production gates)

1. **Universal opportunities (P1):** design `crm_opportunities` owner- and account-scoped schema with FORCE RLS and non-clinical fields (service, source, value, qualification, next action); idempotent import and independent contact lifecycle. Migrate only after DB contract and real owner E2E; no fake purchase ledger.
2. **Booking (P1):** one verified slot, Toronto timezone, calendar event only on confirmed authority/permission, reschedule & cancellation audit, idempotency, double-book denial.
3. **Payments/CRM funnel (P1):** payment provider receipt → locked trusted ledger → entitlement and CRM read-only milestone; neutral notifications only, consent checks; monthly conversion report grounded in server rows.

No external channels, ads, marketing automation, mass sending or paid API may be activated without explicit approval. Do not send health/test information or private descriptions to external notifications or tracking.
