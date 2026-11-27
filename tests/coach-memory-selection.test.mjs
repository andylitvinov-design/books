import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeMemorySelection,ownerMemorySelectionAllowed,matchingMemoryEvidence,memorySelectionView} from '../lib/coaching/coach-memory-selection.mjs'
const id='00000000-0000-4000-8000-000000000001',op='00000000-0000-4000-8000-000000000002'
const source={kind:'reviewed_coaching_protocol',protocolId:id,courseSessionId:'clarity_support',fieldId:'resources',fieldRevision:1,turnIndex:0}
const save={action:'save',confirmed:true,operationId:op,expectedSettingsRevision:0,source,sourceFingerprint:'a'.repeat(64)}
const item={accountId:id,value:'A quiet walk',kind:'resource',source,evidenceStatus:'client_confirmed',temporalStatus:'historical'}
test('selection accepts only explicit reviewed source, never caller text or provider grants',()=>{
 assert.deepEqual(normalizeMemorySelection(save),save)
 for(const patch of [{confirmed:false},{value:'invented'},{accountId:id},{provider:'groq'},{sourceFingerprint:'short'},
  {source:{...source,fieldRevision:0}},{source:{...source,turnIndex:512}},{expectedSettingsRevision:-1},
  {operationId:[op]},{source:{...source,protocolId:[id]}}])
   assert.throws(()=>normalizeMemorySelection({...save,...patch}),/MY_COACH_MEMORY_SELECTION_INVALID/)
 assert.deepEqual(normalizeMemorySelection({action:'list'}),{action:'list',after:null})
 assert.throws(()=>normalizeMemorySelection({action:'list',after:'bad'}))
 assert.throws(()=>normalizeMemorySelection({action:'forget',confirmed:false,operationId:op,id,expectedRevision:0}))
})
test('every archive reference requires both active canonical permissions',()=>{
 const settings={memory_enabled:true,sensitive_enabled:true,revision:0}
 assert.equal(ownerMemorySelectionAllowed(settings),true)
 for(const patch of [{memory_enabled:false},{sensitive_enabled:false},{revision:-1},{revision:'1'}])
  assert.equal(ownerMemorySelectionAllowed({...settings,...patch}),false)
 assert.equal(ownerMemorySelectionAllowed(null),false)
})
test('exact current source evidence only; no substitution or duplicate match',()=>{
 assert.equal(matchingMemoryEvidence([item],source),item)
 for(const patch of [{fieldRevision:2},{turnIndex:2},{courseSessionId:'goal_resources'},{fieldId:'goal'}])
  assert.equal(matchingMemoryEvidence([item],{...source,...patch}),null)
 assert.equal(matchingMemoryEvidence([item,item],source),null)
 assert.equal(matchingMemoryEvidence([{...item,evidenceStatus:'ai_hypothesis'}],source),null)
})
test('client projection is owner-only, historical and never a provider grant',()=>{
 const row={id,account_id:id,revision:0,status:'active',created_at:'2026-11-27T21:00:00Z'}
 const result=memorySelectionView(row,item)
 assert.equal(result.providerShareable,false);assert.equal(result.scope,'owner_only')
 assert.equal(result.value,item.value);assert.equal(Object.hasOwn(result,'accountId'),false)
 assert.equal(memorySelectionView({...row,status:'blocked'},item),null)
 assert.equal(memorySelectionView({...row,account_id:op},item),null)
 assert.equal(memorySelectionView(row,null),null)
})
test('SQL candidate uses canonical settings, account-scoped FK and irreversible block',()=>{
 const sql=readFileSync(new URL('../docs/coaching/PERSONAL_MEMORY_PROTOCOL_REFS_DRAFT.sql',import.meta.url),'utf8')
 assert.match(sql,/REFERENCES app_private\.client_ai_memory_settings\(account_id\)/)
 assert.match(sql,/FOREIGN KEY\(account_id,protocol_id\) REFERENCES app_private\.my_coach_protocol_records\(account_id,protocol_id\) ON DELETE CASCADE/)
 assert.match(sql,/UNIQUE\(account_id,protocol_id,field_id\)/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/OLD\.status<>'active' OR NEW\.revision<>OLD\.revision\+1/)
 assert.match(sql,/FOREIGN KEY\(account_id,ref_id\) REFERENCES app_private\.client_ai_memory_protocol_refs\(account_id,id\) ON DELETE CASCADE/)
 assert.match(sql,/DELETE FROM app_private\.client_ai_memory_protocol_ref_versions/)
 assert.match(sql,/AFTER UPDATE OF memory_enabled,sensitive_enabled/)
 assert.match(sql,/status='blocked',source_hash=NULL,revision=revision\+1/)
 assert.doesNotMatch(sql,/SECURITY DEFINER|payload_ciphertext|protocol_ciphertext/)
})
test('server boundary stays private and forget is possible with flag off',()=>{
 const route=readFileSync(new URL('../app/api/app/my-coach/memory-selection/route.js',import.meta.url),'utf8')
 const store=readFileSync(new URL('../lib/app/my-coach-memory-selection.js',import.meta.url),'utf8')
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(route,/input\.action!=='forget'/)
 assert.match(store,/readSettings\(db,actor,true\)/)
 assert.match(store,/ownerMemoryFingerprint\(config,actor\.id,item\)!==input\.sourceFingerprint/)
 assert.match(store,/MY_COACH_MEMORY_BLOCKED/)
 assert.match(store,/latest\.revision!==settings\.revision/)
 assert.doesNotMatch(store,/fetch\(|sendToProvider|modelGateway/)
})

test("a correction requires explicit confirmation and an exact active revision", () => {
  const input = {action:"correct",confirmed:true,operationId:op,id,expectedRevision:0,value:"  A walk by the sea.  "}
  assert.deepEqual(normalizeMemorySelection(input),{...input,value:"A walk by the sea."})
  for (const patch of [{value:" "},{value:"x".repeat(601)},{value:"bad\u0000text"},
    {confirmed:false},{expectedRevision:-1},{provider:"groq"},{accountId:id},{kind:"resource"}]) {
    assert.throws(()=>normalizeMemorySelection({...input,...patch}),/MY_COACH_MEMORY_SELECTION_INVALID/)
  }
})

test("the latest correction has distinct provenance and cannot fall back to the old quote", () => {
  const row = {id,account_id:id,revision:1,status:"active",created_at:"2026-11-27T21:00:00Z"}
  const correction = {revision:1,value:"A walk by the sea.",confirmedAt:"2026-11-27T21:10:00Z"}
  assert.equal(memorySelectionView(row,item),null)
  assert.equal(memorySelectionView(row,item,{...correction,revision:2}),null)
  const view = memorySelectionView(row,item,correction)
  assert.equal(view.value,correction.value)
  assert.equal(view.valueSource,"owner_correction")
  assert.equal(view.confirmedAt,correction.confirmedAt)
  assert.equal(view.providerShareable,false)
  assert.deepEqual(view.source,item.source)
  assert.doesNotMatch(JSON.stringify(view),/quiet walk/)
})
