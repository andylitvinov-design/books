import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isChatModelStatusQuestion,chatModelStatusReply} from '../lib/holistic-support/chat-model-status.mjs';
import {understandConversationTurn} from '../lib/holistic-support/conversation-intelligence.mjs';
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs';

test('actual owner screenshot: a greeting cannot replace a direct Gemini question',()=>{
 const text='Привет. Ты работаешь через Gemini сейчас или как?';
 assert.equal(isChatModelStatusQuestion(text),true);
 assert.notEqual(understandConversationTurn({message:text,locale:'ru'}).act,'greeting');
 const reply=ruleConversationReply({message:text,locale:'ru'});
 assert.equal(reply.id,'chat_model_status');
 assert.match(reply.reply,/не Gemini/);
 assert.doesNotMatch(reply.reply,/Как проходит твой день/);
});
test('explicit provider questions in three languages, not standalone greetings or safety',()=>{
 for(const input of ['Какая у тебя модель?','Ты подключен к Джемини?','Hello, are you using Gemini now?','¿Usas Gemini?'])
  assert.equal(isChatModelStatusQuestion(input),true,input);
 for(const input of ['Привет','Расскажи, что такое Gemini','Gemini','Деньги','Мне боль в груди, ты Gemini?','I want to die, are you using Gemini?'])
  assert.equal(isChatModelStatusQuestion(input),false,input);
 for(const locale of ['ru','en','es']){
  const reply=chatModelStatusReply({locale});
  assert.match(reply,/Gemini · Free API/);
  assert.notEqual(reply,chatModelStatusReply({locale,lastGemini:true}));
 }
 assert.equal(understandConversationTurn({message:'Привет!',locale:'ru'}).act,'greeting');
 assert.equal(understandConversationTurn({message:'Hello there',locale:'en'}).act,'greeting');
 assert.notEqual(understandConversationTurn({message:'Hello. What is coaching?',locale:'en'}).act,'greeting');
});
test('local disclosure and actual provider result remain separate; server safety wins',()=>{
 const ui=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
 const route=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 assert.ok(ui.indexOf('isChatModelStatusQuestion(text)&&!requiresProtectedReply')<ui.indexOf('if(compact&&isCasualGreeting'));
 assert.match(ui,/data\.modelUsed===true&&used==="gemini-free-public"/);
 assert.match(ui,/answer\.kind==="gemini"\?\{provider:"gemini-free"/);
 assert.match(route,/safety\.status==="clear"&&!recentUnsafe&&body\.judgmentContext==null&&body\.judgmentChoice==null&&isChatModelStatusQuestion/);
 assert.match(route,/source:"chat-model-status",modelUsed:false/);
});
test('ongoing composer has a short placeholder, expands only on authored text and keeps real controls',()=>{
 const ui=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../components/holistic-agent-chat.module.css',import.meta.url),'utf8');
 assert.match(ui,/animateComposer=messengerView&&showLandingComposer/);
 assert.match(ui,/if\(draft\.trim\(\)\)input\.style\.height=/);
 assert.match(ui,/data-hh-chat-has-draft=\{Boolean\(draft\.trim\(\)\)\|\|undefined\}/);
 assert.match(ui,/micMarker="data-hh-conversation-mic"/);
 assert.match(ui,/data-hh-ai-photo-shortcut/);
 assert.match(css,/min-height:50px;height:auto/);
 assert.match(css,/data-hh-chat-has-draft="true"\].*?\.actions>\.recorderToggle\{display:none\}/);
 assert.match(css,/data-hh-dictation-active="true"/);
});
