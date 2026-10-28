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
 assert.ok(["fWfG5gXHK5Y","8Cx-cTU1Y9k"].includes(matches[0].video.youtube_id));
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

test("previously published original IDs are recommended without promoting archived candidates", () => {
 const ids=["HqfixazXqRY","w2BN-HYmHUk"];
 const found=rankMeditationCatalog({videos, publishedSourceIds:ids,
   request:{language:"en",goal:"energy",sourceKind:"original"}});
 assert.ok(found.length>=1);
 assert.ok(found.every(x=>x.playback==="embedded" && ids.includes(x.video.youtube_id)));
 const withoutWhitelist=rankMeditationCatalog({videos,request:{language:"en",goal:"energy",sourceKind:"original"}});
 assert.equal(withoutWhitelist.length,0);
});
test("verified public listing suggests original YouTube link only; no iframe without full QA",()=>{
 const link=videos.find(x=>x.youtube_id==="fWfG5gXHK5Y");
 const publicLink={...link,discovery_status:"link_only",metadata_checked_at:"2026-10-28T00:00:00Z",youtube_oembed_checked_at:"2026-10-28T00:00:00Z"};
 const hits=rankMeditationCatalog({videos:[publicLink],request:{
   language:"en",goal:"money",situations:["money_worries"],desiredStates:["calm"],
 }});
 assert.equal(hits.length,1);
 assert.equal(hits[0].playback,"youtube_only");
 assert.ok(hits[0].reasons.some(x=>x.facet==="situation" && x.value==="money_worries"));
 const noDate=rankMeditationCatalog({videos:[{...publicLink,metadata_checked_at:null}],
   request:{language:"en",goal:"money"}});
 assert.equal(noDate.length,0);
 const noOembed=rankMeditationCatalog({videos:[{...publicLink,youtube_oembed_checked_at:null}],request:{language:"en",goal:"money"}});
 assert.equal(noOembed.length,0);
 const unsafe=rankMeditationCatalog({videos:[{...publicLink,claims_risk:"high"}],
   request:{language:"en",goal:"money",maxRisk:"high",includeHighClaims:true}});
 assert.equal(unsafe.length,0);
});
test("fully published/embeddable editorial recording can play in-site",()=>{
 const title=videos.find(x=>x.youtube_id==="qbPE5zaiNqs");
 const approved={...title,editorial_status:"approved",embed_status:"confirmed",
   rights_status:"embed_approved",content_checked_at:"2026-10-28T00:00:00Z"};
 const hits=rankMeditationCatalog({videos:[approved],request:{language:"en",goal:"relationships"}});
 assert.equal(hits.length,1);
 assert.equal(hits[0].playback,"embedded");
});
test("public integration keeps original library and precise, local client-only state",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 const gallery=read("components/holistic-meditation-gallery.tsx");
 const finder=read("components/holistic-meditation-finder.tsx");
 const server=read("lib/holistic-support/meditation-discovery-server.ts");
 const page=read("app/[locale]/holistic-support/page.tsx");
 assert.match(gallery,/data-meditation-finder-toggle/);
 assert.match(gallery,/HolisticMeditationFinder/);
 assert.match(finder,/data-meditation-audio-language/);
 assert.match(finder,/data-meditation-goal=\{item\}/);
 assert.match(finder,/data-meditation-results/);
 assert.match(finder,/youtube_only/);
 assert.match(server,/getAppConfig/);
 assert.match(server,/createClient/);
 assert.match(server,/freeMeditationVideos\("ru"\)/);
 assert.match(server,/englishGuidedMeditations/);
 assert.match(server,/AbortSignal\.timeout\(4000\)/);
 assert.match(page,/loadMeditationDiscovery\(locale\)/);
 assert.doesNotMatch(finder,/localStorage|sessionStorage|sendBeacon|navigator\.geolocation|URLSearchParams|fetch\(/);
});
