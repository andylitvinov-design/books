import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const full = readFileSync(new URL('../components/ocean-practice-audio.ts', import.meta.url),'utf8');
const first = full.indexOf('function createOceanSoundscape(');
const last = full.indexOf('\nexport function useOceanPracticeAudio()',first);
assert.ok(first>=0&&last>first,'The shared audio hook must have a soundscape creator');

class FakeMedia {
  static last = null;
  static rejectNext = false;
  constructor(src){
    this.src=src;
    this.volume=0;
    this.muted=true;
    this.loop=false;
    this.paused=true;
    this.events=new Map();
    this.pauseCalls=0;
    this.playCalls=0;
    FakeMedia.last=this;
  }
  addEventListener(event,callback){this.events.set(event,callback);}
  removeEventListener(event,callback){if(this.events.get(event)===callback)this.events.delete(event);}
  emit(event){this.events.get(event)?.();}
  play(){
    this.playCalls++;
    if(FakeMedia.rejectNext){FakeMedia.rejectNext=false;return Promise.reject(new Error('NotAllowedError'));}
    this.paused=false;
    this.emit('playing');
    return Promise.resolve();
  }
  pause(){this.pauseCalls++;this.paused=true;this.emit('pause');}
  removeAttribute(name){if(name==='src')this.src='';}
  load(){}
}

const snippet = 'const OCEAN_LOOP = "/audio/holistic-house-soft-melody-gentle-waves-96s.wav";\n'
  + full.slice(first,last);
const compiled = ts.transpileModule(snippet, {compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None
}}).outputText;
const create = runInNewContext(compiled+'\ncreateOceanSoundscape',
  {window:{Audio:FakeMedia},Promise,Map,Error});

function fixture(){
  const states=[];
  const sound=create(value=>states.push(value));
  assert.ok(sound);
  const media=FakeMedia.last;
  return {sound,media,states};
}

test('one tap starts native, looped and unmuted sound before the timer may begin',async()=>{
  const {sound,media,states}=fixture();
  assert.match(media.src,/holistic-house-soft-melody-gentle-waves-20s\.wav$/);
  assert.equal(media.loop,true);
  assert.equal(media.muted,false);
  assert.equal(media.volume,0.65);
  assert.equal(await sound.play(),true);
  assert.equal(media.playCalls,1);
  assert.equal(states.at(-1),'playing');
  sound.dispose();
  assert.equal(media.paused,true);
  assert.equal(media.src,'');
});

test('an iPhone audio playback rejection is visible instead of reporting success',async()=>{
  const {sound,media,states}=fixture();
  FakeMedia.rejectNext=true;
  assert.equal(await sound.play(),false);
  assert.equal(media.playCalls,1);
  assert.equal(states.at(-1),'blocked');
  assert.equal(await sound.play(),true,'The user may retry explicitly');
  assert.equal(states.at(-1),'playing');
  sound.dispose();
});

test('mid-practice buffering blocks and stops sound until another explicit click',async()=>{
  const {sound,media,states}=fixture();
  await sound.play();
  media.emit('waiting');
  assert.equal(states.at(-1),'blocked');
  assert.equal(media.paused,true,'No orphaned playback with a frozen visual timer');
  assert.equal(await sound.play(),true);
  assert.equal(states.at(-1),'playing');
  sound.pause();
  assert.equal(states.at(-1),'paused','Expected user pause is not an error');
  sound.reset();
  assert.equal(states.at(-1),'paused');
  sound.dispose();
});

test('the optional wave toggle cannot freeze a clock just because new media is loading',()=>{
  for(const file of [
    'components/app/opora-ocean-outro.jsx',
    'components/app/course-guided-timer.jsx',
    'components/energywork-ai-learner.tsx',
  ]){
    const code=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.match(code,/await (audio|ocean)\.play\(\)/);
    assert.match(code,/['"]blocked['"],\s*['"]paused['"]/);
    assert.doesNotMatch(code,/['"]loading['"],\s*['"]blocked['"],\s*['"]paused['"]/);
  }
});
