import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { hypnoWavePhase, paintHypnoLightOverlay, recommendHypnoLight } from "../lib/mandala/hypno-visual-overlay.mjs";

test("Wave selects different calm or focused effects from local goal and theme",()=>{
  const active=recommendHypnoLight("energy","more vitality");
  const calm=recommendHypnoLight("energy","хочу спокойствия");
  const work=recommendHypnoLight("money","prepare for an interview");
  assert.equal(active.cyclesPerMinute,8);
  assert.equal(calm.cyclesPerMinute,6);
  assert.equal(calm.opacity,.14);
  assert.equal(work.cyclesPerMinute,7);
  assert.notDeepEqual(active,calm);
});
test("hypnocorrection's smooth six-cycle wave is deterministic and never flashes",()=>{
  assert.equal(hypnoWavePhase(0,6),0);
  assert.ok(hypnoWavePhase(5,6)>.9999);
  assert.ok(hypnoWavePhase(10,6)<.0001);
  assert.equal(hypnoWavePhase(5,6),hypnoWavePhase(5,6));
  assert.ok(hypnoWavePhase(30,6)>=0);
  assert.ok(hypnoWavePhase(30,6)<=1);
});
test("enabled overlay draws a smooth concentric light pattern and restores Canvas state",()=>{
  const actions=[];
  const ctx={
    canvas:{width:1280,height:720},
    save(){actions.push("save");},restore(){actions.push("restore");},
    createRadialGradient(){actions.push("gradient");return{addColorStop(){}};},
    fillRect(){actions.push("fill");},beginPath(){},
    ellipse(){actions.push("ellipse");},stroke(){actions.push("stroke");},
    moveTo(){},lineTo(){},
  };
  paintHypnoLightOverlay(ctx,5,{enabled:true,cyclesPerMinute:6,opacity:.2});
  assert.equal(actions[0],"save");
  assert.equal(actions.at(-1),"restore");
  assert.equal(actions.filter(x=>x==="fill").length,1);
  assert.equal(actions.filter(x=>x==="ellipse").length,3);
  assert.equal(actions.filter(x=>x==="stroke").length,11);
});
test("disabled overlay performs no frame drawing",()=>{
  let called=false;
  paintHypnoLightOverlay({canvas:{width:320,height:180},save(){called=true;}},1,{enabled:false});
  assert.equal(called,false);
});
test("mobile layout reuses one editor, real phrase settings and both frame pipelines",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");
  assert.match(studio,/data-video-quick-control=\{item.id\}/);
  assert.match(studio,/effects:\{tab:"Гипноэффект",title:"Гипноэффекты"/);
  assert.match(studio,/effects:\{tab:"Hypno effect",title:"Hypno effects"/);
  assert.match(studio,/effects:\{tab:"Efecto hipno",title:"Efectos de hipnosis"/);
  assert.match(studio,/data-workspace-section="effects"/);
  assert.match(studio,/MandalaHypnocorrectionMobile/);
  assert.match(studio,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(studio,/createHypnoAudioEffectFile/);
  // Private microphone tracks must never be treated as verified generated speech.
  // The hypno mixer receives only the explicit, consented generated narration.
  assert.match(studio,/setHypnoSpeechSource\(clip\.source==="local"\?null:\(clip\.speechFile\?\?null\)\)/);
  assert.match(studio,/if\(clip\.source==="local"\)/);
  assert.match(studio,/backgroundFile,/);
  assert.match(ui,/data-hypno-speech-settings/);
  assert.match(ui,/data-hypno-binaural-settings/);
  assert.match(ui,/whisperEnabled/);
  assert.match(ui,/binauralEnabled/);
  const audioGroup=ui.slice(ui.indexOf('{group.id==="audio"?<>'),ui.indexOf('{group.id==="visual"?<>'));
  assert.ok(audioGroup.length>0,"audio group must exist");
  assert.doesNotMatch(audioGroup,/unavailable|coming soon/);
  assert.match(studio,/onOpenPhraseEditor=\{\(\)=>\{/);
  assert.match(studio,/openQuickDetailed\("video-hypnosis"\)/);
  assert.match(studio,/onOpenScenes=\{\(\)=>openQuickDetailed\("video-templates"\)\}/);
  assert.equal((studio.match(/paintHypnoLightOverlay\(ctx,/g)||[]).length,5, "both native and WebCodecs MP4 must draw the real hypno overlay");
  for(const name of ['"audio"','"visual"'])assert.ok(ui.includes(name));
  assert.doesNotMatch(ui,/posters\.meditation/,"no stale lookup remains for the removed meditation group");
  for(const name of ["25-й кадр","Бинауральные ритмы","Импульс света",
    "Быстрая настройка с Wave","Создать личную медитацию"])assert.ok(ui.includes(name));
  assert.match(css,/font-size:clamp\(14px,3\.8vw,18px\)/);
  assert.match(css,/\.feature\{display:grid/);
  assert.doesNotMatch(ui,/fetch\(|getUserMedia\(|checkout|stripe|payPal/i);
});

test("10 Nov Hypno uses three exclusive tabs including the moved visual presets",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");
  const videoCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  for(const id of ["visual","audio","effects"])assert.match(ui,new RegExp('id:"'+id+'"'));
  assert.doesNotMatch(ui,/id:"phrases",title:/,"phrases are now accessible within Visual");
  assert.match(ui,/data-hypno-light-preset=\{index\}/);
  assert.match(ui,/data-hypno-text-position=\{position\}/);
  assert.match(ui,/data-hypno-summary/);
  assert.match(ui,/onOpenPhraseEditor/);
  assert.match(ui,/onLightChange\(\{\.\.\.light,enabled:true,opacity\}\)/);
  assert.match(ui,/useState<GroupId>\(initialGroup\)/);
  assert.match(ui,/data-hypno-tabs/);
  assert.match(ui,/data-hypno-visual-effect=\{item.id\}/);
  assert.match(ui,/data-hypno-effect-status/);
  assert.match(ui,/data-hypno-visual-effects/);
  assert.match(ui,/role="tablist"/);
  assert.match(ui,/role="tabpanel"/);
  assert.match(ui,/aria-selected=\{activeGroup===group.id\}/);
  assert.match(ui,/hidden=\{activeGroup!==group.id\}/);
  assert.match(ui,/data-hypno-speech-settings/);
  assert.match(ui,/data-hypno-binaural-settings/);
  assert.match(ui,/data-hypno-light-settings/);
  assert.match(ui,/data-hypno-create/);
  assert.match(ui,/data-hypno-add-effects/);
  assert.match(ui,/onClick=\{\(\)=>setActiveGroup\(activeGroup==="visual"\?"audio":activeGroup==="audio"\?"effects":"visual"\)\}/);
  assert.doesNotMatch(ui,/createPortal|data-hypno-intro-slot|data-hypno-meditation-action/);
  assert.doesNotMatch(ui,/Yes, add|keep simple|Browse hypno library/);
  assert.match(css,/\.groupTabs\{/);
  assert.match(css,/\.group\[hidden\]\{display:none!important\}/);
  assert.match(css,/@media\(max-width:359px\)/);
  assert.match(videoCss,/data-active-workspace="effects"\] \.quickBuilder>\[data-video-quick-section="1"\],[\s\S]*?display:none!important/);
  assert.match(studio,/status=\{notice\} onCreate=\{openReadyForGeneration\}/);
  assert.match(studio,/data-hypno-stage-intro/);
  assert.match(videoCss,/\.hypnoStageTitle\{display:none\}/);
  assert.match(videoCss,/\.studio\[data-active-workspace="effects"\] \.previewStage \.heroRail\{display:none!important\}/);
  assert.match(videoCss,/\.studio\[data-active-workspace="effects"\] \.heroEditorial\{display:none!important\}/);
  assert.equal((studio.match(/id="video-hero"/g)||[]).length,1);
});
test("Effects offers real Generate plus optional Visual/Audio step, without a Voice detour",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
 assert.ok(ui.includes("data-hypno-create"));
 assert.ok(ui.includes("data-hypno-add-effects"));
 assert.ok(ui.includes('onClick={()=>setActiveGroup(activeGroup==="visual"?"audio":activeGroup==="audio"?"effects":"visual")}'));
 assert.ok(studio.includes("status={notice} onCreate={openReadyForGeneration}"));
 assert.ok(!studio.includes("generateWithoutHypnoEffects"));
 assert.ok(studio.includes("void createVideo()"),"must use the real protected video renderer");
});

test("Effects shares the one compact in-flow tab rail and preserves the original video",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
  assert.equal((studio.match(/<nav className=\{videoStyles\.quickVideoNav\}/g)||[]).length,1);
  assert.ok(studio.indexOf("data-video-quick-controls")<studio.indexOf("data-video-live-stage"));
  assert.ok(studio.indexOf("data-video-live-stage")<studio.indexOf('id="video-hero"'));
  assert.doesNotMatch(studio,/createPortal|effectsNavTarget|data-video-hypno-nav-slot/,
    "Hypno cannot move tabs or place the Wave introduction ahead of the player");
  const mobile=css.slice(css.lastIndexOf("/* 04 Nov owner visual recovery"));
  assert.match(mobile,/data-active-workspace="effects"/);
  assert.match(mobile,/hypnoIntroSlot\s*\{\s*order:3!important/);
  assert.match(mobile,/aspect-ratio:16\/9!important/);
});


test("hypno audio renderer produces a real stereo PCM WAV and supports quiet speech and binaural layers",()=>{
  const source=readFileSync(new URL("../lib/mandala/hypno-audio-effects.ts",import.meta.url),"utf8");
  assert.match(source,/export async function createHypnoAudioEffectFile/);
  assert.match(source,/new OfflineContext\(2,/);
  assert.match(source,/createChannelMerger\(2\)/);
  assert.match(source,/frequency\.value = frequency/);
  assert.match(source,/repeatEverySeconds/);
  assert.match(source,/backgroundFile\?: File \| null/);
  assert.match(source,/source\.start\(0, 0, Math\.min\(background\.duration, duration\)\)/);
  assert.match(source,/else if \(!options\.backgroundFile\)/);
  assert.match(source,/whisperGain/);
  assert.match(source,/encodePcmWav/);
  assert.match(source,/setUint16\(22, channels, true\)/);
  assert.match(source,/15 \* 1024 \* 1024/);
  assert.match(source,/SPEECH_TRACK_REQUIRED/);
  assert.match(source,/SPEECH_TRACK_EXCEEDS_DURATION/);
  assert.match(source,/at \+ decoded\.duration <= duration/,
    "the final repeated phrase must fit completely; never trim speech");
  assert.match(source,/OFFLINE_AUDIO_UNAVAILABLE/);
});

test("hypno audio UI uses the existing consented phrase narrator in-place, not the general music tab",()=>{
  const mobile=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(mobile,/data-hypno-speech-settings/);
  assert.match(mobile,/voiceEditor\|\|<p/);
  assert.match(mobile,/onToggleWhisper/);
  assert.match(mobile,/onToggleBinaural/);
  assert.match(mobile,/data-hypno-binaural-settings/);
  const audioGroup=mobile.slice(mobile.indexOf('{group.id==="audio"?<>'),mobile.indexOf('{group.id==="visual"?<>'));
  assert.ok(audioGroup.length>0,"audio group must exist");
  assert.doesNotMatch(audioGroup,/unavailable|coming soon/);
  assert.match(studio,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
  assert.match(studio,/createHypnoAudioEffectFile/);
  assert.match(studio,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,nonLoop:true/);
  assert.match(studio,/includesNarration\?\{narration:true,spokenText:effectSpokenText/,
    "effect files that contain speech retain transcript identity and become stale after approval");
  assert.match(studio,/disabled=\{recording\|\|preparing\|\|hypnoAudioBusy\}/,
    "the entire effects panel is disabled only during export or effect rendering");
  assert.match(studio,/if\(phrasePending\)\{/,
    "pending phrase edits block effect rendering without hiding the editor controls");
  assert.match(studio,/if\(narrationInvalid\)\{/,
    "stale narration blocks effect rendering until the voice is regenerated");
  assert.match(studio,/previousHypnoAudioRef/);
  assert.doesNotMatch(studio,/onOpenAudioEditor=\{\(\)=>openQuickDetailed\("video-audio"\)\}/);
});


test("Hypno audio renderer emits a real stereo PCM WAV with audible quiet repeats and binaural carrier split",async()=>{
  const helper=readFileSync(new URL("../lib/mandala/hypno-audio-effects.ts",import.meta.url),"utf8");
  const compiled=ts.transpileModule(helper,{fileName:"hypno-audio-effects.ts",reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  assert.equal((compiled.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error).length,0);
  const events=[];
  class FakeOfflineAudioContext {
    constructor(channels,frames,rate){this.numberOfChannels=channels;this.length=frames;this.sampleRate=rate;this.destination={};}
    async decodeAudioData(encoded){return encoded.byteLength===32?{duration:15,kind:"background"}:{duration:3,kind:"speech"};}
    createBufferSource(){const node={buffer:null,connect(){},start:(...args)=>events.push({kind:node.buffer.kind,args})};return node;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}};}
    createChannelMerger(channels){events.push({kind:"merger",channels});return {connect(){}};}
    createOscillator(){const node={type:"",frequency:{value:0},connect(){},start(){events.push({kind:"tone",frequency:node.frequency.value});},stop(){}};return node;}
    async startRendering(){
      const data=Array.from({length:this.numberOfChannels},()=>new Float32Array(this.length));
      data[0][0]=.25;data[1][0]=-.25;
      return {numberOfChannels:this.numberOfChannels,length:this.length,sampleRate:this.sampleRate,
        getChannelData(index){return data[index];}};
    }
  }
  class FakeFile {constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type;}}
  const api={};
  runInNewContext(compiled.outputText,{exports:api,OfflineAudioContext:FakeOfflineAudioContext,File:FakeFile});
  const speechFile={arrayBuffer:async()=>new ArrayBuffer(16)};
  const backgroundFile={arrayBuffer:async()=>new ArrayBuffer(32)};
  const result=await api.createHypnoAudioEffectFile({speechFile,backgroundFile,durationSeconds:15,
    whisperEnabled:true,binauralEnabled:true,beatHz:4,repeatEverySeconds:7,whisperGain:.16});
  assert.equal(result.type,"audio/wav");
  const bytes=result.parts[0];
  const view=new DataView(bytes);
  assert.equal(String.fromCharCode(...new Uint8Array(bytes,0,4)),"RIFF");
  assert.equal(view.getUint16(22,true),2,"WAV contains two independently rendered channels");
  assert.equal(view.getUint32(24,true),16000);
  assert.equal(view.getUint16(34,true),16);
  assert.equal(events.filter(item=>item.kind==="background").length,1,
    "the original mixed music/voice bed plays exactly once");
  assert.equal(events.filter(item=>item.kind==="speech").length,2,
    "only the isolated 3s phrase repeats at 0s and 10s when a 7s pause is selected");
  assert.deepEqual(events.filter(item=>item.kind==="tone").map(item=>item.frequency),[180,184]);
  assert.equal(events.find(item=>item.kind==="merger")?.channels,2);
  assert.ok(bytes.byteLength>44);
});

test("Hypno final actions follow the fourth Effects settings section on mobile",()=>{
 const css=readFileSync(new URL("../components/mandala-hypnocorrection-mobile.module.css",import.meta.url),"utf8");
 assert.match(css,/\.actions\{order:3;display:grid/);
});
test("Effects allow silent export only for an unattached automatic music suggestion",()=>{
 const ui=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(ui,/hypnoUnattachedAutoSuggestion=activeWorkspace==="effects"/);
 assert.match(ui,/audioAuto && !uploadedAudio && attachedAudio===null/);
 assert.match(ui,/audioNeedsAttachment=selectedAudioKey!==attachedAudioKey &&\s*!hypnoUnattachedAutoSuggestion/);
 assert.match(ui,/if\(uploadedAudio && !audioRights\)/,
   "uploaded audio keeps its independent rights gate");
});
