import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {parseSubscriberAiUpdate,subscriberAiResponse,subscriberAiEnabled,
 SUBSCRIBER_AI_CONSENT_VERSION} from '../lib/app/subscriber-ai-policy.mjs';
const t=1762400000; // fixed UTC timestamp for reproducible validation
const mk=(text,extras={})=>({update_id:101,message:{date:t,text,chat:{id:12345,type:'private'},
 from:{id:12345,language_code:'ru',is_bot:false},...extras}});
const parsed=(input)=>parseSubscriberAiUpdate(input,'andydotbot',t*1000);
test('versioned consent and opt-in gate default OFF',()=>{
 assert.equal(SUBSCRIBER_AI_CONSENT_VERSION,'hh-subscriber-ai-v1');
 assert.equal(subscriberAiEnabled({HH_SUBSCRIBER_AI_ENABLED:'true',HH_SUBSCRIBER_AI_SEND_ENABLED:'true',HH_CLIENT_TG_LINK_ENABLED:'true'}),false);
 assert.equal(subscriberAiEnabled({VERCEL_ENV:'production',HH_SUBSCRIBER_AI_ENABLED:'true',HH_SUBSCRIBER_AI_SEND_ENABLED:'true',HH_CLIENT_TG_LINK_ENABLED:'true'}),true);
});
test('existing /start tokens and /stop remain routed elsewhere',()=>{
 for(const s of ['/start abcdefghijklmnopqrstuvwxyzABCDEF','/start','/stop','/unsubscribe','/audio','/combine','/video_story'])assert.equal(parsed(mk(s)),null,s);
 assert.equal(parsed(mk('/start hhai_ru')).action,'open');
});
test('explicit activation, deactivation and free text are classified',()=>{
 assert.equal(parsed(mk('/ai')).action,'open');
 assert.equal(parsed(mk('/ai_off')).action,'disable');
 assert.equal(parsed(mk('Ау')).action,'chat');
 assert.equal(parsed(mk('Хочу спокойную практику')).action,'chat');
});
test('only private genuine inbound user messages are accepted',()=>{
 assert.equal(parsed({...mk('/ai'),message:{...mk('/ai').message,chat:{id:-999,type:'group'}}}),null);
 assert.equal(parsed({...mk('/ai'),message:{...mk('/ai').message,from:{id:666}}}),null);
 assert.equal(parsed(mk('/ai',{forward_origin:{type:'user'}})),null);
 assert.equal(parsed(mk('/ai',{date:t-700})),null);
 assert.equal(parsed(mk('x'.repeat(1201))),null);
 assert.equal(parsed(mk('How are you?',{reply_to_message:{message_id:44,from:{is_bot:true,username:'andydotbot'}}})),null);
 assert.equal(parsed(mk('/ai@foreignbot')),null);
});
test('callbacks require matching bot identity and same chat user',()=>{
 const cb={update_id:300,callback_query:{id:'cb1',data:'hhai:agree',from:{id:12345,language_code:'en'},
  message:{date:t,chat:{id:12345,type:'private'},from:{is_bot:true,username:'andydotbot'}}}};
 assert.equal(parsed(cb).action,'enable');
 assert.equal(parsed({...cb,callback_query:{...cb.callback_query,message:{...cb.callback_query.message,date:t-86400}}}).action,'enable');
 assert.equal(parsed({...cb,callback_query:{...cb.callback_query,data:'hhai:bogus'}}),null);
 assert.equal(parsed({...cb,callback_query:{...cb.callback_query,message:{...cb.callback_query.message,from:{is_bot:true,username:'anotherbot'}}}}),null);
 assert.equal(parsed({...cb,callback_query:{...cb.callback_query,from:{id:99}}}),null);
});
test('consent message independent of subscription and never infers account link',()=>{
 const r=subscriberAiResponse('open','ru');
 assert.match(r.text,/подписк/i);assert.match(r.text,/внешним моделям/);
 assert.equal(r.keyboard.inline_keyboard[0][0].callback_data,'hhai:agree');
 assert.match(subscriberAiResponse('disable','ru').text,/подписк/i);
});
test('brief natural RU/EN/ES replies and safety',()=>{
 assert.match(subscriberAiResponse('chat','ru','Привет').text,/здесь|помочь/i);
 assert.match(subscriberAiResponse('chat','en','Hello').text,/here|help/i);
 assert.match(subscriberAiResponse('chat','es','Hola').text,/aqui|aquí|ayuda|puedo|hola/i);
 assert.match(subscriberAiResponse('chat','ru','Хочу умереть').text,/экстренн/);
});
test('no fake private resource access, no fake video order or booking',()=>{
 assert.match(subscriberAiResponse('materials','ru').text,/не открываю/);
 assert.match(subscriberAiResponse('video','ru').text,/заказ сейчас не создан/);
 assert.match(subscriberAiResponse('master','en').text,/No booking/);
});

test('SQL outbox definition contains one updated_at column',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261106080000_hh_subscriber_ai_companion_v1.sql',import.meta.url),'utf8');
 const table=sql.split('create table if not exists app_private.subscriber_ai_outbox (')[1]?.split('\n);')[0];
 assert.ok(table,'outbox table must exist');
 assert.equal((table.match(/updated_at timestamptz/g)||[]).length,1);
});
