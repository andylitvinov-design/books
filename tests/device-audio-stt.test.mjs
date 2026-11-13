import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpeechClock,startDeviceVoiceCapture,transcribeDeviceAudioFile} from '../lib/mandala/device-audio-stt.mjs';

test('event-clock speech segments are not fabricated and have estimated timing',()=>{
 let now=0;const clock=createSpeechClock(()=>now);
 now=1000;clock.observe({results:[{isFinal:true,0:{transcript:'Привет'}}]});
 now=1100;clock.observe({results:[{isFinal:true,0:{transcript:'Привет'}}]});
 now=2200;clock.observe({results:[{isFinal:true,0:{transcript:'Привет'}},{isFinal:false,0:{transcript:'мир'}}]});
 const result=clock.finish(3);
 assert.equal(result.text,'Привет мир');
 assert.equal(result.segments.length,2);
 assert.equal(result.segments[0].endSeconds,1);
 assert.equal(result.timingSource,'estimated');
});
test('without an actual speech result no transcript can be inferred',()=>{
 const clock=createSpeechClock(()=>0);
 assert.equal(clock.finish(9),null);
 assert.equal(clock.finish(0),null);
});
test('unsupported device refuses uploaded file recognition without microphone capture',async()=>{
 assert.equal(startDeviceVoiceCapture('ru'),null);
 await assert.rejects(transcribeDeviceAudioFile(new Blob(['x']),'ru',new AbortController().signal),
   /DEVICE_FILE_STT_UNSUPPORTED/);
});
test('video and messenger have the local-first, consented fallback, privacy and no fabricated clock',()=>{
 const video=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
 const messenger=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
 const helper=readFileSync(new URL('../lib/mandala/device-audio-stt.mjs',import.meta.url),'utf8');
 assert.match(video,/startDeviceVoiceCapture\(locale\)/);
 assert.match(video,/micSpeechRef\.current\?\.abort\(\)/);
 assert.match(video,/transcribeDeviceAudioFile\(entry\.file,locale,controller\.signal\)/);
 assert.match(video,/requestConsentedTimedTranscript\(entry\.file,locale,true,controller\.signal\)/);
 assert.match(video,/data-video-recipient-audio-manual-text/);
 assert.match(video,/timingSource==="estimated"/);
 assert.match(messenger,/transcribeDeviceAudioFile\(file,locale,abort\.signal\)/);
 assert.match(messenger,/stageVoiceStudioHandoff\(file,transcript\)/);
 assert.match(helper,/processLocally:true/);
 assert.match(helper,/engine\.start\(track\)/);
 assert.doesNotMatch(helper,/https?:\/\//);
});
