import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {CAESAR_APPROVED_PRESENTATION,validateCaesarPresentation,caesarPresentation,caesarVideoMetadataMatches,startCaesarGreetingVideo} from '../lib/coaching/caesar-greeting-video.mjs'
const hash='a'.repeat(64),root='/images/holistic-house/my-coach-motion/'
const clip=(key,duration,audio)=>({src:root+'caesar-'+key+'-v1.mp4',width:1080,height:1920,duration,audio,sha256:hash,anchorSha256:hash})
const fixture=()=>({provider:'simli',faceId:'efcb440b-6a24-4e79-a46a-764c1d4b751d',rightsVerified:true,visualQaVerified:true,nativeResolution:true,anchorSha256:hash,poster:root+'caesar-anchor-v1.webp',posterSha256:hash,neutral:clip('neutral',5,false),en:clip('greeting-en',21.3,true),ru:clip('greeting-ru',22.1,true)})
class Media extends EventTarget {
 constructor(){super();this.videoWidth=1080;this.videoHeight=1920;this.duration=21.3;this.currentTime=0;this.ended=false;this.paused=true;this.plays=0}
 play(){this.plays++;this.paused=false;return Promise.resolve()}
 pause(){this.paused=true}
 removeAttribute(n){delete this[n]}
 load(){}
 emit(n){this.dispatchEvent(new Event(n))}
}
test('missing manifest or another coach never selects Caesar media',()=>{assert.equal(caesarPresentation('caesar','ru',null),null);assert.equal(caesarPresentation('mira','en',fixture()),null)})
test('approved manifest selects exact locale, Spanish never uses wrong voice',()=>{const m=fixture();assert.equal(caesarPresentation('caesar','ru',m).greeting,m.ru);assert.equal(caesarPresentation('caesar','en',m).greeting,m.en);assert.equal(caesarPresentation('caesar','es',m).greeting,null);assert.equal(caesarPresentation('caesar','es',m).neutral,m.neutral)})
test('reject unapproved, foreign, low resolution, bad anchor, silent greeting and wrong neutral duration',()=>{for(const mutate of [m=>{m.rightsVerified=false},m=>{m.visualQaVerified=false},m=>{m.nativeResolution=false},m=>{m.en.src='https://example.com/caesar-greeting-en-v1.mp4'},m=>{m.ru.width=1024},m=>{m.en.anchorSha256='b'.repeat(64)},m=>{m.en.audio=false},m=>{m.neutral.duration=6},m=>{m.faceId='other'},m=>{m.en.height=1440}]){const m=fixture();mutate(m);assert.equal(validateCaesarPresentation(m),null)}})
test('real video metadata must agree with approved native dimensions and timing',()=>{const c=fixture().en;const v=new Media();assert.equal(caesarVideoMetadataMatches(v,c),true);v.duration=1;assert.equal(caesarVideoMetadataMatches(v,c),false);v.duration=21.3;v.videoWidth=1024;assert.equal(caesarVideoMetadataMatches(v,c),false)})
test('one media owns audio, pause/resume, mute, seek and completion',()=>{const v=new Media(),events=[];const p=startCaesarGreetingVideo(v,fixture().en,{onStart:()=>events.push('start'),onEnd:()=>events.push('end'),onError:()=>events.push('error')});assert.equal(p.audio,v);assert.equal(v.plays,1);assert.equal(v.src,fixture().en.src);v.emit('loadedmetadata');v.emit('playing');p.setMuted(true);assert.equal(v.muted,true);p.audio.pause();p.audio.currentTime=10;p.audio.play();v.emit('playing');v.ended=true;v.emit('ended');assert.deepEqual(events,['start','end']);assert.equal(v.src,undefined);assert.equal(v.paused,true)})
test('cancel invalidates late callbacks and replay uses a new single controller',()=>{const v=new Media();let starts=0;const p=startCaesarGreetingVideo(v,fixture().en,{onStart:()=>starts++});p.cancel();v.emit('playing');assert.equal(starts,0);const next=startCaesarGreetingVideo(v,fixture().en,{onStart:()=>starts++});v.emit('playing');assert.equal(starts,1);next.cancel()})
test('bad metadata fails closed before start; no automatic audio fallback',()=>{const v=new Media();v.videoWidth=1024;let errors=0;let starts=0;startCaesarGreetingVideo(v,fixture().en,{onError:()=>errors++,onStart:()=>starts++});v.emit('loadedmetadata');v.emit('playing');assert.equal(errors,1);assert.equal(starts,0);assert.equal(v.src,undefined)})
test('a future release manifest requires actual matching committed media bytes',()=>{if(CAESAR_APPROVED_PRESENTATION===null)return;const m=validateCaesarPresentation(CAESAR_APPROVED_PRESENTATION);assert.ok(m);for(const [path,sha] of [[m.poster,m.posterSha256],...[m.neutral,m.en,m.ru].map(c=>[c.src,c.sha256])]){const bytes=readFileSync(new URL('../public'+path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha)}})
