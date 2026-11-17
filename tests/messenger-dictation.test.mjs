import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {speechResultSegments,appendSpokenAnswer} from '../lib/personal-coaching/speech-text.js';

const chat=readFileSync('components/holistic-agent-chat.tsx','utf8');
const voice=readFileSync('components/app/messenger-dictation-button.jsx','utf8');
const css=readFileSync('components/holistic-agent-chat.module.css','utf8');

test('AI Messenger text dictation is available independently of voice conversation feature flag',()=>{
  assert.match(chat,/messengerView&&!pageHelp&&<MessengerDictationButton/);
  assert.doesNotMatch(chat,/messengerView&&!pageHelp&&voiceEnabled&&<button/);
  assert.match(voice,/window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
  assert.match(voice,/capture\.continuous=true/);
  assert.match(voice,/capture\.interimResults=true/);
  assert.match(voice,/capture\.lang=locale==='ru'\?'ru-RU':locale==='es'\?'es-ES':'en-US'/);
  assert.match(voice,/window\.confirm\(t\.notice\)/);
  assert.match(voice,/captureRef\.current=null/);
  assert.doesNotMatch(voice,/fetch\(|MediaRecorder|localStorage|sessionStorage/);
});

test('final words append once to the editable existing draft, never auto-send',()=>{
  const input=[{isFinal:true,0:{transcript:'Hello there'}}];
  const first=speechResultSegments(input,'');
  assert.equal(first.delta,'Hello there');
  assert.equal(speechResultSegments(input,first.final).delta,'');
  assert.equal(appendSpokenAnswer('Previously typed',first.delta,2000),'Previously typed Hello there');
  assert.equal(appendSpokenAnswer('', '  привет мир  ',160),'привет мир');
  assert.ok(!voice.includes('sendTurn('));
});

test('welcome composer is a horizontal flex row with mic and send touch targets',()=>{
  assert.match(css,/Welcome and ongoing Messenger composers share one iPhone-sized input row/);
  assert.match(css,/display:flex;align-items:center;flex-wrap:nowrap/);
  assert.match(css,/\.form \.actions>button\[type="submit"\]/);
  assert.match(css,/width:44px;min-width:44px;height:44px;min-height:44px/);
});
