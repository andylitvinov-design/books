import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions} from '../lib/personal-coaching/session-protocol.mjs'
import {COACH_PROFILE_VERSION} from '../lib/coaching/coach-profile-intake.mjs'

const build=(extra={})=>{
 const now=Date.now()
 return {
  id:'ee6a6327-0394-4530-b2a9-01234567abcd',personaId:'mira',locale:'ru',
  startedAt:new Date(now-60000).toISOString(),completedAt:new Date(now).toISOString(),
  turns:[{role:'user',content:'3 и 8'},{role:'assistant',content:'Благодарю. Продолжим по следующей сфере.'}],
  profileCheckin:{version:COACH_PROFILE_VERSION,completed:false,
    ratings:[{axis:'safety',kind:'rated',current:3,desired:8,quote:'3 и 8'}]},
  ...extra,
 }
}
test('client-reviewed profile check-in survives normalizing and PDF export',()=>{
 const p=normalizeMyCoachProtocol(build())
 assert.equal(p.profileCheckin.ratings[0].desired,8)
 assert.match(myCoachProtocolPdfOptions(p,{locale:'ru'}).protocolOverview,/Опора: 3 → 8/)
})
test('forged profile score or absent client quote cannot enter archive',()=>{
 for(const ratings of [
  [{axis:'safety',kind:'rated',current:-1,desired:8,quote:'3 и 8'}],
  [{axis:'safety',kind:'rated',current:3,desired:11,quote:'3 и 8'}],
  [{axis:'connection',kind:'rated',current:3,desired:8,quote:'3 и 8'}],
  [{axis:'safety',kind:'rated',current:3,desired:8,quote:'not spoken'}],
  [{axis:'safety',kind:'skipped',current:3,desired:null,quote:'3 и 8'}],
 ]){
  assert.throws(()=>normalizeMyCoachProtocol(build({profileCheckin:{
    version:COACH_PROFILE_VERSION,completed:false,ratings
  }})),/MY_COACH_PROTOCOL_INVALID/)
 }
 assert.throws(()=>normalizeMyCoachProtocol(build({profileCheckin:{
  version:COACH_PROFILE_VERSION,completed:true,ratings:[{
   axis:'safety',kind:'rated',current:3,desired:8,quote:'3 и 8'
  }]
 }})),/MY_COACH_PROTOCOL_INVALID/)
})
test('profile remains optional; normal goal sessions are unchanged',()=>{
 const value=build()
 delete value.profileCheckin
 assert.equal(normalizeMyCoachProtocol(value).profileCheckin,undefined)
})
