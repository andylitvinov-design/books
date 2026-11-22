import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  MY_COACH_PROTOCOL_PAGE_SIZE, normalizeMyCoachProtocolCursor,
  unpackLegacyMyCoachProtocol, sameMyCoachProtocol,
} from '../lib/personal-coaching/protocol-archive.mjs'

const protocolId = '11111111-1111-4111-8111-111111111111'
const date = '2026-11-22T13:35:22.000Z'

test('keyset cursor rejects missing twin, invalid dates, injection, and odd IDs', () => {
  assert.equal(MY_COACH_PROTOCOL_PAGE_SIZE, 20)
  assert.equal(normalizeMyCoachProtocolCursor(), null)
  assert.deepEqual(normalizeMyCoachProtocolCursor({before: date, beforeId: protocolId}),
    {before: date, beforeId: protocolId})
  for (const invalid of [
    {before:date},{beforeId:protocolId},
    {before:'2026-11-22T13:35:22Z',beforeId:protocolId},
    {before:date,beforeId:"' OR TRUE --"},
    {before:'not-a-date',beforeId:protocolId},
  ]) assert.throws(() => normalizeMyCoachProtocolCursor(invalid),
    /MY_COACH_PROTOCOL_CURSOR_INVALID/)
})

test('legacy migration preserves reviewed content, strips only savedAt', () => {
  const legacy = {id:protocolId, savedAt:date, provenance:'client_reviewed_dialogue',
    goal:'My goal', clientSummary:'My conclusion', turns:[{role:'user',content:'hello'}]}
  const snapshot = structuredClone(legacy)
  const item = unpackLegacyMyCoachProtocol(legacy)
  assert.equal(item.savedAt,date)
  assert.equal(item.protocol.clientSummary,'My conclusion')
  assert.equal(item.protocol.savedAt,undefined)
  assert.deepEqual(legacy,snapshot)
  assert.throws(() => unpackLegacyMyCoachProtocol({...legacy,savedAt:'invalid'}),
    /MY_COACH_PROTOCOL_UNAVAILABLE/)
})

test('identical retries allowed; changed text or ID blocked', () => {
  const original={id:protocolId,clientSummary:'reviewed'}
  assert.equal(sameMyCoachProtocol(original,structuredClone(original)),true)
  assert.equal(sameMyCoachProtocol(original,{...original,clientSummary:'changed'}),false)
  assert.equal(sameMyCoachProtocol(original,{...original,id:'22222222-2222-4222-8222-222222222222'}),false)
})

test('archive repository enforces per-account SQL, encryption, and deletion', () => {
  const code=readFileSync(new URL('../lib/app/personal-coaching.js', import.meta.url),'utf8')
  const migration=readFileSync(new URL('../supabase/migrations/20261122133522_hh_my_coach_durable_protocol_archive_v1_20261122.sql',import.meta.url),'utf8')
  assert.match(code,/app_private\.my_coach_protocol_records/)
  assert.match(code,/protocol_ciphertext/)
  assert.match(code,/recordContext\(actor/)
  assert.match(code,/MY_COACH_PROTOCOL_PAGE_SIZE/)
  assert.match(code,/migrateLegacyMyCoachProtocols/)
  assert.match(code,/delete from app_private\.my_coach_protocol_records where account_id=\$1 and protocol_id=\$2/)
  assert.match(migration,/enable row level security/i)
  assert.match(migration,/account_id = \(select auth.uid\(\)\)/i)
  assert.match(migration,/to hh_app_backend/i)
  assert.doesNotMatch(migration,/grant all .* authenticated/i)
})
