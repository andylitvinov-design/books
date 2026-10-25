-- Free Express v2: a VERIFIED one-hour first-party continuation can update
-- ONLY the ORIGINAL consented public enquiry. The first CRM contact is never
-- recreated and its original operation hash is never changed.
-- Crucial: a public HH-... reference alone cannot set the transaction-local
-- hh.public_enquiry_continuation value; the application validates a HMAC-backed
-- HttpOnly cookie BEFORE opening this restricted backend transaction.
begin;

create policy hh_free_express_guest_continuation_read
on app.public_service_enquiries
for select to hh_app_backend
using (
  operation_id::text = current_setting('hh.public_enquiry_continuation', true)
  and source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and status in ('requested','contacted')
  and created_at > now() - interval '1 hour'
);

create policy hh_free_express_guest_continuation_update
on app.public_service_enquiries
for update to hh_app_backend
using (
  operation_id::text = current_setting('hh.public_enquiry_continuation', true)
  and source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and status in ('requested','contacted')
  and created_at > now() - interval '1 hour'
)
with check (
  operation_id::text = current_setting('hh.public_enquiry_continuation', true)
  and source_path ~ '^/(en|ru|es)/services/free-situation-review$'
  and status in ('requested','contacted')
  and created_at > now() - interval '1 hour'
);

commit;
