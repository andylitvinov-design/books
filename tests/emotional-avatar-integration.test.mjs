import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('avatar mounts in actual HolisticAgentChat without second data path',()=>{
  const chat=read('components/holistic-agent-chat.tsx');
  const avatar=read('components/app/emotional-avatar.tsx');
  assert.match(chat,/import EmotionalAvatar from ['"]@\/components\/app\/emotional-avatar['"]/);
  assert.match(chat,/<EmotionalAvatar\s+messages=\{messages\}\s+busy=\{busy\}\s+status=\{status\}\s+locale=\{locale\}\s+compact=\{compact\}/);
  assert.match(chat,/data-page-help=\{pageHelp\?/);
  assert.match(chat,/if\(compact&&!authenticated&&mode==="rules"\)/);
  assert.match(chat,/if\(compact&&videoStep\)/);
  assert.match(chat,/selectPageHelpAction/);
  assert.match(chat,/setMessages\(prev=>\[\.\.\.prev/);
  assert.doesNotMatch(avatar,/\bfetch\s*\(|getUserMedia|MediaRecorder|localStorage|sessionStorage|sendBeacon|createClient/);
  assert.match(avatar,/classifyAvatarEmotion/);
  assert.match(avatar,/createDeviceSpeech/);
});
test('voice requires a user click and state only changes on real utterance callbacks',()=>{
  const avatar=read('components/app/emotional-avatar.tsx');
  const speech=read('lib/assistant-avatar/device-speech.mjs');
  assert.match(avatar,/onClick=\{toggleVoice\}/);
  assert.match(avatar,/onStart:\(\)=>\{/);
  assert.match(avatar,/onEnd:reason=>\{/);
  assert.match(speech,/item\.onstart=/);
  assert.match(speech,/item\.onend=/);
  assert.doesNotMatch(speech,/\bfetch\s*\(|WebSocket|microphone|recording/);
});
