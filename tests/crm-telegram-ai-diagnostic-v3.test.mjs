import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  TELEGRAM_AI_DIAGNOSTIC_V3,V3_LABELS,V3_COPY,V3_BUTTONS,v3StartLocale,
  v3CanStart,v3CanChat,v3ServiceIntakeReady,v3ModelKey,v3Context,v3ButtonsFor,v3IsStop,v3Action,v3CanCallModel,v3DailyReplyCount,v3WantsGeneralChat,V3_CHAT_COPY,v3ChatPreConsentSafetyReply,
} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {v3Generate,v3ModelMessages} from '../lib/crm/telegram-ai-diagnostic-v3-model.mjs';
import {waveTelegramLocalReply} from '../lib/crm/telegram-wave-local-reply.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const env={
  VERCEL_ENV:'production',HH_CRM_TG_AI_V3_SCHEMA_READY:'true',HH_CRM_TG_AI_V3_ENABLED:'true',
  HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'true',
  HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED:'true',
  HH_COUNCIL_OPENROUTER_API_KEY:'synthetic-free-key-not-real',
};
test('V3 is a separate, consented three-language journey, not fixed six questions',()=>{
  assert.equal(TELEGRAM_AI_DIAGNOSTIC_V3,3);
  assert.deepEqual(['ru','en','es'].map(l=>v3StartLocale('/start hreview_'+l)),[null,null,null]);
  for(const lang of ['ru','en','es']){
    assert.equal(v3StartLocale('/start hhreview_'+lang),lang);
    assert.equal(typeof V3_COPY[lang].first,'string');
    assert.ok(V3_COPY[lang].intro.length<950);
    assert.deepEqual(v3ButtonsFor(lang,'consent'),[[V3_LABELS[lang].agree,V3_LABELS[lang].decline]]);
    assert.deepEqual(v3ButtonsFor(lang,'interview',1),[]);
    assert.deepEqual(v3ButtonsFor(lang,'interview',2),[[V3_LABELS[lang].finish,V3_LABELS[lang].book],[V3_LABELS[lang].continue]]);
    assert.deepEqual(v3ButtonsFor(lang,'review_confirm'),[
      [V3_LABELS[lang].send],[V3_LABELS[lang].edit,V3_LABELS[lang].cancel],
    ]);
  }
  assert.ok(new Set(V3_BUTTONS).size===V3_BUTTONS.length,
    'V3 button labels must be unambiguous across locales and legacy V2');
  // The current warm, consent-first V3 intentionally offers "Not now".
  // A decline must be recognized in each locale and must never reach a model.
  assert.ok(V3_BUTTONS.includes(V3_LABELS.ru.decline));
  for(const lang of ['ru','en','es'])
    assert.equal(v3Action({rawText:V3_LABELS[lang].decline}),'decline',lang);
  for(const lang of ['ru','en','es'])
    assert.equal(v3WantsGeneralChat(V3_LABELS[lang].decline),false,lang);
  assert.equal(v3Action({inlineAction:'v3:send'}),'send');
  assert.equal(v3Action({rawText:'/finish'}),'finish');
  assert.equal(v3Action({rawText:'сложности с отношениями'}),null);
  assert.equal(v3IsStop('остановить диалог'),true);
  assert.equal(v3IsStop('сегодня остановился'),false);
  assert.equal(v3CanCallModel('Хочу разобраться в работе'),true);
  assert.equal(v3CanCallModel('/stop'),false);
});

test('External inference never starts without a flag, free-only approval and available key',()=>{
  assert.equal(v3CanStart(env),true);
  assert.equal(v3ModelKey(env),env.HH_COUNCIL_OPENROUTER_API_KEY);
  assert.equal(v3CanStart({...env,HH_CRM_TG_AI_V3_ENABLED:'false'}),false);
  assert.equal(v3CanStart({...env,HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'false'}),false);
  assert.equal(v3CanStart({...env,HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED:'false'}),false);
  assert.equal(v3CanStart({...env,VERCEL_ENV:'preview'}),false);
  assert.equal(v3CanStart({...env,HH_COUNCIL_OPENROUTER_API_KEY:'tiny'}),false);
  assert.equal(v3CanStart({...env,HH_COUNCIL_OPENROUTER_API_KEY:'   '}),false);
  assert.equal(v3CanStart({...env,HH_COUNCIL_OPENROUTER_API_KEY:''}),false);
  assert.equal(v3ModelKey({...env,HH_CRM_TG_AI_V3_ENABLED:'false'}),null);
});

test('Context is bounded and encrypted only by server; no raw text inside public start link',()=>{
  const inputs=Array.from({length:32},(_,i)=>({role:i%2?'assistant':'user',text:'x'.repeat(1500)}));
  const ctx=v3Context({turns:inputs,pending:{id:123,kind:'question',text:'hi'},summary:'s'.repeat(5000)});
  assert.equal(ctx.turns.length,20);
  assert.equal(ctx.turns[0].text.length,1000);
  assert.equal(ctx.summary.length,950);
  assert.equal(v3StartLocale('/start hhreview_ru?text=private'),null);
  assert.equal(v3Context({turns:[],pending:{id:8,kind:'question',text:'hello',queuedAt:1234}}).pending.queuedAt,1234);
  assert.deepEqual(v3Context(null),{turns:[],pending:null,summary:null});
});

test('Model prompt works with real context and never assumes a fixed diagnostic field',()=>{
  const turns=[{role:'user',text:'Хочу понять, почему избегаю переговоров'},
    {role:'assistant',text:'Когда появляется это чувство?'},
    {role:'user',text:'Когда боюсь отказа'}];
  const dialog=v3ModelMessages({locale:'ru',turns});
  assert.equal(dialog.at(-1).content,'Когда боюсь отказа');
  assert.match(dialog[0].content,/ONE/);
  assert.match(dialog[0].content,/NON-CLINICAL/);
  const summary=v3ModelMessages({locale:'ru',kind:'summary',turns});
  assert.match(summary[0].content,/Summarize|Summar/i);
  assert.match(summary.at(-1).content,/Summarize/);
});

test('OpenRouter is never called by Telegram V3, even when a legacy key exists',async()=>{
 const network=[];
 const mockFetch=async(...args)=>{network.push(args);throw Error('UNEXPECTED_NETWORK');};
 for(const [locale,text] of [
   ['ru','Поговорим?'],['en',"Let's chat"],['es','Quiero charlar']]){
   const answer=await v3Generate({kind:'chat',locale,
     turns:[{role:'user',text}]},env,mockFetch);
   assert.equal(answer.provider,'holistic-house-native');
   assert.equal(answer.modelUsed,false);
   assert.equal(answer.freeCostVerified,true);
   assert.ok(answer.text.length>12&&answer.text.length<=900);
   assert.ok((answer.text.match(/[?？]/gu)||[]).length<=1);
 }
 assert.equal(network.length,0,'client chat never called an external fetcher');
 const adapter=source('lib/crm/telegram-ai-diagnostic-v3-model.mjs');
 assert.doesNotMatch(adapter,/openrouter\.ai|inspectOpenRouterFreeAccess|FREE_MODEL_KEY_NOT_CONFIGURED/);
 assert.match(adapter,/waveTelegramLocalReply\(\{locale,turns\}\)/);
});

test('Non-chat model fallback refuses provider calls; invalid owned endpoint stays native',async()=>{
 await assert.rejects(
   v3Generate({kind:'summary',locale:'en',
     turns:[{role:'user',text:'Need clarity'}]},env),
   /NATIVE_INTAKE_REQUIRED/);
 const invalidOwned={...env,HH_AGENT_OWNED_ENABLED:'true',
   HH_AGENT_OLLAMA_ENDPOINT:'http://unsafe.example/api/chat',
   HH_AGENT_OLLAMA_MODEL:'qwen2.5',
   HH_AGENT_OLLAMA_TOKEN:'012345678901234567890123'};
 const reply=await v3Generate({kind:'chat',locale:'ru',
   turns:[{role:'user',text:'Хочу поговорить'}]},invalidOwned);
 assert.equal(reply.provider,'holistic-house-native');
 assert.doesNotMatch(reply.text,/OpenRouter/);
});

test('Signed CRM webhook is only routing; legacy V2 and owner/private bot remain intact',()=>{
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
  const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
  const migration=source('supabase/migrations/20261110224654_hh_crm_tg_ai_diagnostic_v3.sql');
  assert.ok(route.indexOf('processTelegramCompanion(event,config)')<
    route.indexOf('processTelegramAiV3(diagnosticEvent,config)'));
  assert.ok(route.indexOf('processTelegramAiV3(diagnosticEvent,config)')<
    route.indexOf('processTelegramDiagnostic(diagnosticEvent,config)'));
  assert.match(route,/after\(async\(\)=>/);
  assert.match(service,/stage='interview'/);
  assert.match(service,/stage='done'/);
  assert.match(service,/ai_review_consent_at=now\(\)/);
  assert.match(service,/ingestMessengerEventInTransaction/);
  assert.match(service,/ai_context_ciphertext=null/);
  assert.match(service,/crm_tg_suppress_existing/);
  assert.match(service,/if\(row&&Number\(row.last_update_id\)>=updateId\)/);
  assert.match(migration,/flow_version in \(1,2,3\)/);
  assert.match(migration,/force|FORCE RLS/);
  assert.doesNotMatch(migration,/^\s*grant\s+.*\bto\s+(anon|authenticated)\b/im);
  assert.match(source('lib/crm/telegram-inline-buttons.mjs'),/hhv3:/);
  assert.match(source('app/api/public/telegram-diagnostic/route.js'),/aiInterviewAvailable/);
});

test('Postgres Date and ISO string preserve actual daily Telegram V3 reply quota',()=>{
  const utc=new Date('2026-11-11T00:00:00.000Z');
  assert.equal(v3DailyReplyCount({reply_day:utc,reply_count:35},'2026-11-11'),35);
  assert.equal(v3DailyReplyCount({reply_day:'2026-11-11',reply_count:17},'2026-11-11'),17);
  assert.equal(v3DailyReplyCount({reply_day:utc,reply_count:70},'2026-11-11'),40);
  assert.equal(v3DailyReplyCount({reply_day:utc,reply_count:35},'2026-11-12'),0);
  assert.equal(v3DailyReplyCount({reply_day:new Date('invalid'),reply_count:14},'2026-11-11'),0);
  assert.equal(v3DailyReplyCount({reply_day:null,reply_count:25},'2026-11-11'),0);
});

test('Consent is explained once; follow-up nudges do not repeat the privacy wall',()=>{
  for(const locale of ['ru','en','es']){
    const messages=V3_COPY[locale];
    assert.ok(messages.intro.length<500);
    assert.ok(messages.nudge.length>30&&messages.nudge.length<180);
    assert.ok(messages.intro.length<165,'the first reply must fit a phone screen');
    assert.match(messages.intro,/AI|IA/i);
    assert.doesNotMatch(messages.intro,/\/stop|medical records|медицинские документы|documentos médicos/i);
    assert.doesNotMatch(messages.nudge,/OpenRouter|medical|медицинск|médic/i);
    assert.notEqual(messages.intro,messages.nudge);
  }
  const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
  assert.ok(service.includes("if(start&&active&&row?.stage==='consent')"));
  assert.ok(service.includes("const purposeReady=general||ctx.mode===FREE_DIAGNOSTIC_MODE||"));
  assert.ok(service.includes("const agrees=general?action==='chatagree':"));
  assert.ok(service.includes("if(!row.ai_consent_at||!((ctx.conversationKind==='general'||ctx.mode===FREE_DIAGNOSTIC_MODE||"));
  assert.ok(service.includes("if(!agrees||!purposeReady)"),"explicit consent and runtime readiness are both mandatory");
  assert.ok(service.includes("if((serviceCopy||ctx.supportSelection)&&ctx.mode!==SECRETARY_MODES.PSYCHOLOGIST&&"),"native Secretary path excludes psychologist");
  assert.ok(service.includes("const reminder=general?(chatAllowed?chat.nudge:copy.notReady):"));
  // Public FAQ first; only explicit Start booking opens the consent gate.
  assert.ok(service.includes("const menuBooking=Boolean(serviceCopy&&ctx.serviceMenuShown&&"));
  assert.ok(service.includes("menuBooking?telegramServiceMenuAnswer({locale:lang,"));
  assert.ok(service.includes("serviceCopy?serviceCopy.welcomeNudge:copy.nudge):copy.notReady)"));
  assert.ok(service.includes("menuBooking?'service_consent':serviceCopy?'consent':"));
  assert.ok(service.includes("purposeReady?v3ButtonsFor(lang,general?'chat_consent':"));
  assert.ok(service.includes("ai_consent_at=now()"));
  assert.ok(service.includes("row&&Number(row.last_update_id)>=updateId"));
});

test('free Telegram conversation is consent gated and shares Secretary/Coach',()=>{
 for(const locale of ['ru','en','es']){
  assert.deepEqual(v3ButtonsFor(locale,'chat_consent'),
    [[V3_LABELS[locale].chatagree,V3_LABELS[locale].chatlater]]);
  assert.doesNotMatch(V3_CHAT_COPY[locale].intro,/OpenRouter/);
  assert.ok(V3_CHAT_COPY[locale].intro.length<165);
 }
 assert.equal(v3WantsGeneralChat('Привет'),true);
 assert.equal(v3WantsGeneralChat('Поговорим?'),true);
 assert.equal(v3WantsGeneralChat('Да, начать'),false);
 assert.equal(v3WantsGeneralChat('/start hhreview_ru'),false);
 assert.equal(v3Context({conversationKind:'general',turns:[]}).conversationKind,'general');
 assert.equal(v3Action({inlineAction:'v3:chatagree'}),'chatagree');
 assert.match(v3ModelMessages({kind:'chat',locale:'ru',turns:[{role:'user',text:'Привет'}]})[0].content,/Secretary Mind/);
 assert.match(v3ModelMessages({kind:'chat',locale:'ru',turns:[{role:'user',text:'Хочу разобраться в отношениях'}]})[0].content,/Coach Mind/);
 assert.match(source('lib/crm/telegram-ai-diagnostic-v3-service.js'),/generalStart/);
});


test('General chat pre-consent danger is answered safely, without diagnostic or LLM',()=>{
  const ru=v3ChatPreConsentSafetyReply('Не хочу больше жить','ru');
  const en=v3ChatPreConsentSafetyReply('I want to kill myself','en');
  const es=v3ChatPreConsentSafetyReply('No puedo respirar','es');
  assert.match(ru,/экстренн/);
  assert.match(en,/emergency/);
  assert.match(es,/emergencia/);
  assert.equal(v3ChatPreConsentSafetyReply('Поговорим?','ru'),null);
  assert.equal(v3ChatPreConsentSafetyReply('Я хочу курс','ru'),null);
  const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
  assert.match(service,/const urgent=v3ChatPreConsentSafetyReply\(raw,lang\)/);
  assert.match(service,/urgent\?\[\]:v3ButtonsFor\(lang,'chat_consent'\)/);
  assert.match(service,/action==='chatlater'\|\|action==='decline'/);
  assert.match(service,/const urgentDuringChat=v3ChatPreConsentSafetyReply\(prior.ctx.pending.text,prior.locale\)/);
  assert.match(service,/if\(urgentDuringChat\)\{\s*result=\{text:urgentDuringChat,freeCostVerified:true\}/);
});

test('Telegram chat uses shared Reaction, Conversation and Reasoning Mind signals',()=>{
  const turns=[
    {role:'user',text:'Хочу обсудить работу'},
    {role:'assistant',text:'Я слушаю. Что сейчас важнее?'},
    {role:'user',text:'Нет, давай поговорим об отношениях'},
  ];
  const prompt=v3ModelMessages({kind:'chat',locale:'ru',turns});
  assert.match(prompt[0].content,/Reaction\/Conversation\/Reasoning Mind context/);
  assert.match(prompt[0].content,/rationaleCode/);
  assert.match(prompt[0].content,/contradictionSignals/);
  assert.equal(prompt.at(-1).content,turns.at(-1).text);
  assert.ok(prompt.length<=10,'owned Ollama max messages remains respected');
});

test('Ali is the only client-facing assistant name; legacy Wave chat buttons keep working',()=>{
  for(const locale of ['ru','en','es']){
    assert.match(V3_CHAT_COPY[locale].intro,/Ali/);
    assert.doesNotMatch(V3_CHAT_COPY[locale].intro,/OpenRouter/);
    assert.doesNotMatch(V3_CHAT_COPY[locale].intro,/Qwen/i);
    assert.match(V3_COPY[locale].intro,/Ali/);
    assert.match(V3_LABELS[locale].chatagree,/Ali/);
  }
  assert.equal(v3Action({rawText:'Начать диалог с ИИ'}),'chatagree');
  assert.equal(v3Action({rawText:'Поговорить с Wave'}),'chatagree');
  assert.equal(v3Action({rawText:'Chat with Wave'}),'chatagree');
  assert.equal(v3Action({rawText:'Hablar con Wave'}),'chatagree');
  assert.equal(v3Action({rawText:'Поговорить с Али'}),'chatagree');
  assert.equal(v3Action({rawText:'Chat with Ali'}),'chatagree');
  assert.equal(v3Action({rawText:'Hablar con Ali'}),'chatagree');
  assert.match(v3ModelMessages({kind:'chat',locale:'ru',turns:[{role:'user',text:'Привет'}]})[0].content,/Ali/);
});

test('Wave local chat remains consent-gated and is independent of any model key',()=>{
  const local={...env,HH_CRM_TG_AI_V3_SCHEMA_READY:'true',
    HH_COUNCIL_OPENROUTER_API_KEY:'',HH_AGENT_OWNED_ENABLED:'false'};
  assert.equal(v3CanStart(local),false,'diagnostic external inference still needs a verified key');
  assert.equal(v3CanChat(local),true,'local-only chat can still answer after consent');
  assert.equal(v3CanChat({...local,HH_CRM_TG_AI_V3_ENABLED:'false'}),false);
  assert.equal(v3CanChat({...local,HH_CRM_TG_AI_V3_SCHEMA_READY:'false'}),false);
  assert.equal(v3CanChat({...local,VERCEL_ENV:'preview'}),false);
  const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
  assert.match(service,/const generalStart=chatAllowed/);
  assert.match(service,/purposeReady=general\|\|ctx\.mode===FREE_DIAGNOSTIC_MODE\|\|/);
  assert.ok(service.includes("if(!row.ai_consent_at||!((ctx.conversationKind==='general'||ctx.mode===FREE_DIAGNOSTIC_MODE||"));
  assert.equal(v3ServiceIntakeReady({...local,HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'false'}),true);
  assert.equal(v3ServiceIntakeReady({...local,HH_CRM_TG_AI_V3_SCHEMA_READY:'false'}),false);
  assert.equal(v3ServiceIntakeReady({...local,HH_CRM_TG_AI_V3_ENABLED:'false'}),false);
  assert.equal(v3ServiceIntakeReady({...local,VERCEL_ENV:'preview'}),false);
  assert.match(service,/if\(\(serviceCopy\|\|ctx\.supportSelection\)\&\&ctx\.mode!==SECRETARY_MODES\.PSYCHOLOGIST&&/);
  assert.match(service,/ctx\.conversationKind!==\x27general\x27&&!event\.voiceNote/);
  assert.match(service,/if\(!row.ai_consent_at\|\|!/);
  assert.match(service,/if\(\(serviceCopy\|\|ctx\.supportSelection\)\&\&ctx\.mode!==SECRETARY_MODES\.PSYCHOLOGIST&&/);
  assert.match(service,/ctx\.conversationKind!==\x27general\x27&&!event\.voiceNote/);
  assert.match(service,/waveTelegramLocalReply\(\{locale:prior.locale,turns\}\)/);
  assert.match(service,/wave_telegram_inference/);
});

test('Wave fallback preserves short-turn context, handles model identity and stays safe',()=>{
  const incoming=(text,history=[],locale='ru')=>waveTelegramLocalReply({
    locale,turns:[...history,{role:'user',text}]});
  assert.match(incoming('Поговорим?'),/поболта|пообща|разговар/i);
  assert.match(incoming("Let's chat",[],'en'),/chat/i);
  assert.match(incoming('Hablemos',[],'es'),/conversar/);
  assert.match(incoming('О Qwen'),/Ali/);
  assert.match(incoming('О Qwen'),/Qwen/);
  assert.match(incoming('What is your name?',[],'en'),/Ali/);
  assert.match(incoming('Quiero morir',[],'es'),/emergencia/);
  assert.match(incoming('Не хочу больше жить'),/экстренн/);
  assert.match(incoming('Объясни квантовую физику'),/Ali/);
  assert.doesNotMatch(incoming('Объясни квантовую физику'),/квантовая физика —/);
  assert.ok(incoming('Поговорим?').length<700);
  assert.equal(incoming('Спасибо',[{role:'assistant',text:'Привет'}]).length>0,true);
});
