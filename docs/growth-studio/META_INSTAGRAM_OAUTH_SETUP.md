import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaOAuthState,verifyMetaOAuthState,encryptMetaCredentials,decryptMetaCredentials,META_REQUIRED_SCOPES,META_ACCOUNT_TARGETS} from '../lib/growth-studio/meta-instagram.mjs'

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
test('Meta OAuth maps exactly the work and personal Instagram destinations',()=>{
  assert.deepEqual(Object.keys(META_ACCOUNT_TARGETS),['wizards_secrets','andy_therapist'])
  assert.deepEqual(META_ACCOUNT_TARGETS.wizards_secrets,{handle:'wizards.secrets',label:'Wizards Secrets',accountRole:'work'})
  assert.deepEqual(META_ACCOUNT_TARGETS.andy_therapist,{handle:'andy.therapist',label:'Andy Therapist',accountRole:'personal'})
  for(const targetId of Object.keys(META_ACCOUNT_TARGETS)){
    const {state,cookieValue}=createMetaOAuthState(targetId,{secret,now:1_800_000_000_000,nonce:targetId+'-state'})
    assert.deepEqual(verifyMetaOAuthState(cookieValue,state,{secret,now:1_800_000_000_000}),{targetId})
  }
  assert.throws(()=>createMetaOAuthState('my_coach_ai',{secret}),/meta_invalid_target/)
  assert.throws(()=>createMetaOAuthState('my_couch_ai',{secret}),/meta_invalid_target/)
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
