import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {telegramBusinessMessageFromUpdate,telegramBusinessClientChoice} from '../lib/assist/telegram-business-request.mjs';
import {matchTelegramFreeReviewDraft,telegramFreeReviewAcknowledgement} from '../lib/crm/telegram-business-free-review.mjs';
import {telegramExpressReviewHandoff} from '../lib/crm/express-review-channel-handoff.mjs';
import {classifyTelegramSecretaryQuery,publishedTelegramServiceOffers,
  composeTelegramSecretaryAnswer,TELEGRAM_SITE} from '../lib/crm/telegram-secretary-offers.mjs';

const make=(patch={})=>({
 id:'eb4ab8cc-dbc1-4603-b674-42b8cd619bf9',
 slug:'remote-energy-support',active:true,status:'published',
 practitioner_slug:'andy-litvinov',practitioner_active:true,
 practitioner_status:'approved',category:'energy_spiritual',
 offering_type:'session',pricing_mode:'from',confirmed_price:'50.00',currency:'EUR',
 localized_copy:{ru:{title:'Энергетическая поддержка цели'},
  en:{title:'Energy Support'},es:{title:'Apoyo energético'}},...patch
});
const f=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('only explicit catalogue needs trigger secretary, not private chats or stop',()=>{
 for(const text of ['Привет','Отмена','/stop','проблемы в отношениях','hello',
  'I feel overwhelmed','I need you to change my password','[HH-REQ:reiki:ru]']){
  assert.equal(classifyTelegramSecretaryQuery(text,'ru'),null,text);
 }
 for(const [message,l] of [['Пришли курс','ru'],['Show me videos','en'],
  ['Quiero un curso','es'],['Сколько стоит рейки','ru']]){
  assert.equal(classifyTelegramSecretaryQuery(message,l)?.kind,'catalog',message);
 }
});
test('unverified/hidden/wrong-owner products never appear, even when supplied by caller',()=>{
 const forged=[
  make({id:'123',status:'published'}),make({active:false}),
  make({status:'draft'}),make({practitioner_status:'submitted'}),
  make({practitioner_active:false}),
  make({localized_copy:{ru:{title:'<script>Pay me</script>'}}}),
  make({slug:'../../secret'}),make({practitioner_slug:'hacker?to=external'}),
 ];
 for(const row of forged)
  assert.deepEqual(publishedTelegramServiceOffers([row],'ru'),[],JSON.stringify(row).slice(0,100));
 assert.equal(publishedTelegramServiceOffers([make(),make()],'en').length,1);
});
test('verified personal service price displayed only from published source',()=>{
 const q=classifyTelegramSecretaryQuery('Сколько стоит рейки?','ru');
 const from=composeTelegramSecretaryAnswer(q,[make()]);
 assert.equal(from.buttons.length,1);
 assert.match(from.text,/от €50/);
 assert.match(from.buttons[0].url,/^https:\/\/holistichouse\.vercel\.app\/ru\/services\//);
 const contact=composeTelegramSecretaryAnswer(q,[make({pricing_mode:'contact',confirmed_price:null,currency:null})]);
 assert.match(contact.text,/Уточняется у специалиста/);
 assert.doesNotMatch(contact.text,/€50/);
 const unknown=composeTelegramSecretaryAnswer(q,[make({pricing_mode:'fixed',confirmed_price:null,currency:'EUR'})]);
 assert.match(unknown.text,/Уточняется у специалиста/);
 assert.doesNotMatch(unknown.text,/Бесплатно/);
 const free=composeTelegramSecretaryAnswer(q,[make({pricing_mode:'free',confirmed_price:null,currency:null})]);
 assert.match(free.text,/Бесплатно/);
});
test('public programmes link to real approved index, never guessed course product',()=>{
 for(const [message,locale] of [
  ['Покажи видео','ru'],['Show me courses','en'],['Quiero un curso','es'],
  ['Покажи тесты','ru'],['Show me practitioners','en'],
 ]){
  const q=classifyTelegramSecretaryQuery(message,locale);
  const answer=composeTelegramSecretaryAnswer(q,[make()]);
  assert.ok(answer?.buttons?.length>0&&answer.buttons.length<=3);
  for(const button of answer.buttons){
    assert.equal(new URL(button.url).origin,TELEGRAM_SITE);
    assert.ok(new URL(button.url).pathname.startsWith('/'+locale+'/'));
    assert.ok(button.text.length<=48);
  }
  if(q.category.course||q.category.video||q.category.test||q.category.master)
    assert.equal(answer.buttons.some(x=>x.url.includes('remote-energy-support')),false,
      'do not force unrelated paid services into informational resource requests');
 }
});
test('budget free filter excludes paid services',()=>{
 const q=classifyTelegramSecretaryQuery('Подскажи бесплатную консультацию','ru');
 const answer=composeTelegramSecretaryAnswer(q,[make()]);
 assert.equal(answer.buttons.some(x=>x.url.includes('/remote-energy-support')),false);
});
test('urgent concern stops commercial suggestions, prevents default upsell',()=>{
 for(const l of ['ru','en','es']){
  const s=l==='ru'?'Хочу покончить с собой, посоветуй курс':
   l==='en'?'I want to kill myself, show me a course':
    'Quiero morir, muéstrame un curso';
  const q=classifyTelegramSecretaryQuery(s,l);
  assert.equal(q.kind,'safety');
  const response=composeTelegramSecretaryAnswer(q,[make()]);
  assert.equal(response.buttons.length,0);
  assert.equal(response.kind,'safety');
  assert.match(response.text,/помощ|help|ayuda/iu);
 }
});
test('same existing signed business webhook and no direct unconsented model or booking',()=>{
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const server=f('lib/crm/telegram-secretary-service.js');
 const provider=f('lib/crm/messenger-provider.js');
 const pending=f('lib/crm/telegram-business-service.js');
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(route,/processTelegramBusinessConversation\(body,config\)/);
 assert.match(route,/processTelegramBusinessSecretary\(body,config,process\.env,\{/);
 assert.match(route,/allowClarification:telegramBusinessInbox\?\.matched===true/);
 assert.match(route,/hh-tg-secretary-reply/);
 assert.match(server,/HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'/);
 assert.match(server,/assertHolisticBusinessConnection/);
 assert.match(server,/where s\.active and s\.status='published'/);
 assert.match(provider,/business_connection_id:connectionId/);
 assert.match(provider,/reply_markup:\{inline_keyboard:/);
 assert.match(provider,/holistichouse\.vercel\.app/);
 assert.match(pending,/if\(!old\)return \{handled:false\}/);
 assert.match(server,/HH_TG_SECRETARY_OWNED_ENABLED==='true'/);
 assert.match(server,/HH_AGENT_OWNED_ENABLED==='true'/);
 assert.match(server,/generateOwnedOllama/);
 assert.match(server,/reviewQwenOwnedReply/);
 assert.match(server,/Published titles:/);
 assert.match(server,/\/ai/);
 assert.doesNotMatch(server,/createPublicServiceEnquiry|https:\/\/openrouter\.ai|fetch\(/);
});


test('STOP persists even without prior order; new explicit queries cannot undo it',async()=>{
 const all=f('lib/crm/telegram-secretary-service.js');
 const before=all.indexOf("const STOP_TABLE=");
 const after=all.indexOf("/**\n * One source-bounded Secretary",before);
 assert.ok(before>=0&&after>before);
 const program=all.slice(before,after).replace(/^export /gm,'');
 let stopped=false;
 const db={async query(sql,params=[]){
   if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
   if(sql.startsWith('select stopped_at'))return {rows:stopped?[{stopped_at:new Date()}]:[]};
   if(sql.startsWith('insert into app_private.crm_tg_business_secretary_optouts')){
     stopped=true;return {rowCount:1,rows:[]};
   }
   throw new Error('UNEXPECTED SQL: '+sql.slice(0,75));
 }};
 const ctx=vm.createContext({
   telegramBusinessMessageFromUpdate,telegramBusinessClientChoice,
   operationHash:({scope})=>scope==='hh-tg-business-connection'?'a'.repeat(64):'b'.repeat(64),
   webhookTransaction:async(_c,fn)=>fn(db),
   process:{env:{HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true'}},Date,Number,String,Boolean
 },{codeGeneration:{strings:false,wasm:false}});
 vm.runInContext(program,ctx,{timeout:2000});
 const evt=(text,n)=>({update_id:n,business_message:{
   business_connection_id:'conn-test-123',message_id:n,
   date:Math.floor(Date.now()/1000),text,
   chat:{type:'private',id:123456789},from:{id:123456789,is_bot:false},
 }});
 const env={HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true'};
 const beforeStop=await ctx.gateTelegramBusinessSecretaryOptOut(evt('Покажи курс',301),{},env);
 assert.equal(beforeStop.blocked,false);
 const stop=await ctx.gateTelegramBusinessSecretaryOptOut(evt('/stop',302),{},env);
 assert.equal(stop.justStopped,true);
 assert.equal(stopped,true);
 const afterStop=await ctx.gateTelegramBusinessSecretaryOptOut(evt('Show me videos',303),{},env);
 assert.equal(afterStop.blocked,true);
 const replay=await ctx.gateTelegramBusinessSecretaryOptOut(evt('/stop',302),{},env);
 assert.equal(replay.blocked,true);
});
test('STOP before Business intake, exact signed ingress and RLS not weakened',()=>{
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const sender=f('lib/crm/messenger-provider.js');
 const sql=f('supabase/migrations/20261113232313_hh_crm_tg_business_secretary_optouts_v1.sql');
 const stop=route.indexOf('gateTelegramBusinessSecretaryOptOut(body,config)');
 const orders=route.indexOf('processTelegramBusinessConversation(body,config)');
 const rec=route.indexOf('processTelegramBusinessSecretary(body,config,process.env,{');
 assert.ok(stop>0&&orders>stop&&rec>orders);
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(sender,/holistichouse\.vercel\.app/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FORCE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT SELECT,INSERT ON app_private\.crm_tg_business_secretary_optouts TO hh_app_inbox/);
 assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE).* TO (?:anon|authenticated|public)/i);
 assert.match(allSecure(),/secretaryStopped\(event,config\)/);
 function allSecure(){return f('lib/crm/telegram-secretary-service.js');}
});

test('customer Free personal express review draft is acknowledged in the human Business chat, not ignored',()=>{
 const cases=[
  ['Hello! I am interested in «Free personal express review». Could you help me make a request?','en'],
  ['Здравствуйте! Меня интересует «Бесплатный личный экспресс-разбор». Подскажите, как оформить запрос.','ru'],
  ['¡Hola! Me interesa «Revisión personal exprés gratuita». ¿Cómo puedo solicitarlo?','es'],
 ];
 for(const [draft,locale] of cases){
  assert.equal(matchTelegramFreeReviewDraft(draft)?.locale,locale);
  const reply=telegramFreeReviewAcknowledgement(locale);
  assert.equal(reply.kind,'free_review');
  assert.ok(reply.handled);
  assert.ok(reply.text.length<450);
  assert.equal(reply.buttons.length,1);
  assert.equal(reply.buttons[0].url,'https://holistichouse.vercel.app/'+locale+'/services/free-situation-review');
  assert.doesNotMatch(reply.text,/booking confirmed|payment confirmed|запись подтверждена/iu);
 }
 for(const text of ['Hello','Could you help me make a request?','A private medical report',
   'Hello! I am interested in «Business coaching». Could you help me make a request?',
   'Hello! I am interested in «Free personal express review». My private story is here.',
   '/stop', 'x'.repeat(500)])
  assert.equal(matchTelegramFreeReviewDraft(text),null,text.slice(0,70));
 const handler=f('lib/crm/telegram-secretary-service.js');
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(handler,/matchTelegramFreeReviewDraft\(event\.text\)/);
 assert.match(handler,/telegramFreeReviewAcknowledgement\(locale\)/);
 assert.match(handler,/assertHolisticBusinessConnection\(\{connectionId:event\.connectionId/);
 assert.match(handler,/secretaryStopped\(event,config\)/);
 assert.match(route,/gateTelegramBusinessSecretaryOptOut\(body,config\)/);
 assert.match(route,/hh-tg-secretary-reply/);
 const i=handler.indexOf("if(query&&query.kind!=='safety'&&query.kind!=='free_review')");
 assert.ok(i>handler.indexOf('assertHolisticBusinessConnection'));
 assert.doesNotMatch(handler,/sendMarketing|sendBroadcast/);
});

test('operational customer FAQs get one bounded guiding question in Russian, English and Spanish',()=>{
 const cases=[
  ['Сколько стоит?','ru','price'],['How much does it cost?','en','price'],['¿Cuánto cuesta?','es','price'],
  ['Как записаться?','ru','booking'],['How can I book?','en','booking'],['¿Cómo puedo reservar?','es','booking'],
  ['Можно консультацию онлайн?','ru','format'],['Do you offer online sessions?','en','format'],['¿Ofrecen consultas online?','es','format'],
  ['Можно поговорить с человеком?','ru','human'],['Can I talk to a real person?','en','human'],['¿Puedo hablar con una persona?','es','human'],
  ['Моя заявка отправлена?','ru','status'],['Is my request submitted?','en','status'],['¿Mi solicitud fue enviada?','es','status'],
  ['Когда вы ответите?','ru','response_time'],['When will you reply?','en','response_time'],['¿Cuándo responden?','es','response_time'],
  ['Как отключить бота?','ru','stop_help'],['How do I stop the bot?','en','stop_help'],['¿Cómo detener el bot?','es','stop_help'],
  ['Как связаться с вами?','ru','contact'],['How can I contact you?','en','contact'],['¿Cómo contactar?','es','contact'],
  ['Хочу бесплатный разбор ситуации','ru','free_review'],['I want a free situation review','en','free_review'],
 ];
 for(const [message,locale,topic] of cases){
  const q=classifyTelegramSecretaryQuery(message,locale);
  assert.equal(q?.kind,'faq',message);
  assert.equal(q?.topic,topic,message);
  const a=composeTelegramSecretaryAnswer(q,[make()]);
  assert.equal(a?.kind,'faq',message);
  assert.equal(a.modelUsed,false);
  assert.ok(a.text.length>=25&&a.text.length<420);
  assert.ok((a.text.match(/[?？]/g)||[]).length<=1,message);
  assert.ok(a.buttons.length<=1);
  for(const button of a.buttons){
   assert.equal(new URL(button.url).origin,TELEGRAM_SITE);
   assert.equal(new URL(button.url).pathname.startsWith('/'+locale+'/'),true);
  }
 }
});
test('new FAQs do not hijack personal messages, STOP, published named prices or emergency help',()=>{
 for(const message of ['Привет','Давай просто поговорим','I feel overwhelmed','I need you to change my password','/stop','[HH-REQ:business:ru]'])
  assert.equal(classifyTelegramSecretaryQuery(message,'ru'),null,message);
 assert.equal(classifyTelegramSecretaryQuery('Не могу дышать','ru').kind,'safety');
 const priced=classifyTelegramSecretaryQuery('Сколько стоит рейки?','ru');
 assert.equal(priced.kind,'catalog');
 assert.match(composeTelegramSecretaryAnswer(priced,[make()]).text,/от €50/);
 assert.equal(classifyTelegramSecretaryQuery('рейки','ru').kind,'catalog');
});

test('free-review website starts the consented Ali Telegram bot; manual Telegram Business remains independent',()=>{
 const view=f('components/telegram-diagnostic-entry.tsx');
 const source=f('lib/crm/express-review-channel-handoff.mjs');
 const expected={
  en:'Hello! I am interested in «Free personal express review». Could you help me make a request?',
  ru:'Здравствуйте! Меня интересует «Бесплатный личный экспресс-разбор». Подскажите, как оформить запрос.',
  es:'¡Hola! Me interesa «Revisión personal exprés gratuita». ¿Cómo puedo solicitarlo?',
 };
 for(const [locale,draft] of Object.entries(expected)){
  const link=telegramExpressReviewHandoff(locale);
  const uri=new URL(link);
  assert.equal(uri.origin,'https://t.me');
  assert.equal(uri.pathname,'/holistichouse_bot');
  assert.deepEqual([...uri.searchParams.keys()],['start']);
  assert.equal(uri.searchParams.get('start'),'hhreview_'+locale);
  assert.equal(matchTelegramFreeReviewDraft(draft)?.locale,locale);
  assert.ok(view.includes(locale==='ru'?'Написать в Telegram':
     locale==='es'?'Escribir a Andrey por Telegram':'Write on Telegram'));
 }
 assert.equal(telegramExpressReviewHandoff('invalid'),null);
 assert.match(source,/telegramExpressReviewHandoff/);
 assert.match(view,/data-telegram-route="ali-free-diagnostic-v3"/);
 assert.doesNotMatch(view,/\/api\/public\/telegram-diagnostic|setTelegramUrl|telegramUnavailable|Telegram is not available right now|hhreview_/);
 assert.match(view,/Opening Telegram does not send your request/);
 assert.match(view,/Открытие Telegram не создаёт заявку/);
 assert.match(view,/secure questionnaire/);
 assert.match(view,/защищённую анкету/);
 assert.doesNotMatch(view,/HH_CRM_MSG_TELEGRAM_TOKEN|https?:\/\/openrouter\.ai/i);
});


test('P0: Reiki? offers the actual FREE course first, then verified paid service without a price',()=>{
 for(const [locale,message] of [['en','Reiki?'],['ru','Рейки?'],['es','¿Reiki?']]){
  const q=classifyTelegramSecretaryQuery(message,locale);
  const answer=composeTelegramSecretaryAnswer(q,[make()]);
  assert.equal(answer.kind,'catalog');
  assert.equal(answer.buttons[0].url,TELEGRAM_SITE+'/'+locale+'/academy/principles-of-energywork');
  assert.equal(answer.buttons[1].url,TELEGRAM_SITE+'/'+locale+'/academy/reiki/tantra-reiki/free-initiation');
  assert.ok(answer.buttons[2].url.includes('/remote-energy-support'));
  assert.doesNotMatch(answer.text,/€50|\$50|CAD 50|от €|from €/iu);
  assert.match(answer.text,/\?/);
  assert.equal(composeTelegramSecretaryAnswer(q,[]).buttons[0].url,answer.buttons[0].url);
 }
});
test('P0: relevant free published rows precede any paid row, even if rank favours paid',()=>{
 const free=make({id:'eb4ab8cc-dbc1-4603-b674-42b8cd619bfa',slug:'reiki-free-intro',
  offering_type:'intro',pricing_mode:'free',confirmed_price:null});
 const q=classifyTelegramSecretaryQuery('Reiki?','en');
 const answer=composeTelegramSecretaryAnswer(q,[make(),free]);
 assert.equal(answer.buttons.length,3);
 assert.ok(answer.buttons[0].url.includes('/academy/principles-of-energywork'));
 assert.ok(answer.buttons[1].url.includes('tantra-reiki/free-initiation'));
 assert.ok(answer.buttons[2].url.includes('reiki-free-intro'));
 assert.ok(answer.buttons.every(b=>!b.url.includes('remote-energy-support')));
 assert.doesNotMatch(answer.text,/€50/);
 const asked=composeTelegramSecretaryAnswer(classifyTelegramSecretaryQuery('Reiki price?','en'),[make()]);
 assert.match(asked.text,/from €50/);
 const session=composeTelegramSecretaryAnswer(classifyTelegramSecretaryQuery('Reiki session','en'),[make()]);
 assert.equal(session.buttons.length,1);
 assert.doesNotMatch(session.text,/€50/);
});
test('P0: free-only Reiki enquiry cannot display a paid session',()=>{
 const answer=composeTelegramSecretaryAnswer(classifyTelegramSecretaryQuery('Free Reiki course','en'),[make()]);
 assert.equal(answer.buttons[0].url,TELEGRAM_SITE+'/en/academy/principles-of-energywork');
 assert.ok(answer.buttons.every(b=>!b.url.includes('remote-energy-support')));
});


test('P0: generic discovery starts with the three verified free entry points',()=>{
 for(const [locale,message] of [['en','What services do you offer?'],['ru','Какие у вас услуги?']]){
  const answer=composeTelegramSecretaryAnswer(classifyTelegramSecretaryQuery(message,locale),[make()]);
  assert.equal(answer.kind,'catalog');
  assert.deepEqual(answer.buttons.map(b=>b.url),['services/free-situation-review','tests','academy/principles-of-energywork'].map(path=>TELEGRAM_SITE+'/'+locale+'/'+path));
  assert.doesNotMatch(answer.text,/€50/);
 }
});

test('Business welcome is a five-topic localized inline menu, free first, no prices',async()=>{
 const {telegramBusinessWelcomeMenu,telegramBusinessWelcomeTopic,telegramBusinessWelcomeClick}=await import('../lib/crm/telegram-business-welcome-menu.mjs');
 for(const locale of ['en','ru','es']){
  const welcome=telegramBusinessWelcomeMenu(locale);
  assert.equal(welcome.buttons.length,5);
  assert.equal(welcome.buttons[0].callback_data,'hhbw1:'+locale+':free');
  for(const button of welcome.buttons){
   assert.ok(button.text.length<=48);
   assert.ok(!button.url);
   const topic=button.callback_data.split(':').at(-1);
   const plan=telegramBusinessWelcomeTopic(locale,topic);
   assert.ok(plan.text.length<600);
   assert.doesNotMatch(plan.text,/€|\$|CAD|EUR/);
   assert.ok(plan.buttons.length<=3);
   for(const link of plan.buttons)assert.equal(new URL(link.url).origin,TELEGRAM_SITE);
   const now=Date.now(),body={update_id:923,callback_query:{id:'test-callback-123',data:button.callback_data,
    from:{id:123456789,is_bot:false},message:{message_id:55,date:Math.floor(now/1000),
     chat:{id:123456789,type:'private'},sender_business_bot:{id:987654321,is_bot:true},
     business_connection_id:'business-connection-123',text:welcome.text}}};
   assert.equal(telegramBusinessWelcomeClick(body,'987654321',now)?.topic,topic);
   assert.equal(telegramBusinessWelcomeClick(body,'111111111',now),null);
   assert.equal(telegramBusinessWelcomeClick(body,'987654321',now+86400000),null);
   assert.equal(telegramBusinessWelcomeClick({...body,callback_query:{...body.callback_query,from:{id:99999999,is_bot:false}}},'987654321',now),null);
   assert.equal(telegramBusinessWelcomeClick({...body,callback_query:{...body.callback_query,data:'hhbw1:'+locale+':book'}},'987654321',now),null);
  }
  assert.equal(telegramBusinessWelcomeTopic(locale,'free').buttons.length,3);
  assert.match(telegramBusinessWelcomeTopic(locale,'reiki').buttons[0].url,/principles-of-energywork$/);
 }
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const first=route.indexOf('if(businessLead?.created)');
 assert.ok(first>0);
 const welcomeRoute=route.slice(first,route.indexOf('const updates=normalizeMessengerUpdates',first));
 assert.ok(welcomeRoute.indexOf('generalWelcome:true')<welcomeRoute.indexOf('welcomeLocale:welcome.locale'));
 assert.match(welcomeRoute,/ensureTelegramInlineWebhookUpdates/);
 assert.match(welcomeRoute,/fallback.buttons/);
 assert.match(route,/secretaryStopped\(click,config\)/);
 assert.match(route,/inbox.matched&&inbox.recorded&&!inbox.humanActive/);
 const inbox=f('lib/crm/telegram-business-inbox.js');
 assert.match(inbox,/business-callback:/);
 assert.match(inbox,/Telegram Business menu selected:/);
});


// Synthetic owner regression: three different messages never receive the same service menu.
test('Business natural clarification recognizes curiosity, location and free choice',async()=>{
 const {businessSecretaryNaturalClarification:clarify}=await import('../lib/crm/telegram-business-natural-dialogue.mjs');
 const messages=['Saw videos of happy people and am curious about it','Am from another city','Free'];
 const answers=messages.map(message=>clarify(message,'en'));
 assert.deepEqual(answers.map(a=>a.clarificationReason),['natural_interest','natural_location','natural_free']);
 assert.equal(new Set(answers.map(a=>a.text)).size,3);
 assert.match(answers[0].text,/curious/i);
 assert.match(answers[1].text,/where you're based/i);
 assert.deepEqual(answers[2].buttons.map(b=>b.url),[TELEGRAM_SITE+'/en/services/free-situation-review',TELEGRAM_SITE+'/en/academy/principles-of-energywork']);
 for(const locale of ['ru','es'])assert.equal(clarify(locale==='ru'?'Бесплатно':'Gratis',locale).buttons.length,2);
 for(const message of ['/stop','where are you?','price'])assert.equal(clarify(message,'en'),null);
 assert.equal(clarify('Free','en',{mediaKind:'voice'}),null);
});

test('Business duplicate content and clarification intent cannot loop; safety and DB errors remain explicit',async()=>{
 const {guardBusinessSecretaryReply:guard}=await import('../lib/crm/telegram-business-natural-dialogue.mjs');
 const seen=new Set(),reserve=async(scope,key)=>{const k=scope+':'+key;if(seen.has(k))throw Object.assign(Error('limit'),{code:'RATE_LIMITED'});seen.add(k)};
 const planned={reply:'Which service?',kind:'clarify',locale:'en',clarificationReason:'general',buttons:[]};
 assert.equal(await guard(planned,reserve),planned);
 const second=await guard({...planned,reply:'Which service!' },reserve);
 assert.equal(second.clarificationReason,'repeat_handoff');
 assert.doesNotMatch(second.reply,/Which service/i);
 assert.equal(await guard({...planned,reply:'What service would you like?'},reserve),null);
 const urgent={...planned,kind:'safety'};
 assert.equal(await guard(urgent,reserve),urgent);
 await assert.rejects(guard(planned,async()=>{throw Error('database unavailable')}),/database unavailable/);
 const route=f('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(route,/guardBusinessSecretaryReply\(secretary/);
 assert.match(route,/text:guarded.reply,buttons:guarded.buttons/);
});
