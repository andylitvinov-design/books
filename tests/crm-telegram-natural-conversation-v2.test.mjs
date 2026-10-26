import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TELEGRAM_DIAGNOSTIC_V2_VERSION,TELEGRAM_DIAGNOSTIC_V2_BUTTONS,
  TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT,
  telegramV2CoachingLink,
} from '../lib/crm/telegram-diagnostic-v2.mjs'
import {
  transitionTelegramDiagnostic,transitionTelegramDiagnosticLegacy,
} from '../lib/crm/telegram-diagnostic.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const msg=(text,extra={})=>({rawText:text,locale:'ru',...extra})
const state=(r,agreed=true)=>({
  stage:r.stage,locale:r.locale,topic:r.topic,
  flowVersion:r.flowVersion,consentAt:agreed?'2026-10-26T18:00:00Z':null,
})
const PHOTO={photoFileId:'AgACAgQAAxk0123456789',photoBytes:210000}
test('new chats use natural first-person consent and no slash command buttons',()=>{
  const first=transitionTelegramDiagnostic(null,msg('/start'))
  assert.equal(first.flowVersion,TELEGRAM_DIAGNOSTIC_V2_VERSION)
  assert.equal(first.stage,'consent')
  assert.equal(first.body,null)
  assert.match(first.reply,/Приветствую! Спасибо за интерес/)
  assert.match(first.reply,/в течение трёх дней/)
  assert.match(first.reply,/соглашаетесь/)
  assert.deepEqual(first.keyboard,[['Да, начинаем','Не сейчас']])
  assert.equal(first.keyboard.flat().some(x=>x.startsWith('/')),false)
  const random=transitionTelegramDiagnostic(null,msg('some personal story'))
  assert.equal(random.body,null,'no unsolicited personal text can enter CRM')
  assert.equal(random.stage,'consent')
  assert.equal(random.consent,false)
})
test('only explicit natural Yes or retained legacy /agree creates consent record',()=>{
  const first=transitionTelegramDiagnostic(null,msg('/start'))
  const declined=transitionTelegramDiagnostic(state(first,false),msg('Не сейчас'))
  assert.equal(declined.stage,'consent')
  assert.equal(declined.body,null)
  assert.deepEqual(declined.keyboard,[])
  const unclear=transitionTelegramDiagnostic(state(first,false),msg('Да'))
  assert.equal(unclear.consent,false)
  const accepted=transitionTelegramDiagnostic(state(first,false),msg('Да, начинаем'))
  assert.equal(accepted.stage,'focus')
  assert.equal(accepted.consent,true)
  assert.match(accepted.body,/consent/)
  assert.deepEqual(accepted.keyboard,[
    ['Деньги / работа','Энергия / самочувствие'],['Отношения','Другое'],
  ])
  assert.equal(accepted.keyboard.flat().some(x=>x.startsWith('/')),false)
})
test('six-step journey captures the portrait, three-part goal and drawing separately in same CRM flow',()=>{
  let flow=transitionTelegramDiagnostic(null,msg('/start hhreview_ru'))
  flow=transitionTelegramDiagnostic(state(flow,false),msg('Да, начинаем'))
  flow=transitionTelegramDiagnostic(state(flow),msg('Отношения'))
  assert.equal(flow.topic,'relationships')
  assert.equal(flow.stage,'photo')
  assert.deepEqual(flow.keyboard,[['Пропустить фото']])
  flow=transitionTelegramDiagnostic(state(flow),msg('',PHOTO))
  assert.equal(flow.stage,'question')
  assert.equal(flow.photoFileId,PHOTO.photoFileId)
  assert.equal(flow.photoPurpose,'portrait')
  assert.match(flow.reply,/фото принял/)
  flow=transitionTelegramDiagnostic(state(flow),msg('Цель: наладить отношения. Сложность: коммуникация. Подробнее: тестовая заявка.'))
  assert.equal(flow.stage,'drawing')
  assert.match(flow.reply,/Я/)
  assert.match(flow.reply,/Цель/)
  assert.match(flow.reply,/Сложность/)
  assert.deepEqual(flow.keyboard,[['Пропустить рисунок']])
  flow=transitionTelegramDiagnostic(state(flow),msg('',PHOTO))
  assert.equal(flow.stage,'done')
  assert.equal(flow.photoPurpose,'drawing')
  assert.equal(flow.photoFileId,PHOTO.photoFileId)
  assert.equal(flow.topic,'relationships')
  assert.ok(flow.reply.includes('https://holistichouse.vercel.app/ru/coaching/intake?topic=relationships'))
  assert.match(flow.reply,/Отправить анкету и заявку/)
  assert.deepEqual(flow.keyboard,[])
  assert.equal(flow.consent,false)
  const final=transitionTelegramDiagnostic(state(flow),msg('Дополнительная информация для мастера'))
  assert.equal(final.stage,'done')
  assert.equal(final.body,'Дополнительная информация для мастера')
  assert.equal(final.reply,null)
})
test('photo and drawing are optional, oversized or unexpected uploads cannot be stored',()=>{
  let flow=transitionTelegramDiagnostic(null,msg('/start'))
  flow=transitionTelegramDiagnostic(state(flow,false),msg('Да, начинаем'))
  flow=transitionTelegramDiagnostic(state(flow),msg('Деньги / работа'))
  assert.equal(flow.topic,'business')
  const oversized=transitionTelegramDiagnostic(state(flow),msg('',{
    photoFileId:PHOTO.photoFileId,photoBytes:TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT+1,
  }))
  assert.equal(oversized.stage,'photo')
  assert.equal(oversized.photoFileId,null)
  flow=transitionTelegramDiagnostic(state(flow),msg('Пропустить фото'))
  assert.equal(flow.stage,'question')
  assert.match(flow.reply,/Теперь напишите/)
  const invalid=transitionTelegramDiagnostic(state(flow),msg('',PHOTO))
  assert.equal(invalid.stage,'question')
  assert.equal(invalid.body,null)
  flow=transitionTelegramDiagnostic(state(flow),msg('Цель: новая работа; трудность: решение; контекст: смена сферы.'))
  assert.equal(flow.stage,'drawing')
  const noDrawing=transitionTelegramDiagnostic(state(flow),msg('Пропустить рисунок'))
  assert.equal(noDrawing.stage,'done')
  assert.equal(noDrawing.photoFileId,null)
  assert.ok(noDrawing.reply.includes('topic=business'))
})
test('Stop remains private opt-out without showing technical /stop or generating a lead',()=>{
  const first=transitionTelegramDiagnostic(null,msg('/start'))
  const canceled=transitionTelegramDiagnostic(state(first,false),msg('Стоп'))
  assert.equal(canceled.stage,'stopped')
  assert.equal(canceled.body,null)
  assert.equal(canceled.stop,false)
  assert.equal(transitionTelegramDiagnostic(state(canceled,false),msg('/start')).reply,null)
  const started=transitionTelegramDiagnostic(state(first,false),msg('Да, начинаем'))
  const opted=transitionTelegramDiagnostic(state(started),msg('Остановить диалог'))
  assert.equal(opted.stop,true)
  assert.equal(opted.body,'/stop')
  assert.equal(opted.stage,'stopped')
})
test('English and Spanish are equal flows and coaching links only allow canonical category',()=>{
  for(const [lang,yes,topic] of [
    ['en',"Yes, let's begin",'Money / work'],
    ['es','Sí, empezamos','Dinero / trabajo'],
  ]){
    const first=transitionTelegramDiagnostic(null,msg('/start hhreview_'+lang))
    assert.equal(first.locale,lang)
    const agreed=transitionTelegramDiagnostic(state(first,false),msg(yes,{locale:lang}))
    assert.equal(agreed.stage,'focus')
    const selection=transitionTelegramDiagnostic(state(agreed),msg(topic,{locale:lang}))
    assert.equal(selection.stage,'photo')
    assert.equal(selection.topic,'business')
  }
  assert.equal(telegramV2CoachingLink('ru','business'),
    'https://holistichouse.vercel.app/ru/coaching/intake?topic=business')
  assert.equal(telegramV2CoachingLink('es','../private/chat_id=123'),
    'https://holistichouse.vercel.app/es/coaching/intake?topic=personal')
  assert.equal(telegramV2CoachingLink('../secret','business'),
    'https://holistichouse.vercel.app/en/coaching/intake?topic=business')
  assert.equal(TELEGRAM_DIAGNOSTIC_V2_BUTTONS.some(x=>x.startsWith('/')),false)
  assert.equal(new Set(TELEGRAM_DIAGNOSTIC_V2_BUTTONS).size,TELEGRAM_DIAGNOSTIC_V2_BUTTONS.length)
})
test('legacy V1 in-progress question remains intact until an explicit new /start',()=>{
  const prior={stage:'question',locale:'ru',consentAt:'2026-10-26T12:00:00Z',flowVersion:1}
  const text=transitionTelegramDiagnostic(prior,msg('Старый ответ по существующей заявке'))
  assert.equal(text.stage,'photo')
  assert.equal(text.body,'Старый ответ по существующей заявке')
  assert.equal(text.flowVersion,undefined)
  const restart=transitionTelegramDiagnostic(prior,msg('/start hhreview_ru'))
  assert.equal(restart.flowVersion,2)
  assert.equal(restart.stage,'consent')
  assert.equal(restart.body,null)
  const v1=transitionTelegramDiagnosticLegacy(prior,msg('/skip'))
  assert.equal(v1.stage,'photo')
  const stopped={stage:'stopped',locale:'ru',flowVersion:1}
  assert.equal(transitionTelegramDiagnostic(stopped,msg('/start')).reply,null)
})
test('all Telegram replies fit existing transport and keyboards never include unsupported commands',()=>{
  const text=read('lib/crm/telegram-diagnostic-v2.mjs')
  const provider=read('lib/crm/messenger-provider.js')
  const hook=read('lib/crm/messenger-webhook.js')
  const v2Replies=[...text.matchAll(/(?:intro|topics|portrait|questionPhoto|questionSkip|drawing|final):\s*(?:`([\s\S]*?)`|'([^']*)')/g)]
  assert.ok(v2Replies.length>=12)
  const locales=['en','ru','es']
  for(const lang of locales){
    const one=transitionTelegramDiagnostic(null,msg('/start hhreview_'+lang))
    assert.ok(one.reply.length<=1200,lang+' intro length: '+one.reply.length)
  }
  assert.match(provider,/TELEGRAM_DIAGNOSTIC_V2_BUTTONS/)
  assert.match(hook,/next\.photoPurpose/)
  assert.match(hook,/flow_version,topic/)
  assert.match(hook,/telegramPhotoPurpose/)
  assert.doesNotMatch(text,/sendMessage\(|setWebhook\(|fetch\(|process\.env/)
})

test('every V2 outgoing step obeys the Telegram 1200-char template limit and 2x3 keyboard',()=>{
  const choices=new Set(TELEGRAM_DIAGNOSTIC_V2_BUTTONS)
  const labelByLanguage={
    ru:{yes:'Да, начинаем',business:'Деньги / работа',skipPhoto:'Пропустить фото',skipDrawing:'Пропустить рисунок'},
    en:{yes:"Yes, let's begin",business:'Money / work',skipPhoto:'Skip photo',skipDrawing:'Skip drawing'},
    es:{yes:'Sí, empezamos',business:'Dinero / trabajo',skipPhoto:'Omitir foto',skipDrawing:'Omitir dibujo'},
  }
  for(const [locale,label] of Object.entries(labelByLanguage)){
    let item=transitionTelegramDiagnostic(null,msg('/start hhreview_'+locale))
    const steps=[item]
    item=transitionTelegramDiagnostic(state(item,false),msg(label.yes,{locale}));steps.push(item)
    item=transitionTelegramDiagnostic(state(item),msg(label.business,{locale}));steps.push(item)
    item=transitionTelegramDiagnostic(state(item),msg(label.skipPhoto,{locale}));steps.push(item)
    item=transitionTelegramDiagnostic(state(item),msg('My goal is clear; I have difficulty choosing; extra: synthetic text.',{locale}));steps.push(item)
    item=transitionTelegramDiagnostic(state(item),msg(label.skipDrawing,{locale}));steps.push(item)
    assert.equal(item.stage,'done')
    for(const step of steps){
      assert.ok(step.reply&&step.reply.length<=1200,locale+' '+step.stage+': '+step.reply?.length)
      assert.ok(step.keyboard.length<=2)
      for(const row of step.keyboard){
        assert.ok(row.length>=1&&row.length<=3)
        for(const choice of row)assert.ok(choices.has(choice),locale+' '+choice)
      }
    }
  }
})
test('V2 private stage schema is additive and first-party owner media stays encrypted',()=>{
  const sql=read('supabase/migrations/20261026171737_hh_crm_telegram_dialogue_v2_20261026.sql')
  const hook=read('lib/crm/messenger-webhook.js')
  const store=read('lib/crm/messenger-store.js')
  const ui=read('components/app/crm-messenger.jsx')
  assert.match(sql,/add column if not exists flow_version/)
  assert.match(sql,/add column if not exists topic/)
  assert.match(sql,/default 1/)
  assert.match(sql,/drawing/)
  assert.doesNotMatch(sql,/drop table|truncate|grant.*anon|disable row level security/i)
  assert.match(hook,/flow_version,topic/)
  assert.match(hook,/next\.flowVersion===2\?2:1/)
  assert.match(hook,/telegramPhotoPurpose/)
  assert.match(store,/openSealed\(m\.body_ciphertext/)
  assert.match(store,/photoPurpose/)
  assert.match(ui,/m\.photoPurpose==='drawing'/)
  assert.doesNotMatch(ui,/telegramPhotoFileId|HH_CRM_MSG_TELEGRAM_TOKEN/)
})
