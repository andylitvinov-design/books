import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  SCENARIO_AUDIO_REGISTRY, SCENARIO_AUDIO_VARIANTS, CLASSICAL_THEMES,
  isScenarioAudioId,isClassicalAudioId,scenarioAudioTracks,classicalAudioTracks,
} from "../lib/mandala/scenario-audio-catalog.mjs";
import {buildScenarioMusic} from "../scripts/generate-scenario-melodies.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("all 48 approved actual film scenarios have four own unique original MP3 paths",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const start=studio.indexOf("const FREE_FILM_PRESETS:readonly FreeFilmPreset[]");
  const open=studio.indexOf("[",studio.indexOf("=",start));
  const end=studio.indexOf("...(extraFreeFilmPresets.presets",open);
  assert.ok(start>=0&&open>start&&end>open);
  const first=JSON.parse(studio.slice(open,end).trim().replace(/,\s*$/,"")+"]");
  const second=JSON.parse(read("data/video-catalog/free-film-presets-v2.json")).presets;
  const authoritative=[...first,...second];
  assert.equal(authoritative.length,48);
  assert.deepEqual(
    SCENARIO_AUDIO_REGISTRY.map(x=>x.id).sort(),
    authoritative.map(x=>x.id).sort(),
    "no orphan or unscored video scenario in the current production catalog"
  );
  assert.equal(SCENARIO_AUDIO_VARIANTS.length,4);
  const assigned=new Set();
  const categories=new Set();
  for(const film of SCENARIO_AUDIO_REGISTRY){
    categories.add(film.category);
    const soundtracks=scenarioAudioTracks(film.id);
    assert.equal(soundtracks.length,4,film.id);
    assert.equal(new Set(soundtracks.map(x=>x.id)).size,4,film.id);
    for(const entry of soundtracks){
      assert.ok(isScenarioAudioId(entry.id),entry.id);
      assert.equal(entry.kind,"melody");
      assert.equal(entry.rights.license,"first_party_original");
      assert.equal(entry.durationSeconds,32);
      assert.ok(entry.themes.includes(film.theme));
      assert.ok(!assigned.has(entry.id),"no MP3 is assigned to multiple scenarios: "+entry.id);
      assigned.add(entry.id);
      for(const l of ["en","ru","es"])assert.ok(entry.name[l]&&entry.detail[l]);
    }
  }
  assert.deepEqual([...categories].sort(),["body","energy","love","stress","work"]);
  assert.equal(assigned.size,192);
  assert.deepEqual(scenarioAudioTracks("unapproved-scenario"),[]);
  assert.equal(isScenarioAudioId("score-imaginary-1"),false);
});

test("four known public-domain melodies have separate first-party digital recordings",()=>{
  assert.equal(CLASSICAL_THEMES.length,4);
  assert.equal(classicalAudioTracks.length,4);
  assert.equal(new Set(classicalAudioTracks.map(x=>x.id)).size,4);
  for(const song of classicalAudioTracks){
    assert.equal(isClassicalAudioId(song.id),true);
    assert.equal(song.rights.license,"public_domain_composition_first_party_recording");
    assert.match(song.detail.ru,/собственная|синтезированная/i);
  }
});

test("generated MP3s are available to actual player and not empty placeholders",()=>{
  const result=buildScenarioMusic({check:true});
  assert.equal(result.scenarioCount,48);
  assert.equal(result.tracksPerScenario,4);
  assert.equal(result.distinctScenarioMasters,192);
  assert.equal(result.publicDomainThemes,4);
  assert.equal(result.totalMasterFiles,196);
  const names=[
    ...SCENARIO_AUDIO_REGISTRY.flatMap(f=>scenarioAudioTracks(f.id).map(x=>x.id)),
    ...CLASSICAL_THEMES.map(x=>x.id)
  ];
  const hashes=new Set();
  for(const id of names){
    const file=new URL("../public/audio/mandala/scenarios/"+id+".mp3",import.meta.url);
    assert.ok(existsSync(file),id+" missing in production prebuild");
    assert.ok(statSync(file).size>25000,id+" must be real audio");
    const b=readFileSync(file);
    const sha=createHash("sha256").update(b).digest("hex");
    assert.ok(!hashes.has(sha),id+" must have distinct recording bytes");
    hashes.add(sha);
  }
  assert.equal(hashes.size,196);
  const executable=ffmpegPath&&existsSync(ffmpegPath)?ffmpegPath:"ffmpeg";
  // Probe representative compressed recordings, not only their ID3 headers.
  for(const id of [names[0],names[95],names[191],"classic-ode-to-joy"]){
    const file=new URL("../public/audio/mandala/scenarios/"+id+".mp3",import.meta.url);
    const probe=spawnSync(executable,["-hide_banner","-i",file.pathname,"-f","null","-"],
      {encoding:"utf8",timeout:12000,maxBuffer:1024*1024});
    assert.equal(probe.status,0,id+" must fully decode as audio: "+probe.stderr?.slice(-350));
    assert.match(probe.stderr,/Audio: mp3/,id);
  }
});

test("studio exposes four scenario melodies in its existing real audio/video mixer",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const player=read("lib/mandala/local-video-music.ts");
  const pipeline=JSON.parse(read("package.json"));
  assert.match(studio,/scenarioAudioTracks\(activeFreeFilmPreset\)/);
  assert.match(studio,/featuredMelodies\.slice\(0,4\)/);
  assert.match(studio,/availableAudioTracks\.find/);
  assert.match(studio,/toggleQuickMusic\(id\)/);
  assert.match(studio,/playQuickTrack\(id\)/);
  assert.match(player,/\/audio\/mandala\/scenarios\//);
  assert.match(player,/startPresetMixAudio/);
  assert.match(pipeline.scripts.prebuild,/scripts\/generate-scenario-melodies\.mjs/);
  assert.match(pipeline.scripts.predev,/scripts\/generate-scenario-melodies\.mjs/);
});
