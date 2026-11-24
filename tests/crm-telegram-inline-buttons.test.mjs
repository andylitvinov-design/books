import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  telegramInlineMarkup,telegramInlineButtonForText,telegramInlineCallbackSelection,
  telegramInlineActionAllowed,
} from '../lib/crm/telegram-inline-buttons.mjs'
import { normalizeMessengerUpdates } from '../lib/crm/messenger-webhook.js'
import {V3_LABELS,v3ButtonsFor,v3Action,v3Context,v3ServiceCopy} from '../lib/crm/telegram-ai-diagnostic-v3.mjs'
import {telegramServiceMenuAnswer,telegramServiceMenuIntent} from '../lib/crm/telegram-service-intro.mjs'
import {
  sendTelegramDiagnosticPrompt,acknowledgeTelegramInlineCallback,telegramReadableKeyboard,
  ensureTelegramInlineWebhookUpdates,
} from '../lib/crm/messenger-provider.js'
import { transitionTelegramDiagnostic } from '../lib/crm/telegram-diagnostic.mjs'
import {telegramCanPairButtons} from '../lib/crm/telegram-button-layout.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const WEBHOOK='https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram'
const env=Object.freeze({
  VERCEL_ENV:'production',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:TEST_TOKEN_NO_NETWORK',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_INLINE_WEBHOOK_SECRET',
  HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
  HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'123456789',
})
const response=result=>new Response(JSON.stringify({ok:true,result}),{
  status:200,headers:{'Content-Type':'application/json'},
})
async function mockedBotApi(work){
  const oldFetch=globalThis.fetch
  const calls=[]
  let updates=['message']
  globalThis.fetch=async (url,options={})=>{
    const method=String(url).split('/').at(-1)
    const body=options.body?JSON.parse(options.body):null
    calls.push({method,body,httpMethod:options.method||'GET'})
    if(method==='getWebhookInfo')return response({url:WEBHOOK,allowed_updates:[...updates]})
    if(method==='setWebhook'){
      updates=body.allowed_updates
      return response(true)
    }
    if(method==='sendMessage')return response({message_id:86753})
    if(method==='sendPhoto')return response({message_id:86754})
    if(method==='answerCallbackQuery')return response(true)
    if(method==='editMessageReplyMarkup')return response(true)
    throw new Error('Unexpected external API '+method)
  }
  try{return await work(calls,()=>updates)}
  finally{globalThis.fetch=oldFetch}
}
const baseCallback=({
  update_id:983241,callback_query:{
    id:'90210304982342',data:'hhv2:ru:yes',
    from:{id:123456789,is_bot:false,first_name:'QA',language_code:'ru'},
    message:{message_id:77,date:1789000000,
      chat:{id:123456789,type:'private'},from:{id:12345678,is_bot:true}},
  },
})

test('message-attached V2 and legacy V1 buttons render above text composer without slash labels',()=>{
  assert.deepEqual(telegramInlineMarkup([['Да, начинаем']],'ru'),{
    inline_keyboard:[[{text:'Да, начинаем',callback_data:'hhv2:ru:yes'}]],
  })
  assert.deepEqual(telegramInlineMarkup([["Yes, let's begin"]],'en'),{
    inline_keyboard:[[{text:"Yes, let's begin",callback_data:'hhv2:en:yes'}]],
  })
  assert.deepEqual(telegramInlineMarkup([['Sí, empezamos']],'es'),{
    inline_keyboard:[[{text:'Sí, empezamos',callback_data:'hhv2:es:yes'}]],
  })
  // Older two-button messages must remain readable even though Not now is hidden.
  assert.equal(telegramInlineCallbackSelection('hhv2:ru:notNow')?.rawText,'Не сейчас')
  assert.deepEqual(telegramInlineMarkup([['деньги/ работа','энергия/ здоровье'],['отношения','другое']], 'ru'),{
    inline_keyboard:[
      [{text:'деньги/ работа',callback_data:'hhv2:ru:business'},
        {text:'энергия/ здоровье',callback_data:'hhv2:ru:wellbeing'}],
      [{text:'отношения',callback_data:'hhv2:ru:relationships'},
        {text:'другое',callback_data:'hhv2:ru:other'}],
    ],
  })
  assert.deepEqual(telegramInlineMarkup([['/agree','/stop']],'ru'),{
    inline_keyboard:[[
      {text:'Да, продолжаем',callback_data:'hhv1:agree'},
      {text:'Остановить диалог',callback_data:'hhv1:stop'},
    ]],
  })
  assert.deepEqual(telegramInlineMarkup([['Пропустить рисунок']],'ru'),{
    inline_keyboard:[[{
      text:'Пропустить рисунок',callback_data:'hhv2:ru:skipDrawing',
    }]],
  })
  for(const label of ['<script>alert(1)</script>','https://bad.example','/execute']){
    assert.equal(telegramInlineButtonForText(label,'ru'),null)
    assert.throws(()=>telegramInlineMarkup([[label]]),/INVALID_INLINE_KEYBOARD/)
  }
  assert.equal(telegramInlineCallbackSelection('hhv2:es:business')?.rawText,'Dinero / trabajo')
  assert.deepEqual(telegramInlineCallbackSelection('hhv1:agree'),{
    rawText:'/agree',inlineAction:'v1:agree',locale:null,
  })
  for(const bad of ['hhv2:ru:code','hhv2:evil:yes','hhv1:javascript',
    'hhv2:ru:yes\nInjected','a'.repeat(80),'']){
    assert.equal(telegramInlineCallbackSelection(bad),null)
  }
})

test('a genuine Telegram private callback becomes ONE bounded synthetic inbound event',()=>{
  const events=normalizeMessengerUpdates('telegram',baseCallback)
  assert.equal(events.length,1)
  const e=events[0]
  assert.equal(e.type,'incoming')
  assert.equal(e.userId,'123456789')
  assert.equal(e.eventId,'tg:983241')
  assert.equal(e.messageId,'tgcb:90210304982342')
  assert.equal(e.inlineAction,'v2:yes')
  assert.equal(e.rawText,'Да, начинаем')
  assert.equal(e.inlineLocale,'ru')
  assert.equal(e.callbackId,'90210304982342')
  assert.equal(e.callbackMessageId,77)
  assert.equal(e.photoFileId,null)
  const first=transitionTelegramDiagnostic({
    flowVersion:2,stage:'consent',locale:'ru',consentAt:null,
  },{...e,locale:'ru'})
  assert.equal(first.stage,'focus')
  assert.equal(first.consent,true)
  assert.deepEqual(first.keyboard,[
    ['деньги/ работа','энергия/ здоровье'],['отношения','другое'],
  ])
})

test('cross-chat, forwarded bot, automated sender and invalid updates never create CRM events',()=>{
  const mutate=(fn)=>{
    const data=structuredClone(baseCallback)
    fn(data)
    return normalizeMessengerUpdates('telegram',data)
  }
  for(const change of [
    o=>{o.callback_query.from.id=222222222},
    o=>{o.callback_query.message.chat.type='group'},
    o=>{o.callback_query.message.from.is_bot=false},
    o=>{o.callback_query.from.is_bot=true},
    o=>{o.callback_query.message.message_id=0},
    o=>{o.update_id='untrusted'},
    o=>{delete o.callback_query.message},
    o=>{o.callback_query.id='bad id'},
  ]) assert.deepEqual(mutate(change),[])
  const unknown=mutate(o=>{o.callback_query.data='hhv2:ru:delete'})
  assert.equal(unknown.length,1)
  assert.equal(unknown[0].type,'callback_ignored')
  assert.equal(unknown[0].rawText,undefined)
  assert.equal(normalizeMessengerUpdates('telegram',{
    callback_query:baseCallback.callback_query,update_id:983241,
  }).length,1)
  assert.equal(normalizeMessengerUpdates('whatsapp',baseCallback).length,0)
})

test('stale or wrong-locale buttons are refused before encrypted CRM changes',()=>{
  assert.equal(telegramInlineActionAllowed('v2:yes','consent',2),true)
  assert.equal(telegramInlineActionAllowed('v2:business','focus',2),true)
  assert.equal(telegramInlineActionAllowed('v2:business','done',2),false)
  assert.equal(telegramInlineActionAllowed('v2:yes','drawing',2),false)
  assert.equal(telegramInlineActionAllowed('v2:skipDrawing','drawing',2),true)
  assert.equal(telegramInlineActionAllowed('v2:skipDrawing','photo',2),false)
  assert.equal(telegramInlineActionAllowed('v1:agree','consent',1),true)
  assert.equal(telegramInlineActionAllowed('v1:skip','photo',1),true)
  assert.equal(telegramInlineActionAllowed('v1:agree','done',1),false)
  assert.equal(telegramInlineActionAllowed('v2:yes','consent',1),false)
  const webhook=source('lib/crm/messenger-webhook.js')
  assert.match(webhook,/telegramInlineActionAllowed\(event\.inlineAction/)
  assert.match(webhook,/event\.inlineLocale!==previous\.locale/)
  assert.match(webhook,/Number\(previous\.last_update_id\)>=updateId/)
  assert.match(webhook,/pg_catalog\.pg_advisory_xact_lock/)
})

test('first valid signed incoming update upgrades existing webhook once, without hijack or dropping updates',async()=>{
  await mockedBotApi(async(calls,allowed)=>{
    const once=await ensureTelegramInlineWebhookUpdates(env)
    assert.deepEqual(once,{ready:true,updated:true})
    assert.deepEqual(allowed(),['message','callback_query','business_connection','business_message'])
    const set=calls.find(x=>x.method==='setWebhook')
    assert.equal(set.httpMethod,'POST')
    assert.equal(set.body.url,WEBHOOK)
    assert.equal(set.body.secret_token,env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET)
    assert.equal(set.body.drop_pending_updates,false)
    assert.equal(set.body.max_connections,4)
    assert.equal(set.body.allowed_updates.includes('callback_query'),true)
    const twice=await ensureTelegramInlineWebhookUpdates(env)
    assert.deepEqual(twice,{ready:true,updated:false})
    assert.equal(calls.filter(x=>x.method==='setWebhook').length,1)
  })
})

test('provider sends six owner text replies with INLINE markup, acknowledges buttons and never opens mass send',async()=>{
  await mockedBotApi(async calls=>{
    const pushed=await sendTelegramDiagnosticPrompt({
      to:'123456789',text:'Подходит, начинаем?',
      keyboard:[['Да, начинаем']],locale:'ru',
    },env)
    assert.equal(pushed.status,'accepted')
    const msg=calls.find(x=>x.method==='sendMessage')?.body
    assert.deepEqual(msg.reply_markup.inline_keyboard[0].map(x=>x.text),
      ['Да, начинаем'])
    assert.equal(msg.reply_markup.keyboard,undefined)
    assert.equal(JSON.stringify(msg).includes(env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET),false)
    assert.equal(JSON.stringify(msg).includes(env.HH_CRM_MSG_TELEGRAM_TOKEN),false)
    await acknowledgeTelegramInlineCallback({
      callbackId:'90210304982342',to:'123456789',messageId:77,
    },env)
    assert.equal(calls.filter(x=>x.method==='answerCallbackQuery').length,1)
    assert.deepEqual(calls.find(x=>x.method==='editMessageReplyMarkup').body.reply_markup,
      {inline_keyboard:[]})
    assert.throws(()=>telegramInlineMarkup([['evil']]))
  })
})
test('webhook route acknowledges signed private callback and catches zero unwanted sends',()=>{
  const src=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  assert.ok(src.indexOf('verifyMessengerWebhook(provider,raw,request.headers)')<
    src.indexOf('normalizeMessengerUpdates(provider,body)'))
  assert.match(src,/ensureTelegramInlineWebhookUpdates/)
  assert.match(src,/acknowledgeTelegramInlineCallback/)
  assert.match(src,/approvedPilotGuest:intake\.approvedPilotGuest===true,locale:intake\.locale/)
  assert.doesNotMatch(src,/setInterval\(|sendCampaign|publishPublicBot/)
})

test('Ali introduces the exact linked service with 3 public info choices before any booking',()=>{
  for(const lang of ['en','ru','es']){
    const l=V3_LABELS[lang],rows=v3ButtonsFor(lang,'service_menu');
    assert.deepEqual(rows,[[l.serviceinfo,l.masterinfo],[l.servicebooking]]);
    const markup=telegramInlineMarkup(rows,lang);
    assert.deepEqual(markup.inline_keyboard.map(row=>row.map(b=>b.callback_data)),
      [['hhv3:'+lang+':serviceinfo','hhv3:'+lang+':masterinfo'],
       ['hhv3:'+lang+':servicebooking']]);
    for(const key of ['serviceinfo','masterinfo','servicebooking','servicebegin','servicechat']){
      const selected=telegramInlineCallbackSelection('hhv3:'+lang+':'+key);
      assert.equal(selected?.inlineAction,'v3:'+key);
      assert.equal(v3Action(selected),key);
    }
    assert.deepEqual(v3ButtonsFor(lang,'service_followup'),
      [[l.serviceinfo,l.masterinfo,l.servicebooking],[l.servicebegin,l.servicechat]]);
    const choice={locale:lang,service:'coaching',offerId:'consultation_express'};
    const intro=v3ServiceCopy(lang,choice.service,choice.offerId).intro;
    assert.ok(intro.includes('Ali'));
    assert.doesNotMatch(intro,/Would you like to request this service|Хотите оформить заявку|Quieres solicitar este servicio/i);
    const info=telegramServiceMenuAnswer({...choice,action:'serviceinfo'});
    assert.match(info,/50|30/);
    assert.match(info,/https:\/\/holistichouse\.vercel\.app/);
    const master=telegramServiceMenuAnswer({...choice,action:'masterinfo'});
    assert.match(master,/24/);
    assert.match(master,new RegExp('/'+(lang==='es'?'en':lang)+'/about'));
    const booking=telegramServiceMenuAnswer({...choice,action:'servicebooking'});
    assert.doesNotMatch(booking,/appointment confirmed|payment made/i);
    const permission=telegramServiceMenuAnswer({...choice,action:'servicebegin'});
    assert.ok(permission.length>18&&permission.length<400);
  }
  const ctx=v3Context({turns:[],serviceRequest:'coaching',
    offerId:'consultation_express',serviceMenuShown:true,serviceBookingStarted:true});
  assert.equal(ctx.serviceMenuShown,true);
  assert.equal(ctx.serviceBookingStarted,true);
  assert.equal(v3Context({turns:[],serviceRequest:'general',serviceMenuShown:true}).serviceMenuShown,true);
  assert.equal(v3Context({turns:[],serviceMenuShown:true}).serviceMenuShown,undefined);
  assert.equal(telegramServiceMenuIntent('How to book?'),'servicebooking');
  assert.equal(telegramServiceMenuIntent('Расскажи об услуге'),'serviceinfo');
  assert.equal(telegramServiceMenuIntent('Про мастера'),'masterinfo');
  assert.equal(telegramServiceMenuIntent('??'),null);
  assert.equal(telegramServiceMenuIntent('/stop'),null);
  assert.equal(telegramServiceMenuAnswer({service:'evil',action:'serviceinfo'}),
    'Choose an option below, or ask Ali a question.');
});

test('signed Telegram service welcome is exactly one portrait post with three inline actions',async()=>{
  await mockedBotApi(async calls=>{
    const sent=await sendTelegramDiagnosticPrompt({
      to:'123456789',locale:'en',
      text:'Hello, I am Ali. You selected Express session · 30 minutes. What would you like to know first?',
      keyboard:v3ButtonsFor('en','service_menu'),
      serviceWelcome:true,welcomePhotoKey:'consultation_express',
    },env);
    assert.equal(sent.status,'accepted');
    const photos=calls.filter(c=>c.method==='sendPhoto');
    const messages=calls.filter(c=>c.method==='sendMessage');
    assert.equal(photos.length,1);
    assert.equal(messages.length,0);
    assert.deepEqual(photos[0].body.reply_markup.inline_keyboard.flat().map(b=>b.callback_data),
      ['hhv3:en:serviceinfo','hhv3:en:masterinfo','hhv3:en:servicebooking']);
    assert.ok(photos[0].body.reply_markup.inline_keyboard.every(row=>row.length===1));
    assert.ok(photos[0].body.photo.startsWith('https://holistichouse.vercel.app/images/'));
    assert.equal(photos[0].body.caption.includes('Would you like to request'),false);
  });
});

test('service introductory FAQ never authorizes intake, personal questioning or CRM sending',()=>{
  const runtime=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
  assert.match(runtime,/serviceEntry&&!diagnosticServiceEntry\?'service_menu':'consent'/);
  assert.match(runtime,/ctx\.serviceMenuShown&&ctx\.conversationKind!=='general'/);
  assert.match(runtime,/telegramServiceMenuAnswer/);
  assert.match(runtime,/action==='servicebegin'/);
  assert.match(runtime,/action==='servicechat'/);
  assert.match(runtime,/const menuBooking=Boolean/);
  assert.match(runtime,/intakeStage:'challenge'/);
  assert.match(runtime,/intakeSlots:.*goal:/s);
  assert.match(runtime,/ai_consent_at=now\(\)/);
  assert.match(runtime,/if\(action==='send'\)/);
  assert.match(runtime,/if\(stop\)/);
  const intro=source('lib/crm/telegram-service-intro.mjs');
  assert.doesNotMatch(intro,/fetch\(|db\.query\(|openrouter|clientId/i);
});


test('Telegram presentation keeps service cards readable without changing approved callbacks',async()=>{
  for(const lang of ['en','ru','es']){
    const menu=telegramInlineMarkup(v3ButtonsFor(lang,'service_menu'),lang);
    const followup=telegramInlineMarkup(v3ButtonsFor(lang,'service_followup'),lang);
    for(const original of [menu,followup]){
      const before=JSON.stringify(original);
      const rendered=telegramReadableKeyboard(original);
      assert.deepEqual(rendered.inline_keyboard.slice(0,3).map(row=>row.length),[1,1,1]);
      assert.ok(rendered.inline_keyboard.every(row=>row.length===1||(row.length===2&&telegramCanPairButtons(...row))));
      assert.deepEqual(rendered.inline_keyboard.flat().map(b=>b.callback_data),original.inline_keyboard.flat().map(b=>b.callback_data));
      assert.equal(JSON.stringify(original),before);
      assert.deepEqual(telegramReadableKeyboard(rendered),rendered);
    }
    await mockedBotApi(async calls=>{
      await sendTelegramDiagnosticPrompt({to:'123456789',locale:lang,text:'Ali — service information',keyboard:v3ButtonsFor(lang,'service_followup')},env);
      const actual=calls.find(c=>c.method==='sendMessage').body.reply_markup;
      assert.deepEqual(actual,telegramReadableKeyboard(followup));
      if(lang==='en')assert.deepEqual(actual.inline_keyboard.at(-1).map(b=>b.text),['✅ Book now','💬 Ask Ali']);
    });
  }
  assert.equal(v3Action({rawText:'Book now'}),'servicebegin');
  const reply={keyboard:[[{text:'Long reply-keyboard option'},{text:'Other option'}]],resize_keyboard:true};
  assert.deepEqual(telegramReadableKeyboard(reply),{keyboard:[[{text:'Long reply-keyboard option'}],[{text:'Other option'}]],resize_keyboard:true});
  const mood={inline_keyboard:[['😟','😕','😐','🙂','😄'].map((text,i)=>({text,callback_data:'checkin_'+i}))]};
  assert.deepEqual(telegramReadableKeyboard(mood),mood);
  const links={inline_keyboard:[[{text:'Long public link',url:'https://holistichouse.vercel.app/en/about'},{text:'Back',callback_data:'home'}]]};
  assert.deepEqual(telegramReadableKeyboard(links).inline_keyboard.flat(),links.inline_keyboard.flat());
  const quiz={inline_keyboard:[[{text:'❤️ Improve relationships & esteem',callback_data:'hhsq:en:1'}]]};
  assert.equal(telegramReadableKeyboard(quiz).inline_keyboard[0][0].text,'❤️ Relationships & esteem');
});


test('all V3 question, consent, review and FAQ stages use full-width or safe short pairs',()=>{
  const stages=['consent','free_consent','free_ready','service_menu','service_followup','service_consent','chat_consent','voice_consent','free_interview','free_portrait','free_drawing','psych_interview','interview','review_confirm'];
  for(const lang of ['en','ru','es'])for(const stage of stages)for(const count of [0,2]){
    const rows=v3ButtonsFor(lang,stage,count,'coaching');
    if(!rows.length)continue;
    const before=telegramInlineMarkup(rows,lang);
    const after=telegramReadableKeyboard(before);
    assert.ok(after.inline_keyboard.every(row=>row.length===1||(row.length===2&&telegramCanPairButtons(...row))),lang+' '+stage);
    assert.deepEqual(after.inline_keyboard.flat().map(b=>b.callback_data),before.inline_keyboard.flat().map(b=>b.callback_data));
  }
});


test('compact pairs stay readable; long labels and three text actions never share a row',()=>{
  const btn=(text,callback_data)=>({text,callback_data});
  const short=[btn('✅ Book now','a'),btn('💬 Ask Ali','b')];
  const long=[btn('📋 About the service','c'),btn('👤 About practitioner','d'),btn('🗓 How to book','e')];
  const markup={inline_keyboard:[long,short,[btn('Yes','f'),btn('No','g'),btn('Skip','h')]]};
  const rendered=telegramReadableKeyboard(markup);
  assert.deepEqual(rendered.inline_keyboard.map(row=>row.map(b=>b.callback_data)),[['c'],['d'],['e'],['a','b'],['f','g'],['h']]);
  assert.deepEqual(telegramReadableKeyboard(rendered),rendered);
  assert.equal(telegramCanPairButtons(btn('123456789012','x'),btn('12345678901','y')),false);
  assert.equal(telegramCanPairButtons(btn('1234567890123','x'),btn('No','y')),false);
  assert.equal(telegramCanPairButtons(btn('A\nB','x'),btn('No','y')),false);
});
