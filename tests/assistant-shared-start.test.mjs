import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('both assistant entries use shared service choices and preserve the original composer',()=>{
 const shared=read('components/assistant-start.tsx');
 for(const label of ['Get AI Coach Session','Get Reiki Course (free)','Request Clarity Session with Andy'])assert.ok(shared.includes(label));
 for(const path of ['my-coach','academy/principles-of-energywork','my-coach/real/andy-litvinov'])assert.ok(shared.includes('path:"'+path+'"'));
 const landing=read('components/app/messenger-ai-landing.tsx');
 assert.ok(landing.includes('<AssistantStart locale={locale} onAsk={onAsk}/>'));
 assert.equal(landing.split('{composer}').length-1,1);
 assert.ok(landing.includes('<IHelpTopics locale={locale} onSelect={onTopicSelect}/>'));
 const chat=read('components/holistic-agent-chat.tsx');
 assert.ok(chat.includes('<AssistantStart locale={locale} pageHelp section={pageHelp.section}'));
 assert.ok(chat.includes('selectPageHelpAction(action)'));
 const shell=read('components/sitewide-ihelp.tsx');
 assert.ok(shell.includes('pageHelp={context} quickPrompt={quickPrompt}'));
 assert.equal(shell.split('<HolisticAgentChat ').length-1,1);
 assert.ok(!shell.includes('<IHelpWelcome '));
});

test('iHelp welcome precedes all messages and reply options are outside the assistant bubble',()=>{
 const chat=read('components/holistic-agent-chat.tsx');
 const welcome=chat.indexOf('<AssistantStart locale={locale} pageHelp');
 const messages=chat.indexOf('{messages.map(');
 assert.ok(welcome>=0&&welcome<messages);
 assert.ok(chat.includes('{compact&&pageHelp&&<>'));
 assert.ok(chat.includes('pageHelpReplyText(m.text,index)'));
 assert.ok(chat.includes('data-hh-ihelp-reply-options'));
 assert.ok(chat.includes('renderWaveGoalMenu(m.text,index,true)'));
 assert.ok(chat.includes('pageHelpGreeting(turnLocale)'));
});
test('localized conversational greeting keeps the existing menu choice routing',async()=>{
 const {buildWaveEntryMenu,readWaveEntryMenu,waveDialogueEntryTurn}=await import('../lib/holistic-support/wave-dialogue-entry.mjs');
 for(const [locale,greeting] of Object.entries({en:"Hi! I'm here to help.",ru:"Привет! Рад помочь.",es:"¡Hola! Estoy aquí para ayudarte."})){
  const menu=buildWaveEntryMenu(locale),reply=greeting+' '+menu.reply;
  assert.deepEqual(readWaveEntryMenu(reply),menu);
  assert.equal(waveDialogueEntryTurn({message:'1',locale,history:[{role:'assistant',text:reply}]}).path,menu.choices[0].id);
 }
});
