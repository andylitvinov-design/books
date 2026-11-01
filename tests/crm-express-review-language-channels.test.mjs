import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHmac} from 'node:crypto'
import {whatsappExpressReviewHandoff,whatsappExpressReviewLocale} from '../lib/crm/express-review-channel-handoff.mjs'
import {telegramDiagnosticPublicUrl} from '../lib/crm/telegram-diagnostic.mjs'
import {normalizeMessengerUpdates,verifyMessengerWebhook} from '../lib/crm/messenger-webhook.js'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const labels={en:'Request',ru:'Запрос',es:'Solicitud'}
const botEnv={
  VERCEL_ENV:'production',HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',
  HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_TOKEN:'123456789:'+ 'a'.repeat(40),
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'test_secret_with_safe_symbols',
  HH_CRM_MSG_TELEGRAM_USERNAME:'HolisticHouseBot',
}
const waEnv={
  VERCEL_ENV:'production',HH_CRM_MSG_PRODUCTION_APPROVED:'true',
  HH_CRM_MSG_WHATSAPP_ENABLED:'true',
  HH_CRM_MSG_WHATSAPP_TOKEN:'synthetic-test-token',
  HH_CRM_MSG_WHATSAPP_PHONE_ID:'123456789012',
  HH_CRM_MSG_META_APP_SECRET:'synthetic-test-secret',
  HH_CRM_MSG_META_VERIFY_TOKEN:'test-verify',
  HH_CRM_MSG_META_API_VERSION:'v24.0',
}
test('English Russian Spanish website chooses the correct verified Telegram bot start language',()=>{
  for(const locale of ['en','ru','es']){
    const url=telegramDiagnosticPublicUrl(locale,botEnv)
    assert.equal(url,'https://t.me/HolisticHouseBot?start=hhreview_'+locale)
  }
  assert.equal(telegramDiagnosticPublicUrl('fr',botEnv),null)
  assert.equal(telegramDiagnosticPublicUrl('en',{...botEnv,HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'false'}),null)
  assert.equal(telegramDiagnosticPublicUrl('en',{...botEnv,HH_CRM_MSG_TELEGRAM_TOKEN:null}),null)
})
test('WhatsApp personal link stays manual and carries only a non-secret site language request',()=>{
  for(const locale of ['en','ru','es']){
    const link=whatsappExpressReviewHandoff(locale)
    const url=new URL(link)
    assert.equal(url.origin,'https://wa.me')
    assert.equal([...url.searchParams.keys()].join(','),'text')
    const body=url.searchParams.get('text')
    assert.ok(body.includes(labels[locale]+': HHREVIEW_'+locale.toUpperCase()))
    assert.ok(body.includes('https://holistichouse.vercel.app/'+locale+'/services/free-situation-review'))
    assert.equal(whatsappExpressReviewLocale(body),locale)
    assert.doesNotMatch(body,/private-selector|access_token|session_id|medical report|medical records|lab results/i)
  }
  assert.equal(whatsappExpressReviewHandoff('../private'),null)
  for(const bad of ['',null,'HHREVIEW_EN','Request: HHREVIEW_ES','Запрос: HHREVIEW_EN',
    'Request: HHREVIEW_EN\nToken:SECRET','Request: HHREVIEW_EN?token=123']) {
    assert.equal(whatsappExpressReviewLocale(bad),null,String(bad))
  }
})
test('signed official WhatsApp webhook stores language marker as locale only, never starts a bot',()=>{
  for(const locale of ['en','ru','es']){
    const body=new URL(whatsappExpressReviewHandoff(locale)).searchParams.get('text')
    const payload={entry:[{changes:[{value:{
      metadata:{phone_number_id:waEnv.HH_CRM_MSG_WHATSAPP_PHONE_ID},
      contacts:[{wa_id:'14165550001',profile:{name:'Synthetic'}}],
      messages:[{from:'14165550001',id:'wamid.synthetic_'+locale,type:'text',
        text:{body},timestamp:'1793000000'}],
    }}]}]}
    const raw=Buffer.from(JSON.stringify(payload))
    const signature='sha256='+createHmac('sha256',waEnv.HH_CRM_MSG_META_APP_SECRET).update(raw).digest('hex')
    const headers=new Headers({'x-hub-signature-256':signature})
    assert.equal(verifyMessengerWebhook('whatsapp',raw,headers,waEnv),true)
    assert.equal(verifyMessengerWebhook('whatsapp',raw,new Headers({'x-hub-signature-256':'sha256='+'0'.repeat(64)}),waEnv),false)
    const result=normalizeMessengerUpdates('whatsapp',payload)
    assert.equal(result.length,1)
    assert.equal(result[0].language,locale)
    assert.equal(result[0].diagnosticLocale,locale)
    // The signed raw message keeps newlines for locale parsing; CRM stores a
    // bounded, safely normalized message without line breaks.
    assert.equal(result[0].body,body.replace(/[\r\n\u0000-\u001f]/g,' ').trim().slice(0,1200))
    assert.equal(result[0].type,'incoming')
    assert.equal(result[0].stop,false)
  }
  assert.equal(waEnv.HH_CRM_MSG_PRODUCTION_APPROVED,'true','synthetic fixture only')
  const noMarker={entry:[{changes:[{value:{metadata:{phone_number_id:waEnv.HH_CRM_MSG_WHATSAPP_PHONE_ID},
    messages:[{from:'14165550001',id:'wamid.unmarked',type:'text',text:{body:'Hello'},timestamp:'1793000000'}]}}]}]}
  const unmarked=normalizeMessengerUpdates('whatsapp',noMarker)
  assert.equal(unmarked[0].language,null)
  assert.equal(unmarked[0].diagnosticLocale,null)
})
test('free situation landing exposes locale-scoped chooser with distinct Telegram bot and manual WhatsApp labels',()=>{
  const component=read('components/telegram-diagnostic-entry.tsx')
  const page=read('components/free-entry-landing.tsx')
  const hook=read('lib/crm/messenger-webhook.js')
  const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js')
  assert.match(page,/import \{ TelegramDiagnosticEntry \} from/)
  assert.match(page,/kind === "situation" \? <TelegramDiagnosticEntry locale=\{locale\} \/>/)
  assert.match(component,/data-express-review-messenger-choice=\{locale\}/)
  assert.match(component,/data-express-review-channel="telegram"/)
  assert.match(component,/data-express-review-channel="whatsapp-manual"/)
  assert.match(component,/data\.urls\?\.\[locale\]/)
  assert.match(component,/start=hhreview_/)
  assert.match(component,/setTelegramUrl\(null\)/)
  assert.match(component,/whatsappExpressReviewHandoff\(locale\)/)
  assert.match(hook,/whatsappExpressReviewLocale\((?:String\(body\?\?''\)|body)\)/)
  assert.match(hook,/const safeBody=safeString\(body,1200\)/)
  assert.ok(route.indexOf('verifyMessengerWebhook(provider,raw,request.headers)')<
    route.indexOf('normalizeMessengerUpdates(provider,body)'))
  assert.doesNotMatch(component,/sendOneMessengerMessage|autoSend|createContact|book|payment|sendBeacon/)
  const css=read('components/telegram-diagnostic-entry.module.css')
  assert.match(css,/@media\s*\(max-width:\s*580px\)/)
  assert.match(css,/min-height:\s*46px/)
})

test('free-review copy does not contradict consented optional Telegram photo and drawing',()=>{
  const landing=read('components/free-entry-landing.tsx')
  assert.doesNotMatch(landing,/Do not send private answers or drawings via messengers|Не отправляйте личные ответы и рисунки в мессенджерах|No envíes respuestas privadas ni dibujos por mensajería/)
  assert.match(landing,/After consent, the Telegram dialogue may ask/)
  assert.match(landing,/После согласия Telegram-бот может/)
  assert.match(landing,/Tras dar tu consentimiento, Telegram puede pedir/)
  assert.match(landing,/protected website form/)
})

test('free-review messenger CTAs have branded colors, clear localized names and no duplicate primary button',()=>{
  const channels=read('components/telegram-diagnostic-entry.tsx')
  const channelsCss=read('components/telegram-diagnostic-entry.module.css')
  const capture=read('components/personal-express-enquiry.tsx')
  const captureCss=read('components/personal-express-enquiry.module.css')
  for(const label of [
    'Request my free review via Telegram','Request my free review via WhatsApp',
    'Запросить бесплатный разбор через Telegram','Запросить бесплатный разбор через WhatsApp',
    'Solicitar mi revisión gratis por Telegram','Solicitar mi revisión gratis por WhatsApp',
  ]) assert.ok(channels.includes(label),label)
  assert.match(channels,/import \{ MessageCircle, Send \} from "lucide-react"/)
  assert.match(channelsCss,/\.action \{ background: #087cad/)
  assert.match(channelsCss,/\.manualAction \{ background: #087846/)
  assert.match(channelsCss,/@media \(max-width: 580px\)/)
  assert.match(channelsCss,/min-height: 54px/)
  assert.ok(capture.indexOf('<TelegramDiagnosticEntry locale={locale} />') <
    capture.indexOf('<button ref={revealRef}'), 'messenger choices precede the discreet secure-form link')
  assert.doesNotMatch(capture,/reveal:\s*"Request my free review"/)
  assert.match(capture,/secureAlternative: "Use the secure website form instead"/)
  assert.match(capture,/data-express-reveal aria-expanded=\{expanded\}/)
  assert.match(captureCss,/\.reveal\{display:inline-flex;/)
  assert.match(captureCss,/data-express-review-messenger-choice\]\)\{display:none\}/)
})
