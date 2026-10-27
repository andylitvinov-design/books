import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const service=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
const cron=readFileSync(new URL('../app/api/internal/housekeeping/route.js',import.meta.url),'utf8')
const migration=readFileSync(new URL('../supabase/migrations/20261027011919_hh_owner_audio_delivery_receipt.sql',import.meta.url),'utf8')
const BATCH_ID='ebc20303-d41d-4f77-89ac-e277dd50d4f6'
const item=i=>({id:'550e8400-e29b-41d4-a716-'+String(446655440000+i),updateId:900+i,bytes:4096})
const source=service.match(/export async function recoverOwnerAudioBatchFromCron\([\s\S]*?\n}\n\nasync function updateFolderFromBot/)
assert(source,'cron recovery must be an isolated, private service function')
const recoveredFunction=source[0].replace('export async function','async function')
  .replace(/\nasync function updateFolderFromBot$/,'')
const config={}

function simulate({status='collecting',n=9,found=n,verified=true,delivered=true,
                   hasPriorReceipt=false,expired=false,mode='shared_practice'}={}){
  const events={db:[],ownerChecks:0,sends:[],cleanups:[],storageChecks:0}
  const row={
    batch_id:BATCH_ID,status,items:Array.from({length:n},(_,i)=>item(i)),
    expires_at:new Date(Date.now()+(expired?-60000:600000)).toISOString(),
    result_audio_id:hasPriorReceipt?BATCH_ID:null,
    delivered_at:hasPriorReceipt?'2026-10-27T02:00:00Z':null,
  }
  const recovered={
    status:'ready',result_audio_id:BATCH_ID,
    telegram_delivery_message_id:313,delivered_at:'2026-10-27T02:00:00Z',
  }
  const recover=new Function(
    'telegramClientBotMode','ownerTransaction','PRACTITIONER_ID',
    'OWNER_AUDIO_RECOVERY_BATCH','combineItems','OWNER_AUDIO_COMBINE_MAX_BYTES',
    'resolvedOwnerTelegramEnv','ownerBotCredentials','verifyOwnerTelegram',
    'finishAudioCombine','checkedAudioStorage','deleteTemporaryAudioParts',
    recoveredFunction+'\nreturn recoverOwnerAudioBatchFromCron',
  )(
    ()=>mode,
    async(_config,callback)=>callback({query:async(sql,args)=>{
      events.db.push({sql,args})
      if(sql.includes('select batch_id,status,items,expires_at,result_audio_id,delivered_at'))
        return {rows:[row]}
      if(sql.includes('select count(*)::int as count from app_private.telegram_owner_audio')){
        if(sql.includes('coalesce(sum(bytes)'))
          return {rows:[{count:found,total_bytes:found*4096}]}
        return {rows:[{count:0}]}
      }
      if(sql.includes('select status,result_audio_id,telegram_delivery_message_id,delivered_at'))
        return {rows:[recovered]}
      throw Error('UNEXPECTED_DB_QUERY')
    }}),
    'owner-practitioner',BATCH_ID,arr=>{
      const used=new Set()
      return arr.filter(x=>x&&typeof x.id==='string'&&!used.has(x.id)&&used.add(x.id))
    },20_000_000,
    async(_config,env)=>env,
    ()=>({token:'LOCAL_FAKE_TOKEN',chat:'123456'}),
    async()=>{events.ownerChecks++;return {verified,hasWebhook:verified}},
    async(_config,event,credentials)=>{
      events.sends.push({event,credentials})
      return {handled:true,delivered}
    },
    async()=>{events.storageChecks++;return {}},
    async(_config,id)=>{events.cleanups.push(id)},
  )
  return {recover,events}
}
const env={VERCEL_ENV:'production'}
test('trusted daily Cron triggers exactly one identified owner batch, no forged webhook',async()=>{
  const {recover,events}=simulate()
  assert.deepEqual(await recover(config,{env}),{status:'provider_confirmed'})
  assert.equal(events.ownerChecks,1)
  assert.equal(events.sends.length,1)
  const {event,credentials}=events.sends[0]
  assert.equal(event.batchId,BATCH_ID)
  assert.equal(event.internalRecovery,true)
  assert(Number.isSafeInteger(event.updateId))
  assert(event.updateId>4_500_000_000_000_000)
  assert.equal(credentials.chat,'123456')
  assert.equal(events.cleanups.length,0)
  assert(!events.db.some(x=>/delete from/i.test(x.sql)))
})
test('cron cannot target another batch or execute in previews/off mode',async()=>{
  const run=simulate()
  assert.deepEqual(await run.recover(config,{env:{VERCEL_ENV:'preview'}}),
    {status:'disabled'})
  const disabled=simulate({mode:'dedicated'})
  assert.deepEqual(await disabled.recover(config,{env}),{status:'disabled'})
  assert.equal(run.events.sends.length+disabled.events.sends.length,0)
})
test('no automatic delivery on nine-source mismatch or no verified owner',async()=>{
  const incomplete=simulate({found:8})
  assert.deepEqual(await incomplete.recover(config,{env}),{status:'unverified_sources'})
  const unverified=simulate({verified:false})
  assert.deepEqual(await unverified.recover(config,{env}),{status:'telegram_identity_unverified'})
  const outdated=simulate({expired:true})
  assert.deepEqual(await outdated.recover(config,{env}),{status:'inactive'})
  assert.equal(incomplete.events.sends.length+unverified.events.sends.length+
    outdated.events.sends.length,0)
})
test('provider failures are not labeled delivered, existing confirmed results never resend',async()=>{
  const failed=simulate({delivered:false})
  assert.deepEqual(await failed.recover(config,{env}),{status:'telegram_not_confirmed'})
  const done=simulate({status:'ready',hasPriorReceipt:true})
  assert.deepEqual(await done.recover(config,{env}),{status:'already_confirmed'})
  assert.equal(done.events.sends.length,0)
})
test('RLS and provider receipt are backend-only, cron is existing CRON_SECRET gate',()=>{
  assert.match(migration,/telegram_delivery_message_id bigint/)
  assert.match(migration,/delivered_at timestamptz/)
  assert.doesNotMatch(migration,/grant\s+.*(anon|authenticated|public)/i)
  assert.match(service,/await rememberCombinedTelegramReceipt\(config,batch\.batchId,saved\.id,receipt\.messageId\)/)
  assert.match(service,/delivered=true/)
  assert.match(service,/internalRecovery=event\.internalRecovery===true/)
  assert.match(service,/last_command_update_id=case when \$4 then last_command_update_id else \$2 end/)
  assert.match(cron,/runHousekeepingCron\(request/)
  assert.match(cron,/recoverOwnerAudioBatchFromCron\(config\)/)
  assert(!cron.includes('OWNER_AUDIO_RECOVERY_BATCH'))
})
