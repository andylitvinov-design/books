import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAvatarState,reduceAvatar} from '../lib/assistant-avatar/avatar-machine.mjs';
import {createDeviceSpeech} from '../lib/assistant-avatar/device-speech.mjs';

const run=(state,...events)=>events.reduce(reduceAvatar,state);
test('open, react, think, answer, read aloud, end',()=>{
  let state=run(initialAvatarState(),
    {type:'TURN_START',turnId:1,emotion:'concerned',intensity:1},
    {type:'THINKING',turnId:1});
  assert.equal(state.phase,'thinking');
  assert.equal(state.emotion,'concerned');
  state=run(state,{type:'TURN_DONE',turnId:1},{type:'SPEECH_START',turnId:1,speechId:2});
  assert.equal(state.phase,'speaking');
  assert.equal(state.speaking,true);
  state=run(state,{type:'SPEECH_END',turnId:1,speechId:2});
  assert.equal(state.phase,'idle');
  assert.equal(state.speaking,false);
});
test('stale network or speech callbacks cannot mutate a newer turn',()=>{
  const state=run(initialAvatarState(),
    {type:'TURN_START',turnId:1,emotion:'warm',intensity:1},
    {type:'TURN_START',turnId:2,emotion:'attentive',intensity:1},
    {type:'THINKING',turnId:2});
  assert.deepEqual(run(state,
    {type:'TURN_ERROR',turnId:1},
    {type:'TURN_DONE',turnId:1},
    {type:'SPEECH_START',turnId:1,speechId:200}),state);
  const speaking=run(state,{type:'SPEECH_START',turnId:2,speechId:3});
  assert.deepEqual(reduceAvatar(speaking,{type:'SPEECH_END',turnId:2,speechId:2}),speaking);
  assert.equal(run(speaking,{type:'SPEECH_END',turnId:2,speechId:3}).phase,'idle');
});
test('reset, hide, show, locale and errors stay safe',()=>{
  let state=run(initialAvatarState(false),{type:'TURN_START',turnId:1,emotion:'warm',intensity:1},
    {type:'TURN_ERROR',turnId:1});
  assert.equal(state.phase,'error');assert.equal(state.emotion,'neutral');
  state=run(state,{type:'HIDE'},{type:'SPEECH_START',turnId:1,speechId:999});
  assert.equal(state.phase,'hidden');assert.equal(state.speaking,false);
  state=run(state,{type:'SHOW'},{type:'RESET',turnId:2});
  assert.equal(state.phase,'idle');assert.equal(state.compact,false);
  assert.equal(state.emotion,'neutral');
  assert.deepEqual(reduceAvatar(state,{type:'RESET',turnId:1}),state);
  state=run(state,{type:'LOCALE_CHANGE'});
  assert.equal(state.phase,'idle');
});
function fakeVoice(){
  let events={};
  class Utterance{constructor(text){this.text=text;}}
  const synth={speaking:false,pending:false,queue:[],cancelCount:0,
    getVoices(){return [{lang:'ru-RU',localService:true,name:'System RU'}];},
    addEventListener(name,cb){events[name]=cb;},removeEventListener(name){delete events[name];},
    speak(item){this.queue.push(item);},cancel(){this.cancelCount++;this.speaking=false;}};
  const environment={SpeechSynthesisUtterance:Utterance,speechSynthesis:synth,
    setTimeout(){return 1;},clearTimeout(){}};
  return {environment,synth,events};
}
test('device speech is opt-in, no speaking animation until onstart',()=>{
  const {environment,synth}=fakeVoice(),speech=createDeviceSpeech(()=>environment),events=[];
  assert.equal(speech.available(),true);
  const started=speech.speak('Тест','ru',{onStart:id=>events.push('start:'+id),onEnd:r=>events.push('end:'+r)});
  assert.equal(started.ok,true);
  assert.deepEqual(events,[]);
  synth.speaking=true;synth.queue[0].onstart();
  assert.deepEqual(events,[`start:${started.id}`]);
  synth.speaking=false;synth.queue[0].onend();
  assert.deepEqual(events,[`start:${started.id}`,'end:ended']);
  assert.equal(synth.cancelCount,0);
  speech.destroy();
});
test('stopping unstarted speech never cancels unrelated audio',()=>{
  const {environment,synth}=fakeVoice(),speech=createDeviceSpeech(()=>environment),events=[];
  speech.speak('Test','en',{onStart:()=>events.push('started'),onEnd:r=>events.push(r)});
  speech.stop();
  synth.queue[0].onstart();synth.queue[0].onend();
  assert.deepEqual(events,['cancelled']);
  assert.equal(synth.cancelCount,0);
});
test('later utterances and completed errors ignore stale callbacks',()=>{
  const {environment,synth}=fakeVoice(),speech=createDeviceSpeech(()=>environment),events=[];
  const first=speech.speak('one','en',{onStart:()=>events.push('a'),onEnd:r=>events.push('a:'+r)});
  synth.speaking=true;synth.queue[0].onstart();speech.stop();
  const second=speech.speak('two','en',{onStart:()=>events.push('b'),onEnd:r=>events.push('b:'+r)});
  assert.equal(first.ok,true);assert.equal(second.ok,true);
  synth.queue[0].onerror();
  synth.speaking=true;synth.queue[1].onstart();synth.speaking=false;synth.queue[1].onend();
  assert.deepEqual(events,['a','a:cancelled','b','b:ended']);
  assert.equal(synth.cancelCount,1);
});
test('unavailable TTS, busy other audio and voiceschanged leave chat usable',()=>{
  const missing=createDeviceSpeech(()=>({}));
  assert.equal(missing.available(),false);
  assert.equal(missing.speak('hello','en').ok,false);
  const {environment,synth,events}=fakeVoice(),speech=createDeviceSpeech(()=>environment);
  let changes=0;const unwatch=speech.watchVoices(voices=>{changes++;assert.equal(voices.length,1);});
  events.voiceschanged();unwatch();assert.equal(changes,2);
  synth.speaking=true;
  assert.deepEqual(speech.speak('hello','en').reason,'busy');
  assert.equal(synth.cancelCount,0);
  speech.destroy();
});

test('queued local audio is cancelled only if no other module is speaking',()=>{
  const {environment,synth}=fakeVoice(),speech=createDeviceSpeech(()=>environment);
  speech.speak('Queued audio','en');
  synth.pending=true;
  speech.stop();
  assert.equal(synth.cancelCount,1);
  speech.destroy();
});
