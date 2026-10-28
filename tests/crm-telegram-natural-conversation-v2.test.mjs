import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TELEGRAM_DIAGNOSTIC_V2_VERSION,TELEGRAM_DIAGNOSTIC_V2_BUTTONS,
  TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT,
  telegramV2CoachingLink,telegramDiagnosticDailyReplyCount,
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
  assert.match(first.reply,/Приветствую! Спасибо за интерес к экспресс-диагностике/)
  assert.match(first.reply,/в течение трех дней/)
  assert.match(first.reply,/Подходит, начинаем\?$/)
  assert.doesNotMatch(first.reply,/Нажимая «Да, начинаем»/)
  assert.deepEqual(first.keyboard,[['Да, начинаем','Не сейчас']])
  assert.equal(first.keyboard.flat().some(x=>x.startsWith('/')),false)
  const random=transitionTelegramDiagnostic(null,msg('some personal story'))
  assert.equal(random.body,null,'no unsolicited personal text can enter CRM')
  assert.equal(random.stage,'consent')
  assert.equal(random.consent,false)
})
test('localized intros end with the question and no long consent paragraph',()=>{
  for (const [locale,end,removed] of [
    ['ru','Подходит, начинаем?','Нажимая «Да, начинаем»'],
    ['en','Shall we begin?','By choosing'],
    ['es','¿Empezamos?','Al elegir «Sí, empezamos»'],
  ]) {
    const first=transitionTelegramDiagnostic(null,{rawText:'/start hhreview_'+locale,locale})
    assert.equal(first.stage,'consent')
    assert.ok(first.reply.endsWith(end),locale+' ends with the question')
    assert.equal(first.reply.includes(removed),false,locale+' has no added footer')
    assert.equal(first.consent,false,locale+' does not record consent without a click')
  }
})
test('six exact owner-authored RU messages are sent in order; photo and drawing remain separate',()=>{
  const steps=[]
  let r=transitionTelegramDiagnostic(null,msg('/start hhreview_ru'));steps.push(r)
  r=transitionTelegramDiagnostic(state(r,false),msg('Да, начинаем'));steps.push(r)
  r=transitionTelegramDiagnostic(state(r),msg('деньги/ работа'));steps.push(r)
  r=transitionTelegramDiagnostic(state(r),msg('',PHOTO));steps.push(r)
  r=transitionTelegramDiagnostic(state(r),msg('Цель: деньги, сложность: выбор, подробности: тестовая цель.'));steps.push(r)
  r=transitionTelegramDiagnostic(state(r),msg('',PHOTO));steps.push(r)
  const expected=[
    "Приветствую! Спасибо за интерес к экспресс-диагностике.\n\nБуду рад помочь.\n\nМы можем провести блиц диагностику текущей ситуации.\nЭто могут быть деньги, работа, отношения, переезд и тп.\n\nВ блиц-формате я могу дать обратную связь:\n- что сейчас происходит\n- в чем причина (где внутренний ступор)\n- что можно сделать с этим.\n\nЧерез этот бот я задам пару вопросов и потом в течение трех дней сделаю личный разбор.\n\nПодходит, начинаем?",
    "Выбери, пожалуйста, с какой темой сейчас хотелось бы поработать:\n- деньги/ работа\n- энергия/ здоровье\n- отношения\n- другое.",
    "Вышли, пожалуйста, свое фото (лучше недавнее, за последний год, чтобы четко было видно лицо, в полный рост - ну или любое которое есть).",
    "Спасибо. Фото принял.\n\nНапиши, пожалуйста,\n1) в чем ключевая задача (цель)\n2) в чем сложность\n3) любые подробности, которые стоило бы добавить.",
    "Спасибо за ответ.\n\nТеперь самое важное чтобы я мог разобрать ситуацию, сделай, пожалуйста, рисунок. Ручкой, на любом листике бумаги нарисуй три фигурки:\n- я\n- цель\n- сложность/ препятствие\n\nЭто могут быть любые абстрактные фигурки, человечки, квадратики.\nВсе что придет в голову.\n\nИ потом вышли, пожалуйста, фото рисунка в этот чат.",
    "Спасибо.\nЗадача принята в работу.\n\nИ последнее.\nЧтобы еще чуть лучше понять, разобраться в текущей форме заполни, пожалуйста, эту коучинг форму.\n\nТакая форма поможет и тебе четче понять запрос и решения.\nИ мне подготовить для тебя те ответы, которые будут более значимы.\n\nКоучинг форма по этой ссылке.\nhttps://holistichouse.vercel.app/ru/coaching/intake?topic=business\n\nПросто зайти на нее, заполни ответы, нажми отправить.\nИ я займусь изучением твоего вопроса."
  ]
  assert.equal(steps.length,6,'exactly six distinct bot messages')
  assert.deepEqual(steps.map(x=>x.stage),['consent','focus','photo','question','drawing','done'])
  assert.deepEqual(steps.map(x=>x.reply),expected,'no paraphrase or missing fifth/drawing step')
  assert.equal(steps[3].photoPurpose,'portrait')
  assert.equal(steps[5].photoPurpose,'drawing')
  assert.deepEqual(steps[1].keyboard,[
    ['деньги/ работа','энергия/ здоровье'],['отношения','другое'],
  ])
  assert.equal(steps.some(x=>x.keyboard.flat().some(k=>k.startsWith('/'))),false)
  assert.equal(steps.some(x=>x.reply?.includes('/agree')||x.reply?.includes('/stop')),false)
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
    ['деньги/ работа','энергия/ здоровье'],['отношения','другое'],
  ])
  assert.equal(accepted.keyboard.flat().some(x=>x.startsWith('/')),false)
})
test('six-step journey captures the portrait, three-part goal and drawing separately in same CRM flow',()=>{
  let flow=transitionTelegramDiagnostic(null,msg('/start hhreview_ru'))
  flow=transitionTelegramDiagnostic(state(flow,false),msg('Да, начинаем'))
  flow=transitionTelegramDiagnostic(state(flow),msg('отношения'))
  assert.equal(flow.topic,'relationships')
  assert.equal(flow.stage,'photo')
  assert.deepEqual(flow.keyboard,[['Пропустить фото']])
  flow=transitionTelegramDiagnostic(state(flow),msg('',PHOTO))
  assert.equal(flow.stage,'question')
  assert.equal(flow.photoFileId,PHOTO.photoFileId)
  assert.equal(flow.photoPurpose,'portrait')
  assert.match(flow.reply,/Фото принял/)
  flow=transitionTelegramDiagnostic(state(flow),msg('Цель: наладить отношения. Сложность: коммуникация. Подробнее: тестовая заявка.'))
  assert.equal(flow.stage,'drawing')
  assert.match(flow.reply,/я/)
  assert.match(flow.reply,/цель/)
  assert.match(flow.reply,/сложность/)
  assert.deepEqual(flow.keyboard,[['Пропустить рисунок']])
  flow=transitionTelegramDiagnostic(state(flow),msg('',PHOTO))
  assert.equal(flow.stage,'done')
  assert.equal(flow.photoPurpose,'drawing')
  assert.equal(flow.photoFileId,PHOTO.photoFileId)
  assert.equal(flow.topic,'relationships')
  assert.ok(flow.reply.includes('https://holistichouse.vercel.app/ru/coaching/intake?topic=relationships'))
  assert.match(flow.reply,/нажми отправить/)
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
  flow=transitionTelegramDiagnostic(state(flow),msg('деньги/ работа'))
  assert.equal(flow.topic,'business')
  const oversized=transitionTelegramDiagnostic(state(flow),msg('',{
    photoFileId:PHOTO.photoFileId,photoBytes:TELEGRAM_DIAGNOSTIC_V2_PHOTO_LIMIT+1,
  }))
  assert.equal(oversized.stage,'photo')
  assert.equal(oversized.photoFileId,null)
  flow=transitionTelegramDiagnostic(state(flow),msg('Пропустить фото'))
  assert.equal(flow.stage,'question')
  assert.match(flow.reply,/Напиши, пожалуйста/)
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
test('existing V1 chat can restart the exact six owner messages with a natural phrase and no visible slash commands',()=>{
  for(const [locale,phrase] of [
    ['ru','Начать заново'],['en','Start again'],['es','Empezar de nuevo'],
  ]){
    const previous={stage:'done',locale,flowVersion:1,consentAt:'2026-10-26T14:00:00Z'}
    const response=transitionTelegramDiagnostic(previous,msg(phrase,{locale}))
    assert.equal(response.flowVersion,2,locale)
    assert.equal(response.stage,'consent',locale)
    assert.equal(response.body,null,'restart is never an extra CRM lead')
    assert.ok(response.reply&&response.reply.length>50,locale)
    assert.ok(response.keyboard.every(row=>row.every(button=>!button.startsWith('/'))))
    const newSession={...previous,flowVersion:2}
    const second=transitionTelegramDiagnostic(newSession,msg(phrase,{locale}))
    assert.equal(second.stage,'consent',locale)
    assert.equal(second.consent,false)
    assert.equal(telegramDiagnosticDailyReplyCount({
      flow_version:2,reply_day:'2026-10-26',reply_count:8,
    },second,'2026-10-26'),8,'V2 repeated restart cannot refill daily quota')
    const stopped={...previous,stage:'stopped'}
    assert.equal(transitionTelegramDiagnostic(stopped,msg(phrase,{locale})).reply,null)
  }
  const old={stage:'done',locale:'ru',flowVersion:1,consentAt:'2026-10-26T14:00:00Z'}
  const noRestart=transitionTelegramDiagnostic(old,msg('Дополнительное пояснение'))
  assert.equal(noRestart.flowVersion,undefined,'ordinary V1 reply preserves old version')
  assert.equal(noRestart.body,'Дополнительное пояснение')
})

test('legacy chat at ten replies can restart six owner messages ONCE without unbounded daily resets',()=>{
  const day='2026-10-26'
  const old={flow_version:1,reply_day:day,reply_count:10}
  const prior={stage:'done',locale:'ru',flowVersion:1,consentAt:'2026-10-26T12:00:00Z'}
  const restart=transitionTelegramDiagnostic(prior,msg('/start hhreview_ru'))
  assert.equal(restart.flowVersion,2)
  assert.equal(restart.stage,'consent')
  assert.equal(telegramDiagnosticDailyReplyCount(old,restart,day),0)
  assert.equal(telegramDiagnosticDailyReplyCount(old,{flowVersion:1,stage:'done'},day),10,
    'unrestarted V1 must remain capped')
  const newSession={flow_version:2,reply_day:day,reply_count:6}
  assert.equal(telegramDiagnosticDailyReplyCount(newSession,restart,day),6,
    'subsequent V2 /start must NOT reset quota')
  assert.equal(telegramDiagnosticDailyReplyCount({...newSession,reply_count:10},restart,day),10)
  assert.equal(telegramDiagnosticDailyReplyCount({...newSession,reply_count:10},restart,'2026-10-27'),0)
  assert.equal(telegramDiagnosticDailyReplyCount(old,{flowVersion:2,stage:'focus',consent:true},day),10,
    'only an explicit V2 consent-screen restart can reset')
  const source=read('lib/crm/messenger-webhook.js')
  assert.match(source,/telegramDiagnosticDailyReplyCount\(previous,next,today\)/)
  assert.match(source,/Number\(previous\.last_update_id\)>=updateId/)
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
    ru:{yes:'Да, начинаем',business:'деньги/ работа',skipPhoto:'Пропустить фото',skipDrawing:'Пропустить рисунок'},
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
  assert.match(hook,/pilot_access_until,flow_version,topic/)
  assert.match(hook,/verifyTelegramSecondAccountInvite/)
  assert.match(hook,/approvedPilotGuest/)
  assert.match(hook,/next\.flowVersion===2\?2:1/)
  assert.match(hook,/telegramPhotoPurpose/)
  assert.match(store,/openSealed\(m\.body_ciphertext/)
  assert.match(store,/photoPurpose/)
  assert.match(ui,/m\.photoPurpose==='drawing'/)
  assert.doesNotMatch(ui,/telegramPhotoFileId|HH_CRM_MSG_TELEGRAM_TOKEN/)
})

test('expired-pilot STOP remains terminal even for legacy sessions',()=>{
  const webhook=read('lib/crm/messenger-webhook.js')
  assert.match(webhook,/rawText:isStop\?'\/stop':invite\?'\/start hhreview_'/)
  assert.match(webhook,/if\(restricted&&!ownerChat&&!activeGuest&&!invite&&!isStop\)return \{handled:true\}/)
  assert.match(webhook,/approvedPilotGuest:restricted&&!ownerChat/)
})
