import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {runInNewContext} from 'node:vm'
import * as recall from '../lib/coaching/coach-private-recall.mjs'

const reviewed={
  provenance:'client_reviewed_dialogue',completedAt:'2026-11-25T11:00:00Z',
  goal:'Synthetic focus',clientSummary:'Synthetic conclusion',clientNextStep:'Try the cedar exercise',
  turns:[{role:'user',content:'Synthetic raw transcript'}],
}

test('private entry projects one reviewed anchor and localizes its follow-up',()=>{
  assert.equal(typeof recall.projectCoachEntryContext,'function')
  const entry=recall.projectCoachEntryContext(reviewed,false)
  assert.deepEqual(entry,{kind:'next_step',value:'Try the cedar exercise'})
  for(const language of ['en','ru','es']){
    const text=recall.privateCoachEntryText(entry,language)
    assert.ok(text.includes('Try the cedar exercise'))
    assert.equal(text.match(/\?/g)?.length,1)
    assert.doesNotMatch(text,/Synthetic raw transcript|Synthetic conclusion|Synthetic focus/)
  }
  assert.deepEqual(recall.projectCoachEntryContext({...reviewed,clientNextStep:''},false),{kind:'topic',value:'Synthetic focus'})
})

test('private entry distinguishes unfinished and unavailable context without quoting a draft',()=>{
  assert.equal(typeof recall.projectCoachEntryContext,'function')
  assert.deepEqual(recall.projectCoachEntryContext(reviewed,true),{kind:'unfinished'})
  assert.deepEqual(recall.projectCoachEntryContext({...reviewed,provenance:'client_autosaved_unreviewed_draft'},false),{kind:'none'})
  assert.equal(recall.privateCoachEntryText({kind:'none'},'en'),'')
  assert.match(recall.privateCoachEntryText({kind:'unavailable'},'en'),/could not/i)
  assert.doesNotMatch(recall.privateCoachEntryText({kind:'unfinished'},'en'),/cedar|confirmed/i)
})

test('account-bound entry projection is awaited before Play and kept out of provider setup and history',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const route=readFileSync(new URL('../app/api/app/my-coach/protocol/route.js',import.meta.url),'utf8')
  const storage=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
  const bootstrap=ui.slice(ui.indexOf("appFetch('bootstrap?view=portrait'"),ui.indexOf("view=capabilities"))
  assert.match(bootstrap,/view=greeting-identity&includeContext=true/)
  assert.match(bootstrap,/accountId:id/)
  assert.match(bootstrap,/setGreetingIdentity\(\{status:'ready',[\s\S]*entryContext:value.entryContext/)
  assert.match(route,/readMyCoachGreetingIdentity\(config,actor,\{includeContext\}\)/)
  assert.match(storage,/includeContext\?\{entryContext:projectCoachEntryContext/)
  const enter=ui.slice(ui.indexOf('function enterCoachingFromGreeting'),ui.indexOf('const motionPhase'))
  assert.match(enter,/if\(greetingIdentity.status==='loading'(?:\|\|entryMemoryGrant\?\.status==='loading')?(?:\|\|courseRunId)?\)return/)
  assert.doesNotMatch(enter,/loadPrivateRecall|captureBasicIntroduction/)
  const portrait=ui.slice(ui.indexOf('function startSessionFromPortrait'),ui.indexOf('function ensureCoachMethodSession'))
  assert.doesNotMatch(portrait,/captureBasicIntroduction/)
  const relay=ui.slice(ui.indexOf('function acceptClarityRelayClock'),ui.indexOf('function queuePrivateDraft'))
  assert.doesNotMatch(relay,/loadPrivateRecall/)
  assert.equal(ui.match(/greetingIdentity\.entryContext/g)?.length,1)
  assert.match(ui,/greetingIdentity.owner===protocolOwnerRef.current/)
  assert.match(ui,/data-coach-private-entry-context/)
})

function simulateGreetingReads(){
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const start=ui.indexOf('  useEffect(()=>{\n    let active=true\n    const controller=new AbortController()')
  const end=ui.indexOf('\n  },[])',start)+8
  const pending=[],timers=new Set(),states=[],ready=[]
  const owner={current:null}
  let cleanup
  runInNewContext(ui.slice(start,end),{
    AbortController,
    useEffect:startEffect=>{cleanup=startEffect()},
    setTimeout:callback=>{timers.add(callback);return callback},
    clearTimeout:callback=>timers.delete(callback),
    turnsRef:{current:[]},protocolStartedRef:{current:null},protocolOwnerRef:owner,
    namePreferenceVersion:{current:null},
    setGreetingIdentity:value=>states.push(value),
    setProtocolOwnerReady:value=>ready.push(value),
    appFetch:(path,body,method,{accountId,signal})=>new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true})
      pending.push({path,accountId,signal,resolve,reject})
    }),
  })
  return {pending,timers,states,ready,owner,cleanup}
}

const ownerId='10000000-0000-4000-8000-000000000001'
const nextRead=()=>new Promise(resolve=>setImmediate(resolve))

test('slow account verification and memory loading each get their own bounded timeout and retry',async()=>{
  const state=simulateGreetingReads()
  ;[...state.timers][0]()
  await nextRead()
  assert.equal(state.pending.length,2)
  assert.equal(state.pending[0].signal.aborted,true)
  state.pending[1].resolve({account:{id:ownerId}})
  await nextRead()
  assert.equal(state.pending[2].accountId,ownerId)
  ;[...state.timers][0]()
  await nextRead()
  assert.equal(state.pending.length,4)
  assert.equal(state.pending[3].accountId,ownerId)
  state.pending[3].resolve({entryContext:{kind:'unfinished'},hasPreviousProtocol:true})
  await nextRead()
  assert.equal(state.states.at(-1).entryContext.kind,'unfinished')
  assert.deepEqual(state.ready,[true])
  assert.equal(state.timers.size,0)
})

test('greeting memory stops on account mismatch or unmount',async()=>{
  const changed=simulateGreetingReads()
  changed.pending[0].resolve({account:{id:ownerId}})
  await nextRead()
  changed.pending[1].reject(Object.assign(Error('ACCOUNT_CHANGED'),{status:409}))
  await nextRead()
  assert.equal(changed.pending.length,2)
  assert.equal(changed.owner.current,null)
  assert.deepEqual(changed.ready,[true,false])
  assert.equal(changed.states.at(-1).name,'')
  const closed=simulateGreetingReads()
  closed.cleanup()
  await nextRead()
  assert.equal(closed.pending.length,1)
  assert.equal(closed.pending[0].signal.aborted,true)
  assert.equal(closed.states.length,0)
})

test('entry consent explicitly binds the ticket to Gemini Free and discards a withdrawn request',async()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const start=ui.indexOf('  async function approveEntryMemory(')
  const end=ui.indexOf('\n  }',start)+4
  let finish
  const requests=[],states=[],owner='synthetic-owner'
  const approve=runInNewContext(ui.slice(start,end)+'\napproveEntryMemory',{
    AbortController,setTimeout,clearTimeout,
    entryMemoryRequest:{current:null},protocolOwnerRef:{current:owner},memoryProvider:'gemini_free',entryContextTopic:'',contextSession:null,
    setContextPaused:()=>{},
    setEntryMemoryGrant:value=>states.push(value),
    appFetch:(path,body,method,opts)=>{
      requests.push(JSON.parse(JSON.stringify({path,body,method,accountId:opts.accountId})))
      return new Promise(resolve=>{finish=resolve})
    },
  })
  const enabling=approve(true)
  await approve(false)
  finish({schema:'hh-my-coach-staged-memory-v1',stage:'identity',stageToken:'synthetic'})
  await enabling
  assert.equal(states.at(-1),null)
  assert.deepEqual(requests,[{path:'my-coach/staged-memory',method:'POST',accountId:owner,
    body:{stage:'identity',provider:'gemini_free',entry:true,consent:{
      sessionAccepted:true,priorSessions:true,providerSharing:true,
    }},
  }])
})
