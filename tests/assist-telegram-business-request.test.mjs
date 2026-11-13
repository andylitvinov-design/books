import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOLISTIC_TELEGRAM_ACCOUNT,telegramServiceRequestDraft,telegramServiceRequestUrl,parseTelegramServiceDraft,telegramBusinessRequestFromUpdate,isHolisticBusinessConnection,telegramBusinessRequestReply} from '../lib/assist/telegram-business-request.mjs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('15 real service request drafts are filled into a normal user chat, no /start',()=>{
 assert.equal(HOLISTIC_TELEGRAM_ACCOUNT,'holistichouse');
 for(const locale of ['ru','en','es'])for(const id of ['homeopathy','coaching','reiki','constellations','business']){
  const href=telegramServiceRequestUrl(id,locale);
  assert.ok(href.startsWith('https://t.me/holistichouse?text='));
  const text=new URL(href).searchParams.get('text');
  assert.equal(parseTelegramServiceDraft(text).service,id);
  assert.equal(parseTelegramServiceDraft(text).locale,locale);
  assert.ok(!href.includes('start='));
 }
 assert.equal(telegramServiceRequestUrl('unknown','en'),null);
 assert.equal(telegramServiceRequestDraft('reiki','xx'),null);
 assert.equal(parseTelegramServiceDraft('Hello'),null);
 assert.equal(parseTelegramServiceDraft('[HH-REQ:reiki:en] unexpected'),null);
 assert.equal(parseTelegramServiceDraft('[HH-REQ:reiki:xx]'),null);
});
const fixture=()=>({update_id:55,business_message:{business_connection_id:'connection-abc123',
  chat:{type:'private',id:111222333},from:{id:111222333,is_bot:false},
  message_id:81,date:Math.floor(Date.now()/1000),text:'hello\n[HH-REQ:reiki:en]'}});
test('only signed-ingress-shaped private, recent customer message is parsed',()=>{
 const e=fixture();assert.equal(telegramBusinessRequestFromUpdate(e).service,'reiki');
 for(const mutate of [x=>x.business_message.chat.type='group',
    x=>x.business_message.from.id=9,x=>x.business_message.from.is_bot=true,
    x=>x.business_message.date=1,x=>x.business_message.text='hello',
    x=>x.business_message.sender_business_bot={id:9},x=>x.update_id=0.5]){
  const x=fixture();mutate(x);assert.equal(telegramBusinessRequestFromUpdate(x),null);
 }
 assert.equal(telegramBusinessRequestFromUpdate({update_id:5,message:fixture().business_message}),null);
});
test('business reply requires enabled verified @holistichouse and narrow can_reply',()=>{
 const conn={id:'connection-abc123',is_enabled:true,user:{id:321789,is_bot:false,username:'holistichouse'},rights:{can_reply:true}};
 assert.equal(isHolisticBusinessConnection(conn,conn.id),true);
 assert.equal(isHolisticBusinessConnection(conn,conn.id,'321789'),true);
 assert.equal(isHolisticBusinessConnection(conn,conn.id,'77'),false);
 for(const p of [{...conn,id:'foreign'},{...conn,is_enabled:false},
  {...conn,user:{...conn.user,username:'other'}},{...conn,rights:{can_reply:false}}]){
  assert.equal(isHolisticBusinessConnection(p,conn.id),false);
 }
 for(const locale of ['ru','en','es']){
  const reply=telegramBusinessRequestReply({service:'reiki',locale});
  assert.ok(reply.length<600);
  assert.doesNotMatch(reply,/https?:|@holistichouse_bot/);
 }
});
test('Assist and signed Telegram webhook preserve bot diagnostics, prefill, limits',()=>{
 const ui=get('components/assist-top-recommendations.tsx');
 const provider=get('lib/crm/messenger-provider.js');
 const route=get('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(ui,/telegramServiceRequestUrl\(id,locale\)/);
 assert.match(ui,/target="_blank"/);
 assert.match(ui,/data-assist-best-action=\{id\}/);
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(route,/telegramBusinessRequestFromUpdate\(body\)/);
 assert.match(route,/HH_CRM_TG_CHAT_AUTOMATION_ENABLED==='true'/);
 assert.match(route,/hh-tg-business-intent-message/);
 assert.match(route,/processTelegramDiagnostic\(diagnosticEvent,config\)/);
 assert.match(provider,/getBusinessConnection/);
 assert.match(provider,/business_connection_id:connectionId/);
 assert.match(provider,/business_connection','business_message/);
 assert.match(provider,/drop_pending_updates:false/);
});
