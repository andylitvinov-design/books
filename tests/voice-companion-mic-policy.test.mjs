import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mic stays denied globally and is allowed only on existing Messenger documents',()=>{
 const config=read('next.config.ts');
 assert.match(config,/microphone=\(\), geolocation=\(\)/);
 assert.match(config,/const messengerMicrophoneSources = \["\/ru\/app\/messages", "\/en\/app\/messages", "\/es\/app\/messages"\]/);
 assert.match(config,/\.\.\.messengerMicrophoneSources\.map\(\(source\) => \(\{/);
 assert.doesNotMatch(config,/messengerMicrophoneSources\s*=\s*\[[^\]]*:\s*path\*/);
 const controls=read('components/voice-companion-controls.tsx');
 assert.match(controls,/micPolicy\.allowsFeature\('microphone'\)/);
 assert.match(controls,/setRecognitionSupported\(microphoneAllowed&&Boolean/);
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(chat,/onTranscript=\{text=>setDraft/);
});
