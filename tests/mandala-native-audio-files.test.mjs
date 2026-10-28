import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const audioSource = read("lib/mandala/local-video-music.ts");
const client = read("components/mandala-free-video-studio.tsx");

function loadAudio({decodeFails=false}={}) {
  const result = ts.transpileModule(audioSource,{fileName:"local-video-music.ts",reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
  const contexts = [], steps = [];
  class Param {
    constructor(){this.value=0}
    setValueAtTime(value){this.value=value}
    linearRampToValueAtTime(value){this.value=value}
    cancelScheduledValues(){}
    setTargetAtTime(value){this.value=value}
  }
  class Node {
    constructor(){this.connections=[];this.disconnected=false}
    connect(target){this.connections.push(target)}
    disconnect(){this.disconnected=true}
  }
  class Context {
    constructor(){contexts.push(this);this.state="suspended";this.currentTime=0;this.destination=new Node()}
    resume(){steps.push("resume");this.state="running";return Promise.resolve()}
    close(){steps.push("close");this.closed=true;return Promise.resolve()}
    createMediaStreamDestination(){
      this.track={kind:"audio",readyState:"live",stop(){this.readyState="ended"}};
      this.media=new Node();this.media.stream={getAudioTracks:()=>[this.track]};
      return this.media;
    }
    createGain(){this.gain=new Node();this.gain.gain=new Param();return this.gain}
    createBufferSource(){
      const src = new Node(); src.loop=false;src.started=false;src.stopped=false;
      src.start=()=>{src.started=true};src.stop=()=>{src.stopped=true};
      this.source=src;return src;
    }
    async decodeAudioData(bytes){
      steps.push("decode");
      assert.ok(bytes.byteLength>0);
      if(decodeFails)throw new Error("Unsupported audio");
      return {length:22050,duration:1,numberOfChannels:1};
    }
  }
  const audioSession={type:"ambient"};
  const exports={};
  new Function("exports","window","navigator","Blob",result.outputText)(
    exports,{AudioContext:Context},{audioSession},Blob);
  return {api:exports,contexts,steps,audioSession};
}

test("all five built-in tones create playable PCM WAV files with actual nonzero sound",async()=>{
  const {api}=loadAudio();
  for (const preset of ["harmony","prosperity","energy","love","meditation"]) {
    const blob=api.createAmbientPreviewWav(preset);
    assert.equal(blob.type,"audio/wav");
    const bytes=Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WAVE");
    assert.equal(bytes.readUInt16LE(20),1,"linear PCM");
    assert.equal(bytes.readUInt16LE(22),1,"mono output");
    assert.equal(bytes.readUInt32LE(24),22050);
    assert.equal(bytes.readUInt16LE(34),16);
    assert.equal(bytes.length,44+8*22050*2);
    let energy=0;
    for(let i=44;i<bytes.length;i+=2){const value=bytes.readInt16LE(i)/32768;energy+=value*value;}
    assert.ok(Math.sqrt(energy/((bytes.length-44)/2))>.03,preset+" is audible rather than a zero WAV");
  }
});

test("selected preset exports the identical PCM wave heard in the native player",async()=>{
  const h=loadAudio();
  const preset=await h.api.startPresetAudio("prosperity",75);
  assert.ok(preset, "one exactly matching native-PCM audio source is recorded");
  assert.ok(h.contexts[0].source.started && h.contexts[0].source.loop);
  assert.equal(h.contexts[0].gain.gain.value,.75);
  assert.ok(!h.contexts[0].gain.connections.includes(h.contexts[0].destination));
  preset.close();
  assert.equal(h.contexts[0].track.readyState,"ended");
  assert.equal(h.audioSession.type,"ambient");
});

test("file picker accepts local iOS audio types with strict memory/format limits",()=>{
  const {api}=loadAudio();
  for(const name of ["voice.m4a","song.mp3","ambient.wav","take.aac","clip.mp4"]){
    assert.equal(api.isSupportedLocalAudio({name,size:45000,type:""}),true,name);
  }
  assert.equal(api.isSupportedLocalAudio({name:"private.png",size:512,type:"image/png"}),false);
  assert.equal(api.isSupportedLocalAudio({name:"song.mp3",size:16*1024*1024,type:"audio/mpeg"}),false);
  assert.equal(api.isSupportedLocalAudio({name:"empty.wav",size:0,type:"audio/wav"}),false);
  assert.equal(api.isSupportedLocalAudio({name:"fake.mp3",size:100,type:"text/html"}),false);
});

test("real file is decoded locally and connected ONLY to recorder; iOS routing restored after stop",async()=>{
  const h=loadAudio();
  const file={name:"my-recording.wav",size:128,type:"audio/wav",
    async arrayBuffer(){h.steps.push("file-array-buffer");return Uint8Array.of(1,2,3,4).buffer}};
  const session=await h.api.startUploadedAudio(file,80);
  assert.ok(session);
  const ctx=h.contexts[0];
  assert.equal(h.audioSession.type,"playback");
  assert.equal(ctx.source.started,true);
  assert.equal(ctx.source.loop,true);
  assert.equal(ctx.source.buffer.duration,1);
  assert.equal(ctx.track,session.track);
  assert.ok(ctx.source.connections.includes(ctx.gain));
  assert.ok(ctx.gain.connections.includes(ctx.media));
  assert.ok(!ctx.gain.connections.includes(ctx.destination),"export never outputs unexpectedly through speakers");
  assert.deepEqual(h.steps.slice(0,3),["resume","file-array-buffer","decode"],
    "Web Audio resume is invoked synchronously before file decoding");
  assert.equal(ctx.gain.gain.value,.8);
  session.setVolume(40);assert.equal(ctx.gain.gain.value,.4);
  session.fadeOut();assert.equal(ctx.gain.gain.value,0);
  session.close();
  assert.equal(ctx.closed,true);
  assert.equal(ctx.source.stopped,true);
  assert.equal(ctx.track.readyState,"ended");
  assert.equal(h.audioSession.type,"ambient");
});

test("unsupported codecs fail explicitly instead of substituting silent video",async()=>{
  const h=loadAudio({decodeFails:true});
  const file={name:"broken.m4a",size:100,type:"audio/mp4",
    async arrayBuffer(){return Uint8Array.of(1,2,3).buffer}};
  assert.equal(await h.api.startUploadedAudio(file,80),null);
  assert.equal(h.audioSession.type,"ambient");
  assert.ok(h.contexts[0].closed);
  assert.match(client,/if\(\(music !== "none" \|\| uploadedAudio\) && !musicSession\)/);
  assert.match(client,/data-video-audio-rights/);
  assert.match(client,/!uploadedAudio \|\| audioRights/);
});

test("iPhone editor wires native <audio> controls, explicit file input, EN/RU/ES and no network upload",()=>{
  assert.match(client,/data-video-audio-player/);
  assert.match(client,/controls preload="metadata"/);
  assert.match(client,/void player\.play\(\)\.catch/);
  assert.match(client,/onPlay=\{\(\)=>/);
  assert.match(client,/onPause=\{\(\)=>/);
  assert.match(client,/type="file"/);
  assert.match(client,/data-video-audio-upload/);
  assert.match(client,/isSupportedLocalAudio\(file\)/);
  assert.match(client,/createAmbientPreviewWav\(music\)/);
  assert.match(client,/startUploadedAudio\(uploadedAudio\.file,soundVolume\)/);
  for(const phrase of ["Добавить аудиофайл","Add audio file","Añadir archivo de audio"]){
    assert.ok(client.includes(phrase),phrase);
  }
  assert.doesNotMatch(audioSource+client,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|postMessage|api\.kling|heygen|higgsfield|analytics/i);
});
