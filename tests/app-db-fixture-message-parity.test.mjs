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
  assert.match(migration(fixtures[5]), /message_alerts boolean not null default false/i);
  assert.match(migration(fixtures[5]), /message_alerts=true/i);
  assert.match(migration(fixtures[5]), /app\.practitioner_request_messages/);
});
