import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { mandalaAudioTracks, recommendMandalaAudio } from "../lib/mandala/audio-recommendations.mjs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio = read("components/mandala-free-video-studio.tsx");
const audioSource = read("lib/mandala/local-video-music.ts");

function audioApi() {
  const compiled = ts.transpileModule(audioSource,{
    fileName:"local-video-music.ts",reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
  });
  assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
  const exports={};
  new Function("exports","Blob",compiled.outputText)(exports,Blob);
  return exports;
}

test("34 original soundtrack presets have distinct site-local WAV masters matching video export",async()=>{
  assert.equal(mandalaAudioTracks.length,34);
  assert.equal(mandalaAudioTracks.filter(x=>x.new).length,21);
  assert.equal(new Set(mandalaAudioTracks.map(t=>t.id)).size,13);
  const api=audioApi();
  for(const track of mandalaAudioTracks){
    assert.ok(["melody","tones","pulse","nature"].includes(track.kind),track.id);
    assert.ok(["slow","steady","active"].includes(track.pace),track.id);
    assert.ok(track.themes.length && track.moods.length,track.id);
    assert.ok([8,16].includes(track.durationSeconds),track.id);
    assert.equal(track.new,track.durationSeconds===16,track.id);
    for(const lang of ["en","ru","es"]) {
      assert.ok(track.name[lang]&&track.detail[lang],track.id+" "+lang);
    }
    const blob=api.createAmbientPreviewWav(track.id);
    const file=Buffer.from(await blob.arrayBuffer());
    const path=api.presetAudioUrl(track.id);
    assert.equal(path,"/audio/mandala/"+track.id+".wav");
    const published=readFileSync(new URL("../public"+path,import.meta.url));
    assert.deepEqual(file,published,track.id+" preview bytes equal export bytes");
    assert.equal(file.toString("ascii",0,4),"RIFF");
    assert.equal(file.toString("ascii",8,12),"WAVE");
    assert.equal(file.readUInt16LE(20),1);
    assert.equal(file.readUInt16LE(22),1);
    assert.equal(file.readUInt16LE(34),16);
    const original=["harmony","prosperity","energy","love","meditation"].includes(track.id);
    assert.equal(file.readUInt32LE(24),original?44100:22050);
    assert.equal(file.length,44+track.durationSeconds*file.readUInt32LE(24)*2,track.id+" encoded length");
    let sum=0;
    for(let i=44;i<file.length;i+=2){const a=file.readInt16LE(i)/32768;sum+=a*a}
    assert.ok(Math.sqrt(sum/((file.length-44)/2))>.028,track.id+" must contain audible sound");
  }
});

test("smart selection ranks the current theme rather than inventing profile or test data",()=>{
  for(const theme of ["energy","money","relationships","goals","life","health"]){
    const recommended=recommendMandalaAudio({theme});
    assert.equal(recommended.length,34);
    assert.ok(recommended[0].themes.includes(theme),theme+" should have relevant first pick");
  }
  assert.equal(recommendMandalaAudio({theme:"money"})[0].id,"prosperity");
  assert.equal(recommendMandalaAudio({theme:"relationships"})[0].id,"love");
  assert.ok(recommendMandalaAudio({theme:"energy",kind:"nature"}).every(x=>x.kind==="nature"));
  assert.equal(recommendMandalaAudio({kind:"melody"}).length,9);
  assert.equal(recommendMandalaAudio({kind:"nature"}).length,9);
  assert.equal(recommendMandalaAudio({kind:"pulse"}).length,4);
  assert.ok(recommendMandalaAudio({theme:"money",mood:"focus"}).every(x=>x.moods.includes("focus")));
  assert.ok(recommendMandalaAudio({pace:"slow"}).every(x=>x.pace==="slow"));
  assert.ok(recommendMandalaAudio({voiceFriendly:true}).every(x=>x.voiceSafe));
  assert.equal(recommendMandalaAudio({kind:"nature",pace:"active"}).length,0);
  assert.deepEqual(recommendMandalaAudio({theme:"money"}).map(x=>x.id),
    recommendMandalaAudio({theme:"money"}).map(x=>x.id),"local order must be stable");
});

test("mobile audio controls preserve native HTTPS playback, private files, EN/RU/ES and explicit choice",()=>{
  const css=read("components/mandala-video-mobile.module.css");
  for(const selector of [
    "data-video-audio-context","data-video-audio-auto","data-video-audio-kind",
    "data-video-audio-mood","data-video-audio-pace","data-video-audio-voice",
    "data-video-audio-tracks","data-video-audio-now","data-video-audio-upload",
    "data-video-audio-player","data-video-audio-rights","data-video-audio-source",
  ])assert.ok(studio.includes(selector),selector);
  assert.match(studio,/const audioMatches = recommendMandalaAudio/);
  assert.match(studio,/data-video-audio-play=\{track.id\}/);
  assert.match(studio,/function playAudioTrack\(/);
  assert.match(studio,/flushSync\(\(\)=>\{/);
  assert.match(studio,/audioUi\.play/);
  assert.match(studio,/kind:audioKind,mood:audioMood,pace:audioPace/);
  assert.match(studio,/theme:audioTheme,kind:audioKind/);
  assert.match(studio,/voiceFriendly:audioVoiceFriendly,wish/);
  assert.match(studio,/if \(audioAuto && !uploadedAudio\) setMusic/);
  assert.match(studio,/setAudioAuto\(false\);chooseMusic/);
  assert.match(studio,/controls preload="metadata"/);
  assert.match(studio,/presetAudioUrl\(music\)/);
  assert.match(studio,/isSupportedLocalAudio\(file\)/);
  assert.match(css,/\.audioTrackList\{display:flex;flex-direction:column/);
  assert.match(css,/\.audioFileInput\{position:absolute!important/);
  assert.match(css,/@media\(max-width:380px\)/);
  assert.ok(studio.includes("Под вашу тему")&&studio.includes("For your video theme")&&studio.includes("Para el tema elegido"));
  assert.doesNotMatch(studio+audioSource,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|api\.kling|heygen|higgsfield/i);
});
