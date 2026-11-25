# Practitioner CRM — verified client profiles & private request conversations

**Holistic House · 19 Oct 2026 · EN/RU/ES UI**

## Existing client profiles for every master
- My Practice → Clients shows a searchable account-bound client list, counts, open requests, and a detail view with contact details explicitly provided in enquiries.
- Grouping uses a server-side HMAC of the verified `consultation_requests.account_id` and the exact `recipient_practitioner_id`. Equal names, shared phone/email and typed contact values **never merge two people**. No access to clinical reports, psychology tests, client documents, client cabinet, or another practitioner's requests.
- Master sees all consultations addressed to their profile, ordered by date and service, including the **original enquiry text and status**. Status changes reuse existing revision-controlled practitioner request workflow.

## Actual in-app correspondence history
- Client: My Cabinet → My consultations → individual request → **Conversation history**.
- Master: My Practice → Clients → select verified client → request → **Conversation history**.
- Both authenticated participants can write manual 1:1 replies inside Holistic House as long as the request is `requested` or `contacted`. After closure the history remains viewable but no further client-visible replies are sent.
- Only the assigned practitioner can additionally save **practitioner-only encrypted notes**. These are explicitly marked private; RLS blocks them from the client's account even within the same request.
- Each additional message lives in `app.practitioner_request_messages`, encrypted with the existing account-key infrastructure and request+message AAD. There is a 1,200-character bound, up to 40 messages per participant per request per 24 h, immutable operation UUID for safe retries, and 40-message keyset pagination. There are no attachments, email notifications or provider sends.
- **Status is 'saved in the private Holistic House thread,' not 'delivered to phone/email/Telegram/WhatsApp'**. Clients must visit the consultation page to read replies until an independently approved notification service is connected.

## Authorization model
- `createRequestAuth.verified` confirms a live Supabase user session.
- `app/api/app/practitioner-client-messages/route.js` requires exact matching `X-HH-Account-Id`, same-origin POST, strict body whitelist and no-store.
- The repository invokes `transaction(config,actor,...)` under restricted `hh_app_backend`, which verifies active session, scopes each request to its actual requester or the verified active recipient practitioner, encrypts message text and caps reads.
- New DB table uses **FORCE RLS** with explicit `SELECT/INSERT` to `hh_app_backend` only, and **no anon/authenticated direct grants or UPDATE/DELETE**. Two participant checks are repeated at the DB boundary, including note visibility.
- The initial request text/contact is readable to the relevant practitioner only because the client already submitted that specific service enquiry; no profile or medical data is silently imported from the client Cabinet.
- Unique actor and message ID + original encrypted payload must match on retries. An attempt to reuse a request UUID for a different sender, recipient, visibility or text fails.

## Acceptance checklist
- [ ] Signed-out GET/POST returns 401; mismatched account header returns 409.
- [ ] Requester cannot fetch another person's request, another master's request or private master notes.
- [ ] Master A cannot view client requests/messages addressed only to master B, even if a request UUID is guessed.
- [ ] A client may write only client-visible replies, never practitioner-only notes.
- [ ] Closing/withdrawing a request preserves history but disables new shared messages.
- [ ] A private master note does not generate a client-visible message or any external provider call.
- [ ] Two requests from the same authenticated client group into one profile, even with changed contact name. Same name/email across different accounts remains distinct.
- [ ] Synthetic RLS and UI tests, production Next.js build, exact Vercel READY commit, desktop/mobile 360–430px verified.
- [ ] Confirm no false 'delivered/read' claims, no unapproved clinical export, and no public/paid sends.

## External provider limitations
The owner-only CRM Messenger channel adapter remains separate. No integration with Telegram/WhatsApp/Instagram/Facebook personal chat archives exists without official accounts, permissions, client consent and secure identity binding. Never merge an external contact with a client account by phone/name alone. A future verified provider integration may add a consent-driven identity link, but not in this release.

## Rollback / costs
The new table is additive and remains empty until someone sends a real authenticated in-app message. Rollback of the app code leaves encrypted history untouched for recovery; do not drop the table or delete customer content. No external messaging credits or subscriptions are activated.
