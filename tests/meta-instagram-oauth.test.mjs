import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaOAuthState,verifyMetaOAuthState,encryptMetaCredentials,decryptMetaCredentials,META_REQUIRED_SCOPES} from '../lib/growth-studio/meta-instagram.mjs'

const secret='synthetic-test-secret-only-never-a-real-production-secret'
test('Meta OAuth state is signed, target-bound and expires',()=>{
  const now=1_800_000_000_000
  const {state,cookieValue}=createMetaOAuthState('my_coach_ai',{secret,now,nonce:'test-state'})
  assert.deepEqual(verifyMetaOAuthState(cookieValue,state,{secret,now}),{targetId:'my_coach_ai'})
  assert.equal(verifyMetaOAuthState(cookieValue,'different-state',{secret,now}),null)
  assert.equal(verifyMetaOAuthState(cookieValue,state,{secret:'wrong-secret',now}),null)
  assert.equal(verifyMetaOAuthState(cookieValue,state,{secret,now:now+601_000}),null)
  assert.equal(verifyMetaOAuthState(cookieValue+'.tamper',state,{secret,now}),null)
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
