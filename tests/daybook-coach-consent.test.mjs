import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { hasCoachContextGrant } from '../lib/coaching/context-cloud-consent.mjs'
import { selectCoachContext } from '../lib/coaching/context-cloud-selector.mjs'
import { projectCoachSelectedContext } from '../lib/coaching/coach-staged-memory.mjs'
import {coachLiveMemoryNote} from '../lib/coaching/coach-live-memory-note.mjs'
import {geminiLiveContextMessage} from '../lib/coaching/gemini-live-transport.mjs'
import { withCoachContext } from '../lib/coaching/context-cloud-messages.mjs'
const request={accountId:'owner',sessionId:'session',sessionOnly:true,includeJournal:true,provider:'groq',policyVersion:'p',role:'coach',topicKey:'body_health',now:100}
const revision='journal:1:1:body_health:0:18'
const grant={...request,purpose:'coaching',category:'journal_excerpt',itemId:'entry',sourceRevision:revision,
 revision:1,decision:'grant',occurredAt:50,expiresAt:200}
const scope={...request,category:'journal_excerpt',itemId:'entry',sourceRevision:revision}
const item={id:'entry',accountId:'owner',category:'journal_excerpt',topicKey:'body_health',sourceKind:'selected_daybook_excerpt',
 sourceRevision:revision,currentSourceRevision:revision,status:'confirmed',sensitivity:'coach_shareable',reviewedAt:50,expiresAt:200,text:'I will walk today.'}
test('journal grants require an explicit item, finite expiry and exact current session, never account-wide fallback',()=>{
 assert.equal(hasCoachContextGrant(scope,[grant]),true)
 for(const patch of [{sessionId:null},{itemId:null},{expiresAt:null},{sessionId:'other'}]){
  assert.equal(hasCoachContextGrant(scope,[{...grant,...patch}]),false)
 }
 assert.equal(hasCoachContextGrant({...scope,sessionOnly:false},[grant]),false)
 assert.equal(hasCoachContextGrant({...scope,accountId:'other'},[grant]),false)
 assert.equal(hasCoachContextGrant({...scope,sourceRevision:revision+'x'},[grant]),false)
})
test('item and global withdrawals take precedence; a grant from another conversation cannot resurrect sharing',()=>{
 for(const revoke of [{...grant,revision:2,decision:'revoke'},
  {...grant,revision:2,decision:'revoke',sessionId:null,itemId:null,sourceRevision:null}]){
  assert.equal(hasCoachContextGrant(scope,[grant,revoke]),false)
 }
 assert.equal(hasCoachContextGrant(scope,[{...grant,decision:'revoke'}, {...grant,revision:2,sessionId:'other'}]),false)
})
test('reviewed excerpt projects through the actual provider boundary only with selected-saved-context opt-in',()=>{
 const packet=selectCoachContext(request,[item],[grant])
 assert.equal(packet.items.length,1)
 assert.deepEqual(projectCoachSelectedContext(packet).items,[])
 assert.equal(projectCoachSelectedContext(packet,{goals:true}).items.length,1)
 const messages=[{role:'user',content:'What is one next step?'}]
 const projected=withCoachContext(messages,packet)
 assert.equal(projected.length,3)
 assert.match(projected[1].content,/selected_daybook_excerpt/)
 assert.equal(projected.at(-1),messages[0])
 assert.deepEqual(selectCoachContext({...request,sessionOnly:false},[item],[grant]).items,[])
 assert.deepEqual(selectCoachContext({...request,includeJournal:false},[item],[grant]).items,[])
})
test('actual encrypted owner source is rechecked for grant/source revision, topic, deletion and session before use',()=>{
 const daybookModule=new URL('../lib/app/coach-context-daybook.js',import.meta.url)
 const crypto=new URL('../lib/app/crypto.js',import.meta.url)
 execFileSync(process.execPath,['--conditions=react-server','--input-type=module','-e',`
  import assert from 'node:assert/strict'
  import {reviewDaybookContextItem,readApprovedDaybookItems} from ${JSON.stringify(daybookModule.href)}
  import {seal} from ${JSON.stringify(crypto.href)}
  const actor={id:'11111111-1111-4111-8111-111111111111'},id='33333333-3333-4333-8333-333333333333'
  const config={encryptionKey:Buffer.alloc(32,42),encryptionKeyId:'test'},now=Date.now()
  const payload={text:'I will walk today.',tags:[],kind:'note',locale:'en',timezone:'UTC',localDay:'2026-11-23',goalId:null}
  let row={id,revision:1,payload_ciphertext:seal(payload,{accountId:actor.id,recordId:id,field:'daybook.entry'},config),updated_at:new Date(now-1000)}
  let reads=0
  const db={query:async(sql,args)=>{reads++;assert.equal(args[0],actor.id);return {rows:row?[row]:[]}}}
  const input={itemId:id,topicKey:'body_health',excerpt:{revision:1,start:0,end:18}}
  const preview=await reviewDaybookContextItem(db,config,actor,input)
  assert.equal(preview.text,payload.text)
  const request={accountId:actor.id,sessionId:id,sessionOnly:true,includeJournal:true,provider:'groq',policyVersion:'p',role:'coach',topicKey:'body_health'}
  const grant={...request,purpose:'coaching',category:'journal_excerpt',itemId:id,sourceRevision:preview.sourceRevision,
   revision:1,decision:'grant',occurredAt:now-500,expiresAt:now+60000}
  reads=0
  assert.deepEqual(await readApprovedDaybookItems(db,config,actor,{...request,includeJournal:false},[grant]),[])
  assert.equal(reads,0)
  assert.equal((await readApprovedDaybookItems(db,config,actor,request,[grant])).length,1)
  reads=0
  assert.deepEqual(await readApprovedDaybookItems(db,config,actor,{...request,sessionOnly:false},[grant]),[])
  assert.equal(reads,0)
  assert.deepEqual(await readApprovedDaybookItems(db,config,actor,request,[grant,{...grant,revision:2,decision:'revoke'}]),[])
  assert.equal(reads,0)
  row={...row,revision:2}
  assert.deepEqual(await readApprovedDaybookItems(db,config,actor,request,[grant]),[])
  row=null
  assert.deepEqual(await readApprovedDaybookItems(db,config,actor,request,[grant]),[])
 `],{encoding:'utf8'})
})

test('approved journal excerpts reach Free Live unchanged only through the selected-context gate',()=>{
 const text='Ж'.repeat(240)
 const personal={context:projectCoachSelectedContext({items:[{kind:'journal_excerpt',sourceKind:'selected_daybook_excerpt',text}]},{goals:true})}
 assert.equal(coachLiveMemoryNote({personal}), '')
 const note=coachLiveMemoryNote({personal,goalsAllowed:true,topicKey:'body_health'})
 assert.ok(note.includes(text))
 assert.ok(note.includes('selected_daybook_excerpt'))
 assert.equal(geminiLiveContextMessage(note).clientContent.turnComplete,false)
})
