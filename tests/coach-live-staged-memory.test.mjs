import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  COACH_STAGED_MEMORY_SCHEMA,coachStagedMemoryProvider,coachClientPrior,
  coachPersonalView,coachLiveMemorySections
} from '../lib/coaching/coach-live-staged-memory.mjs'

const fixture={
  schema:COACH_STAGED_MEMORY_SCHEMA,stage:'identity',stageToken:'PRIVATE',
  prior:{preferredName:'Nina',hasPreviousSession:true,previous:[{
    date:'2026-11-11',topic:'Career change',clientConclusions:'I want a gradual transition',
    clientNextStep:'Talk to one colleague',provenance:'client_reviewed_dialogue',
    turns:[{role:'user',content:'DO NOT SHARE WHOLE TRANSCRIPT'}],
  }]}
}
test('provider-scoped stage identity only accepts reviewed account projections',()=>{
  assert.equal(coachStagedMemoryProvider('gemini_live_free'),'gemini_free')
  assert.equal(coachStagedMemoryProvider('gemini_paid'),'gemini_paid')
  assert.equal(coachStagedMemoryProvider('groq_stream'),'groq')
  assert.equal(coachClientPrior({...fixture,schema:'forged'}),null)
  const prior=coachClientPrior(fixture)
  assert.equal(prior.name,'Nina')
  assert.equal(prior.topic,'Career change')
  assert.equal(prior.previous.length,1)
  assert.equal(JSON.stringify(prior).includes('DO NOT SHARE WHOLE TRANSCRIPT'),false)
})
test('Live receives nothing by default, no raw turns, no token and only explicitly selected context',()=>{
  const noConsent=coachLiveMemorySections({identity:fixture})
  assert.deepEqual(noConsent,{identity:'',personal:''})
  const yes=coachLiveMemorySections({identity:fixture,shareIdentity:true})
  assert.match(yes.identity,/Nina/)
  assert.match(yes.identity,/UNTRUSTED DATA/)
  assert.doesNotMatch(yes.identity,/PRIVATE|DO NOT SHARE WHOLE TRANSCRIPT/)
  assert.equal(yes.personal,'')
  const selected={schema:COACH_STAGED_MEMORY_SCHEMA,stage:'personal',
    profile:{preferredLanguage:'ru'},context:{items:[
      {kind:'goals',sourceKind:'saved_life_plan',text:'Build confidence'},
      {kind:'test_results',sourceKind:'random',text:'Do not publish'}
    ]}}
  assert.equal(coachPersonalView(selected).items.length,1)
  const later=coachLiveMemorySections({personal:selected,sharePersonal:true})
  assert.match(later.personal,/Build confidence/)
  assert.doesNotMatch(later.personal,/Do not publish/)
  assert.equal(later.identity,'')
})
test('client UI gates old records after accepted invitation and later goals after focus',()=>{
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  const live=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
  const server=readFileSync(new URL('../lib/coaching/gemini-live-free.mjs',import.meta.url),'utf8')
  // Archive POST must remain for explicit protocol saving; disallow the old pre-Play GET.
  assert.ok(!ui.includes("fetch('/api/app/my-coach/protocol',{credentials:"))
  assert.match(ui,/allowOpeningPrior&&openingProgress\.lamps\.invitation/)
  assert.match(ui,/allowPersonalMemory&&openingProgress\.lamps\.focus/)
  assert.match(ui,/postStagedCoachMemory/)
  assert.match(ui,/sharePersonalMemory&&Boolean\(verifiedPersonal\)/)
  assert.match(live,/turnComplete:false/)
  assert.match(live,/memoryApplied/)
  assert.match(server,/NO earlier session has been authorized/)
  assert.ok(!server.includes('value.openingPrior?.name'))
})
