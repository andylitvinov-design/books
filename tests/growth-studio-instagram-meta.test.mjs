import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {
  INSTAGRAM_LOGIN_SCOPES,INSTAGRAM_OAUTH_CALLBACK_PATH,
  buildInstagramLoginUrl,createInstagramOAuthState,verifyInstagramOAuthState,
  readInstagramMetaConfiguration,exchangeInstagramAuthorizationCode,
  encryptInstagramAccessToken,decryptInstagramAccessToken,
} from '../lib/growth-studio/instagram-meta.mjs'
import {createGrowthInstagramAccountStore} from '../lib/growth-studio/instagram-account-store.mjs'

const encryptionKey=Buffer.alloc(32,7).toString('base64')
const stateSecret='local-test-state-secret-with-at-least-thirty-two-characters'
const environment={
  NEXT_PUBLIC_SITE_URL:'https://holistichouse.vercel.app',
  HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_ID:'123456789',
  HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_SECRET:'test-meta-app-secret',
  HH_GROWTH_INSTAGRAM_REDIRECT_URI:'https://holistichouse.vercel.app'+INSTAGRAM_OAUTH_CALLBACK_PATH,
  HH_GROWTH_INSTAGRAM_OAUTH_STATE_SECRET:stateSecret,
  HH_GROWTH_INSTAGRAM_TOKEN_ENCRYPTION_KEY:encryptionKey,
}
const configuration=readInstagramMetaConfiguration(environment)

test('Meta configuration fails closed until all required server-only credentials and redirect are valid',()=>{
  const absent=readInstagramMetaConfiguration({})
  assert.equal(absent.ready,false)
  assert.equal(absent.publishEnabled,false)
  assert.ok(absent.missing.includes('HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_ID'))
  assert.ok(absent.missing.includes('HH_GROWTH_INSTAGRAM_TOKEN_ENCRYPTION_KEY'))
  assert.equal(configuration.ready,true)
  assert.equal(configuration.publishEnabled,false)
  assert.equal(configuration.redirectUri,environment.HH_GROWTH_INSTAGRAM_REDIRECT_URI)
  const badRedirect=readInstagramMetaConfiguration({...environment,HH_GROWTH_INSTAGRAM_REDIRECT_URI:'https://evil.example/callback'})
  assert.equal(badRedirect.ready,false)
  assert.equal(badRedirect.clientSecret,'')
  assert.equal(badRedirect.encryptionKey,'')
})

test('OAuth state is signed, account-bound, short-lived and tamper evident',()=>{
  const nonce=randomUUID(),issuedAt=1_800_000_000_000
  const state=createInstagramOAuthState({accountId:'my_coach_ai',nonce,issuedAt},stateSecret)
  assert.deepEqual(verifyInstagramOAuthState(state,stateSecret,{now:issuedAt+1000}),{
    accountId:'my_coach_ai',nonce,issuedAt,
  })
  assert.throws(()=>verifyInstagramOAuthState(state+'x',stateSecret,{now:issuedAt}),/invalid_oauth_state/)
  assert.throws(()=>verifyInstagramOAuthState(state,stateSecret,{now:issuedAt+11*60*1000}),/invalid_oauth_state/)
  assert.throws(()=>createInstagramOAuthState({accountId:'unknown',nonce,issuedAt},stateSecret),/invalid_oauth_state/)
})

test('Instagram Login URL requests only required scopes and the exact configured callback',()=>{
  const state=createInstagramOAuthState({accountId:'my_couch_ai',nonce:randomUUID()},stateSecret)
  const url=new URL(buildInstagramLoginUrl({accountId:'my_couch_ai',state,configuration}))
  assert.equal(url.origin,'https://www.instagram.com')
  assert.equal(url.pathname,'/oauth/authorize')
  assert.equal(url.searchParams.get('client_id'),environment.HH_GROWTH_INSTAGRAM_LOGIN_CLIENT_ID)
  assert.equal(url.searchParams.get('redirect_uri'),environment.HH_GROWTH_INSTAGRAM_REDIRECT_URI)
  assert.deepEqual(url.searchParams.get('scope').split(','),[...INSTAGRAM_LOGIN_SCOPES])
  assert.equal(url.searchParams.get('state'),state)
  assert.throws(()=>buildInstagramLoginUrl({accountId:'not-registered',state,configuration}),/instagram_oauth_unavailable/)
})

test('OAuth code exchange requires exact granted scopes, long-lived token and matching profile identity',async()=>{
  const calls=[]
  const payloads=[
    {access_token:'short-token-that-is-secret',user_id:'ig-100',permissions:[...INSTAGRAM_LOGIN_SCOPES]},
    {access_token:'long-lived-token-that-is-secret',token_type:'bearer',expires_in:5184000},
    {user_id:'ig-100',username:'my.coach.ai'},
  ]
  const fetchFn=async(url,options)=>{
    calls.push({url:String(url),options})
    const value=payloads.shift()
    return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}})
  }
  const result=await exchangeInstagramAuthorizationCode({code:'authorization-code',configuration,fetchFn})
  assert.equal(result.providerAccountId,'ig-100')
  assert.equal(result.username,'my.coach.ai')
  assert.equal(result.accessToken,'long-lived-token-that-is-secret')
  assert.ok(Date.parse(result.expiresAt)>Date.now())
  assert.equal(calls.length,3)
  assert.equal(new URL(calls[1].url).searchParams.get('grant_type'),'ig_exchange_token')
  assert.equal(calls[2].options.headers.Authorization,'Bearer long-lived-token-that-is-secret')
  assert.ok(!JSON.stringify(result.permissions).includes('short-token'))
})

test('OAuth exchange refuses missing permission and wrong Instagram identity',async()=>{
  let count=0
  const missingScope=async()=>{
    count++
    return new Response(JSON.stringify({access_token:'short-token',user_id:'ig-100',
      permissions:['instagram_business_basic']}),{status:200})
  }
  await assert.rejects(exchangeInstagramAuthorizationCode({code:'code',configuration,fetchFn:missingScope}),/instagram_permissions_missing/)
  assert.equal(count,1)
  const responses=[
    {access_token:'short-token',user_id:'ig-100',permissions:[...INSTAGRAM_LOGIN_SCOPES]},
    {access_token:'long-lived-token-that-is-secret',expires_in:5184000},
    {user_id:'another-id',username:'my.coach.ai'},
  ]
  const identityFetch=async()=>new Response(JSON.stringify(responses.shift()),{status:200})
  await assert.rejects(exchangeInstagramAuthorizationCode({code:'code',configuration,fetchFn:identityFetch}),/instagram_identity_unverified/)
})

test('AES-256-GCM token envelope round-trips and rejects tampered ciphertext',()=>{
  const token='long-lived-private-instagram-access-token'
  const envelope=encryptInstagramAccessToken(token,encryptionKey)
  assert.equal(envelope.alg,'A256GCM')
  assert.ok(!JSON.stringify(envelope).includes(token))
  assert.equal(decryptInstagramAccessToken(envelope,encryptionKey),token)
  assert.throws(()=>decryptInstagramAccessToken({...envelope,ciphertext:envelope.ciphertext.slice(0,-2)+'aa'},encryptionKey),/instagram_credential_unavailable/)
  assert.throws(()=>encryptInstagramAccessToken(token,'not-a-valid-key'),/instagram_encryption_unavailable/)
})

test('account Redis store returns safe status only and isolates two encrypted credentials',async()=>{
  const values=new Map(),hash=new Map()
  const fetchFn=async(url,options)=>{
    const args=JSON.parse(options.body)
    const [verb,scriptOrKey]=args
    let result=null
    if(verb==='SET'){
      const key=args[1],value=args[2]
      if(args.includes('NX')&&values.has(key))result=null
      else {values.set(key,value);result='OK'}
    }else if(verb==='GET'){
      result=values.get(args[1])??null
    }else if(verb==='HGETALL'){
      result=Object.fromEntries(hash)
    }else if(verb==='EVAL'){
      const script=args[1]
      if(script.includes("local value=redis.call('GET'")){
        const key=args[3];result=values.get(key)??null;values.delete(key)
      }else if(script.includes("redis.call('HSET'")){
        const metaKey=args[3],credentialKey=args[4],accountId=args[5]
        hash.set(accountId,args[6]);values.set(credentialKey,args[7]);result=1
      }else if(script.includes("redis.call('HDEL'")){
        hash.delete(args[5]);values.delete(args[4]);result=1
      }
    }
    return new Response(JSON.stringify({result}),{status:200,headers:{'content-type':'application/json'}})
  }
  const store=createGrowthInstagramAccountStore({environment:{
    PRESCRIPTIONS_KV_REST_API_URL:'https://redis.example.com',
    PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic-redis-token',
  },fetchFn})
  const nonce=randomUUID()
  const state=createInstagramOAuthState({accountId:'my_coach_ai',nonce},stateSecret)
  await store.createOAuthState(nonce,state)
  const consumed=await store.consumeOAuthState(nonce)
  assert.equal(consumed,state)
  await store.saveConnected({
    accountId:'my_coach_ai',providerAccountId:'ig-1',username:'my.coach.ai',
    permissions:[...INSTAGRAM_LOGIN_SCOPES],expiresAt:new Date(Date.now()+3600_000).toISOString(),
    encryptedCredential:encryptInstagramAccessToken('credential-one-long-private-token',encryptionKey),
  })
  await store.saveConnected({
    accountId:'my_couch_ai',providerAccountId:'ig-2',username:'my.couch.ai',
    permissions:[...INSTAGRAM_LOGIN_SCOPES],expiresAt:new Date(Date.now()+3600_000).toISOString(),
    encryptedCredential:encryptInstagramAccessToken('credential-two-long-private-token',encryptionKey),
  })
  const accounts=await store.listAccounts()
  assert.equal(accounts.find(x=>x.id==='my_coach_ai').connectionState,'connected')
  assert.equal(accounts.find(x=>x.id==='my_couch_ai').connectionState,'connected')
  assert.equal(accounts.every(x=>x.publishingEnabled===false),true)
  assert.ok(!JSON.stringify(accounts).includes('credential-one'))
  assert.ok(!JSON.stringify(accounts).includes('ig-1'))
  const envelope=await store.getCredentialEnvelope('my_coach_ai')
  assert.equal(decryptInstagramAccessToken(envelope,encryptionKey),'credential-one-long-private-token')
  await store.disconnect('my_coach_ai')
  assert.equal((await store.listAccounts()).find(x=>x.id==='my_coach_ai').connectionState,'pending_authorization')
  assert.equal((await store.listAccounts()).find(x=>x.id==='my_couch_ai').connectionState,'connected')
})
