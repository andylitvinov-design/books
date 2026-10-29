import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fixture = readFileSync(new URL('./helpers/app-db-setup.mjs', import.meta.url), 'utf8');
const migration = (name) => readFileSync(
  new URL('../supabase/migrations/' + name, import.meta.url),
  'utf8',
);
const fixtures = [
  '20261017013000_hh_assessment_interpretation_registry.sql',
  '20261005165044_hh_master_network_r2_policy_hardening.sql',
  '20261019152000_hh_public_service_enquiries_secure.sql',
  '20261019121144_hh_practitioner_request_messages_20261019.sql',
  '20261020123209_hh_practitioner_request_followup_tasks_20261020.sql',
  '20261019174312_hh_practitioner_request_read_state_20261019.sql',
  '20261019180000_hh_client_message_push_optin.sql',
];

test('isolated CI fixture refuses production and nonempty databases', () => {
  assert.match(fixture, /HH_TEST_ADMIN_DATABASE_URL/);
  assert.match(fixture, /HH_APP_TEST_RUNTIME/);
  assert.match(fixture, /process\.env\.VERCEL/);
  assert.match(fixture, /127\.0\.0\.1/);
  assert.match(fixture, /Refusing to initialize nonempty test DB/);
  assert.match(fixture, /hh_app_test/);
});

test('real dependent migrations apply only inside isolated fixture, in dependency order', () => {
  const starts = fixtures.map((name) => {
    const expression = "await db.query(await readFile(new URL('../../supabase/migrations/" + name;
    const first = fixture.indexOf(expression);
    assert.ok(first > 0, 'Missing actual migration execution: ' + name);
    assert.equal(fixture.indexOf(expression, first + 1), -1, 'Duplicate migration: ' + name);
    return first;
  });
  assert.ok(starts.every((start, index) => index === 0 || start > starts[index - 1]));
  assert.ok(starts.at(-1) < fixture.indexOf('create role hh_app_ci_login'));
  assert.doesNotMatch(fixture, /CREATE TABLE (app\.practitioner_request_messages|app\.practitioner_request_reads)/);
});

test('reused migrations preserve table access policy and explicit notification opt-in', () => {
  assert.match(migration(fixtures[0]), /FORCE ROW LEVEL SECURITY/i);
  assert.match(migration(fixtures[0]), /CREATE POLICY interpretation_backend_read/i);
  assert.match(migration(fixtures[2]), /FORCE ROW LEVEL SECURITY/i);
  assert.match(migration(fixtures[2]), /CREATE POLICY public_service_enquiry_insert/i);
  assert.match(migration(fixtures[3]), /FORCE ROW LEVEL SECURITY/i);
  assert.match(migration(fixtures[3]), /CREATE POLICY practitioner_request_messages_participant_insert/i);
  assert.match(migration(fixtures[4]), /FORCE ROW LEVEL SECURITY/i);
  assert.match(migration(fixtures[4]), /CREATE POLICY practitioner_request_tasks_insert/i);
  assert.match(migration(fixtures[5]), /FORCE ROW LEVEL SECURITY/i);
  assert.match(migration(fixtures[6]), /message_alerts boolean not null default false/i);
  assert.match(migration(fixtures[6]), /message_alerts=true/i);
  assert.match(migration(fixtures[6]), /app\.practitioner_request_messages/);
});

test('isolated client-session parent schema matches production metadata before the real engagement migration', () => {
  const schema = readFileSync(new URL('./helpers/app-client-session-schema-parity.sql', import.meta.url), 'utf8');
  const parent = "await db.query(await readFile(new URL('./app-client-session-schema-parity.sql'";
  const child = "await db.query(await readFile(new URL('../../supabase/migrations/20261020192118_hh_report_engagement_opt_in_20261020.sql'";
  const before = fixture.indexOf(parent), after = fixture.indexOf(child);
  assert.ok(before > 0 && after > before && after < fixture.indexOf('create role hh_app_ci_login'));
  assert.equal(fixture.indexOf(parent, before + 1), -1);
  assert.equal(fixture.indexOf(child, after + 1), -1);
  assert.match(schema, /current_database\(\) <> 'hh_app_test'/);
  for (const table of ['client_delivery_sessions', 'client_session_share_grants', 'client_session_viewer_sessions']) {
    assert.match(schema, new RegExp('create table app_private\\.' + table + '\\('));
    assert.match(schema, new RegExp('alter table app_private\\.' + table + ' enable row level security'));
  }
  assert.match(schema, /references app_private\.client_delivery_sessions\(id,legacy_client_id\)/);
  assert.match(schema, /references app_private\.client_session_share_grants\(id\)/);
  assert.match(schema, /create policy hh_delivery_server_only/);
  assert.match(schema, /create policy hh_delivery_grant_server_only/);
  assert.match(schema, /create policy hh_delivery_viewer_server_only/);
  assert.match(schema, /from public,anon,authenticated,service_role/);
  assert.match(schema, /to hh_app_backend/);
  assert.doesNotMatch(schema, /create table app_private\.client_session_engagement_events/i);
  const real = migration('20261020192118_hh_report_engagement_opt_in_20261020.sql');
  assert.match(real, /create table if not exists app_private\.client_session_engagement_events/);
  assert.match(real, /force row level security/i);
  assert.match(real, /grant select,insert,update,delete on app_private\.client_session_engagement_events to hh_app_backend/);
});
