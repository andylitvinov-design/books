import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  TELEGRAM_AI_DIAGNOSTIC_V3,V3_LABELS,V3_COPY,V3_BUTTONS,v3StartLocale,
  v3CanStart,v3ModelKey,v3Context,v3ButtonsFor,v3IsStop,v3Action,v3CanCallModel,v3DailyReplyCount,v3WantsGeneralChat,V3_CHAT_COPY,
} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {v3Generate,v3ModelMessages} from '../lib/crm/telegram-ai-diagnostic-v3-model.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const env={
  VERCEL_ENV:'production',HH_CRM_TG_AI_V3_ENABLED:'true',
  HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'true',
  HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED:'true',
  HH_COUNCIL_OPENROUTER_API_KEY:'synthetic-free-key-not-real',
};
const model='google/gemma-4-31b-it:free';
const reply=payload=>new Response(JSON.stringify(payload),{status:200});
function mockProvider({text='I hear you. What would change if this became easier?',cost=0,pricing='0'}={}){
  const calls=[];
  const fetcher=async (url,opts={})=>{
    const u=String(url),body=opts.body?JSON.parse(opts.body):null;
    calls.push({url:u,method:opts.method,body});
    if(u.endsWith('/key'))return reply({data:{label:'test'}});
    if(u.endsWith('/models'))return reply({data:[{
      id:model,pricing:{prompt:pricing,completion:pricing},
      architecture:{input_modalities:['text'],output_modalities:['text']},
    }]});
    if(u.endsWith('/chat/completions'))return reply({
      model,choices:[{finish_reason:'stop',message:{content:text}}],
      usage:{cost},
    });
    throw Error('Unexpected provider URL');
  };
  return {fetcher,calls};
}

test('V3 is a separate, consented three-language journey, not fixed six questions',()=>{
  assert.equal(TELEGRAM_AI_DIAGNOSTIC_V3,3);
  assert.deepEqual(['ru','en','es'].map(l=>v3StartLocale('/start hreview_'+l)),[null,null,null]);
  for(const lang of ['ru','en','es']){
    assert.equal(v3StartLocale('/start hhreview_'+lang),lang);
    assert.equal(typeof V3_COPY[lang].first,'string');
    assert.ok(V3_COPY[lang].intro.length<950);
    assert.deepEqual(v3ButtonsFor(lang,'consent'),[[V3_LABELS[lang].agree,V3_LABELS[lang].decline]]);
    assert.deepEqual(v3ButtonsFor(lang,'interview',1),[]);
    assert.deepEqual(v3ButtonsFor(lang,'interview',2),[[V3_LABELS[lang].finish,V3_LABELS[lang].continue]]);
    assert.deepEqual(v3ButtonsFor(lang,'review_confirm'),[
      [V3_LABELS[lang].send],[V3_LABELS[lang].edit,V3_LABELS[lang].cancel],
    ]);
  }
  assert.ok(new Set(V3_BUTTONS).size===V3_BUTTONS.length,
    'V3 button labels must be unambiguous across locales and legacy V2');
  assert.ok(!V3_BUTTONS.includes('Не сейчас'));
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

test('External free adapter checks zero-priced catalog, denial of training and zero charged cost',async()=>{
  const api=mockProvider();
  const result=await v3Generate({locale:'en',turns:[{role:'user',text:'I cannot make a decision'}]},env,api.fetcher);
  assert.equal(result.freeCostVerified,true);
  assert.equal(result.model,model);
  const call=api.calls.find(x=>x.url.endsWith('chat/completions'));
  assert.ok(call);
  assert.equal(call.body.model,model);
  assert.equal(call.body.provider.max_price.prompt,0);
  assert.equal(call.body.provider.max_price.completion,0);
  assert.equal(call.body.provider.allow_fallbacks,false);
  assert.equal(call.body.provider.data_collection,'deny');
  assert.equal(call.body.messages.at(-1).content,'I cannot make a decision');
  assert.ok(!api.calls.some(x=>x.url.includes('gemini')));
});

test('Free adapter rejects paid responses and long multi-question model output',async()=>{
  const paid=mockProvider({cost:0.01});
  await assert.rejects(
    v3Generate({locale:'ru',turns:[{role:'user',text:'Нужно решение'}]},env,paid.fetcher),
    /FREE_MODEL_NOT_VERIFIED/,
  );
  const long=mockProvider({text:'What happened? When? Why?'});
  await assert.rejects(
    v3Generate({locale:'ru',turns:[{role:'user',text:'Нужно решение'}]},env,long.fetcher),
    /FREE_MODEL_TOO_MANY_QUESTIONS/,
  );
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
    assert.ok(messages.intro.includes('OpenRouter'));
    assert.ok(messages.intro.includes('/stop'));
    assert.doesNotMatch(messages.nudge,/OpenRouter|medical|медицинск|médic/i);
    assert.notEqual(messages.intro,messages.nudge);
  }
  const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
  assert.ok(service.includes("if(start&&active&&row?.stage==='consent')"));
  assert.ok(service.includes("allowed?copy.nudge:copy.notReady"));
  assert.ok(service.includes("ai_consent_at=now()"));
  assert.ok(service.includes("row&&Number(row.last_update_id)>=updateId"));
});

test('free Telegram conversation is consent gated and shares Secretary/Coach',()=>{
 for(const locale of ['ru','en','es']){
  assert.deepEqual(v3ButtonsFor(locale,'chat_consent'),
    [[V3_LABELS[locale].chatagree,V3_LABELS[locale].chatlater]]);
  assert.match(V3_CHAT_COPY[locale].intro,/OpenRouter/);
  assert.match(V3_CHAT_COPY[locale].intro,/\/stop/);
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
