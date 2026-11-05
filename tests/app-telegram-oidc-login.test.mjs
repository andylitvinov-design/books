import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {
  TELEGRAM_OIDC_PROVIDER, IDENTITY_LINK_COOKIE, telegramLoginEnabled, oauthProvider,
  createIdentityLinkProof, verifyIdentityLinkProof,
} from '../lib/app/telegram-oauth.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const context={encryptionKey:randomBytes(32)}
const account='10000000-0000-4000-8000-000000000001'

test('Google continues unchanged while Telegram OIDC is unavailable by default',()=>{
  assert.equal(TELEGRAM_OIDC_PROVIDER,'custom:telegram')
  assert.equal(IDENTITY_LINK_COOKIE,'hh-app-identity-link')
  assert.equal(telegramLoginEnabled({}),false)
  assert.equal(telegramLoginEnabled({HH_APP_TELEGRAM_OIDC_ENABLED:'false'}),false)
  assert.equal(telegramLoginEnabled({HH_APP_TELEGRAM_OIDC_ENABLED:'TRUE'}),false)
  assert.equal(telegramLoginEnabled({HH_APP_TELEGRAM_OIDC_ENABLED:'true'}),true)
  assert.deepEqual(oauthProvider('google',{}),{provider:'google',scopes:'openid email profile'})
  assert.equal(oauthProvider('telegram',{}),null)
  assert.deepEqual(oauthProvider('telegram',{HH_APP_TELEGRAM_OIDC_ENABLED:'true'}),{
    provider:'custom:telegram',scopes:'openid profile',
  })
  for(const invalid of ['',null,undefined,'telegram-bot','whatsapp','custom:telegram'])
    assert.equal(oauthProvider(invalid,{}),null)
})

test('manual same-account linking proof rejects modification, expiry, replay across keys and future timestamps',()=>{
  const now=Date.now()
  const proof=createIdentityLinkProof(account,'custom:telegram',context,now)
  assert.deepEqual(verifyIdentityLinkProof(proof,context,now),{accountId:account,provider:'custom:telegram'})
  assert.deepEqual(verifyIdentityLinkProof(proof,context,now+9*60*1000),{accountId:account,provider:'custom:telegram'})
  assert.equal(verifyIdentityLinkProof(proof,context,now+11*60*1000),null)
  assert.equal(verifyIdentityLinkProof(proof,context,now-60000),null)
  assert.equal(verifyIdentityLinkProof(proof,{encryptionKey:randomBytes(32)},now),null)
  const parts=proof.split('.')
  const changed=(parts[2][0]==='a'?'b':'a')+parts[2].slice(1)
  assert.equal(verifyIdentityLinkProof(parts[0]+'.'+parts[1]+'.'+changed,context,now),null)
  assert.equal(verifyIdentityLinkProof('v1.invalid.invalid',context,now),null)
  assert.equal(verifyIdentityLinkProof(null,context,now),null)
  assert.throws(()=>createIdentityLinkProof('telegram-username','custom:telegram',context))
  assert.throws(()=>createIdentityLinkProof(account,'custom:telegram',{encryptionKey:randomBytes(12)}))
  assert.throws(()=>createIdentityLinkProof(account,'unexpected',context))
  const nextProof=createIdentityLinkProof(account,'google',context,now)
  assert.notEqual(proof,nextProof)
  assert.deepEqual(verifyIdentityLinkProof(nextProof,context,now),{accountId:account,provider:'google'})
})

test('new routes reuse server PKCE session, enforce explicit consent and restrict verified link to same account',()=>{
  const app=source('app/api/app/[...path]/route.js')
  const session=source('lib/app/session.js')
  assert.match(app,/joined === 'auth\/providers'/)
  assert.match(app,/provider: selectedProvider\.provider/)
  assert.match(app,/scopes: selectedProvider\.scopes/)
  assert.match(app,/signInWithOAuth\(/)
  assert.match(app,/exchangeCodeForSession\(/)
  assert.match(app,/joined === 'auth\/identities'/)
  assert.match(app,/joined === 'auth\/link'/)
  assert.match(app,/body\.confirm !== true/)
  assert.match(app,/getUserIdentities\(/)
  assert.match(app,/auth\.client\.auth\.linkIdentity\(/)
  assert.match(app,/createIdentityLinkProof\(actor\.id,selected\.provider,config\)/)
  assert.match(app,/verifyIdentityLinkProof\(request\.cookies\.get\(IDENTITY_LINK_COOKIE\)/)
  assert.match(app,/linkedAccount && \(await auth\.verified\(\)\)\.id !== linkedAccount/)
  assert.match(app,/item\.provider===linkProof\.provider/)
  assert.match(app,/identity=failed/)
  assert.match(app,/linkedAccount && actor\.id !== linkedAccount/)
  assert.match(app,/auth\.client\.auth\.signOut\(\{scope:'local'\}\)/)
  assert.match(app,/maxAge:0,httpOnly:true,secure:!config\.test,sameSite:'lax'/)
  assert.match(app,/op:'oauth-link'/)
  assert.match(app,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
  assert.match(app,/new URL\(data\.url\)\.origin !== config\.supabaseUrl/)
  assert.match(session,/client\.auth\.getUser\(\)/)
  assert.match(session,/client\.auth\.getSession\(\)/)
  assert.match(session,/requireUUID\(claims\.session_id\)/)
  assert.doesNotMatch(app,/signInWithPassword|signInAnonymously|createUser\(/)
})

test('entry UI, consent and settings keep both methods and three locales',()=>{
  const cabinet=source('components/app/cabinet-guest-overview.jsx')
  const app=source('components/app/app-workspace.jsx')
  const settings=source('components/app/account-login-methods.jsx')
  const course=source('components/app/course-guest-landing.jsx')
  for(const locale of ['en','ru','es']){
    assert.match(cabinet,new RegExp('  '+locale+': \\{'))
  }
  assert.match(cabinet,/onTelegramSignin/)
  assert.match(cabinet,/telegramAvailable && !unavailable/)
  assert.match(cabinet,/onSignin/)
  assert.match(cabinet,/sign in with Google first/i)
  assert.match(app,/appFetch\('auth\/providers'/)
  assert.match(app,/providerChoice === 'telegram' \? \{ provider: 'telegram' \} : \{\}/)
  assert.doesNotMatch(app,/provider: providerChoice === 'telegram' \? 'telegram' : 'google'/)
  assert.match(app,/telegramAvailable=\{telegramAvailable\}/)
  assert.match(app,/AccountLoginMethods/)
  assert.match(settings,/appFetch\('auth\/link'/)
  assert.match(settings,/confirm:true/)
  assert.match(settings,/appFetch\('auth\/identities'/)
  assert.match(settings,/not a subscription/)
  assert.match(course,/data-course-telegram-signin/)
  assert.match(course,/telegramAvailable &&/)
  assert.match(course,/data-course-google-signin/)
})

test('Telegram messenger pairing stays separate from OIDC and marketing opt-in',()=>{
  const helper=source('lib/app/telegram-oauth.mjs')
  assert.doesNotMatch(helper,/sendMessage|CRM_MSG_TELEGRAM_TOKEN|secret_key|service_role/)
  const settings=source('components/app/account-login-methods.jsx')
  const channel=source('components/app/messenger-notification-settings.jsx')
  assert.match(settings,/messaging bot separately/i)
  assert.match(channel,/news.*marketing consent/i)
})
