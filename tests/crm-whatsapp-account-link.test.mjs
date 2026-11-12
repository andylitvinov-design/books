import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {WHATSAPP_LINK_NOTICE,whatsappWebhookReady,whatsappLinkReady,
 whatsappLinkUrl,isWhatsAppLinkCommand,whatsappLinkToken,whatsappStop,whatsappProofAllowed
} from '../lib/crm/whatsapp-account-link.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const env={VERCEL_ENV:'production',HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED:'true',
 HH_CRM_MSG_WHATSAPP_ENABLED:'true',HH_CRM_MSG_WHATSAPP_PHONE_ID:'12345678910',
 HH_CRM_MSG_WHATSAPP_NUMBER_PUBLIC:'14165551212',HH_CRM_MSG_WHATSAPP_TOKEN:'synthetic-only',
 HH_CRM_MSG_META_APP_SECRET:'synthetic-app-secret',HH_CRM_MSG_META_VERIFY_TOKEN:'synthetic-verify-secret',
 HH_CRM_MSG_META_API_VERSION:'v23.0',HH_CRM_MSG_WHATSAPP_PILOT_WA_ID:'14165550199'}
test('Meta credentials, exact business and single pilot sender required; no public fallback',()=>{
 assert.equal(whatsappLinkReady(env),true)
 assert.equal(whatsappWebhookReady(env),true)
 assert.equal(whatsappWebhookReady({...env,HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED:'false'}),true)
 for(const key of ['HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED','HH_CRM_MSG_WHATSAPP_ENABLED',
  'HH_CRM_MSG_WHATSAPP_PHONE_ID','HH_CRM_MSG_WHATSAPP_NUMBER_PUBLIC','HH_CRM_MSG_WHATSAPP_TOKEN',
  'HH_CRM_MSG_META_APP_SECRET','HH_CRM_MSG_META_VERIFY_TOKEN','HH_CRM_MSG_META_API_VERSION',
  'HH_CRM_MSG_WHATSAPP_PILOT_WA_ID'])
  assert.equal(whatsappLinkReady({...env,[key]:''}),false,key)
 assert.equal(whatsappLinkReady({...env,VERCEL_ENV:'preview'}),false)
})
test('link proof is one-use 256-bit opaque token with no account id or marketing',()=>{
 const token='A'.repeat(43)
 assert.equal(WHATSAPP_LINK_NOTICE,'hh-whatsapp-account-link-v1')
 assert.equal(isWhatsAppLinkCommand('HHWA '+token),true)
 assert.equal(whatsappLinkToken('HHWA '+token),token)
 assert.equal(whatsappLinkToken('HHWA '+token+' x'),null)
 assert.equal(whatsappLinkToken('HHWA '+'A'.repeat(42)),null)
 assert.equal(whatsappLinkUrl(token,env),'https://wa.me/14165551212?text=HHWA%20'+token)
 assert.equal(whatsappLinkUrl('bad token',env),null)
 assert.equal(whatsappStop('/STOP'),true)
})
test('proof rejects wrong sender/business, old/missing provider timestamps; STOP honors opt-out',()=>{
 const now=Date.now(),e={type:'incoming',accountId:'12345678910',userId:'14165550199',waProviderSentAt:now}
 assert.equal(whatsappProofAllowed(e,env,now),true)
 for(const wrong of [{accountId:'12345678912'},{userId:'14165559999'},
  {waProviderSentAt:now-960000},{waProviderSentAt:now+120000},{waProviderSentAt:null},{type:'receipt'}])
  assert.equal(whatsappProofAllowed({...e,...wrong},env,now),false)
 assert.equal(whatsappProofAllowed({...e,waProviderSentAt:now-3600000},env,now,true),true)
 assert.equal(whatsappProofAllowed({...e,waProviderSentAt:now-31*24*3600000},env,now,true),false)
 assert.equal(whatsappProofAllowed({...e,userId:'14165559999'},env,now,true),true)
})
test('sender proof depends on signed Meta webhook, protected Cabinet endpoint and pilot-only business identity',()=>{
 const webhook=read('lib/crm/messenger-webhook.js')
 const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js')
 const repo=read('lib/app/whatsapp-account-link-repository.js')
 const api=read('app/api/app/whatsapp-link/route.js')
 const provider=read('lib/crm/messenger-provider.js')
 const store=read('lib/crm/messenger-store.js')
 assert.match(webhook,/createHmac\('sha256',env.HH_CRM_MSG_META_APP_SECRET\)/)
 assert.match(webhook,/waProviderSentAt/)
 assert.match(webhook,/processWhatsAppAccountLink/)
 assert.match(webhook,/crm_whatsapp_claim_verified/)
 assert.match(webhook,/crm_whatsapp_revoke_verified/)
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/)
 assert.match(route,/processWhatsAppAccountLink\(event,config\)/)
 assert.match(route,/!channelTransportReady\('whatsapp'\)/)
 assert.match(provider,/whatsappLinkReady\(env\)/)
 assert.match(store,/whatsappLinkReady\(\)/)
 assert.match(repo,/randomBytes\(32\)/)
 assert.match(api,/auth.verified\(\)/)
 assert.match(api,/requireSameOrigin/)
 assert.match(api,/WHATSAPP_LINK_NOTICE/)
 assert.doesNotMatch(repo,/signInWithOtp|auth.admin/)
})
test('SQL private RLS, owner role and replay-safe STOP',()=>{
 const sql=read('supabase/migrations/20261106215000_hh_whatsapp_account_link.sql')
 assert.equal((sql.match(/FORCE ROW LEVEL SECURITY/g)||[]).length,2)
 assert.match(sql,/UNIQUE\(business_hash,user_hash\)/)
 assert.match(sql,/session_active\(\)/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION app_private.crm_whatsapp_claim_verified\(text,text,text\) TO hh_app_inbox/)
 assert.match(sql,/EXCEPTION WHEN unique_violation/)
 assert.match(sql,/linked_at<p_sent_at\+interval '1 second'/)
 assert.match(sql,/revoke_verified\(text,text,timestamptz\)/)
})
