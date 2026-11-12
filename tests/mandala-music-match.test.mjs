import test from "node:test";
import assert from "node:assert/strict";
import {rankPersonalMusic,MUSIC_MATCH_VERSION} from "../lib/mandala/music-match.mjs";
import {mandalaAudioTracks} from "../lib/mandala/audio-recommendations.mjs";
import {SCENARIO_AUDIO_REGISTRY,scenarioAudioTracks,classicalAudioTracks}
  from "../lib/mandala/scenario-audio-catalog.mjs";
import {curatedAudioTracks} from "../lib/mandala/curated-audio-recommendations.mjs";
const testSong=(id,opts={})=>({id,kind:"melody",themes:["energy"],moods:["calm"],
 pace:"slow",voiceSafe:true,durationSeconds:32,
 name:{ru:id,en:id,es:id},detail:{ru:"",en:"",es:""},...opts});
const samples=[
 testSong("quiet-stars",{themes:["health"],moods:["calm","focus"]}),
 testSong("gentle-heart",{themes:["relationships"],name:{ru:"Нежное сердце",en:"Tender heart",es:"Corazón amable"}}),
 testSong("bright-step",{themes:["goals","money"],moods:["uplift","focus"],pace:"active",voiceSafe:false}),
 testSong("steady-piano",{themes:["goals","money"],moods:["focus"],pace:"steady"}),
 testSong("warm-morning",{themes:["energy"],moods:["uplift","calm"]}),
];
test("all physically approved source registries can be tagged and globally ranked",()=>{
 const approved=[...SCENARIO_AUDIO_REGISTRY.flatMap(row=>scenarioAudioTracks(row.id)),
   ...mandalaAudioTracks,...curatedAudioTracks,...classicalAudioTracks];
 assert.equal(MUSIC_MATCH_VERSION,"hh-music-match-v1");
 assert.equal(SCENARIO_AUDIO_REGISTRY.length,49);
 assert.equal(approved.filter(row=>row.kind==="melody").length,
   196+24+classicalAudioTracks.length+curatedAudioTracks.length);
 const ranked=rankPersonalMusic({tracks:approved,theme:"relationships",
   wish:"Хочу любви, доверия и тепла",limit:300});
 assert.equal(ranked.length,approved.filter(row=>row.kind==="melody").length);
 assert.equal(new Set(ranked.map(row=>row.id)).size,ranked.length);
 assert.ok(ranked[0].themes.includes("relationships"));
 assert.ok(ranked.every(row=>row.tags.voiceSafe===row.voiceSafe&&row.tags.moods.length));
 for(const row of ranked)for(const lang of ["ru","en","es"])
   assert.ok(row.name[lang]&&row.detail[lang]!==undefined);
});
test("a selected story outranks generic songs when matching the stated need",()=>{
 const chosen=SCENARIO_AUDIO_REGISTRY.find(x=>x.theme==="health");
 const songs=scenarioAudioTracks(chosen.id);
 const tracks=[...songs,...mandalaAudioTracks];
 const ranked=rankPersonalMusic({tracks,theme:chosen.theme,
  scenarioId:chosen.id,priorityIds:songs.map(x=>x.id),wish:"Я хочу отдыха и покоя"});
 assert.equal(ranked.length,3);
 assert.ok(songs.some(x=>x.id===ranked[0].id));
 assert.equal(new Set(ranked.map(x=>x.id)).size,3);
});
test("voice-safe, publisher rights and category filters are hard gates",()=>{
 const invalid=testSong("curated-fake",{rights:{license:"CC-BY-NC-4.0"}});
 const tracks=[...samples,invalid,testSong("noise",{kind:"nature"}),
    testSong("short",{durationSeconds:0}),testSong("invalid-path!",{})];
 const ranked=rankPersonalMusic({tracks,theme:"goals",voiceFriendly:true,limit:30});
 assert.equal(ranked.some(x=>x.id==="bright-step"),false);
 assert.equal(ranked.some(x=>x.id==="curated-fake"),false);
 assert.equal(ranked.some(x=>x.id==="noise"),false);
 assert.equal(ranked.some(x=>x.id==="short"),false);
 assert.deepEqual(rankPersonalMusic({tracks,kind:"nature"}),[]);
});
test("three RU/EN/ES recommendations change with request; no stored raw wish",()=>{
 const request="Хочу собраться для презентации и действовать уверенно";
 const work=rankPersonalMusic({tracks:samples,theme:"goals",wish:request});
 const rest=rankPersonalMusic({tracks:samples,theme:"health",wish:"Хочу расслабиться и отдыхать"});
 const en=rankPersonalMusic({tracks:samples,theme:"relationships",wish:"Tender, peaceful love"});
 const es=rankPersonalMusic({tracks:samples,theme:"relationships",wish:"Amor y tranquilidad"});
 assert.equal(work[0].id,"steady-piano");
 assert.equal(rest[0].id,"quiet-stars");
 assert.equal(en[0].id,"gentle-heart");
 assert.equal(es[0].id,"gentle-heart");
 assert.equal(work.length,3);
 assert.ok(work.every(x=>!JSON.stringify(x).includes(request)));
 assert.deepEqual(work,rankPersonalMusic({tracks:samples,theme:"goals",wish:request}));
});
test("UI offers one of three suggestions and preserves user voice/silence",async()=>{
 const {readFileSync}=await import("node:fs");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const ideas=studio.slice(studio.indexOf('data-hypno-music'),
   studio.indexOf('id="phrase-audio-settings"'));
 assert.match(studio,/rankPersonalMusic\(\{tracks:rankedAudioPool/);
 assert.match(studio,/SCENARIO_AUDIO_REGISTRY\.flatMap\(\(scene:\{id:string\}\)=>scenarioAudioTracks\(scene\.id\)\)/);
 assert.match(studio,/const featuredMelodies=rankPersonalMusic/);
 assert.match(ideas,/featuredMelodies\.slice\(0,3\)/);
 assert.match(ideas,/onClick=\{\(\)=>choosePersonalMusic\(id\)\}/);
 assert.match(ideas,/data-phrase-music-play=\{id\}/);
 assert.match(studio,/if\(attachedAudio\?\.kind==="file"\)\{/);
 assert.match(studio,/changeMusicBed\(\{id:choice as MyTubeMusicBed\["id"\]\}\)/);
 assert.match(studio,/setAudioAuto\(false\);chooseMusic\("none"\);setAttachedAudio\(null\)/);
 assert.match(studio,/startPresetAudio\(attachedAudio\.id,soundVolume/);
});

test("personalized Music Match remains visible in Ideas Voice while legacy controls stay hidden",async()=>{
 const {readFileSync}=await import("node:fs");
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 const hidden='.studio[data-active-workspace="phrases"] [data-ideas-subtab="voice"] [data-hypno-overview]>:not([data-hypno-voice]):not([data-personalized-music-match]):not(#phrase-audio-settings){display:none!important}';
 assert.ok(css.includes(hidden),"compact Ideas Voice must exclude personalized music from its hidden legacy child selector");
 assert.match(css,/\.studio\[data-active-workspace="phrases"\] \.phraseMusicSection\[data-personalized-music-match\]\{display:grid!important\}/,
   "the current 3 Music Match suggestions must remain visible");
});
