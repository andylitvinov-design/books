import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MYTUBE_MUSIC_BEDS,MYTUBE_REVIEWED_MUSIC_BEDS,MYTUBE_BED_FADES,
  myTubeAudioLaneGains,validateMyTubeMusicBed
} from "../lib/mandala/creative-editor-audio-lanes.mjs";
import {createMyTubeEditorDraft,parseMyTubeEditorDraft} from "../lib/mandala/creative-editor-draft.mjs";
import {curatedAudioTracks} from "../lib/mandala/curated-audio-recommendations.mjs";
const allow={
 approvedSceneIds:["safe-1","safe-2","safe-3","safe-4"],
 approvedPresetIds:["approved-preset"],
 approvedAudioIds:[...MYTUBE_MUSIC_BEDS,...MYTUBE_REVIEWED_MUSIC_BEDS]
};
const shots=()=>allow.approvedSceneIds.map((sceneId,i)=>({
 sceneId,startSeconds:i*5,durationSeconds:5,overlayText:""
}));
const project=()=>({presetId:"approved-preset",aspect:"portrait",durationSeconds:20,
 shots:shots(),captions:null,audioStartSeconds:0});
const bed={id:"quiet-stars",volumePercent:30,fadeSeconds:1};
test("legacy music IDs remain compatible while new beds require approved recordings",()=>{
 assert.deepEqual([...MYTUBE_MUSIC_BEDS],[
   "warm-morning","wings-of-light","heart-harmony","quiet-stars","bright-path"
 ]);
 assert.deepEqual([...MYTUBE_BED_FADES],[0,.5,1,2]);
 assert.ok(MYTUBE_REVIEWED_MUSIC_BEDS.length>=3);
 assert.deepEqual([...MYTUBE_REVIEWED_MUSIC_BEDS],curatedAudioTracks
   .filter(track=>track.voiceSafe&&track.rights?.sourceType==="reviewed_external_recording")
   .map(track=>track.id));
 for(const id of MYTUBE_REVIEWED_MUSIC_BEDS)
   assert.equal(validateMyTubeMusicBed({...bed,id}).id,id);

 assert.deepEqual(validateMyTubeMusicBed(bed),bed);
 for(const invalid of [
   {...bed,id:"https://outside.invalid/song"},
   {...bed,id:"curated-private"},
   {...bed,volumePercent:65},
   {...bed,volumePercent:-5},
   {...bed,volumePercent:31},
   {...bed,fadeSeconds:3},
   {...bed,fadeSeconds:NaN},
   {...bed,token:"secret"},
   null,[],{__proto__:null}
 ])assert.throws(()=>validateMyTubeMusicBed(invalid),/invalid_mytube_music_bed/);
});
test("two audio lanes have independent, bounded gains and preserve the original mono path",()=>{
 const solo=myTubeAudioLaneGains(80,30,false);
 assert.equal(solo.primary,.8);
 assert.equal(solo.bed,0);
 const mix=myTubeAudioLaneGains(80,30,true);
 assert.ok(Math.abs(mix.primary-.8/Math.sqrt(2))<1e-12);
 assert.ok(Math.abs(mix.bed-.8*.3/Math.sqrt(2))<1e-12);
 assert.equal(myTubeAudioLaneGains(100,0,true).bed,0);
 for(const v of [-5,101,NaN,Infinity]){
   assert.throws(()=>myTubeAudioLaneGains(v,30,true),/invalid_mytube_audio_lane_gains/);
 }
 assert.throws(()=>myTubeAudioLaneGains(80,61,true),/invalid_mytube_audio_lane_gains/);
});
test("backwards-compatible local draft stores only safe melody metadata and never client audio",()=>{
 const old=createMyTubeEditorDraft(project(),allow);
 assert.equal(parseMyTubeEditorDraft(old,allow).musicBed,undefined);
 const newer=createMyTubeEditorDraft({...project(),musicBed:bed,voiceFile:"private-voice.wav"},allow);
 const decoded=parseMyTubeEditorDraft(newer,allow);
 assert.deepEqual(decoded.musicBed,bed);
 assert.equal(newer.includes("private-voice.wav"),false);
 const forged=JSON.parse(newer);
 forged.musicBed={...bed,id:"https://outside.invalid/voice.mp3"};
 assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify(forged),allow),/mytube_draft_music_bed/);
 forged.musicBed=bed;forged.audioRawBytes="secret";
 assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify(forged),allow),/mytube_draft_format/);
 assert.throws(()=>parseMyTubeEditorDraft(newer,{...allow,approvedAudioIds:[]}),
   /mytube_draft_music_bed/);
});
test("native WebCodecs, MediaRecorder and preview consume independent voice/music settings",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const audio=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
 const web=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
 const timeline=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
 assert.match(studio,/data-video-audio-bed-select/);
 assert.match(studio,/data-video-audio-bed-volume/);
 assert.match(studio,/data-video-audio-bed-fade/);
 assert.match(studio,/startLayeredVideoAudio\(/);
 assert.match(studio,/gainPercent:musicBed\.volumePercent/);
 assert.match(studio,/musicBed,/);
 assert.match(studio,/MYTUBE_MUSIC_BEDS/);
 assert.match(studio,/attachedAudio\?\.kind==="file"\?musicBed:null/);
 assert.match(timeline,/data-video-timeline-music-bed/);
 assert.match(audio,/const resumed=context\.resume\(\)/);
 assert.match(audio,/context\.createMediaStreamDestination\(\)/);
 assert.match(audio,/myTubeAudioLaneGains\(/);
 assert.match(web,/laneGain=baseGain\*lanePercent\/100/);
 assert.match(web,/fadeInSeconds/);
 assert.match(web,/fadeOutSeconds/);
 assert.doesNotMatch(audio,/fetch\(\s*["\x27]https?:\/\//);
});

test("voice auto music fails closed while explicit licensed beds retain export support",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const audio=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
 assert.match(studio,/tracks:voiceBedMode\?\[\]:rankedAudioPool/);
 assert.doesNotMatch(studio,/tracks:voiceBedMode\?mandalaAudioTracks\.filter/);
 assert.match(studio,/if\(!MYTUBE_REVIEWED_MUSIC_BEDS\.some\(id=>id===choice\)\)/);
 assert.match(studio,/\{MYTUBE_REVIEWED_MUSIC_BEDS\.map\(id=>/);
 assert.match(studio,/approvedCuratedBedIds:MYTUBE_REVIEWED_MUSIC_BEDS/);
 assert.match(audio,/isCuratedAudioPreset\(bedId\)&&options\.approvedCuratedBedIds\?\.includes\(bedId\)===true/);
 assert.match(studio,/preset:musicBed\.id,loop:true,startSeconds:0/);
 assert.match(studio,/const bedUrl=activeBed\?presetAudioUrl\(musicBed\.id/);
});
