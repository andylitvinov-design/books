import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createReikiJoinIntent,verifyReikiJoinIntent,createReikiRetryProof,verifyReikiRetryProof,verifiedReikiGoogleEmail,REIKI_JOIN_TTL,REIKI_RETRY_TTL } from '../lib/academy/reiki-registration-proof.mjs'
import { classifyHolisticHouseNativeAuth } from '../lib/native/deep-link-policy.js'
const config={encryptionKey:Buffer.alloc(32,17)}
const now=1760000000000
const actor={id:'11111111-1111-4111-8111-111111111111',email:'student@example.test'}
const google={provider:'google',identity_data:{email:'Student@example.test',email_verified:true}}
test('one intentional Google start has a short-lived nonce-specific proof',()=>{
 const one=createReikiJoinIntent('es',config,now), two=createReikiJoinIntent('en',config,now)
 assert.equal(verifyReikiJoinIntent(one.nonce,one.value,config,now),'es')
 assert.equal(verifyReikiJoinIntent(two.nonce,one.value,config,now),null)
 assert.equal(verifyReikiJoinIntent(one.nonce,one.value.replace('.es.','.ru.'),config,now),null)
 assert.equal(verifyReikiJoinIntent(one.nonce,one.value,config,now+REIKI_JOIN_TTL*1000+1),null)
 assert.equal(verifyReikiJoinIntent(one.nonce,undefined,config,now),null)
})
test('only the exact provider-verified Google email can register',()=>{
 assert.equal(verifiedReikiGoogleEmail(actor,[google]),actor.email)
 assert.equal(verifiedReikiGoogleEmail(actor,[{...google,provider:'custom:telegram'}]),null)
 assert.equal(verifiedReikiGoogleEmail(actor,[{...google,identity_data:{email:actor.email,email_verified:false}}]),null)
 assert.equal(verifiedReikiGoogleEmail({...actor,email:'other@example.test'},[google]),null)
})
test('retry proof cannot be transferred to a different user or email',()=>{
 const retry=createReikiRetryProof(actor,'ru',config,now)
 assert.equal(verifyReikiRetryProof(actor,retry,config,now),'ru')
 assert.equal(verifyReikiRetryProof({...actor,id:'22222222-2222-4222-8222-222222222222'},retry,config,now),null)
 assert.equal(verifyReikiRetryProof({...actor,email:'other@example.test'},retry,config,now),null)
 assert.equal(verifyReikiRetryProof(actor,retry,config,now+REIKI_RETRY_TTL*1000+1),null)
})
test('native callback carries only a valid scoped nonce',()=>{
 const nonce='a'.repeat(32)
 const base='holistichouse://auth/callback?code=synthetic&continue=energywork-daybook&reikiJoin='
 assert.equal(classifyHolisticHouseNativeAuth(base+nonce).kind,'hh-auth')
 assert.equal(classifyHolisticHouseNativeAuth(base+'bad').kind,'unsupported')
 assert.equal(classifyHolisticHouseNativeAuth(base.replace('energywork-daybook','cabinet')+nonce).kind,'unsupported')
})
test('registration uses owner-scoped hash, link and insert without overwrite or marketing',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/academy/reiki-registration-store.js')
 const api=read('app/api/app/[...path]/route.js')
 const entry=read('components/reiki-practitioner-entry.tsx')
 assert.ok(store.includes('on conflict(owner_id,email_hash) do nothing'))
 assert.ok(store.includes('on conflict(account_id) do nothing'))
 assert.ok(store.includes('getUserIdentities()'))
 assert.ok(store.includes('for update'))
 assert.ok(!store.includes('crm_consent_ledger')&&!store.includes('crm_email_jobs'))
 assert.ok(api.indexOf('ensureAccount(actor)')<api.indexOf('await syncReikiRegistration(config,actor,auth.client,reikiLocale)'))
 assert.ok(api.includes('verifyReikiRetryProof(actor,retryCookie,config)'))
 const dialog=read('components/reiki-join-dialog.tsx')
 assert.ok(entry.includes('reikiRegistration: locale')&&dialog.includes('Your journal stays private'))
 assert.ok(dialog.indexOf('<p className={styles.note}>{t.note}</p>')<dialog.indexOf('data-reiki-join-google'))
})
