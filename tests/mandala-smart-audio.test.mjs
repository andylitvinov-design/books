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

test("13 original soundtrack presets have distinct site-local playable masters matching the video export source",async()=>{
  assert.equal(mandalaAudioTracks.length,13);
  assert.equal(new Set(mandalaAudioTracks.map(t=>t.id)).size,13);
  const api=audioApi();
  for(const track of mandalaAudioTracks){
    assert.ok(["tones","pulse","nature"].includes(track.kind),track.id);
    assert.ok(["slow","steady","active"].includes(track.pace),track.id);
    assert.ok(track.themes.length && track.moods.length,track.id);
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
    let sum=0;
    for(let i=44;i<file.length;i+=2){const a=file.readInt16LE(i)/32768;sum+=a*a}
    assert.ok(Math.sqrt(sum/((file.length-44)/2))>.028,track.id+" must contain audible sound");
  }
});

test("smart selection ranks the current theme rather than inventing profile or test data",()=>{
  for(const theme of ["energy","money","relationships","goals","life","health"]){
    const recommended=recommendMandalaAudio({theme});
    assert.equal(recommended.length,13);
    assert.ok(recommended[0].themes.includes(theme),theme+" should have relevant first pick");
  }
  assert.equal(recommendMandalaAudio({theme:"money"})[0].id,"prosperity");
  assert.equal(recommendMandalaAudio({theme:"relationships"})[0].id,"love");
  assert.ok(recommendMandalaAudio({theme:"energy",kind:"nature"}).every(x=>x.kind==="nature"));
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
  assert.match(studio,/kind:audioKind,mood:audioMood,pace:audioPace/);
  assert.match(studio,/theme,kind:audioKind/);
  assert.match(studio,/voiceFriendly:audioVoiceFriendly,wish/);
  assert.match(studio,/if \(audioAuto && !uploadedAudio\) setMusic/);
  assert.match(studio,/setAudioAuto\(false\);chooseMusic/);
  assert.match(studio,/controls preload="metadata"/);
  assert.match(studio,/presetAudioUrl\(music\)/);
  assert.match(studio,/isSupportedLocalAudio\(file\)/);
  assert.match(css,/\.audioTrackGrid\{display:grid/);
  assert.match(css,/\.audioFileInput\{position:absolute!important/);
  assert.match(css,/@media\(max-width:380px\)/);
  assert.ok(studio.includes("Под вашу тему")&&studio.includes("For your video theme")&&studio.includes("Para el tema elegido"));
  assert.doesNotMatch(studio+audioSource,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|api\.kling|heygen|higgsfield/i);
});
