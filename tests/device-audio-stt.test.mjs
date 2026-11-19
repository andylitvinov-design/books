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
test('device recognition preserves late phrases and rejects oversized text without truncation',()=>{
 const long=createSpeechClock(()=>1000);
 long.observe({results:[{isFinal:true,0:{transcript:'а'.repeat(751)}}]});
 assert.equal(long.finish(2),null);
 let now=0;const late=createSpeechClock(()=>now);
 now=1000;late.observe({results:[{isFinal:true,0:{transcript:'Первая фраза'}}]});
 now=1100;late.observe({results:[{isFinal:true,0:{transcript:'Первая фраза'}},
  {isFinal:true,0:{transcript:'Последняя фраза'}}]});
 const completed=late.finish(1);
 assert.equal(completed.text,'Первая фраза Последняя фраза');
 assert.equal(completed.timingSource,'estimated');
 assert.equal(completed.segments.at(-1).endSeconds,1);
 assert.ok(completed.segments[0].endSeconds<=completed.segments[1].startSeconds);
 let tick=0;const oversized=createSpeechClock(()=>tick),results=[];
 for(let index=0;index<14;index++){
  tick+=1000;results.push({isFinal:true,0:{transcript:'а'.repeat(750)}});
  oversized.observe({results});
 }
 assert.equal(oversized.finish(15),null,'the full transcript must not be cut at 10,000 characters');
});
test('repeated words in distinct final and interim results are preserved',()=>{
 let now=0;const clock=createSpeechClock(()=>now);
 now=800;clock.observe({results:[{isFinal:true,0:{transcript:'Да'}}]});
 now=1300;clock.observe({results:[{isFinal:true,0:{transcript:'Да'}},
  {isFinal:false,0:{transcript:'Да'}}]});
 const transcript=clock.finish(2);
 assert.equal(transcript.text,'Да Да');
 assert.equal(transcript.segments.length,2);
});
test('roundoff does not reject three estimated segments that exactly fit',()=>{
 const clock=createSpeechClock(()=>0);
 clock.observe({results:Array.from({length:3},()=>({isFinal:true,0:{transcript:'да'}}))});
 const result=clock.finish(.15);
 assert.equal(result.text,'да да да');
 assert.equal(result.segments.at(-1).endSeconds,.15);
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
 assert.match(video,/startDeviceVoiceCapture\(spokenAudioLanguage\)/);
 assert.match(video,/micSpeechRef\.current\?\.abort\(\)/);
 assert.match(video,/transcribeDeviceAudioFile\(entry\.file,spokenAudioLanguage,controller\.signal\)/);
 assert.match(video,/requestConsentedTimedTranscript\(\s*entry\.file,spokenAudioLanguage,true,controller\.signal\)/);
 assert.match(video,/data-video-recipient-audio-manual-text/);
 assert.match(video,/timingSource==="estimated"/);
 assert.match(messenger,/transcribeDeviceAudioFile\(file,locale,abort\.signal\)/);
 assert.match(messenger,/stageVoiceStudioHandoff\(file,transcript\)/);
 assert.match(helper,/processLocally:true/);
 assert.match(helper,/engine\.start\(track\)/);
 assert.doesNotMatch(helper,/https?:\/\//);
});
