import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('components/app/profile-program-request.jsx')
const css=read('components/app/profile-program-request.module.css')
const profile=read('components/app/profile-space-dashboard.jsx')
const goal=read('components/app/profile-goal-console.jsx')
test('shared consultation disclosures remain available, with business session-only options',()=>{
 for(const program of ['clarity','business','goal']){
  const owner=program==='goal'?goal:profile
  const tag='<ProfileProgramRequest locale={'+(program==='goal'?'lang':'selected')+'} program="'+program+'"'
  assert.equal(owner.split(tag).length-1,1)
 }
 assert.ok(source.includes('aria-expanded={expanded} aria-controls={id}'))
 assert.ok(source.includes('hidden={!expanded}'))
 assert.ok(source.includes('data-program-request-ready={ready?"true":"false"}'))
 assert.ok(source.includes('disabled={!ready}'))
 assert.ok(source.includes('useEffect(()=>{setReady(true)},[])'))
 assert.ok(source.includes('onClick={()=>toggle(!expanded)}'))
 assert.ok(source.includes('program+\'-contact-options\''))
 assert.ok(profile.includes("getElementById('business-contact-options')"))
 assert.ok(profile.includes('showTrigger={false}'))
 assert.ok(source.includes('if(!showTrigger&&!expanded)return null'))
 assert.ok(source.includes('{showTrigger&&<button'))
 assert.ok(source.includes('MandatoryMessengerActions locale={lang} compact'))
 assert.ok(source.includes('telegramServiceRequestUrl(service,lang)'))
 assert.ok(source.includes('whatsappEnquiryUrl({locale:lang'))
 assert.ok(source.includes("program==='business'?'business':'coaching'"))
 for(const label of ['Request Details','Запросить детали','Solicitar detalles']) assert.ok(source.includes(label))
 assert.ok(css.includes('min-height:52px'))
 assert.ok(css.includes('min-height:44px'))
 assert.ok(css.includes('color:#fff!important'))
 assert.ok(css.includes('linear-gradient(145deg,#fff19b,#ffc520 44%,#e99000)'))
})
test('course entry remains separate from messenger disclosure',()=>{
 assert.ok(profile.includes('data-business-daybook-link'))
 assert.ok(profile.includes('<ClarityStartLink'))
 assert.ok(goal.includes('data-goal-vector-entry'))
 assert.ok(goal.includes('data-goal-current-lesson'))
})
