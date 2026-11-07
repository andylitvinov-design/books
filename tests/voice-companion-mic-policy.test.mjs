import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('mic stays denied globally and only approved pages have a same-origin exception',()=>{
 const config=read('next.config.ts');
 assert.match(config,/microphone=\(\), geolocation=\(\)/);
 assert.match(config,/microphone=\(self\), geolocation=\(\)/);
 assert.match(config,/const (?:liveAudioHostSources|messengerMicrophoneSources)\s*=/);
 for(const locale of ['ru','en','es'])assert.ok(config.includes('"/'+locale+'/app/messages"'));
 const controls=read('components/voice-companion-controls.tsx');
 assert.match(controls,/micPolicy\.allowsFeature\('microphone'\)/);
 assert.match(controls,/setRecognitionSupported\(microphoneAllowed&&Boolean/);
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(chat,/onTranscript=\{text=>setDraft/);
});
