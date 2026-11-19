import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const chat=read('components/holistic-agent-chat.tsx');
const chatCSS=read('components/holistic-agent-chat.module.css');
const note=read('components/app/messenger-voice-note.tsx');
const noteCSS=read('components/app/messenger-voice-note.module.css');
const audioRoute=read('app/api/holistic-support/audio-storyboard/route.js');

test('the AI Messenger microphone records independently of voice-companion consent',()=>{
  assert.match(chat,/messengerView&&!pageHelp&&<MessengerVoiceNote/);
  assert.doesNotMatch(chat,/data-hh-conversation-mic/);
  assert.match(note,/getUserMedia/);
  assert.match(note,/new MediaRecorder\(/);
  assert.match(note,/recorder\.start\(300\)/);
  assert.match(note,/recorder\.stop\(\)/);
  assert.match(note,/data-hh-voice-note-mic/);
  assert.match(note,/onBegin\?\.\(\)/);
});

test('recorded note can be reviewed, discarded, and sent through existing consented STT bridge',()=>{
  assert.match(note,/<audio controls preload="metadata"/);
  assert.match(note,/data-hh-voice-note-send/);
  assert.match(note,/\/api\/holistic-support\/audio-storyboard/);
  assert.match(note,/body\.append\("consent","yes"\)/);
  assert.match(audioRoute,/requireSameOrigin\(request,config\)/);
  assert.match(audioRoute,/form\.get\("consent"\)!=="yes"/);
  assert.match(audioRoute,/MAX_AUDIO_BYTES=4\*1024\*1024/);
  assert.match(note,/LIMIT_SECONDS = 59/);
  assert.match(note,/URL\.revokeObjectURL/);
  assert.match(note,/stopTracks\(streamRef\.current\)/);
  assert.match(note,/abortRef\.current\?\.abort\(\)/);
});

test('recognized voice is sent to the existing dialogue and playable locally without nested paragraphs',()=>{
  assert.match(chat,/void sendTurn\(text,null,\{url,seconds\}\)/);
  assert.match(chat,/voiceNoteUrl\?:string/);
  assert.match(chat,/data-hh-sent-voice-message/);
  assert.match(chat,/<div key=\{index\} data-hh-chat-turn=\{m\.role\}/);
  assert.match(chat,/<div className=\{styles\.voiceNoteMessage\}/);
  assert.match(chat,/localVoiceUrls\.current\.add\(url\)/);
  assert.ok(chat.indexOf('const [messages,setMessages]')<chat.indexOf('const localVoiceUrls'),
    'message state must be initialized before message-dependent effects');
});

test('rating stays one compact row, retaining its no-text analytics contract',()=>{
  assert.match(chat,/data-hh-compact-reply-rating/);
  assert.match(chat,/data-hh-quality-positive/);
  assert.match(chat,/data-hh-quality-negative/);
  assert.match(chat,/body:JSON\.stringify\(\{channel,locale,signal,consent:true\}\)/);
  assert.match(chatCSS,/width:32px;height:32px;min-width:32px;min-height:32px/);
  assert.match(chatCSS,/flex-wrap:nowrap/);
  assert.match(noteCSS,/width:min\(324px,calc\(100vw - 30px\)\)/);
});
