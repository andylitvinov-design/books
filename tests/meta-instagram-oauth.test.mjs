import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaOAuthState,verifyMetaOAuthState,encryptMetaCredentials,decryptMetaCredentials,META_REQUIRED_SCOPES,META_ACCOUNT_TARGETS} from '../lib/growth-studio/meta-instagram.mjs'
import {isValidInstagramInsightDate,isValidInstagramInsightRange,normalizeInstagramInsightMetrics} from '../lib/growth-studio/instagram-insights.mjs'

const secret='synthetic-test-secret-only-never-a-real-production-secret'
test('Meta OAuth state is signed, target-bound and expires',()=>{
  const now=1_800_000_000_000
  const {state,cookieValue}=createMetaOAuthState('wizards_secrets',{secret,now,nonce:'test-state'})
  assert.deepEqual(verifyMetaOAuthState(cookieValue,state,{secret,now}),{targetId:'wizards_secrets'})
  assert.equal(verifyMetaOAuthState(cookieValue,'different-state',{secret,now}),null)
  assert.equal(verifyMetaOAuthState(cookieValue,state,{secret:'wrong-secret',now}),null)
  assert.equal(verifyMetaOAuthState(cookieValue,state,{secret,now:now+601_000}),null)
  assert.equal(verifyMetaOAuthState(cookieValue+'.tamper',state,{secret,now}),null)
})
test('Meta OAuth maps work and personal profiles independently',()=>{
  assert.deepEqual(Object.keys(META_ACCOUNT_TARGETS),['wizards_secrets','andy_therapist'])
  assert.equal(META_ACCOUNT_TARGETS.wizards_secrets.handle,'wizards.secrets')
  assert.equal(META_ACCOUNT_TARGETS.andy_therapist.handle,'andy.therapist')
  for(const targetId of Object.keys(META_ACCOUNT_TARGETS)){
    const {state,cookieValue}=createMetaOAuthState(targetId,{secret,now:1_800_000_000_000,nonce:targetId+'-state'})
    assert.deepEqual(verifyMetaOAuthState(cookieValue,state,{secret,now:1_800_000_000_000}),{targetId})
  }
})
test('Meta OAuth refuses unknown target ids',()=>{
  assert.throws(()=>createMetaOAuthState('someone-else',{secret}),/meta_invalid_target/)
})
test('Meta credentials are authenticated-encrypted and decrypt only with the correct key',()=>{
  const record={instagramAccountId:'123',pageAccessToken:'synthetic-secret-token'}
  const encrypted=encryptMetaCredentials(record,{secret,iv:Buffer.alloc(12,7)})
  assert.deepEqual(decryptMetaCredentials(encrypted,{secret}),record)
  assert.throws(()=>decryptMetaCredentials(encrypted,{secret:'wrong-key'}),/meta_credential_unavailable/)
  assert.ok(!encrypted.includes(record.pageAccessToken))
})
test('OAuth scope set is restricted to publishing and insights essentials',()=>{
  assert.deepEqual(META_REQUIRED_SCOPES,['pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish','instagram_manage_insights'])
  assert.ok(!META_REQUIRED_SCOPES.some(x=>x.includes('messages')||x.includes('ads')))
})

test('Instagram Insights date ranges are canonical and bounded to 90 days',()=>{
  assert.equal(isValidInstagramInsightDate('2026-11-09'),true)
  assert.equal(isValidInstagramInsightDate('2026-02-30'),false)
  assert.equal(isValidInstagramInsightDate('2026-2-09'),false)
  assert.equal(isValidInstagramInsightRange('2026-10-01','2026-11-09'),true)
  assert.equal(isValidInstagramInsightRange('2026-08-01','2026-11-09'),false)
  assert.equal(isValidInstagramInsightRange('2026-11-10','2026-11-09'),false)
})
test('Instagram Insights normalization keeps only allowlisted numeric aggregate metrics',()=>{
  const metrics=normalizeInstagramInsightMetrics({data:[
    {name:'views',total_value:{value:123}},
    {name:'reach',values:[{value:12},{value:8}]},
    {name:'saves',values:[]},
    {name:'profile_links_taps',total_value:{value:'5'}},
    {name:'follower_demographics',total_value:{value:{age:'25-34'}}},
  ]})
  assert.deepEqual(metrics,{views:123,reach:20,saves:null,profile_links_taps:null})
})
