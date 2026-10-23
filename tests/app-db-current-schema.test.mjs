import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const setup = readFileSync(new URL('./helpers/app-db-setup.mjs', import.meta.url), 'utf8')
test('current isolated fixture keeps loopback, empty-database and least-privilege guards', () => {
  assert.match(setup, /process.env.CI!=='true'/)
  assert.match(setup, /process.env.HH_APP_TEST_RUNTIME!=='isolated'/)
  assert.match(setup, /process.env.VERCEL/)
  assert.match(setup, /\['127.0.0.1','localhost'\].includes\(url.hostname\)/)
  assert.match(setup, /url.pathname!=='\/hh_app_test'/)
  assert.match(setup, /if\(occupied\)throw new Error\('Refusing to initialize nonempty test DB'\)/)
  assert.match(setup, /create role service_role nologin nosuperuser nobypassrls/)
  assert.doesNotMatch(setup, /grant [^;\n]*to service_role/i)
})
test('exact current schema dependencies precede their consumers and synthetic login', () => {
  const position = name => { const index = setup.indexOf(name); assert.ok(index > 0, name); return index }
  assert.ok(position('20261005164140_hh_master_network_r2.sql') < position('20261019121144_hh_practitioner_request_messages_20261019.sql'))
  assert.ok(position('20261019121144_hh_practitioner_request_messages_20261019.sql') < position('20261019174312_hh_practitioner_request_read_state_20261019.sql'))
  assert.ok(position('20261019174312_hh_practitioner_request_read_state_20261019.sql') < position('20261019180000_hh_client_message_push_optin.sql'))
  assert.ok(position('20261013170000_hh_opt_in_push_notifications.sql') < position('20261019180000_hh_client_message_push_optin.sql'))
  assert.ok(position('create schema storage;') < position('client-delivery-sessions-20261015.sql'))
  assert.ok(position('client-delivery-sessions-20261015.sql') < position('20261020192118_hh_report_engagement_opt_in_20261020.sql'))
  assert.ok(position('20261017013000_hh_assessment_interpretation_registry.sql') < position('create role hh_app_ci_login'))
  assert.ok(position('20261020192118_hh_report_engagement_opt_in_20261020.sql') < position('create role hh_app_ci_login'))
})

test('public enquiry counts use the existing protected schema in isolated setup', () => {
  const migration = '20261019152000_hh_public_service_enquiries_secure.sql'
  assert.equal(setup.split(migration).length - 1, 1)
  const position = setup.indexOf(migration)
  assert.ok(position > setup.indexOf('20261005165044_hh_master_network_r2_policy_hardening.sql'))
  assert.ok(position < setup.indexOf('create role hh_app_ci_login'))
  assert.ok(setup.includes("await db.query(await readFile(new URL('../../supabase/migrations/" + migration + "',import.meta.url),'utf8'))"))
  assert.doesNotMatch(setup, /create table app\.public_service_enquiries|alter table app\.public_service_enquiries|grant .*public_service_enquiries/i)
})

test('practitioner task aggregates use the existing protected schema in isolated setup', () => {
  const migration = '20261020123209_hh_practitioner_request_followup_tasks_20261020.sql'
  assert.equal(setup.split(migration).length - 1, 1)
  const position = setup.indexOf(migration)
  assert.ok(position > setup.indexOf('20261002164037_hh_app_r1_foundation.sql'))
  assert.ok(position > setup.indexOf('20261005164140_hh_master_network_r2.sql'))
  assert.ok(position < setup.indexOf('create role hh_app_ci_login'))
  assert.ok(setup.includes("await db.query(await readFile(new URL('../../supabase/migrations/" + migration + "',import.meta.url),'utf8'))"))
  assert.doesNotMatch(setup, /create table app\.practitioner_request_tasks|alter table app\.practitioner_request_tasks|grant .*practitioner_request_tasks/i)
})
