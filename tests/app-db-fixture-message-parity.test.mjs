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

test('approved private delivery SQL executes once before opt-in engagement',()=>{
 const shim=readFileSync(new URL('./helpers/app-client-session-schema-parity.sql',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../sql/client-delivery-sessions-20261015.sql',import.meta.url),'utf8');
 const statements=[
   "await db.query(await readFile(new URL('./app-client-session-schema-parity.sql'",
   "await db.query(await readFile(new URL('../../sql/client-delivery-sessions-20261015.sql'",
   "await db.query(await readFile(new URL('../../supabase/migrations/20261020192118_hh_report_engagement_opt_in_20261020.sql'",
 ];
 const positions=statements.map(x=>fixture.indexOf(x));
 assert.ok(positions.every((p,i)=>p>0&&(i===0||p>positions[i-1])));
 assert.ok(positions.at(-1)<fixture.indexOf('create role hh_app_ci_login'));
 for(const x of statements)assert.equal(fixture.indexOf(x,fixture.indexOf(x)+1),-1);
 assert.match(shim,/current_database\(\) <> 'hh_app_test'/);
 assert.match(shim,/create table if not exists storage\.buckets/);
 assert.doesNotMatch(shim,/create table (?:if not exists )?app_private\.client_/i);
 for(const t of ['client_delivery_sessions','client_delivery_assets','client_session_share_grants','client_session_viewer_sessions']){
  assert.match(sql,new RegExp('create table if not exists app_private\\.'+t+'\\s*\\('));
  assert.match(sql,new RegExp('alter table app_private\\.'+t+' enable row level security'));
 }
 for(const p of ['hh_delivery_server_only','hh_delivery_asset_server_only','hh_delivery_grant_server_only','hh_delivery_viewer_server_only'])
   assert.ok(sql.includes('create policy '+p));
 assert.match(sql,/from PUBLIC, anon, authenticated/);
 assert.match(sql,/to hh_app_backend/);
 const real=migration('20261020192118_hh_report_engagement_opt_in_20261020.sql');
 assert.match(real,/create table if not exists app_private\.client_session_engagement_events/);
 assert.match(real,/force row level security/i);
});

test('five canonical immutable forms are populated in isolated database only',()=>{
 const source=readFileSync(new URL('./helpers/seed-additional-professional-versions.mjs',import.meta.url),'utf8');
 assert.match(fixture,/seedAdditionalProfessionalTestVersions\(db\)/);
 assert.match(source,/ADDITIONAL_PROFESSIONAL_DEFINITIONS/);
 assert.match(source,/process\.env\.CI !== 'true'/);
 assert.match(source,/HH_APP_TEST_RUNTIME !== 'isolated'/);
 assert.match(source,/url\.pathname !== '\/hh_app_test'/);
 assert.match(source,/EXPECTED_FIVE_INSTRUMENTS/);
 assert.match(source,/HH_PROFESSIONAL_FIXTURE_CONFLICT/);
 assert.match(source,/HH_PROFESSIONAL_FIXTURE_READBACK_MISMATCH/);
 assert.doesNotMatch(source,/on conflict[\s\S]{0,70}do update/i);
});