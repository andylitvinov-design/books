import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";
import { runInNewContext } from "node:vm";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const styles=read("components/mandala-video-mobile.module.css");
const source=read("lib/mandala/local-video-music.ts");
const browser=read("scripts/verify-holistic-mandala-browser.mjs");

test("audio-only mobile list: no fake video images, real readable controls and filters",()=>{
  const start=studio.indexOf('<section className={videoStyles.audioSection}');
  const end=studio.indexOf('<section className={videoStyles.hypnosisSection}',start);
  assert.ok(start>0 && end>start);
  const section=studio.slice(start,end);
  assert.doesNotMatch(section,/<video\b|<img\b/,"this block selects audio, not video scenes");
  for(const hook of ["data-video-audio-context","data-video-audio-kind","data-video-audio-mood",
    "data-video-audio-pace","data-video-audio-length","data-video-audio-search",
    "data-video-audio-sort","data-video-audio-more","data-video-music=",
    "data-video-audio-player","data-video-audio-upload","data-video-audio-mic",
    "data-video-audio-attach","data-video-audio-attached"]){
    assert.ok(section.includes(hook),hook);
  }
  assert.match(section,/visibleAudio\.map\(/);
  assert.match(section,/AudioLines/);
  assert.match(section,/audioUi\.pick/);
  assert.match(styles,/\.audioTrackList\{display:flex;flex-direction:column/);
  assert.match(styles,/\.audioTrackSelect\{display:grid/);
  assert.match(styles,/\.audioTrackList \.audioTileText strong\{[\s\S]*?font-size:13\.5px/);
  assert.match(styles,/\.audioTrackSelect\{[\s\S]*?min-height:66px/);
  assert.match(styles,/@media\(max-width:375px\)/);
  assert.match(styles,/\.audioAttachButton\{[\s\S]*?min-height:48px/);
  assert.doesNotMatch(section,/<video\b|<img\b|youtube|autoplay/);
});

test("choice is a preview, attach is explicit and MediaRecorder exports ONLY attached audio",()=>{
  assert.match(studio,/type AttachedAudio = \{kind:"preset"/);
  assert.match(studio,/const selectedAudioKey=uploadedAudio/);
  assert.match(studio,/const attachedAudioKey=attachedAudio===null/);
  assert.match(studio,/const audioNeedsAttachment=selectedAudioKey!==attachedAudioKey/);
  assert.match(studio,/attachedAudioKey,attachedAudio\?soundVolume:0,caption/);
  assert.match(studio,/!audioNeedsAttachment &&/);
  assert.match(studio,/function attachSelectedAudio\(\)/);
  assert.match(studio,/setAttachedAudio\(\{kind:"file",id:uploadedAudio.url,file:uploadedAudio.file\}\)/);
  assert.match(studio,/setAttachedAudio\(\{kind:"preset",id:music\}\)/);
  assert.match(studio,/setAttachedAudio\(null\)/);
  assert.match(studio,/musicSession = attachedAudio\?\.kind==="file"/);
  assert.match(studio,/startUploadedAudio\(attachedAudio\.file,soundVolume,\{loop:attachedAudio\.narration!==true\}\)/);
  assert.match(studio,/startPresetAudio\(attachedAudio.id,soundVolume\)/);
  assert.match(studio,/if\(attachedAudio && !musicSession\)/);
  assert.match(studio,/if\(audioNeedsAttachment\)\{[\s\S]*?audioUi\.needsAttach/);
  for(const fragment of [
    'assert.equal(await create.isEnabled(),false,"selecting a soundtrack must not attach it silently")',
    'await attachButton.click()',
    'await page.locator("[data-video-audio-attach]").click()',
    'assert.ok(streams.some(stream => stream.codec_type === "audio")',
  ])assert.ok(browser.includes(fragment),fragment);
});

test("browser-local mic capture honors device permission, stopping, size, MIME and explicit rights",()=>{
  assert.match(studio,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(studio,/new MediaRecorder\(stream,/);
  assert.match(studio,/recorder\.onstop=/);
  assert.match(studio,/recorder\.start\(250\)/);
  assert.match(studio,/180000/);
  assert.match(studio,/session\.stream|getTracks\(\)\.forEach\(track=>track.stop\(\)\)/);
  assert.match(studio,/isSupportedLocalAudio\(file\)/);
  assert.match(studio,/setAudioRights\(false\)/);
  assert.match(studio,/audioRightsHelp/);
  assert.match(studio,/setAudioDurationInvalid\(true\)/);
  const compiled=ts.transpileModule(source,{fileName:"local-video-music.ts",reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
  const exports={};new Function("exports",compiled.outputText)(exports);
  for(const name of ["take.m4a","take.webm","take.mp3"]){
    assert.ok(exports.isSupportedLocalAudio({name,size:100,type:name.endsWith(".webm")?"audio/webm":"audio/mp4"}));
  }
  assert.equal(exports.isSupportedLocalAudio({name:"big.webm",size:16*1024*1024,type:"audio/webm"}),false);
  assert.equal(exports.isSupportedLocalAudio({name:"fake.webm",size:100,type:"text/html"}),false);
});

test("EN/RU/ES visible attach, select, upload and recording copy is complete",()=>{
  for(const phrase of ["Attach to video","Прикрепить к видео","Adjuntar al vídeo",
    "Record my voice","Записать голос","Grabar voz",
    "Select","Выбрать","Elegir",
    "Sound is attached","Дорожка прикреплена","Audio adjunto"]){
    assert.ok(studio.includes(phrase),phrase);
  }
  // Permit one safe same-origin static WAV GET, never arbitrary networking or uploads.
  const firstPartyWav=/fetch\(presetAudioUrl\(id\),\{cache:"force-cache"\}\)/g;
  assert.equal((source.match(firstPartyWav)||[]).length,1,"one verified site-owned WAV GET");
  assert.doesNotMatch((studio+source).replace(firstPartyWav,""),/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|api\.kling|heygen/i);
});

test("39 soundtrack covers reuse approved local first-party illustration files",()=>{
  const covers=[...styles.matchAll(/\.audioTrackRow\[data-audio-id="([a-z-]+)"\] \.audioTileGlyph\{background-image:url\('([^']+)'\)\}/g)];
  assert.equal(covers.length,39,"all 39 site audio sounds have explicit illustrative cover art");
  assert.ok(new Set(covers.map(x=>x[1])).size>=13,"retain diverse existing cover scenes");
  for(const [,id,url] of covers){
    assert.match(url,/^\/videos\/holistic-house\/film-collection-v2\/[a-z-]+\.jpg$/);
    assert.ok(existsSync(new URL("../public"+url,import.meta.url)),id+" first-party cover must exist");
  }
  assert.match(studio,/data-video-audio-theme=\{item\}/);
  assert.match(studio,/aria-pressed=\{audioTheme===item\}/);
  assert.match(studio,/data-video-audio-favorite=\{track.id\}/);
  assert.match(studio,/setAudioFavorites\(list=>/);
  assert.match(styles,/\.audioFilterRow\{display:grid/);
  assert.match(styles,/\.audioChipRail button\{flex:none;min-height:42px/);
  assert.match(styles,/\.audioFavorite\{display:grid;place-items:center;width:44px;min-height:44px/);
});


test("approved compact audio mock has one real player/microphone and no duplicate picker",()=>{
  const quickStart=studio.indexOf('data-video-quick-section="5"');
  const quickEnd=studio.indexOf('data-video-quick-section="6"',quickStart);
  const fullStart=studio.indexOf('<section className={videoStyles.audioSection}');
  const fullEnd=studio.indexOf('<section className={videoStyles.hypnosisSection}',fullStart);
  assert.ok(quickStart>=0 && quickEnd>quickStart && fullStart>=0 && fullEnd>fullStart,
    "the single detailed audio editor may be hoisted before JSX to serve the active workspace");
  assert.equal((studio.match(/id="video-audio"/g)||[]).length,1);
  assert.match(studio,/\{activeWorkspace==="audio" \? deepAudioPane : null\}/);
  const quick=studio.slice(quickStart,quickEnd);
  const full=studio.slice(fullStart,fullEnd);
  assert.doesNotMatch(quick,/<audio\b|quickAudioFilters|quickAudioPlayer|data-video-audio-mic/,
    "the quick summary cannot host another recorder, media player or sound catalogue");
  assert.match(quick,/data-video-quick-attach/,"existing quick attach still works");
  assert.match(quick,/quickAudioSilent/,"silent output remains available");
  assert.match(full,/data-video-audio-dock/,"one shared selected-track player dock");
  assert.match(full,/data-video-audio-play=\{track\.id\}/,"every audio row has direct playback");
  assert.match(studio,/flushSync\(\(\)=>\{/,"same user tap can play new first-party WAV on iOS");
  assert.equal((studio.match(/<audio\b/g)||[]).length,1,
    "one native audio element in the canonical video editor");
  assert.equal((studio.match(/data-video-audio-mic\b/g)||[]).length,1,
    "one functional mic recorder rather than duplicate voice workflows");
  assert.match(styles,/\.audioSection \.blockHeading\{display:grid/);
  assert.match(styles,/\.audioSection \.audioFilterRow\{grid-template-columns:/);
  assert.match(styles,/\.audioTrackPlay\{position:absolute/);
  assert.match(styles,/\.quickAudioCompact\{display:grid/);
});


test("quick music checkboxes attach at most three unique first-party melodies while audition is independent",()=>{
  assert.match(studio,/type AttachedAudio = [^\n]*kind:"presets";ids:PresetId\[\]/);
  assert.match(studio,/data-video-quick-music-check=\{id\}/);
  assert.match(studio,/data-video-quick-music-play=\{id\}/);
  assert.match(studio,/onClick=\{\(\)=>playQuickTrack\(id\)\}/);
  assert.match(studio,/startPresetMixAudio\(attachedAudio\.ids,soundVolume\)/);
  assert.match(studio,/startMovieSound\(attachedAudio,soundVolume\)/);
  assert.match(studio,/stopMovieSound\(\);setPreviewPlaying\(false\)/);
  assert.equal((studio.match(/<audio\b/g)||[]).length,1,"keep exactly one visible HTML audio player");
  assert.equal((studio.match(/data-video-audio-mic\b/g)||[]).length,1,"one recorder");
  const ast=ts.createSourceFile("mandala.tsx",studio,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let handler=null;
  const visit=node=>{
    if(ts.isFunctionDeclaration(node) && node.name?.text==="toggleQuickMusic")handler=node;
    ts.forEachChild(node,visit);
  };
  visit(ast);
  assert.ok(handler,"exercise the actual quick-music implementation, not a duplicate mock");
  const transpiled=ts.transpileModule(handler.getText(ast),{
    fileName:"mandala.tsx",compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
  }).outputText;
  let attached=null,selected="none",mutations=0,played=0;
  const invoke=choice=>{
    const attachedPresetIds=attached?.kind==="presets"?attached.ids:
      attached?.kind==="preset"?[attached.id]:[];
    runInNewContext(transpiled+";toggleQuickMusic(choice)",{
      choice,attachedPresetIds,recording:false,preparing:false,micRecording:false,
      clearUploadedAudio:()=>{},setSamplePreviewId:()=>{},setAudioAuto:()=>{},
      setMusic:id=>{selected=id;},setAttachedAudio:next=>{attached=next;mutations++;},
      setMusicWarning:()=>{},previewPlaying:false,startMovieSound:()=>{played++;}
    },{timeout:1000});
  };
  invoke("warm-morning");
  assert.equal(attached.kind,"preset");assert.equal(attached.id,"warm-morning");
  invoke("wings-of-light");
  assert.deepEqual(Array.from(attached.ids),["warm-morning","wings-of-light"]);
  invoke("heart-harmony");
  assert.equal(attached.ids.length,3);
  invoke("quiet-stars");
  assert.deepEqual(Array.from(attached.ids),["wings-of-light","heart-harmony","quiet-stars"],"FIFO bound of 3");
  invoke("heart-harmony");
  assert.deepEqual(Array.from(attached.ids),["wings-of-light","quiet-stars"],"toggle off selected layer");
  assert.equal(selected,"wings-of-light");
  assert.equal(mutations,5);assert.equal(played,0,"inactive film does not autoplay");
});

test("local music mixer reads at most three static site-owned WAVs and emits one export audio track",async()=>{
  const {exports:compiled}=(()=>{
    const result=ts.transpileModule(source,{fileName:"local-video-music.ts",
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
    return {exports:result.outputText};
  })();
  const calls=[],started=[],track={kind:"audio",stop(){this.stopped=true;}};
  const ctx={
    state:"suspended",currentTime:0,
    resume(){this.state="running";return Promise.resolve();},
    decodeAudioData:async()=>({length:16,duration:16}),
    createMediaStreamDestination:()=>({stream:{getAudioTracks:()=>[track]}}),
    createGain:()=>({gain:{value:0,setValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),
    createBufferSource:()=>{const item={loop:false,connect(){},disconnect(){},start(){started.push(item);},stop(){}};return item;},
    close(){this.closed=true;return Promise.resolve();}
  };
  const session={type:"ambient"};
  const api={};
  new Function("exports","window","navigator","fetch","Blob","File",compiled)(
    api,{AudioContext:class{constructor(){return ctx;}}},{audioSession:session},
    async(url,options)=>{calls.push({url,options});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(32)};},
    Blob,undefined
  );
  assert.equal(await api.startPresetMixAudio([],75),null);
  assert.equal(await api.startPresetMixAudio(["warm-morning","warm-morning"],75),null);
  assert.equal(await api.startPresetMixAudio(["warm-morning","wings-of-light","heart-harmony","quiet-stars"],75),null);
  const output=await api.startPresetMixAudio(["warm-morning","wings-of-light","heart-harmony"],75);
  assert.ok(output);assert.equal(output.track.kind,"audio");
  assert.equal(started.length,3);
  assert.ok(started.every(x=>x.loop));
  assert.deepEqual(calls.map(x=>x.url),[
    "/audio/mandala/warm-morning.wav",
    "/audio/mandala/wings-of-light.wav",
    "/audio/mandala/heart-harmony.wav"
  ]);
  assert.ok(calls.every(x=>x.options.cache==="force-cache"));
  output.setVolume(50);output.fadeOut();output.close();
  assert.equal(track.stopped,true);
  assert.equal(session.type,"ambient","restore iOS audio routing");
});


test("quick music rail and shared native player are simultaneously mounted on Audio workspace",()=>{
  // The old production CSS hid the quick selector exactly when the native player existed.
  assert.doesNotMatch(styles,/\.studio\[data-active-workspace="audio"\] \.quickMusicRail/);
  assert.match(studio,/\{activeWorkspace==="audio" \? deepAudioPane : null\}/);
  assert.match(studio,/flushSync\(\(\)=>\{setActiveWorkspace\("audio"\);setSamplePreviewId\(choice\);\}\)/);
  assert.match(studio,/const player=audioPreviewRef\.current/);
  assert.equal((studio.match(/<audio\b/g)||[]).length,1);
});


test("direct audio URL reveals its existing workspace instead of hidden advanced settings",()=>{
  const s=read("components/mandala-free-video-studio.tsx");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(s,/const revealAudioDeepLink=\(\)=>\{/);
  assert.match(s,/if\(window\.location\.hash!==\"#video-audio\"\)return;/);
  assert.match(s,/setActiveWorkspace\(\"audio\"\)/);
  assert.match(s,/window\.addEventListener\(\"hashchange\",revealAudioDeepLink\)/);
  assert.match(s,/window\.removeEventListener\(\"hashchange\",revealAudioDeepLink\)/);
  assert.equal((s.match(/id=\"video-audio\"/g)||[]).length,1);
  assert.equal((s.match(/data-video-audio-mic\b/g)||[]).length,1);
  assert.match(browser,/await deepPage\.goto\(url\+\"#video-audio\"/);
  assert.match(browser,/deep-link\.png/);
});
