import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {createHash} from "node:crypto";
import { mandalaAudioTracks, recommendMandalaAudio } from "../lib/mandala/audio-recommendations.mjs";
import { SONGS, MASTER_IDS, SAMPLE_RATE, DURATION_SECONDS, renderMelody } from "../scripts/generate-mandala-melodies.mjs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio = read("components/mandala-free-video-studio.tsx");
const audioSource = read("lib/mandala/local-video-music.ts");
const mastered = new Set(MASTER_IDS);

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

test("41 first-party tracks: 24 authored melodic performances, 17 optional textures",async()=>{
  assert.equal(mandalaAudioTracks.length,MASTER_IDS.length+17);
  assert.equal(new Set(mandalaAudioTracks.map(t=>t.id)).size,MASTER_IDS.length+17);
  const api=audioApi();
  for(const track of mandalaAudioTracks){
    assert.ok(["tones","pulse","nature","melody"].includes(track.kind),track.id);
    assert.ok(["slow","steady","active"].includes(track.pace),track.id);
    assert.ok(track.themes.length && track.moods.length,track.id);
    for(const lang of ["en","ru","es"]) {
      assert.ok(track.name[lang]&&track.detail[lang],track.id+" "+lang);
    }
    const path=api.presetAudioUrl(track.id);
    assert.equal(path,"/audio/mandala/"+track.id+".wav");
    const published=readFileSync(new URL("../public"+path,import.meta.url));
    const file=mastered.has(track.id)
      ?published:Buffer.from(await api.createAmbientPreviewWav(track.id).arrayBuffer());
    if (!mastered.has(track.id))
      assert.deepEqual(file,published,track.id+" preview bytes equal export PCM bytes");
    assert.equal(file.toString("ascii",0,4),"RIFF");
    assert.equal(file.toString("ascii",8,12),"WAVE");
    assert.equal(file.readUInt16LE(20),1);
    assert.equal(file.readUInt16LE(22),1);
    assert.equal(file.readUInt16LE(34),16);
    assert.equal(file.readUInt32LE(24),SAMPLE_RATE);
    assert.equal(file.readUInt32LE(28),SAMPLE_RATE*2);
    if(mastered.has(track.id)){
      assert.equal(track.kind,"melody",track.id+" must be classified as music");
      assert.equal(track.durationSeconds,DURATION_SECONDS);
      assert.equal(file.readUInt32LE(40),SAMPLE_RATE*DURATION_SECONDS*2);
    }
    let sum=0;
    for(let i=44;i<file.length;i+=2){const a=file.readInt16LE(i)/32768;sum+=a*a}
    assert.ok(Math.sqrt(sum/((file.length-44)/2))>.028,track.id+" must contain audible sound");
  }
  assert.equal(mastered.size,24);
  assert.equal(mandalaAudioTracks.filter(t=>t.kind==="melody").length,MASTER_IDS.length);
  assert.ok(mandalaAudioTracks.filter(t=>t.kind!=="melody").length===17);
  const apiIds=api.ORIGINAL_MELODY_IDS;
  assert.deepEqual([...apiIds].sort(),[...MASTER_IDS].sort(),"export uses same WAV as player");
});

test("every original melody master has authored scores, harmonic movement and distinct WAV bytes",()=>{
  assert.equal(SONGS.length,24);
  const bytes=SONGS.map(song=>{
    assert.equal(song.chords.length,4);
    assert.ok(new Set(song.chords).size>=3,song.id+" needs changing chords");
    assert.ok(song.motif.filter(x=>x!==null).length>=5,song.id+" needs a melody");
    const path=new URL("../public/audio/mandala/"+song.id+".wav",import.meta.url);
    const file=readFileSync(path);
    return {id:song.id,length:file.length,file};
  });
  assert.equal(new Set(bytes.map(x=>x.length)).size,1,"same 32 second loop duration");
  assert.equal(new Set(bytes.map(x=>createHash("sha256").update(x.file).digest("hex"))).size,SONGS.length,
    "each melodic song must have distinct arranged sound, not renamed noise");
  for(const id of ["prosperity","heart-harmony"]){
    const score=SONGS.find(x=>x.id===id);
    assert.deepEqual(renderMelody(score),readFileSync(new URL("../public/audio/mandala/"+id+".wav",import.meta.url)));
  }
});

test("smart selection ranks the current theme rather than inventing profile or test data",()=>{
  for(const theme of ["energy","money","relationships","goals","life","health"]){
    const recommended=recommendMandalaAudio({theme});
    assert.equal(recommended.length,mandalaAudioTracks.length);
    assert.ok(recommended[0].themes.includes(theme),theme+" should have relevant first pick");
    assert.equal(recommended[0].kind,"melody",theme+" must suggest a composed melody, not a sound effect");
  }
  assert.equal(recommendMandalaAudio({theme:"money"})[0].id,"prosperity");
  assert.equal(recommendMandalaAudio({theme:"relationships"})[0].id,"love");
  assert.ok(recommendMandalaAudio({theme:"energy",kind:"nature"}).every(x=>x.kind==="nature"));
  assert.ok(recommendMandalaAudio({theme:"money",mood:"focus"}).every(x=>x.moods.includes("focus")));
  assert.ok(recommendMandalaAudio({pace:"slow"}).every(x=>x.pace==="slow"));
  assert.ok(recommendMandalaAudio({voiceFriendly:true}).every(x=>x.voiceSafe));
  assert.equal(recommendMandalaAudio({kind:"nature",pace:"active"}).length,0);
  assert.equal(recommendMandalaAudio({kind:"melody"}).length,MASTER_IDS.length);
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
  assert.match(studio,/const \[audioKind,setAudioKind\] = useState\("melody"\)/);
  assert.match(studio,/const \[audioAuto,setAudioAuto\] = useState\(true\)/);
  assert.match(studio,/const featuredMelodies=\(scenarioTracks\.length\?scenarioTracks:recommendMandalaAudio/);
  assert.match(studio,/scenarioAudioTracks\(activeFreeFilmPreset\)/);
  assert.match(studio,/const baseAudioMatches=recommendMandalaAudio/);
  assert.match(studio,/const audioMatches=\[\.\.\.matchingScenarioTracks,\.\.\.baseAudioMatches,\.\.\.classicMatches\]/);
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
  assert.doesNotMatch(studio+audioSource,/XMLHttpRequest|FormData|sendBeacon|api\.kling|heygen|higgsfield/i);
  assert.match(audioSource,/fetch\(presetAudioUrl\(id\),\{cache:"force-cache"\}\)/,"melody master is fetched from the same-origin preset path");
});

test("published audio helper copy accurately describes new scenario MP3s plus WAV melodies in EN/RU/ES",()=>{
  assert.match(studio,/originalAudio:"Four distinct instrumental scores/);
  assert.match(studio,/originalAudio:"Четыре отдельные инструментальные мелодии/);
  assert.match(studio,/originalAudio:"Cuatro piezas instrumentales distintas/);
  assert.doesNotMatch(studio,/originalAudio:"13 /,"obsolete soundtrack count must not be displayed");
});
