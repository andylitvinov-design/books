import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const landing=readFileSync('components/app/messenger-ai-landing.tsx','utf8');
const chat=readFileSync('components/holistic-agent-chat.tsx','utf8');
const personas=readFileSync('lib/holistic-support/ali-personas.mjs','utf8');
test('Samir reuses the four existing guide ids and stable voice route',()=>{
 assert.match(personas,/ALI_DEFAULT_PERSONA_ID='alex'/);
 assert.match(personas,/name:local\('Samir','Самир','Samir'\)/);
 assert.match(personas,/genie-calm-loop-poster\.webp/);
});
test('first open has exactly two choice buttons with real chat handoff',()=>{
 assert.match(landing,/data-hh-ai-goal-choice="find"/);
 assert.match(landing,/data-hh-ai-goal-choice="already"/);
 assert.match(landing,/onGoalChoice\(sceneCopy\.findPrompt\)/);
 assert.match(landing,/onGoalChoice\(sceneCopy\.havePrompt\)/);
 assert.match(chat,/onGoalChoice=\{text=>sendSelectedTurn\(text\)\}/);
 assert.match(landing,/data-hh-ai-inline-composer/);
});
test('existing persona, Free-Pro, voice, media and topic controls remain',()=>{
 for(const id of ['data-hh-ai-chat-shortcuts','data-hh-ai-persona-voice-play',
 'data-hh-alchemist-topics','data-hh-ai-video-hero'])assert.ok(landing.includes(id),id);
 for(const id of ['data-hh-ai-gemini-tier','data-hh-conversation-mic',
 'data-hh-ai-more','data-hh-ai-chat-composer'])assert.ok(chat.includes(id),id);
});
