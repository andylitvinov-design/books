-- PR Repair dispatch is a one-shot real action, not an observation.
-- Earlier QUEUED/WATCHING CI reads must not consume the future opportunity.
alter table business_brain.commander_pr_completions
  add column if not exists dispatch_attempted_at timestamptz;
comment on column business_brain.commander_pr_completions.dispatch_attempted_at is
  'Atomically reserved before any remote Repair workflow dispatch; prevents duplicate attempts while allowing CI to settle first.';
