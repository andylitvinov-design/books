import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rankMeditationCatalog} from "../lib/holistic-support/meditation-catalog-ranker.mjs";
const videos=JSON.parse(readFileSync(new URL("../data/academy/meditation-catalog-candidates-20261028.json",import.meta.url),"utf8")).videos;
const facets=JSON.parse(readFileSync(new URL("../data/academy/meditation-filter-facets-20261028.json",import.meta.url),"utf8")).facets;
test("curated metadata has unique video IDs and staging safeguards",()=>{
 assert.equal(videos.length,31);
 assert.equal(new Set(videos.map(v=>v.youtube_id)).size,31);
 assert.equal(videos.filter(v=>v.source_kind==="original").length,11);
 assert.equal(videos.filter(v=>v.source_kind==="external").length,20);
 assert.equal(facets.length,62);
 for(const v of videos) {
  assert.match(v.youtube_id,/^[A-Za-z0-9_-]{11}$/);
  assert.equal(v.source_url,`https://www.youtube.com/watch?v=${v.youtube_id}`);
  assert.ok(["en","ru","es"].includes(v.audio_language));
  assert.equal(v.editorial_status,"candidate");
  assert.equal(v.embed_status,"unverified");
  assert.equal(v.rights_status,"pending_embed_check");
  assert.ok(v.goals.length>0 && v.goals.every(g=>facets.some(f=>f.facet_type==="goal"&&f.facet_key===g)));
 }
});
test("no unreviewed videos become publicly recommended",()=>{
 const output=rankMeditationCatalog({videos,request:{language:"en",goal:"money"}});
 assert.deepEqual(output,[]);
});
test("money worry maps to matching meditations, not magical income claims",()=>{
 const matches=rankMeditationCatalog({videos,editorialPreview:true,request:{
   language:"en",goal:"money",situations:["money_worries"],desiredStates:["calm"],limit:5
 }});
 assert.ok(matches.length>=2);
 assert.equal(matches[0].video.youtube_id,"fWfG5gXHK5Y");
 assert.ok(matches.slice(0,2).every(x=>x.matchType==="exact"));
 assert.ok(matches[0].reasons.some(r=>r.value==="money_worries"));
});
test("source audio language is strict, even in candidate preview",()=>{
 const spanish=rankMeditationCatalog({videos,editorialPreview:true,request:{language:"es",goal:"energy"}});
 assert.ok(spanish.length>0);
 assert.ok(spanish.every(x=>x.video.audio_language==="es"));
 const russian=rankMeditationCatalog({videos,editorialPreview:true,request:{language:"ru",goal:"energy"}});
 assert.ok(russian.length>0);
 assert.ok(russian.every(x=>x.video.audio_language==="ru"));
});
test("unverified duration is never presented as exact under a strict limit",()=>{
 const matches=rankMeditationCatalog({videos,editorialPreview:true,request:{language:"en",goal:"money",maxDurationMinutes:15}});
 assert.equal(matches.length,0);
 const softMatches=rankMeditationCatalog({videos,editorialPreview:true,request:{language:"en",goal:"money",maxDurationMinutes:15,allowUnverifiedDuration:true}});
 assert.ok(softMatches.length>=1);
 assert.ok(softMatches.every(x=>!x.durationVerified));
});
test("risks can be explicitly excluded and not silently relabelled",()=>{
 const a=rankMeditationCatalog({videos,editorialPreview:true,request:{language:"ru",goal:"energy",maxRisk:"low",limit:30}});
 assert.ok(a.every(x=>x.video.claims_risk==="low"));
});
