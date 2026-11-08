import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("components/mandala-free-video-studio.tsx");
const child=read("components/mandala-video-ideas.tsx");
const audio=read("lib/mandala/local-video-music.ts");
const css=read("components/mandala-video-mobile.module.css");

test("video wizard starts Goal → Montage Style/Audio → Ideas Text/Voice → optional Hypno",()=>{
  const tabs=source.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
  assert.deepEqual([...tabs.matchAll(/id:"([a-z]+)"/g)].map(x=>x[1]),
    ["video","editor","phrases","effects","pro","ready"]);
  const goal=source.slice(source.indexOf("const continueToMontage = () => {"),
    source.indexOf("const openVideoScenarioStep",source.indexOf("const continueToMontage = () => {")));
  assert.match(goal,/setActiveWorkspace\("editor"\)/);
  assert.match(goal,/setMontagePanel\("effects"\)/);
  const montage=source.slice(source.indexOf("const continueMontageOrGenerate=()=>{"),
    source.indexOf("const continueToMontage = () => {"));
  assert.match(montage,/setMontagePanel\("audio"\)/);
  assert.match(montage,/goToIdeasFromMontage\(\)/);
  assert.doesNotMatch(montage,/createVideo\(|startFromHero\(|createQuickVideo\(/);
  const ideas=source.slice(source.indexOf('data-video-quick-phrases aria-label='),
    source.indexOf('data-video-effects-panel aria-label='));
  assert.match(ideas,/data-video-ideas-tabs role="group"/);
  assert.match(ideas,/onCreate=\{createQuickVideo\} hideCreateAction/);
  assert.match(child,/!hideCreateAction\?<button/);
  assert.equal((ideas.match(/data-video-ideas-final-actions/g)||[]).length,1);
  assert.match(ideas,/data-video-ideas-create[\s\S]*?onClick=\{createQuickVideo\}/);
  assert.match(ideas,/data-video-ideas-add-effects[\s\S]*?activateQuickWorkspace\("effects"\)/);
  assert.match(css,/\.ideasFinalActions\{display:grid/);
  for(const phrase of ["Создать видео","Добавить эффекты","Create video","Add effects","Crear vídeo","Añadir efectos"])
    assert.ok(ideas.includes(phrase),phrase);
});

test("Music from Montage and generated/recorded Ideas voice remain independent audio sources",()=>{
  assert.match(source,/const \[voiceBackgroundTrack,setVoiceBackgroundTrack\] = useState<AttachedAudio\|null>\(null\)/);
  assert.match(source,/const \[voiceBackgroundVolume,setVoiceBackgroundVolume\] = useState\(30\)/);
  const attach=source.slice(source.indexOf("function attachGeneratedAffirmationAudio("),
    source.indexOf("async function applyHypnoAudioEffects("));
  assert.match(attach,/setVoiceBackgroundTrack\(/);
  assert.ok(attach.indexOf("setVoiceBackgroundTrack(")<attach.indexOf("chooseAudioFile(voiceOnlyFile)"),
    "persist background before replacing the temporary upload picker");
  assert.match(attach,/const voiceOnlyFile=clip\.speechFile/);
  assert.match(attach,/new File\(\[clip\.speechFile\],clip\.file\.name/);
  assert.match(attach,/chooseAudioFile\(voiceOnlyFile\)/,
    "export isolated speech rather than voice preview WAV with another baked soundtrack");
  assert.match(attach,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,narration:true/);
  const selector=source.slice(source.indexOf("function attachSelectedAudio()"),
    source.indexOf("function stopMicRecording()"));
  assert.match(selector,/setVoiceBackgroundTrack\(uploadedAudio\?/);
  assert.match(selector,/setAudioRights\(true\)/);
  assert.match(source,/voiceBackgroundTrack&&\(attachedAudio\.narration\|\|attachedAudio\.nonLoop\)/);
  assert.match(source,/await startVoiceOverBackgroundAudio\(/);
  assert.match(source,/gainPercent:voiceBackgroundVolume/);
  assert.match(source,/file:selected\.file,loop:true/);
  assert.match(source,/data-video-voice-background-volume/);
  assert.match(source,/bedPlayers\.forEach\(player=>void player\.play\(\)/);
  assert.match(source,/session\.fileUrls\.forEach\(url=>URL\.revokeObjectURL\(url\)\)/);
  assert.match(audio,/export async function startVoiceOverBackgroundAudio\(/);
  assert.match(audio,/decoded\.forEach\(\(buffer,index\)=>\{/);
  assert.match(audio,/node\.loop=index!==0/);
  assert.match(audio,/destination=context\.createMediaStreamDestination\(\)/);
  assert.doesNotMatch(audio.slice(audio.indexOf("export async function startVoiceOverBackgroundAudio")),
    /fetch\(\s*["']https:\/\//);
});

test("The background remains selected if voice needs regeneration",()=>{
  const invalidate=source.slice(source.indexOf("const hypnoVoiceEditor = ("),
    source.indexOf("data-video-ideas-voice-actions"));
  assert.match(invalidate,/setAttachedAudio\(voiceBackgroundTrack\)/);
  assert.match(invalidate,/setVoiceBackgroundTrack\(null\)/);
});

// Exercise the real TS mixer with a deterministic browser AudioContext stand-in,
// not another copy of the algorithm. No provider calls or paid media rendering.
test("local export mixes a non-looping spoken WAV and looping background into one track",async()=>{
 const ts=(await import("typescript")).default;
 const compiled=ts.transpileModule(audio,{
   fileName:"local-video-music.ts",
   compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
 }).outputText;
 const starts=[],sources=[],fetched=[],track={stopped:false,stop(){this.stopped=true;}};
 const sharedContext={
   state:"suspended",currentTime:5,
   resume(){this.state="running";return Promise.resolve();},
   decodeAudioData:async()=>({length:100,duration:8}),
   createMediaStreamDestination:()=>({stream:{
     getAudioTracks:()=>[track],getTracks:()=>[track]}}),
   createGain:()=>({gain:{
     value:0,setValueAtTime(){},cancelScheduledValues(){},
     setTargetAtTime(){},linearRampToValueAtTime(){}
   },connect(){},disconnect(){}}),
   createBufferSource:()=>{
     const node={loop:false,buffer:null,connect(){},disconnect(){},stop(){},
       start(at){starts.push(at);}};
     sources.push(node);return node;
   },
   close(){this.closed=true;return Promise.resolve();}
 };
 class FakeFile{
   constructor(name){this.name=name;this.type="audio/wav";this.size=800;}
   arrayBuffer(){return Promise.resolve(new ArrayBuffer(80));}
 }
 const nav={audioSession:{type:"ambient"}};
 const api={};
 new Function("exports","window","navigator","fetch","Blob","File",compiled)(
   api,{AudioContext:class{constructor(){return sharedContext;}}},
   nav,
   async(url,options)=>{
     fetched.push({url,options});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(100)};
   },
   Blob,FakeFile);
 const voice=new FakeFile("approved-voice.wav");
 const mix=await api.startVoiceOverBackgroundAudio(voice,"warm-morning",90,20,
   {seconds:15,startSeconds:2,deferStart:true});
 assert.ok(mix,"voice and first-party music must be accepted for one local movie");
 assert.equal(mix.track,track);
 assert.deepEqual(fetched.map(x=>x.url),["/audio/mandala/warm-morning.wav"]);
 assert.equal(fetched[0].options.credentials,"same-origin");
 assert.equal(sources.length,2,"voice and music remain separate audio nodes");
 assert.deepEqual(sources.map(x=>x.loop),[false,true],
   "speech runs once while the soundtrack loops");
 assert.equal(starts.length,0,"no playback before trusted record click");
 mix.begin();
 assert.deepEqual(starts,[7,5],"spoken start offset differs from soundtrack");
 mix.setVolume(60);mix.fadeOut();mix.close();
 assert.equal(track.stopped,true);
 assert.equal(nav.audioSession.type,"ambient","restore original iOS audio session");
});
