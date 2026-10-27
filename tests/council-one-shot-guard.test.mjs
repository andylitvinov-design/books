import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {councilOneShotAuthorized} from '../lib/practitioners/council-one-shot-guard.mjs'

const origin='https://holistichouse.vercel.app/api/internal/council-archive-telegram'
const proof='a'.repeat(80)
const env={VERCEL_ENV:'production',HH_COUNCIL_ONE_SHOT_PROOF:proof,
  HH_COUNCIL_ONE_SHOT_EXPIRES:'2000000500000'}
const now=2000000000000
const request=(url)=>new Request(url)

test('only unexpired production proof at canonical Council route enables manual probe/send',()=>{
  for(const mode of ['probe','send']){
    assert.equal(councilOneShotAuthorized(request(origin+'?proof='+proof+'&mode='+mode),env,now),true)
  }
  assert.equal(councilOneShotAuthorized(request(origin+'?mode=probe&proof='+proof+'&_vercel_share=temporary'),env,now),true)
})

test('fail closed for missing/expired/unscoped credentials and malformed requests',()=>{
  const valid=origin+'?proof='+proof+'&mode=send'
  assert.equal(councilOneShotAuthorized(request(valid),{...env,VERCEL_ENV:'preview'},now),false)
  assert.equal(councilOneShotAuthorized(request(valid),{...env,HH_COUNCIL_ONE_SHOT_PROOF:undefined},now),false)
  assert.equal(councilOneShotAuthorized(request(valid),{...env,HH_COUNCIL_ONE_SHOT_EXPIRES:''},now),false)
  assert.equal(councilOneShotAuthorized(request(valid),env,2000000500000),false)
  assert.equal(councilOneShotAuthorized(request(valid),{...env,HH_COUNCIL_ONE_SHOT_EXPIRES:String(now+120*60000)},now),false)
  assert.equal(councilOneShotAuthorized(request(valid.replace(proof,'b'.repeat(80))),env,now),false)
  assert.equal(councilOneShotAuthorized(request(valid.replace('holistichouse.vercel.app','example.com')),env,now),false)
  assert.equal(councilOneShotAuthorized(request(valid.replace('https://','http://')),env,now),false)
  assert.equal(councilOneShotAuthorized(request(valid+'&proof=duplicate'),env,now),false)
  assert.equal(councilOneShotAuthorized(request(valid+'&other=1'),env,now),false)
  assert.equal(councilOneShotAuthorized(request(valid.replace('mode=send','mode=reset')),env,now),false)
  assert.equal(councilOneShotAuthorized(request(valid.replace('council-archive-telegram','practice-telegram-digest')),env,now),false)
})

test('one-shot mode cannot create a second cron or bypass the existing daily claim',()=>{
  const route=readFileSync(new URL('../app/api/internal/council-archive-telegram/route.js',import.meta.url),'utf8')
  assert.match(route,/cronAuthorized\(request,process\.env\)/)
  assert.match(route,/councilOneShotAuthorized\(request,process\.env\)/)
  assert.match(route,/ownerAiProviderReadiness\(config,env\)/)
  assert.match(route,/deliverArchivedCouncilReports\(config,\{env,strategyOnly:!manual\}\)/)
  assert.match(route,/maxDuration=120/)
  const schedule=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
  assert.deepEqual(schedule.crons.filter(x=>x.path.includes('council-archive-telegram')),
    [{path:'/api/internal/council-archive-telegram',schedule:'0 16,17 * * *'}])
})
