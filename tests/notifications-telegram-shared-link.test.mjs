import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import * as telegramPolicy from '../lib/app/client-telegram-policy.js'
import * as messengerPolicy from '../lib/app/messenger-notification-policy.js'

// Run the actual repository body with all persistence, crypto and provider
// boundaries replaced. No production environment, credentials or network.
const source=readFileSync(new URL('../lib/app/messenger-notification-repository.js',import.meta.url),'utf8')
const body=source.replace(/^import\s+['"]server-only['"];?\s*$/m,'')
  .replace(/^import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2;?\s*$/gm,
    (_match,bindings,_quote,specifier)=>'const '+bindings+'=__imports['+JSON.stringify(specifier)+']')
  .replace('export function createMessengerNotificationRepository','function createMessengerNotificationRepository')
const actor=Object.freeze({id:'00000000-0000-4000-8000-000000000001'})
const fixtureToken=String(123456)+':'+String('synthetic').repeat(5)
const challenge=Buffer.alloc(24,7).toString('base64url')
const baseEnv=Object.freeze({
  HH_CLIENT_TG_LINK_ENABLED:'true',
  HH_CLIENT_TG_WEBHOOK_SECRET:'synthetic_webhook_secret_'.repeat(2),
  HH_CLIENT_TG_SEND_APPROVED:'false',
})
const sharedEnv=Object.freeze({...baseEnv,
  HH_CLIENT_TG_USE_PRACTICE_BOT:'true',HH_PRACTICE_TG_ENABLED:'true',
  HH_PRACTICE_TG_BOT_TOKEN:fixtureToken,
})
const dedicatedEnv=Object.freeze({...baseEnv,
  HH_CLIENT_TG_BOT_TOKEN:fixtureToken,HH_CLIENT_TG_BOT_USERNAME:'SyntheticClientBot',
})
const input=Object.freeze({action:'begin_telegram',channel:'telegram',
  permissionAccepted:true,noticeVersion:'hh-messenger-contact-v1',locale:'en',
  topics:{messages:true,booking:false,reports:false,courses:false,news:false},
})
class FakeAppError extends Error{
  constructor(code,status){super(code);this.code=code;this.status=status}
}
function harness(env,{providerError=false,accountActive=true}={}){
  const calls={provider:0,transactions:0,random:0,queries:[]}
  let saved
  const db={query:async(sql,parameters=[])=>{
    calls.queries.push({sql,parameters})
    if(sql.startsWith('select status,onboarding_state'))
      return {rows:[{status:accountActive?'active':'disabled',onboarding_state:'active'}]}
    if(sql.startsWith('insert into app_private.notification_messenger_requests')){
      assert.equal(parameters[0],actor.id)
      saved={channel:'telegram',destination_ciphertext:parameters[1],topics:JSON.parse(parameters[2])}
      return {rows:[],rowCount:1}
    }
    if(sql.startsWith('select channel,destination_ciphertext'))return {rows:saved?[saved]:[]}
    if(sql.startsWith('select verified_at'))return {rows:[]}
    if(sql.startsWith('delete from app_private.notification_telegram_links')||
       sql.startsWith('insert into app_private.notification_telegram_challenges')){
      assert.equal(parameters[0],actor.id)
      return {rows:[],rowCount:1}
    }
    assert.fail('Unexpected persistence operation')
  }}
  const context={Buffer,process:{env:{...env}},
    fetch:()=>assert.fail('Network must not be called'),
    transaction:async(_config,owner,action)=>{
      calls.transactions++
      assert.equal(owner,actor)
      return action(db)
    },
    randomBytes:length=>{calls.random++;assert.equal(length,24);return Buffer.alloc(length,7)},
    seal:(value,scope)=>{assert.equal(scope.accountId,actor.id);return JSON.stringify(value)},
    openSealed:value=>JSON.parse(value),
    operationHash:({scope,token})=>{
      assert.equal(scope,'hh-client-telegram-link');assert.equal(token,challenge)
      return 'synthetic-one-use-challenge-hash'
    },
    AppError:FakeAppError,
    telegramClientLinkReady:()=>telegramPolicy.telegramClientLinkReady(env),
    telegramClientSendReady:()=>telegramPolicy.telegramClientSendReady(env),
    telegramClientBotUsername:()=>telegramPolicy.telegramClientBotUsername(env),
    verifyClientBot:async(actualEnv,options)=>{
      calls.provider++
      assert.equal(actualEnv.HH_CLIENT_TG_LINK_ENABLED,env.HH_CLIENT_TG_LINK_ENABLED)
      assert.equal(options.requireWebhook,true)
      if(providerError)throw new FakeAppError('TELEGRAM_WEBHOOK_NOT_CONNECTED',503)
    },
    ...messengerPolicy,
  }
  const imports={
    'node:crypto':{randomBytes:context.randomBytes},
    './database.js':{transaction:context.transaction},
    './crypto.js':{seal:context.seal,openSealed:context.openSealed,operationHash:context.operationHash},
    '../assessments/contracts.js':{AppError:FakeAppError},
    './client-telegram-policy.js':{
      telegramClientLinkReady:context.telegramClientLinkReady,
      telegramClientSendReady:context.telegramClientSendReady,
      telegramClientBotUsername:context.telegramClientBotUsername,
    },
    './client-telegram-transport.js':{verifyClientBot:context.verifyClientBot},
    './messenger-notification-policy.js':messengerPolicy,
  }
  const sandbox={Buffer,process:context.process,fetch:context.fetch,__imports:imports}
  const create=vm.runInNewContext(body+'\ncreateMessengerNotificationRepository',sandbox,
    {filename:'messenger-notification-repository.synthetic.js',timeout:1000})
  return {repository:create({test:true}),calls}
}
async function assertLink(env,expectedName){
  const {repository,calls}=harness(env)
  const result=await repository.mutate(actor,input)
  const url=new URL(result.linkUrl)
  assert.equal(url.origin,'https://t.me')
  assert.equal(url.pathname,'/'+expectedName)
  assert.equal(url.searchParams.get('start'),challenge)
  assert.equal([...url.searchParams].length,1)
  assert.doesNotMatch(url.pathname,/undefined|null/)
  assert.equal(result.channels.telegram.status,'pending')
  assert.equal(result.sendingEnabled,false)
  assert.equal(calls.provider,1)
  assert.equal(calls.random,1)
  assert.equal(calls.transactions,2)
  assert.equal(calls.queries.filter(q=>q.sql.startsWith('insert into app_private.notification_telegram_challenges')).length,1)
  assert.equal(calls.queries.filter(q=>q.sql.startsWith('delete from app_private.notification_telegram_links')).length,1)
  return calls
}

test('dedicated client bot retains its verified username and consent flow',async()=>{
  assert.equal(telegramPolicy.telegramClientBotMode(dedicatedEnv),'dedicated')
  assert.equal(telegramPolicy.telegramClientBotUsername(dedicatedEnv),'SyntheticClientBot')
  await assertLink(dedicatedEnv,'SyntheticClientBot')
})
test('full dedicated credentials take precedence over shared practice mode',async()=>{
  await assertLink({...sharedEnv,...dedicatedEnv},'SyntheticClientBot')
})
test('shared practice linking uses the same verified identity as readiness',async()=>{
  assert.equal(telegramPolicy.telegramClientBotMode(sharedEnv),'shared_practice')
  assert.equal(telegramPolicy.telegramClientBotUsername(sharedEnv),telegramPolicy.PRACTICE_NOTIFICATION_BOT_USERNAME)
  await assertLink(sharedEnv,telegramPolicy.PRACTICE_NOTIFICATION_BOT_USERNAME)
})
test('shared practice linking also supports explicitly empty dedicated variables',async()=>{
  await assertLink({...sharedEnv,HH_CLIENT_TG_BOT_TOKEN:'',HH_CLIENT_TG_BOT_USERNAME:''},
    telegramPolicy.PRACTICE_NOTIFICATION_BOT_USERNAME)
})

const blockedCases=[
  ['no bot configuration',baseEnv],
  ['shared flag missing',{...sharedEnv,HH_CLIENT_TG_USE_PRACTICE_BOT:undefined}],
  ['shared flag false',{...sharedEnv,HH_CLIENT_TG_USE_PRACTICE_BOT:'false'}],
  ['practice disabled',{...sharedEnv,HH_PRACTICE_TG_ENABLED:'false'}],
  ['practice token missing',{...sharedEnv,HH_PRACTICE_TG_BOT_TOKEN:undefined}],
  ['practice token invalid',{...sharedEnv,HH_PRACTICE_TG_BOT_TOKEN:'invalid'}],
  ['partial dedicated token blocks fallback',{...sharedEnv,HH_CLIENT_TG_BOT_TOKEN:fixtureToken}],
  ['partial dedicated username blocks fallback',{...sharedEnv,HH_CLIENT_TG_BOT_USERNAME:'SyntheticClientBot'}],
  ['invalid dedicated pair blocks fallback',{...sharedEnv,...dedicatedEnv,HH_CLIENT_TG_BOT_USERNAME:'invalid'}],
  ['linking disabled',{...sharedEnv,HH_CLIENT_TG_LINK_ENABLED:'false'}],
  ['webhook secret invalid',{...sharedEnv,HH_CLIENT_TG_WEBHOOK_SECRET:'invalid'}],
]
for(const [name,env] of blockedCases)test(name+' fails closed before provider or persistence',async()=>{
  assert.equal(telegramPolicy.telegramClientLinkReady(env),false)
  const {repository,calls}=harness(env)
  await assert.rejects(repository.mutate(actor,input),{code:'TELEGRAM_NOT_CONFIGURED'})
  assert.equal(calls.provider,0)
  assert.equal(calls.transactions,0)
  assert.equal(calls.random,0)
})
test('unverified bot or webhook cannot create a challenge or return a link',async()=>{
  const {repository,calls}=harness(sharedEnv,{providerError:true})
  await assert.rejects(repository.mutate(actor,input),{code:'TELEGRAM_WEBHOOK_NOT_CONNECTED'})
  assert.equal(calls.transactions,0)
  assert.equal(calls.random,0)
})
test('explicit client consent remains mandatory',async()=>{
  const {repository,calls}=harness(sharedEnv)
  await assert.rejects(repository.mutate(actor,{...input,permissionAccepted:false}),
    {code:'INVALID_MESSENGER_NOTIFICATION_REQUEST'})
  assert.equal(calls.provider,0)
  assert.equal(calls.transactions,0)
  assert.equal(calls.random,0)
})
test('inactive account cannot persist or receive a linking challenge',async()=>{
  const {repository,calls}=harness(sharedEnv,{accountActive:false})
  await assert.rejects(repository.mutate(actor,input),{code:'ACCOUNT_UNAVAILABLE'})
  assert.equal(calls.queries.length,1)
  assert.equal(calls.queries[0].sql.startsWith('select status,onboarding_state'),true)
})
