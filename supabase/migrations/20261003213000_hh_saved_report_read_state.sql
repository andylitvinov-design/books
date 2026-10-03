-- Owner-scoped read state is deliberately tiny: it supports a next-step hint
-- without copying a report body or widening any report-grant authority.
alter table app.saved_reports add column if not exists opened_at timestamptz;
grant update(opened_at) on app.saved_reports to hh_app_backend;
