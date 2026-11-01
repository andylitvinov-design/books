import test from 'node:test'
import assert from 'node:assert/strict'
import {runInNewContext} from 'node:vm'
import {AppError} from '../lib/assessments/contracts.js'
import {readFileSync} from 'node:fs'
import {
  parseDiagnosticStart,telegramPublicStartRequested,telegramDiagnosticReady,telegramDiagnosticPublicUrl,
  transitionTelegramDiagnosticLegacy as transitionTelegramDiagnostic,TELEGRAM_DIAGNOSTIC_PHOTO_LIMIT,
} from '../lib/crm/telegram-diagnostic.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const message=(text,extra={})=>({rawText:text,locale:'ru',...extra})
const session=(r,consented=false)=>({stage:r.stage,locale:r.locale,consentAt:consented?'2026-10-26T10:00:00Z':null})
const env={
  VERCEL_ENV:'production',
  HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_MSG_PRODUCTION_APPROVED:'true',
  HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_USERNAME:'HolisticHouseBot',
  HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:SYNTHETIC_BOT_TOKEN_ONLY_123456789',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_TEST_SECRET',
}
test('deep-link parser supports exactly three static localized starters, no client PII',()=>{
  for(const lang of ['en','ru','es']){
    assert.equal(parseDiagnosticStart('/start hhreview_'+lang),lang)
  }
  for(const s of ['/start','/start hhreview_ru injection',
      '/start hhreview_foo','/start?token=abc','/start hhreview_ru&phone=123']){
    assert.equal(parseDiagnosticStart(s),null)
  }
})
test('permanent public CTA requires scoped release and valid dedicated BotFather credentials',()=>{
  assert.equal(telegramDiagnosticReady({}),false)
  assert.equal(telegramDiagnosticPublicUrl('ru',{}),null)
  for(const key of ['HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED','HH_CRM_MSG_TELEGRAM_TOKEN',
    'HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET','HH_CRM_MSG_TELEGRAM_USERNAME','HH_CRM_TG_DIAGNOSTIC_ENABLED']){
    const missing={...env}
    delete missing[key]
    assert.equal(telegramDiagnosticPublicUrl('ru',missing),null,key)
  }
  assert.equal(telegramDiagnosticPublicUrl('ru',{...env,HH_CRM_MSG_TELEGRAM_USERNAME:'wrong/bot'}),null)
  assert.equal(telegramDiagnosticPublicUrl('ru',env),
    'https://t.me/HolisticHouseBot?start=hhreview_ru')
  assert.equal(telegramDiagnosticPublicUrl('es',env),
    'https://t.me/HolisticHouseBot?start=hhreview_es')
  assert.equal(telegramDiagnosticPublicUrl('en',{...env,VERCEL_ENV:'preview'}),null)
  assert.equal(telegramDiagnosticPublicUrl('ru',{...env,HH_CRM_MSG_PRODUCTION_APPROVED:'false'}),
    'https://t.me/HolisticHouseBot?start=hhreview_ru',
    'permanent link works WITHOUT enabling global outbound messaging')
  for(const cmd of ['/start','/start hhreview_ru','/start hhreview_en','/start@HolisticHouseBot'])
    assert.equal(telegramPublicStartRequested(cmd),true)
  for(const cmd of ['hi','/start invite-secret','/start hhreview_ru extra','/agree',
    '/stop','/situation','/start?token=abc',''])
    assert.equal(telegramPublicStartRequested(cmd),false)
})
test('new Telegram chats only enter consent stage; /start cannot create CRM lead',()=>{
  const unsolicited=transitionTelegramDiagnostic(null,message('Hi'))
  assert.equal(unsolicited.handled,true)
  assert.equal(unsolicited.stage,'consent')
  assert.equal(unsolicited.body,null,'no CRM lead before /agree')
  assert.match(unsolicited.reply,/\/agree/)
  const photoBeforeConsent=transitionTelegramDiagnostic(null,message('',{
    photoFileId:'AgACAgQAAxk0123456789',photoBytes:123456,
  }))
  assert.equal(photoBeforeConsent.body,null,'unapproved photo is never ingested')
  assert.equal(photoBeforeConsent.stage,'consent')
  const plainStart=transitionTelegramDiagnostic(null,message('/start'))
  assert.equal(plainStart.stage,'consent')
  assert.equal(plainStart.locale,'ru')
  assert.equal(plainStart.body,null)
  assert.match(plainStart.reply,/\/agree/)
  assert.equal(transitionTelegramDiagnostic(null,message('/start@holistichouse_bot')).stage,'consent')
  const started=transitionTelegramDiagnostic(null,message('/start hhreview_ru'))
  assert.equal(started.stage,'consent')
  assert.equal(started.locale,'ru')
  assert.equal(started.body,null)
  assert.match(started.reply,/\/agree/)
  assert.deepEqual(started.keyboard,[['/agree','/stop']])
  const refused=transitionTelegramDiagnostic(session(started),message('Hello'))
  assert.equal(refused.stage,'consent')
  assert.equal(refused.body,null)
  assert.match(refused.reply,/\/agree/)
})
test('consented client completes situation request with optional photo and owner handoff',()=>{
  let r=transitionTelegramDiagnostic(null,message('/start hhreview_en'))
  assert.equal(r.locale,'en')
  r=transitionTelegramDiagnostic(session(r),message('/agree'))
  assert.equal(r.consent,true)
  assert.equal(r.stage,'focus')
  assert.match(r.body,/One-time personal reply/)
  r=transitionTelegramDiagnostic(session(r,true),message('/situation'))
  assert.equal(r.stage,'question')
  assert.match(r.body,/situation/)
  r=transitionTelegramDiagnostic(session(r,true),message('I need help setting my next goal'))
  assert.equal(r.stage,'photo')
  assert.equal(r.body,'I need help setting my next goal')
  r=transitionTelegramDiagnostic(session(r,true),message('',{
    photoFileId:'AgACAgQAAxk0123456789',photoBytes:625000,
  }))
  assert.equal(r.stage,'done')
  assert.equal(r.photoFileId,'AgACAgQAAxk0123456789')
  assert.match(r.body,/photo attached/)
  assert.match(r.reply,/personal response/)
  const followup=transitionTelegramDiagnostic(session(r,true),message('One more note'))
  assert.equal(followup.stage,'done')
  assert.equal(followup.body,'One more note')
  assert.equal(followup.reply,null,'manual CRM replies, no bot auto-chat')
})
test('energy branch and optional /skip paths do not treat a click as a booking',()=>{
  let r=transitionTelegramDiagnostic(null,message('/start hhreview_es'))
  r=transitionTelegramDiagnostic(session(r),message('/agree'))
  r=transitionTelegramDiagnostic(session(r,true),message('/energy'))
  assert.match(r.body,/energy and wellbeing/)
  r=transitionTelegramDiagnostic(session(r,true),message('/skip'))
  assert.equal(r.stage,'photo')
  assert.equal(r.body,null)
  r=transitionTelegramDiagnostic(session(r,true),message('/skip'))
  assert.equal(r.stage,'done')
  assert.match(r.reply,/no hay cita/i)
  assert.equal(r.body,null)
})
test('photo is strictly optional, size bounded, accepted only after opt-in',()=>{
  assert.equal(TELEGRAM_DIAGNOSTIC_PHOTO_LIMIT,5*1024*1024)
  const before=transitionTelegramDiagnostic(null,message('',{photoFileId:'AgACAgQAAxk0123456789',photoBytes:50000}))
  assert.equal(before.handled,true)
  assert.equal(before.stage,'consent')
  assert.equal(before.body,null)
  const waiting={stage:'photo',locale:'ru',consentAt:'2026-10-26T10:00:00Z'}
  for(const item of [
    {photoFileId:'AgACAgQAAxk0123456789',photoBytes:TELEGRAM_DIAGNOSTIC_PHOTO_LIMIT+1},
    {photoFileId:'x',photoBytes:400},
    {photoFileId:'AgACAgQAAxk0123456789',photoBytes:0},
  ]){
    const r=transitionTelegramDiagnostic(waiting,message('',item))
    assert.equal(r.stage,'photo')
    assert.equal(r.photoFileId,null)
    assert.equal(r.body,null)
  }
})
test('/stop before consent makes no lead; after consent suppresses future customer replies',()=>{
  const before=transitionTelegramDiagnostic(null,message('/stop'))
  assert.equal(before.stage,'stopped')
  assert.equal(before.body,null)
  assert.equal(before.reply,null)
  let r=transitionTelegramDiagnostic(null,message('/start hhreview_ru'))
  r=transitionTelegramDiagnostic(session(r),message('/stop'))
  assert.equal(r.body,null)
  assert.equal(r.stage,'stopped')
  assert.equal(transitionTelegramDiagnostic(session(r),message('/start hhreview_ru')).reply,null)
  const after=transitionTelegramDiagnostic({
    stage:'done',locale:'ru',consentAt:'2026-10-26T10:00:00Z',
  },message('/stop'))
  assert.equal(after.stop,true)
  assert.equal(after.body,'/stop')
  assert.equal(after.reply,null)
})
test('signed Telegram transport, single transactional CRM save, update-id dedup and explicit public gate',()=>{
  const hook=source('lib/crm/messenger-webhook.js')
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  const db=source('supabase/migrations/20261026143713_hh_crm_telegram_diagnostic_intake_20261026.sql')
  const publicApi=source('app/api/public/telegram-diagnostic/route.js')
  assert.ok(route.indexOf('verifyMessengerWebhook(provider,raw,request.headers)')<
    route.indexOf('processTelegramDiagnostic(event,config)'))
  assert.match(hook,/telegramPilotReady\(env\)/)
  assert.match(hook,/last_update_id/)
  assert.match(hook,/pg_advisory_xact_lock/)
  assert.match(hook,/ingestMessengerEventInTransaction\(db,'telegram'/)
  assert.match(hook,/select owner_id,account_id from app_private.crm_msg_resolve/)
  assert.match(hook,/transitionTelegramDiagnostic\(priorFlow/)
  assert.match(db,/FORCE ROW LEVEL SECURITY/i)
  assert.match(db,/force row level security/i)
  assert.match(db,/to hh_app_inbox/)
  assert.doesNotMatch(db,/grant .* to (anon|authenticated)/i)
  assert.match(publicApi,/channelTransportReady\('telegram',env\)/)
  assert.match(publicApi,/telegramDiagnosticPublicUrl/)
})
test('owner-only private photo, no public Telegram file ID or brokered medical details',()=>{
  const store=source('lib/crm/messenger-store.js')
  const provider=source('lib/crm/messenger-provider.js')
  const photo=source('app/api/app/crm/messenger/photo/route.js')
  const ui=source('components/app/crm-telegram-photo.jsx')
  assert.match(store,/async readTelegramPhotoRef/)
  assert.match(store,/m.owner_id=\$3/)
  assert.match(store,/m.direction='in'/)
  assert.match(photo,/auth\.verified\(\)/)
  assert.match(photo,/practitionerEmailAllowed\(actor\)/)
  assert.match(photo,/repo\.withOwner\(actor/)
  assert.match(photo,/Cache-Control':'private, no-store/)
  assert.match(provider,/retrievePrivateTelegramPhoto/)
  assert.match(provider,/Number\(info.file_size\)>5\*1024\*1024/)
  assert.match(ui,/URL\.revokeObjectURL/)
  assert.doesNotMatch(ui,/file_id|telegramPhotoFileId|api\.telegram\.org/)
})

test('diagnostic webhook forwards committed reply as Bot API text, not a missing property',()=>{
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  const provider=source('lib/crm/messenger-provider.js')
  assert.match(route,/sendTelegramDiagnosticPrompt\(\{to:intake\.to,text:intake\.reply,keyboard:intake\.keyboard,/)
  assert.match(route,/approvedPilotGuest:intake\.approvedPilotGuest===true/)
  assert.match(provider,/sendTelegramDiagnosticPrompt\(\{to,text,keyboard=\[\],approvedPilotGuest=false,locale='en'\}/)
  assert.doesNotMatch(route,/sendTelegramDiagnosticPrompt\(intake\)/)
})


// The Bot API "File.file_size" is OPTIONAL. The private proxy must fetch and
// validate actual JPEG/PNG bytes even when Telegram sends no size metadata.
// Mock transport only; no Telegram access, credentials, records or sends.
const photoPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+tTmYAAAAASUVORK5CYII=','base64')
const photoId='AgACAgQAAxk0123456789'
// Exercise the actual implementation in an isolated VM because its parent
// provider module is server-only and cannot be imported by plain node --test.
async function mockTelegramFile(fileInfo,fileBytes,verify){
  const requests=[]
  const implementation=source('lib/crm/messenger-provider.js').match(
    /^export async function retrievePrivateTelegramPhoto[\s\S]*?^\}/m)?.[0]
  assert.ok(implementation,'private owner media function source is present')
  const download=async url=>{
    assert.match(String(url),/^https:\/\/api\.telegram\.org\/file\/bot/)
    requests.push('download')
    return new Response(fileBytes,{status:200})
  }
  const retrievePrivateTelegramPhoto=runInNewContext(
    implementation.replace(/^export /,'')+'\nretrievePrivateTelegramPhoto',{
      AppError,Buffer,Number,encodeURIComponent,AbortSignal,TIMEOUT:9000,
      API:'https://api.telegram.org',process,
      token:()=>env.HH_CRM_MSG_TELEGRAM_TOKEN,
      channelTransportReady:()=>true,
      readProvider:async url=>{
        assert.match(String(url),/^https:\/\/api\.telegram\.org\/bot.+\/getFile\?file_id=/)
        requests.push('metadata')
        return {ok:true,result:fileInfo}
      },
      fetch:download,
    })
  await verify(requests,retrievePrivateTelegramPhoto)
}

test('owner Telegram photo proxy accepts missing optional File.file_size and validates real PNG bytes',async()=>{
  await mockTelegramFile({file_path:'photos/file_1.png'},photoPng,async (calls,retrievePrivateTelegramPhoto)=>{
    const result=await retrievePrivateTelegramPhoto(photoId,env)
    assert.equal(result.contentType,'image/png')
    assert.deepEqual(result.bytes,photoPng)
    assert.deepEqual(calls,['metadata','download'])
  })
})
test('owner Telegram photo proxy also accepts a declared valid file size',async()=>{
  await mockTelegramFile({file_size:photoPng.length,file_path:'photos/file_1.png'},photoPng,async (calls,retrievePrivateTelegramPhoto)=>{
    assert.equal((await retrievePrivateTelegramPhoto(photoId,env)).bytes.length,photoPng.length)
    assert.deepEqual(calls,['metadata','download'])
  })
})
test('owner Telegram proxy blocks inflated, malformed, unsafe-path and invalid content without disclosure',async()=>{
  for(const info of [
    {file_size:5*1024*1024+1,file_path:'photos/file_1.png'},
    {file_size:'many',file_path:'photos/file_1.png'},
    {file_size:-5,file_path:'photos/file_1.png'},
    {file_path:'../private.env'},
    {file_path:'photos/../private.env'},
  ]){
    await mockTelegramFile(info,photoPng,async (calls,retrievePrivateTelegramPhoto)=>{
      await assert.rejects(retrievePrivateTelegramPhoto(photoId,env),{code:'PHOTO_UNAVAILABLE',status:404})
      assert.deepEqual(calls,['metadata'],'must not download unsafe or oversized media')
    })
  }
  await mockTelegramFile({file_path:'photos/file_1.png'},Buffer.from('not-a-valid-image-payload'),async (calls,retrievePrivateTelegramPhoto)=>{
    await assert.rejects(retrievePrivateTelegramPhoto(photoId,env),{code:'PHOTO_UNAVAILABLE',status:404})
    assert.deepEqual(calls,['metadata','download'])
  })
})
