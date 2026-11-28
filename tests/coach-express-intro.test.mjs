import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_EXPRESS_SECONDS,expressClock,expressCopy,expressInstruction,expressPersona} from '../lib/coaching/coach-express-intro.mjs'
test('express clock reaches closing at 100s, ends at 120s and cannot extend',()=>{
  const start=1000
  assert.equal(COACH_EXPRESS_SECONDS,120)
  for(const [elapsed,phase] of [[0,'opening'],[14999,'opening'],[15000,'contact'],[45000,'dialogue'],[99999,'dialogue'],[100000,'closing'],[119999,'closing'],[120000,'ended'],[900000,'ended']]){
    const result=expressClock(start,start+elapsed)
    assert.equal(result.phase,phase)
    assert.equal(result.mayOpenNewQuestion,elapsed<100000)
    assert.equal(result.mayTransport,elapsed<120000)
    assert.equal(result.remainingSeconds,Math.max(0,Math.ceil((120000-elapsed)/1000)))
  }
  assert.throws(()=>expressClock(1000,999))
  assert.throws(()=>expressClock(NaN,1000))
})
test('all locale and persona instructions keep course and intro separate',()=>{
  for(const locale of ['ru','en','es']){
    assert.ok(expressCopy(locale).button)
    for(const persona of ['mira','max','sofia','alex','merlin','harry','genie','caesar','lea','noah','iris','ray']){
      const prompt=expressInstruction(persona,locale)
      assert.match(prompt,/locked voice/)
      assert.match(prompt,/not a coaching course/)
      assert.match(prompt,/explicit consent/)
      assert.ok(prompt.includes(expressCopy(locale).opening))
    }
  }
  assert.throws(()=>expressInstruction('genie','fr'))
})

import {readFileSync} from 'node:fs'
test('greeting keeps resume flow and only offers authorized dedicated express transport',()=>{
 const source=readFileSync(new URL('../components/my-coach-greeting-gate.jsx',import.meta.url),'utf8')
 assert.match(source,/expressAvailable=false/)
 assert.ok(source.includes("expressAvailable===true&&typeof onExpressStart==='function'"))
 assert.ok(source.includes('available={canExpress}'))
 assert.ok(source.includes('gate.begin({id:expressActionId})'))
 assert.ok(source.includes("onExpressStart({personaId,locale:lang,mode:'express_intro'})"))
 assert.ok(source.includes('onResumeSession(entry.item)'))
 assert.ok(source.includes('resolveEntry(id)'))
})

test('express uses a distinct authenticated token route and never checkpoints a course',()=>{
 const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
 const transport=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/coaching/gemini-live-free.mjs',import.meta.url),'utf8')
 assert.ok(route.includes("joined === 'my-coach/express-token'"))
 assert.ok(route.includes('expressLiveApproved(process.env)'))
 assert.ok(transport.includes('if(r.expressIntro)return'))
 assert.ok(transport.includes('delete setup.setup.sessionResumption'))
 assert.ok(server.includes('express?COACH_EXPRESS_SECONDS*1000'))
 assert.ok(server.includes("express?',sessionResumption':''"))
})

test('exact free CTA and unique character reactions for all public coaches in all languages',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(expressCopy(locale).button,'Free chat: 2 min.')
  const ids=['mira','max','sofia','alex','merlin','harry','genie','caesar']
  assert.equal(new Set(ids.map(id=>expressPersona(id)[locale])).size,8)
  for(const id of ids){const prompt=expressInstruction(id,locale);assert.ok(prompt.includes(expressPersona(id)[locale]));assert.match(prompt,/First substantive reply/);assert.match(prompt,/not the worth of the person/)}
 }
})
test('lifetime account and coach claim is durable and only verified admin is exempt',()=>{
 const source=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
 const claims=readFileSync(new URL('../lib/app/coach-express-claims.js',import.meta.url),'utf8')
 const schema=readFileSync(new URL('../supabase/migrations/20261128144037_hh_coach_express_lifetime_claims.sql',import.meta.url),'utf8')
 assert.ok(source.includes('practitionerEmailAllowed(actor)&&await repo.isPractitioner(actor)'))
 assert.ok(source.indexOf('await consumeRateBatch(config,liveQuota.successful)')<source.indexOf('!await claimExpressOnce(config,actor,start.personaId)'))
 assert.ok(claims.includes('on conflict(account_id,persona_id) do nothing'))
 assert.ok(schema.includes('primary key(account_id,persona_id)'))
 assert.ok(schema.includes('force row level security'))
})
