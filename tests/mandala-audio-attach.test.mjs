import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";

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
  assert.match(studio,/startUploadedAudio\(attachedAudio\.file,soundVolume,\{loop:attachedAudio\.narration!==true&&attachedAudio\.nonLoop!==true\}\)/);
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
  assert.doesNotMatch(studio+source,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|api\.kling|heygen/i);
});

test("sound-only covers reuse 13 real local first-party illustration files",()=>{
  const covers=[...styles.matchAll(/\.audioTrackRow\[data-audio-id="([a-z-]+)"\] \.audioTileGlyph\{background-image:url\('([^']+)'\)\}/g)];
  assert.equal(covers.length,13,"all thirteen site audio sounds have honest illustrative cover art");
  assert.equal(new Set(covers.map(x=>x[1])).size,13);
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
