import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {instagramPublishReadiness} from '../lib/growth-studio/instagram-publish-readiness.mjs'
const business={targetId:'wizards_secrets',handle:'wizards.secrets',
  connectionState:'connected',instagramAccountType:'BUSINESS'}
const ready={configuration:{authorizationReady:true,publishFlagEnabled:true},accounts:[business]}
const reason=(snapshot,id='wizards_secrets',placement='story')=>
  instagramPublishReadiness(snapshot,id,placement)

test('no cached Meta readback or incomplete Meta app never enables publishing',()=>{
  assert.deepEqual(reason(null),{ready:false,reason:'meta_not_configured'})
  assert.equal(reason({configuration:{authorizationReady:false,publishFlagEnabled:true},accounts:[business]}).ready,false)
})

test('per-account verified identity and professional Story capability are required',()=>{
  assert.deepEqual(reason(ready),{ready:true,reason:null})
  assert.equal(reason(ready,'andy_therapist').reason,'instagram_account_not_connected')
  const personal={...business,targetId:'andy_therapist',handle:'andy.therapist'}
  assert.equal(reason({...ready,accounts:[personal]},'andy_therapist').ready,true)
  assert.equal(reason({...ready,accounts:[{...business,handle:'andy.therapist'}]}).ready,false)
  const creator={...business,instagramAccountType:'CREATOR'}
  assert.equal(reason({...ready,accounts:[creator]}).reason,'meta_story_business_required')
  assert.equal(reason({...ready,accounts:[creator]},'wizards_secrets','feed').ready,true)
  assert.equal(reason(ready,'invalid').ready,false)
})

test('disabled production publish flag fails closed without a fake account success',()=>{
  const blocked={...ready,configuration:{...ready.configuration,publishFlagEnabled:false}}
  assert.equal(reason(blocked).reason,'instagram_publishing_disabled')
  assert.equal(reason(blocked).ready,false)
})

test('publisher preflights provider status again before owner confirmation and guards both actions',()=>{
  const ui=readFileSync(new URL('../components/growth-studio.jsx',import.meta.url),'utf8')
  const connections=readFileSync(new URL('../components/growth-studio-connections.jsx',import.meta.url),'utf8')
  assert.match(ui,/onMetaStatus=\{setMetaStatus\}/)
  assert.match(ui,/instagramPublishReadiness\(fresh,post\.socialAccountId,post\.placement\)/)
  assert.match(ui,/!instagramReady\(post\.socialAccountId,post\.placement\)/)
  assert.match(ui,/!instagramReady\(post\.socialAccountId,'story'\)/)
  assert.match(ui,/Откройте «Подключения»/)
  assert.match(connections,/onMetaStatus\(\{accounts,configuration\}\)/)
  assert.match(connections,/onMetaStatus\(null\)/)
  assert.match(connections,/const NOOP_META_STATUS=\(\)=>\{\}/)
  assert.doesNotMatch(ui,/process\.env\.META|META_APP_SECRET|pageAccessToken/)
})
