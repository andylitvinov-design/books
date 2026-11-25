import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ALI_PERSONAS,getAliPersona} from '../lib/holistic-support/ali-personas.mjs';
import {threeJourneyLabel} from '../lib/holistic-support/three-journeys.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('genie dialogue opens in the established Messenger first turn, not a second bot',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx');
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(chat,/<MessengerAiLanding locale=\{locale\} composer=\{composer\}/);
 assert.match(landing,/data-hh-genie-scene/);
 assert.match(landing,/data-hh-ali-first-message/);
 assert.match(landing,/data-hh-genie-path-choice="therapy"/);
 assert.match(landing,/data-hh-genie-path-choice="consultation"/);
 assert.match(landing,/data-hh-genie-path-choice="goal"/);
 assert.match(landing,/onJourneySelect\('therapy'\)/);
 assert.match(chat,/onJourneySelect=\{startJourney\}/);
 assert.match(landing,/data-hh-ai-inline-composer>\{composer\}/);
 assert.match(landing,/data-hh-ai-persona-voice-play/);
 assert.match(landing,/playAliPersonaAudio\(persona.id,locale/);
 assert.match(landing,/data-hh-ai-chat-shortcuts/);
 assert.match(landing,/data-hh-alchemist-topics/);
 for(const path of ['therapy','consultation','goal']){
  assert.ok(landing.includes(`threeJourneyLabel("${path}",locale)`));
  for(const locale of ['ru','en','es'])assert.ok(threeJourneyLabel(path,locale).length>10);
 }
});

test('localized genie first turn keeps existing guide, conversation and voice controls',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx');
 const css=read('components/app/messenger-ai-landing.module.css');
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(landing,/guideName=persona.name\[locale\]/);
 assert.match(landing,/data-hh-genie-goal-choices/);
 assert.match(css,/var\(--hh-ai-persona-image, none\)/);
 assert.match(css,/max-width:365px/);
 assert.match(css,/max-height:740px/);
 assert.match(css,/data-hh-ai-chat-composer/);
 assert.doesNotMatch(chat,/data-hh-ai-gemini-tier/);
 assert.match(chat,/data-hh-ai-photo-shortcut/);
 assert.match(chat,/data-hh-conversation-mic/);
 assert.match(chat,/data-hh-ai-more/);
});


test('opening and active chat backgrounds use the current selected guide image',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx');
 const hub=read('components/app/messages-orders-clients.jsx');
 const landingCss=read('components/app/messenger-ai-landing.module.css');
 const hubCss=read('components/app/messages-orders-clients.module.css');
 const hook=read('components/app/use-ali-persona.js');
 for(const component of [landing,hub]){
  assert.ok(component.includes('const {persona}=useAliPersona()'));
  assert.ok(component.includes("'--hh-ai-persona-image':`url(\"\${persona.image}\")`"));
 }
 for(const sheet of [landingCss,hubCss]){
  assert.ok(sheet.includes('var(--hh-ai-persona-image, none)'));
  assert.ok(!sheet.includes('genie-calm-loop-poster.webp'));
 }
 assert.ok(hook.includes('window.addEventListener(ALI_PERSONA_EVENT,onChange)'));
 assert.ok(hook.includes("window.addEventListener('storage',sync)"));
 assert.equal(new Set(ALI_PERSONAS.map(p=>p.image)).size,4);
 for(const p of ALI_PERSONAS){
  assert.equal(getAliPersona(p.id).image,p.image);
  assert.ok(existsSync(new URL('public'+p.image,root)),p.image);
 }
});
