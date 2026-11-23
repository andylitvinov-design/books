import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const scene=readFileSync('components/app/messenger-ai-landing.module.css','utf8');
const chat=readFileSync('components/holistic-agent-chat.module.css','utf8');
test('Samir first viewport has one non-overlapping scene, goal choices, and menu',()=>{
 for(const s of ['Samir iPhone first-screen fix','height:100%;min-height:0',
  'flex:1 1 auto;height:auto;min-height:0','position:relative;bottom:auto;flex:none',
  'extraDirections{position:absolute','max-height:min(59dvh,490px)',
  '@media(max-height:740px) and (max-width:760px)'])assert.ok(scene.includes(s),s);
});
test('initial input remains 16px, consent remains legible, plus menu opens above dock',()=>{
 for(const s of ['Samir one-viewport composer','not([data-gemini-pending="true"]):not([data-voice-onboarding="true"])',
  'height:42px;min-height:42px;max-height:72px','height:44px;min-height:44px',
  'bottom:calc(100% + 9px)'])assert.ok(chat.includes(s),s);
});
