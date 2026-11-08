import test from 'node:test'
import assert from 'node:assert/strict'
import {paintVideoBrandStamp,videoBrandStampLayout,resolveVideoExportVariant,
  VIDEO_EXPORT_POLICY_VERSION,canOfferOriginalVideoSource} from '../lib/mandala/video-branding.mjs'
import {pilotVideoExportCapability} from '../lib/mandala/video-branding-policy.mjs'

const owner='12345678-1234-4234-8234-123456789abc'
const now=Date.parse('2026-11-06T12:00:00Z')
const pilotEnv={HH_VIDEO_EXPORT_CLEAN_PILOT_ENABLED:'true',
  HH_VIDEO_EXPORT_CLEAN_PILOT_ACCOUNT_IDS:owner,
  HH_VIDEO_EXPORT_CLEAN_PILOT_EXPIRES_AT:'2026-12-06T12:00:00Z'}

test('professional FREE always brands unless a server-confirmed pilot grant is present',()=>{
  assert.equal(resolveVideoExportVariant({professionalMode:false}), 'none')
  assert.equal(resolveVideoExportVariant({professionalMode:true}), 'branded')
  assert.equal(resolveVideoExportVariant({professionalMode:true,capability:{canExportClean:true}}),'branded')
  assert.equal(resolveVideoExportVariant({professionalMode:true,capability:{
    policyVersion:VIDEO_EXPORT_POLICY_VERSION,canExportClean:true,grantType:'practice_pro'}}),'branded')
  assert.equal(resolveVideoExportVariant({professionalMode:true,capability:
    pilotVideoExportCapability({id:owner},pilotEnv,now)}),'clean')
})

test('pilot capability fails closed on expiry, missing flag, wrong account, and long allowlist',()=>{
  const active=pilotVideoExportCapability({id:owner},pilotEnv,now)
  assert.equal(active.canExportClean,true)
  assert.equal(active.grantType,'pilot')
  assert.equal(Date.parse(active.validUntil),Date.parse(pilotEnv.HH_VIDEO_EXPORT_CLEAN_PILOT_EXPIRES_AT))
  assert.equal(pilotVideoExportCapability({id:owner},pilotEnv,now+31*86400000).canExportClean,false)
  assert.equal(pilotVideoExportCapability({id:owner},{...pilotEnv,
    HH_VIDEO_EXPORT_CLEAN_PILOT_ENABLED:'false'},now).canExportClean,false)
  assert.equal(pilotVideoExportCapability({id:'99999999-9999-4999-8999-999999999999'},pilotEnv,now).canExportClean,false)
  assert.equal(pilotVideoExportCapability({id:owner},{...pilotEnv,
    HH_VIDEO_EXPORT_CLEAN_PILOT_ACCOUNT_IDS:Array(65).fill(owner).join(',')},now).canExportClean,false)
  assert.equal(pilotVideoExportCapability({id:owner},{...pilotEnv,
    HH_VIDEO_EXPORT_CLEAN_PILOT_EXPIRES_AT:'not-a-date'},now).canExportClean,false)
  assert.equal(pilotVideoExportCapability({id:owner},{...pilotEnv,
    HH_VIDEO_EXPORT_CLEAN_PILOT_EXPIRES_AT:'2028-01-01'},now).canExportClean,false)
})

test('watermark is in safe upper right zone for all supported sizes',()=>{
  for(const [width,height] of [[1280,720],[1920,1080],[720,1280],[1080,1920],[720,720]]){
    const p=videoBrandStampLayout(width,height)
    assert.ok(p.x>width*.50 && p.y>=0)
    assert.ok(p.width>80 && p.height>20)
    assert.ok(p.x+p.width<width && p.y+p.height<height*.20)
    assert.ok(p.width<=width*.33)
  }
  assert.throws(()=>videoBrandStampLayout(0,900),/VIDEO_BRAND_INVALID_DIMENSIONS/)
})

function fakeCanvas(){
  const calls=[]
  const ctx={canvas:{width:1280,height:720},save(){calls.push('save')},
    restore(){calls.push('restore')},beginPath(){},moveTo(){},lineTo(){},
    quadraticCurveTo(){},closePath(){},fill(){calls.push('fill')},stroke(){calls.push('stroke')},
    fillText(text){calls.push('text:'+text)}}
  return {ctx,calls}
}

test('watermark modifies real Canvas frames only in branded mode and restores context',()=>{
  const {ctx,calls}=fakeCanvas()
  paintVideoBrandStamp(ctx,'none');paintVideoBrandStamp(ctx,'clean')
  assert.deepEqual(calls,[])
  paintVideoBrandStamp(ctx,'branded')
  assert.equal(calls[0],'save')
  assert.equal(calls.at(-1),'restore')
  assert.ok(calls.includes('text:Holistic House'))
  assert.equal(calls.filter(c=>c==='stroke').length,6)
})


test('professional exports cannot offer a raw source MP4 if Canvas recording fails',()=>{
  assert.equal(canOfferOriginalVideoSource(false),true)
  assert.equal(canOfferOriginalVideoSource(),true)
  assert.equal(canOfferOriginalVideoSource(true),false)
})
