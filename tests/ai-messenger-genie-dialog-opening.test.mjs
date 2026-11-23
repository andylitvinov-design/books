import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('genie dialogue opens in the established Messenger first turn, not a second bot',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx');
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(chat,/<MessengerAiLanding locale=\{locale\} composer=\{composer\}/);
 assert.match(landing,/data-hh-genie-scene/);
 assert.match(landing,/data-hh-ali-first-message/);
 assert.match(landing,/data-hh-genie-goal-choice="discover"/);
 assert.match(landing,/data-hh-genie-goal-choice="defined"/);
 assert.match(landing,/onGoalChoice\(locale===/);
 assert.match(landing,/data-hh-ai-inline-composer>\{composer\}/);
 assert.match(landing,/data-hh-ai-persona-voice-play/);
 assert.match(landing,/playAliPersonaAudio\(persona.id,locale/);
 assert.match(landing,/data-hh-ai-chat-shortcuts/);
 assert.match(landing,/data-hh-alchemist-topics/);
 for(const label of ['Помоги найти цель','У меня уже есть цель','Help me find my goal',
  'I already have a goal','Ayúdame a encontrar mi meta']){
  assert.ok(landing.includes(label),label);
 }
});

test('localized genie first turn keeps existing guide, conversation and voice controls',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx');
 const css=read('components/app/messenger-ai-landing.module.css');
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(landing,/guideName=persona.name\[locale\]/);
 assert.match(landing,/data-hh-genie-goal-choices/);
 assert.match(css,/genie-calm-loop-poster\.webp/);
 assert.match(css,/max-width:365px/);
 assert.match(css,/max-height:740px/);
 assert.match(css,/data-hh-ai-chat-composer/);
 assert.match(chat,/data-hh-ai-gemini-tier/);
 assert.match(chat,/data-hh-conversation-mic/);
 assert.match(chat,/data-hh-ai-more/);
});
