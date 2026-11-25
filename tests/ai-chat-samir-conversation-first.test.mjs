import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const landing=readFileSync('components/app/messenger-ai-landing.tsx','utf8');
const chat=readFileSync('components/holistic-agent-chat.tsx','utf8');
const personas=readFileSync('lib/holistic-support/ali-personas.mjs','utf8');
test('Samir remains the existing stable male presenter, no extra provider',()=>{
 assert.match(personas,/ALI_DEFAULT_PERSONA_ID='alex'/);
 assert.ok(personas.includes("name:local('Samir','Самир','Samir')"));
 assert.ok(personas.includes('genie-calm-loop-poster.webp'));
});
test('two existing goal actions now actually submit a conversation turn',()=>{
 for(const id of ['discover','defined'])assert.ok(landing.includes('data-hh-genie-goal-choice="'+id+'"'));
 assert.ok(landing.includes('onGoalChoice(locale==='));
 assert.ok(chat.includes('onGoalChoice={text=>sendSelectedTurn(text)}'));
 assert.ok(chat.includes('data-hh-conversation-mic'));
 assert.ok(chat.includes('data-hh-ai-gemini-tier'));
});
test('original one-thread and menu remain',()=>{
 for(const key of ['data-hh-genie-scene','data-hh-ali-first-message','data-hh-ai-inline-composer',
 'data-hh-ai-chat-shortcuts','data-hh-alchemist-topics','data-hh-ai-video-hero'])
  assert.ok(landing.includes(key),key);
});
