-- Extend existing consent evidence; no journal text is copied into the ledger.
alter table app_private.context_cloud_grants
  drop constraint context_cloud_grants_category_check;
alter table app_private.context_cloud_grants
  add constraint context_cloud_grants_category_check
  check (category in ('goals', 'actions', 'reports', 'preferences', 'test_results', 'journal_excerpt'));
alter table app_private.context_cloud_grants
  add constraint context_cloud_grants_journal_session_check
  check (category <> 'journal_excerpt' or decision = 'revoke' or
    (item_id is not null and session_id is not null and expires_at is not null));
