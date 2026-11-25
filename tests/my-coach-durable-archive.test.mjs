import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  MY_COACH_PROTOCOL_PAGE_SIZE, normalizeMyCoachProtocolCursor,
  unpackLegacyMyCoachProtocol, sameMyCoachProtocol,
} from '../lib/personal-coaching/protocol-archive.mjs'

const protocolId = '11111111-1111-4111-8111-111111111111'
const date = '2026-11-22T13:35:22.000Z'
const cursorDate = '2026-11-22T13:35:22.000123Z'

test('keyset cursor rejects missing twin, invalid dates, injection, and odd IDs', () => {
  assert.equal(MY_COACH_PROTOCOL_PAGE_SIZE, 20)
  assert.equal(normalizeMyCoachProtocolCursor(), null)
  assert.deepEqual(normalizeMyCoachProtocolCursor({before: cursorDate, beforeId: protocolId}),
    {before: cursorDate, beforeId: protocolId})
  for (const invalid of [
    {before:cursorDate},{beforeId:protocolId},
    {before:date,beforeId:protocolId}, // 3-digit Date silently loses precision
    {before:'2026-11-22T13:35:22Z',beforeId:protocolId},
    {before:cursorDate,beforeId:"' OR TRUE --"},
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


test('microsecond cursor preserves distinct records inside the same millisecond',()=>{
 const first=normalizeMyCoachProtocolCursor({before:'2026-11-22T13:35:22.000001Z',
   beforeId:protocolId})
 const last=normalizeMyCoachProtocolCursor({before:'2026-11-22T13:35:22.000999Z',
   beforeId:'22222222-2222-4222-8222-222222222222'})
 assert.notEqual(first.before,last.before)
 assert.ok(first.before<last.before)
 const sameTimestamp=normalizeMyCoachProtocolCursor({before:first.before,
   beforeId:'33333333-3333-4333-8333-333333333333'})
 assert.notEqual(first.beforeId,sameTimestamp.beforeId)
 for(const bad of ['2026-02-30T13:35:22.000123Z',
   '2026-11-22T13:35:22.000123+00:00',
   '2026-11-22T13:35:22.000123Z\' OR 1=1 --'])
  assert.throws(()=>normalizeMyCoachProtocolCursor({before:bad,beforeId:protocolId}),
    /MY_COACH_PROTOCOL_CURSOR_INVALID/)
})

test('archived pages show earlier owner-only protocols without dropping same-millisecond records',()=>{
 const code=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(code,/saved_at_cursor/)
 assert.match(code,/before:last\.saved_at_cursor/)
 assert.match(code,/to_char\(saved_at AT TIME ZONE 'UTC'/)
 assert.match(code,/\(saved_at,protocol_id\)<\(\$2::timestamptz,\$3::uuid\)/)
 for(const label of ['Show earlier sessions','Показать предыдущие сессии','Mostrar sesiones anteriores'])
  assert.ok(ui.includes(label),label)
 assert.match(ui,/data-my-coach-load-earlier/)
 assert.match(ui,/new URLSearchParams\(\{before:cursor.before,beforeId:cursor.beforeId\}\)/)
 assert.match(ui,/known\.has\(item\.id\)/)
 assert.match(ui,/protocolPage\.accountId===accountId/)
 assert.match(ui,/activeAccountRef\.current!==accountId/)
})

// Regression: the public Samir coach must be accepted by the same archive as the other coaches.
import {normalizeMyCoachProtocol} from '../lib/personal-coaching/session-protocol.mjs'
import {projectCoachPriorSessions} from '../lib/coaching/coach-staged-memory.mjs'
test('Samir can archive a reviewed partial conversation with his primary or optional method',()=>{
 const input={id:protocolId,personaId:'genie',locale:'en',startedAt:date,completedAt:date,
  turns:[{role:'user',content:'Yes',unanswered:true}]}
 for(const methodId of [undefined,'woop','appreciative_inquiry']){
  const p=normalizeMyCoachProtocol({...input,methodId})
  assert.equal(p.personaId,'genie')
  assert.equal(p.methodId,methodId||'woop')
  assert.equal(p.turns[0].unanswered,true)
 }
 assert.throws(()=>normalizeMyCoachProtocol({...input,methodId:'grow'}),/MY_COACH_PROTOCOL_INVALID/)
})
test('returning client never inherits a speech repair as name and older valid names survive',()=>{
 const rows=['Say again','','','Mary Jane'].map((name,i)=>({
  provenance:'client_reviewed_dialogue',completedAt:new Date(Date.parse(date)-i*1000).toISOString(),opening:{name}
 }))
 const result=projectCoachPriorSessions(rows,'Account Name')
 assert.equal(result.preferredName,'Mary Jane')
 assert.equal(result.previous.length,3)
 assert.equal(projectCoachPriorSessions(rows.slice(0,3),'Account Name').preferredName,'Account Name')
})

import {normalizeMyCoachDraft,draftTranscriptPrefix,validDraftRevision} from '../lib/personal-coaching/protocol-draft.mjs'
import {createCoachDraftQueue} from '../lib/personal-coaching/protocol-draft-queue.mjs'
test('autosaved partial protocol remains unreviewed and does not become a reviewed fact',()=>{
 const value={courseSessionId:'life_direction',protocol:{id:protocolId,personaId:'genie',locale:'ru',startedAt:date,completedAt:date,goal:'not confirmed',clientSummary:'not confirmed',turnLayout:'chronological',turns:[{role:'user',content:'Мой вопрос'}]}}
 const draft=normalizeMyCoachDraft(value)
 assert.equal(draft.protocol.provenance,'client_autosaved_unreviewed_draft')
 assert.equal(draft.protocol.goal,'');assert.equal(draft.protocol.clientSummary,'')
 assert.equal(draft.protocol.turns[0].unanswered,true)
 assert.equal(projectCoachPriorSessions([draft.protocol]).hasPreviousSession,false)
 assert.equal(validDraftRevision(0),false)
 assert.equal(draftTranscriptPrefix(draft.protocol,{...draft.protocol,turns:[...draft.protocol.turns,{role:'assistant',content:'Reply'}]}),true)
 assert.equal(draftTranscriptPrefix(draft.protocol,{...draft.protocol,turns:[{role:'user',content:'Changed'}]}),false)
})
test('checkpoint queue retries the same revision and only acknowledges matching server receipts',async()=>{
 const revisions=[];let fail=true
 const queue=createCoachDraftQueue(async(revision,value)=>{revisions.push(revision);if(fail){fail=false;throw Error('offline')}return {id:value.protocol.id,revision,saved:true}})
 const value={courseSessionId:'life_direction',protocol:{id:protocolId,turns:[{role:'user',content:'First'}]}}
 queue.offer(value);assert.equal(await queue.flush(),null);assert.equal(queue.revision(),0)
 queue.offer({...value,protocol:{...value.protocol,turns:[...value.protocol.turns,{role:'assistant',content:'Reply'}]}})
 assert.equal(await queue.flush(),2);assert.deepEqual(revisions,[1,1,2]);queue.stop();assert.equal(await queue.flush(),null)
})
test('draft API requires account header, origin, separate rate and no provider sharing',()=>{
 const route=readFileSync(new URL('../app/api/app/my-coach/draft/route.js',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 assert.match(route,/auth\.verified\(\)/);assert.match(route,/requireSameOrigin/);assert.match(route,/ACCOUNT_CHANGED/);assert.match(route,/my-coach-draft-checkpoint/)
 assert.match(server,/pg_advisory_xact_lock/);assert.match(server,/payload_ciphertext=null/);assert.match(server,/draftTranscriptPrefix/)
 assert.doesNotMatch(route,/fetch\(/)
})
