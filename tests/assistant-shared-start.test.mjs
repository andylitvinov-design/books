import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('approved chat welcome keeps one large two-row composer and five fitting topics',()=>{
 const shared=read('components/assistant-start.module.css');
 const topics=read('components/ihelp-welcome.module.css');
 const messenger=read('components/holistic-agent-chat.module.css');
 const ihelp=read('components/sitewide-ihelp.module.css');
 assert.match(shared,/mask-image:linear-gradient\(90deg,transparent 0%,#000 34%\)/);
 assert.match(topics,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(topics,/white-space:normal;text-align:center/);
 for(const css of [messenger,ihelp]){
   assert.ok(css.includes('flex-direction:column!important'));
   assert.ok(css.includes('data-gemini-pending="true"'));
   assert.ok(css.includes('data-voice-onboarding="true"'));
   assert.ok(css.includes('data-hh-dictation-active="true"'));
   assert.ok(css.includes('min-height:100px'));
 }
 assert.ok(messenger.includes('.form[data-landing-composer]'));
 assert.ok(ihelp.includes('[data-page-help]:not([data-has-messages])>form'));
});

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
