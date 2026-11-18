import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {telegramSupportQuizText,telegramSupportQuizButtons,
  parseTelegramSupportCallback,telegramSupportQuizMarkupAllowed,
  telegramSupportSelection,telegramSupportStartCommand,
  telegramSupportStartSelection,telegramSupportSummary,
  telegramSupportFirstQuestion} from '../lib/crm/telegram-support-quiz.mjs';
import {telegramMainMenuButtons,telegramMainDetailButtons,
  parseTelegramHomeAction,parseTelegramHomeCallback} from '../lib/crm/telegram-companion-menu.mjs';
import {telegramCompanionNativeCommands,mergeTelegramCompanionNativeCommands} from '../lib/crm/telegram-companion-native-commands.mjs';
import {v3SupportStart,v3Context} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Get Support is first and the other six top-level actions follow site navigation',()=>{
 for(const lang of ['ru','en']){
  const main=telegramMainMenuButtons(lang);
  assert.equal(main.inline_keyboard.length,7);
  assert.equal(main.inline_keyboard[0][0].text.includes('Get Support'),true);
  assert.deepEqual(main.inline_keyboard.map(row=>parseTelegramHomeCallback(row[0].callback_data)?.action),
    ['support','tests','academy','library','events','cabinet','language']);
  for(const action of ['tests','academy','library','events','cabinet']){
   const button=telegramMainDetailButtons(lang,action).inline_keyboard[0][0];
   assert.equal(new URL(button.url).origin,'https://holistichouse.vercel.app');
   assert.equal(new URL(button.url).pathname.startsWith('/'+lang+'/'),true);
  }
  const native=telegramCompanionNativeCommands(lang);
  assert.equal(native.length,8);
  assert.equal(native[0].command,'support');
  assert.ok(native.every(x=>x.description.length>0));
  assert.equal(parseTelegramHomeAction('/support')?.action,'support');
  assert.equal(parseTelegramHomeAction('/tests')?.action,'tests');
  assert.equal(parseTelegramHomeAction('/academy')?.action,'academy');
 }
});

test('four topics and contextual needs/modes/budget use the same site quiz',()=>{
 for(const lang of ['ru','en']){
  const intro=telegramSupportQuizButtons(lang);
  assert.equal(intro.inline_keyboard.length,5);
  assert.ok(telegramSupportQuizText(lang).length<200);
  for(let topic=0;topic<4;topic++){
   const topicDigits=String(topic);
   const needs=telegramSupportQuizButtons(lang,topicDigits);
   assert.equal(needs.inline_keyboard.length,5);
   assert.ok(telegramSupportQuizMarkupAllowed(needs));
   for(let need=0;need<4;need++){
    const needDigits=topicDigits+need;
    const formats=telegramSupportQuizButtons(lang,needDigits);
    assert.equal(formats.inline_keyboard.length,5);
    for(let format=0;format<4;format++){
     const formatDigits=needDigits+format;
     const budgets=telegramSupportQuizButtons(lang,formatDigits);
     assert.ok(telegramSupportQuizMarkupAllowed(budgets));
     for(let budget=0;budget<4;budget++){
      const digits=formatDigits+budget;
      const modes=telegramSupportQuizButtons(lang,digits);
      assert.equal(modes.inline_keyboard.length,4,'3 conversation modes and Back');
      assert.ok(telegramSupportQuizMarkupAllowed(modes));
      assert.equal(telegramSupportStartCommand(lang,digits),null,'4 choices are not AI consent');
      for(let mode=0;mode<3;mode++){
       const full=digits+mode;
       const callback=parseTelegramSupportCallback('hhsq:'+lang+':'+full);
       assert.deepEqual(callback,{locale:lang,digits:full,action:'support'+full});
       assert.deepEqual(parseTelegramHomeCallback('hhsq:'+lang+':'+full),
         {locale:lang,action:'support'+full});
       const deepLink=telegramSupportStartCommand(lang,full);
       assert.equal(telegramSupportStartSelection(deepLink)?.selection.digits,full);
       assert.equal(v3SupportStart(deepLink)?.selection.digits,full);
       assert.equal(v3Context({turns:[],supportSelection:full}).supportSelection,full);
       assert.equal(telegramSupportSelection(full).chatMode,
         ['secretary','coach','talk'][mode]);
       assert.ok(telegramSupportSummary(lang,full).length>20);
       assert.ok(telegramSupportFirstQuestion(lang,full).length>20);
      }
      // Deep links sent by an older menu version remain valid Secretary entries.
      const old='/start hhsupport_'+lang+'_'+digits;
      assert.equal(v3SupportStart(old)?.selection.chatMode,'secretary');
     }
    }
   }
  }
 }
});

test('retire only known bot-managed command duplicates, leave custom owner commands',()=>{
 const legacy=telegramCompanionNativeCommands('ru');
 const former=[
  {command:'menu',description:'Открыть главное меню'},
  {command:'ai',description:'Общаться с AI после согласия'},
  {command:'ai_off',description:'Выключить AI'},
  {command:'daily',description:'Включить утреннее приветствие'},
  {command:'daily_off',description:'Выключить утреннее приветствие'},
  {command:'review',description:'Личный разбор с мастером'},
  {command:'stop',description:'Остановить общение'}
 ];
 const next=mergeTelegramCompanionNativeCommands([
  ...former,{command:'start',description:'Owner personal start'}],'ru');
 assert.deepEqual(next.filter(x=>legacy.some(y=>x.command===y.command)),legacy);
 assert.equal(next.some(x=>['ai','ai_off','daily','daily_off','review'].includes(x.command)),false);
 assert.equal(next.find(x=>x.command==='start')?.description,'Owner personal start');
 assert.equal(mergeTelegramCompanionNativeCommands(next,'ru').length,next.length);
});

test('reject malformed callbacks and keyboards; never turn quiz into consent',()=>{
 for(const callback of ['hhsq:es:0000','hhsq:ru:','hhsq:ru:01234',
  'hhsq:ru:abcd','hhsq:ru:012;','hhsq:ru:3/0','hhsq:ru:9999']){
  assert.equal(parseTelegramSupportCallback(callback),null);
 }
 assert.equal(telegramSupportSelection('00003'),null);
 assert.equal(telegramSupportStartSelection('/start hhsupport_ru_9999'),null);
 assert.equal(v3Context({turns:[],supportSelection:'xyz'}).supportSelection,undefined);
 assert.equal(telegramSupportQuizMarkupAllowed({inline_keyboard:[
  [{text:'bad',callback_data:'hhsq:en:0'}]]}),false);
 const svc=source('lib/crm/telegram-companion-service.js');
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const v3=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.ok(svc.includes('supportStart:telegramSupportStartCommand'));
 assert.ok(route.includes('if(companion.supportStart)'));
 assert.ok(v3.includes('supportStart?telegramSupportIntro'));
 assert.ok(v3.includes("supportStart.selection.topic==='business_support'"));
 assert.ok(v3.includes("supportStart.selection.digits"));
 assert.ok(v3.includes('supportChatStart'));
 assert.ok(v3.includes("supportChatStart?'chat_consent'"));
 assert.ok(v3.includes("conversationKind:'general'"));
 assert.ok(v3.includes('ctx.supportSelection?telegramSupportFirstQuestion'));
 const model=source('lib/crm/telegram-ai-diagnostic-v3-model.mjs');
 assert.ok(model.includes("selected.chatMode==='coach'"));
 assert.ok(model.includes("selected.chatMode==='talk'"));
 assert.ok(v3.includes('!activeServiceConsent&&!activeFreeConsent&&!activeSupportConsent&&'));
 assert.ok(v3.includes(".supportSelection"));
});
