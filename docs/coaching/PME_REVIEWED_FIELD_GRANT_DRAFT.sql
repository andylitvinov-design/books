-- Use the existing owner-only Context Cloud ledger. No archive text is stored here.
-- Rehearse only until the reviewed migration and retention policy are approved.
begin;
alter table app_private.context_cloud_grants drop constraint context_cloud_grants_category_check;
alter table app_private.context_cloud_grants add constraint context_cloud_grants_category_check
 check (category in ('goals','actions','reports','preferences','test_results','journal_excerpt','reviewed_protocol_fields'));
alter table app_private.context_cloud_grants add constraint context_cloud_grants_reviewed_fields_check
 check (category <> 'reviewed_protocol_fields' or
  (provider_key='groq' and session_id is not null and
   ((decision='grant' and item_id is not null and expires_at is not null) or decision='revoke')));
commit;
