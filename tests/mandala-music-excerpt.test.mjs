import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../lib/mandala/local-video-music.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const api={};
new Function('exports',code)(api);
const {startLayeredVideoAudio,startUploadedAudio}=api;
const sampleRate=10;
function buffer(seconds){const samples=new Float32Array(seconds*sampleRate); return {length:samples.length,duration:seconds,sampleRate,numberOfChannels:1,getChannelData(){return samples}};}
let voice=buffer(40);const music=buffer(180); let contexts=[];
class FakeContext {
 constructor(){this.state='running';this.currentTime=0;this.sources=[];this.decoded=0;contexts.push(this)}
 resume(){return Promise.resolve()} close(){return Promise.resolve()}
 decodeAudioData(){return Promise.resolve(this.decoded++===0?voice:music)}
 createBuffer(channels,length,rate){return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,copyToChannel(){}}}
 createMediaStreamDestination(){return {stream:{getAudioTracks(){return [{stop(){}}]},getTracks(){return []}}}}
 createBufferSource(){const source={connect(){},disconnect(){},stop(){},start(){}};this.sources.push(source);return source}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){},disconnect(){}}}
}
globalThis.window={AudioContext:FakeContext};
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)});
const file={name:'voice.m4a',type:'audio/mp4',size:2,arrayBuffer:async()=>new ArrayBuffer(2)};
for(const loop of [true,false]) test(`layered export preserves narration and trims only music, loop=${loop}`,async()=>{
 const session=await startLayeredVideoAudio(file,'warm-morning',80,30,{seconds:60,loop,deferStart:true});
 assert.ok(session);const sources=contexts.at(-1).sources;assert.equal(sources.length,2);assert.equal(sources[0].buffer,voice);assert.equal(sources[0].buffer.duration,40);assert.equal(sources[1].buffer.duration,30);session.close();
});

for(const loop of [true,false]) test(`uploaded source selects excerpt only when looping, loop=${loop}`,async()=>{
 const session=await startUploadedAudio(file,80,{loop,deferStart:true});
 assert.ok(session);const source=contexts.at(-1).sources[0];
 if(loop) assert.equal(source.buffer.duration,30); else assert.equal(source.buffer,voice);
 session.close();
});

test('MP3 encoder padding is tolerated only for looping music',async()=>{
 const previous=voice;voice=buffer(180.144);
 try {const musicSession=await startUploadedAudio(file,80,{loop:true,deferStart:true});assert.ok(musicSession);assert.equal(contexts.at(-1).sources[0].buffer.duration,30);musicSession.close();
 const narrationSession=await startUploadedAudio(file,80,{loop:false,deferStart:true});assert.equal(narrationSession,null);
 voice=buffer(181);assert.equal(await startUploadedAudio(file,80,{loop:true,deferStart:true}),null);
 } finally {voice=previous;}
});


test('stereo music excerpt preserves the first 30 seconds without mutating its source',()=>{
 const rate=100, frames=180*rate;
 const channels=[Float32Array.from({length:frames},(_,i)=>i/frames),Float32Array.from({length:frames},(_,i)=>1-i/frames)];
 const input={length:frames,duration:180,sampleRate:rate,numberOfChannels:2,getChannelData:i=>channels[i]};
 const context={createBuffer:(count,length,sampleRate)=>({length,duration:length/sampleRate,sampleRate,numberOfChannels:count,channels:Array.from({length:count},()=>new Float32Array(length)),copyToChannel(data,i){this.channels[i].set(data)}})};
 const result=api.clipMusicBuffer(context,input,30);
 assert.equal(result.length,3000);assert.equal(result.numberOfChannels,2);
 for(const i of [0,1,2999])for(const channel of [0,1])assert.equal(result.channels[channel][i],channels[channel][i]);
 assert.equal(channels[0].length,frames);assert.equal(api.clipMusicBuffer(context,result,30),result);
 assert.throws(()=>api.clipMusicBuffer(context,input,90),/invalid_music_excerpt/);
});
