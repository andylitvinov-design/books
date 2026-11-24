import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mp3FrameHeader,Mp3FrameStream,coachingWebCodecsOptIn,startProgressiveMp3WebCodecs} from '../lib/personal-coaching/streamed-mp3-webcodecs.mjs'
const frame=()=>{const b=new Uint8Array(417);b.set([255,251,144,100]);return b}
const segment=count=>{const buf=new Uint8Array(417*count);for(let i=0;i<count;i++)buf.set(frame(),417*i);return buf}
function fakeContext(){const sources=[];const context={state:'running',currentTime:2,destination:{},sources,
createBuffer:(channels,frames,rate)=>{const pcm=Array.from({length:channels},()=>new Float32Array(frames));return {duration:frames/rate,getChannelData:c=>pcm[c] }},
createBufferSource(){const s={buffer:null,onended:null,connect(){},disconnect(){},start(when){this.when=when;sources.push(s)},stop(){this.stopped=true}};return s}};return context}
function browser(supported=true){let created=0,decoded=0;class Decoder{
 static async isConfigSupported(){return {supported}}
 constructor({output,error}){this.output=output;this.error=error;this.decodeQueueSize=0;created++}
 configure(c){assert.equal(c.codec,'mp3')}
 decode(frame){decoded++;this.output({numberOfChannels:2,numberOfFrames:1152,sampleRate:44100,copyTo:arr=>arr.fill(.2),close(){}})}
 async flush(){}
 close(){}
}
class AudioChunk{constructor(o){Object.assign(this,o)}}
return {w:{AudioDecoder:Decoder,EncodedAudioChunk:AudioChunk,Blob,location:{search:'?coachStream=1'}},get created(){return created},get decoded(){return decoded}}}

test('incremental MPEG1 frame parsing reassembles chunk boundaries without duplicate frames',()=>{
 const first=frame();assert.deepEqual(mp3FrameHeader(first),{frameLength:417,sampleRate:44100,channels:2,samples:1152});
 const parser=new Mp3FrameStream();assert.equal(parser.push(first.slice(0,23)).length,0);
 assert.equal(parser.push(first.slice(23,400)).length,0);assert.equal(parser.push(first.slice(400)).length,1);
 assert.equal(parser.push(first).length,1);assert.equal(parser.frames,2);assert.equal(parser.validEnd(),true);
 const invalid=first.slice(); invalid[1]=0;assert.equal(mp3FrameHeader(invalid),null)
})
test('ID3 header is skipped before the first audio frame',()=>{
 const tag=new Uint8Array(20);tag.set([73,68,51,4,0,0,0,0,0,10]);
 const parser=new Mp3FrameStream();assert.equal(parser.push(tag.slice(0,12)).length,0)
 const stream=new Uint8Array(417*2+8);stream.set(tag.slice(12),0);stream.set(frame(),8);stream.set(frame(),425)
 assert.equal(parser.push(stream).length,2);assert.equal(parser.validEnd(),true)
})
test('opt-in only and no decoder fallback by default',()=>{
 const w=browser().w; assert.equal(coachingWebCodecsOptIn(w),true)
 w.location.search='?coachStream=0';assert.equal(coachingWebCodecsOptIn(w),false)
 delete w.AudioDecoder;assert.equal(coachingWebCodecsOptIn(w),false)
})
test('schedules decoded PCM before MP3 HTTP stream finishes, then ends exactly once',async()=>{
 const b=browser(),ctx=fakeContext(),calls={start:0,end:0,error:0};let releaseTail
 let step=0;const response={body:{getReader(){return {
  async read(){step++;if(step===1)return {done:false,value:segment(8)};
   if(step===2)return await new Promise(resolve=>releaseTail=resolve)
   return {done:true}},
  cancel:async()=>{},releaseLock(){} }}},blob:async()=>new Blob([segment(8)],{type:'audio/mpeg'})};
 const player=startProgressiveMp3WebCodecs(response,{environment:b.w,audioContext:ctx,onStart:()=>calls.start++,onEnd:()=>calls.end++,onError:()=>calls.error++})
 for(let i=0;i<20&&!releaseTail;i++)await new Promise(resolve=>setImmediate(resolve))
 assert.equal(calls.start,1,'PCM playback begins before final network bytes')
 assert.equal(calls.end,0);assert.equal(ctx.sources.length,8)
 assert.equal(b.decoded,8)
 releaseTail({done:true})
 assert.equal((await player.run).streaming,true)
 assert.equal(calls.end,0)
 for(const s of [...ctx.sources])s.onended?.()
 assert.equal(calls.end,1);assert.equal(calls.error,0)
 player.cancel();assert.equal(calls.end,1)
})
test('unsupported codec safely uses the SAME already-returned full MP3 without another fetch',async()=>{
 const b=browser(false),ctx=fakeContext();let blobCalls=0
 const response={body:{getReader(){throw Error('should not lock body')}},blob:async()=>{blobCalls++;return new Blob([segment(2)])}}
 const player=startProgressiveMp3WebCodecs(response,{environment:b.w,audioContext:ctx})
 const result=await player.run;assert.equal(result.fallback,true);assert.equal(blobCalls,1);assert.equal(result.blob.size,834)
 assert.equal(b.created,0)
})
test('cancel stops scheduled audio nodes, does not generate new audio, and prevents completion',async()=>{
 const b=browser(),ctx=fakeContext();let finish=0;let release
 let step=0;const response={body:{getReader(){return {
 async read(){step++;if(step===1)return{done:false,value:segment(7)};return await new Promise(r=>release=r)},
 cancel:async()=>{release?.({done:true})},releaseLock(){}
 }}},blob:async()=>new Blob([segment(7)])}
 const player=startProgressiveMp3WebCodecs(response,{environment:b.w,audioContext:ctx,onEnd:()=>finish++})
 for(let i=0;i<20&&ctx.sources.length===0;i++)await new Promise(r=>setImmediate(r))
 assert.ok(ctx.sources.length>0)
 player.cancel()
 for(const s of ctx.sources){assert.equal(s.stopped,true);s.onended?.()}
 assert.equal(finish,0)
 await player.run
})

test('original one-Play player gates codec to explicit URL and keeps abortable full-MP3 fallback',()=>{
 const player=readFileSync(new URL('../lib/personal-coaching/streamed-mp3-playback.mjs',import.meta.url),'utf8')
 assert.match(player,/if\(audioContext&&isMp3SpeechResponse\(response\)&&coachingWebCodecsOptIn\(w\)&&response\.body\?\.getReader\)/)
 assert.match(player,/const isMp3SpeechResponse=response=>/)
 assert.match(player,/\.startsWith\('audio\/mpeg'\)/,'WAV must never reach MP3 WebCodecs on iOS')
 assert.match(player,/progressivePlayer\?\.cancel\(\)/)
 assert.match(player,/if\(outcome\?\.fallback&&isActive\(\)\)await playDownloaded\(outcome\.blob\)/)
 assert.equal((player.match(/startProgressiveMp3WebCodecs\(response/g)||[]).length,1)
 assert.match(player,/if\(audioContext&&typeof response\.blob==='function'\)/,'default buffered iPhone path remains')
})
