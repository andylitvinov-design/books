import test from "node:test";
import assert from "node:assert/strict";
import {VIDEO_LIFE_AREAS,lifeAreasForIntent,lifeAreasForStudioCategory,
  normalizeDiscoveryFacets,videoMatchesFacets} from "../lib/video-discovery/taxonomy.mjs";
import {buildPublishedVideoIndex,relatedPublishedVideos,projectApprovedMeditationRows} from "../lib/video-discovery/catalog.mjs";
import {rankDiscoveryVideos} from "../lib/video-discovery/ranker.mjs";
import {parseYouTubeVideoId,normalizeVideoCandidate,parseAiVideoLabels,curationAudit}
  from "../lib/video-discovery/curation.mjs";
const video=(id,props={})=>({id,kind:"video",title:"Original video",youtubeId:id,curation:"verified",...props});
const ID1="AAAAAAAAAAA",ID2="BBBBBBBBBBB",ID3="CCCCCCCCCCC";
test("four root spheres remain canonical and exactly match issue #2480",()=>{
  assert.deepEqual(VIDEO_LIFE_AREAS,["business","relationships","energy_health","personal_growth"]);
  assert.deepEqual(lifeAreasForIntent("work"),["business"]);
  assert.deepEqual(lifeAreasForIntent("stress"),["energy_health"]);
  assert.deepEqual(lifeAreasForIntent("practices"),[]);
  assert.deepEqual(lifeAreasForStudioCategory("love"),["relationships"]);
});
test("trusted Academy overrides map original lesson to type/direction/tradition without guessing audio",()=>{
  const facets=normalizeDiscoveryFacets(video(ID1,{sourceGroup:"videos/greek-mysteries-dionysus"}));
  assert.deepEqual(facets.lifeAreas,["relationships","personal_growth"]);
  assert.equal(facets.contentType,"course_lesson");
  assert.deepEqual(facets.traditions,["greek"]);
  assert.equal(videoMatchesFacets(facets,{area:"personal_growth",direction:"temple",tradition:"greek"}),true);
  assert.equal(videoMatchesFacets(facets,{area:"business"}),false);
});
test("source-specific filtering works for existing fast goal chips",()=>{
  const items=[video(ID1,{topicTags:["work"],sourceGroup:"owner"}),
    video(ID2,{topicTags:["stress"],sourceGroup:"owner"})];
  assert.deepEqual(rankDiscoveryVideos(items,{area:"business"}).map(v=>v.youtubeId),[ID1]);
  assert.deepEqual(rankDiscoveryVideos(items,{area:"energy_health"}).map(v=>v.youtubeId),[ID2]);
});
test("canonical index dedupes by YouTube ID, keeps Greek series order and provenance",()=>{
  const items=[video(ID1,{title:"Dionysus first",sourceGroup:"videos/greek-mysteries-dionysus",seriesId:"greek-dionysus",seriesOrder:1,sourceLabel:"Academy"}),
    video(ID2,{title:"Dionysus second",sourceGroup:"videos/greek-mysteries-dionysus",seriesId:"greek-dionysus",seriesOrder:2}),
    video("dup",{youtubeId:ID1,title:"Mirrored title",curation:"published",sourceLabel:"Owner"})];
  const index=buildPublishedVideoIndex(items);
  assert.equal(index.length,2);
  assert.deepEqual(index.map(v=>v.seriesOrder),[1,2]);
  assert.deepEqual(index[0].provenance,["Academy","Owner"]);
  assert.equal(index[0].href,"https://www.youtube.com/watch?v="+ID1);
});
test("unreviewed and unsafe external candidates never enter public index",()=>{
  const valid=video(ID1,{source_kind:"external",sourceApproved:true,
    editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",
    content_checked_at:"2026-10-30T00:00:00Z"});
  const unsafe=[
    video(ID2,{editorial_status:"candidate",sourceApproved:true}),
    video(ID3,{source_kind:"external",editorial_status:"approved",embed_status:"unverified",
      rights_status:"embed_approved",content_checked_at:"2026-10-30T00:00:00Z",sourceApproved:true}),
    {id:"private",kind:"guide",title:"Client",youtubeId:"DDDDDDDDDDD"},
    video("not-a-real-id"),
  ];
  assert.deepEqual(buildPublishedVideoIndex([...unsafe,valid]).map(v=>v.youtubeId),[ID1]);
});
test("related videos return approved diverse matches only",()=>{
  const src=video(ID1,{topicTags:["stress"],sourceGroup:"one"});
  const related=video(ID2,{topicTags:["stress"],sourceGroup:"two"});
  const unapproved=video(ID3,{topicTags:["stress"],editorial_status:"candidate"});
  assert.deepEqual(relatedPublishedVideos(src,[src,related,unapproved]).map(x=>x.youtubeId),[ID2]);
});
test("video URL import rejects unrelated hosts, credentials and ambiguous IDs",()=>{
  assert.equal(parseYouTubeVideoId("https://youtu.be/"+ID1),ID1);
  assert.equal(parseYouTubeVideoId("https://www.youtube.com/watch?v="+ID1),ID1);
  assert.equal(parseYouTubeVideoId("https://youtube.com/shorts/"+ID1),ID1);
  assert.equal(parseYouTubeVideoId("https://youtube.com.evil.example/watch?v="+ID1),null);
  assert.equal(parseYouTubeVideoId("http://youtube.com/watch?v="+ID1),null);
  assert.equal(parseYouTubeVideoId("https://alice:pass@youtube.com/watch?v="+ID1),null);
});
test("candidate import is always quarantined and never publishes",()=>{
  const c=normalizeVideoCandidate({url:"https://www.youtube.com/watch?v="+ID1,
    title:"Public practice",sourceUrl:"https://example.org/reference",sourceKind:"external"});
  assert.equal(c.ok,true);
  assert.equal(c.candidate.editorial_status,"candidate");
  assert.equal(c.candidate.embed_status,"unverified");
  assert.equal(c.candidate.rights_status,"pending_embed_check");
  assert.equal(normalizeVideoCandidate({url:"https://www.youtube.com/watch?v="+ID2}).ok,false);
});
test("AI labels cannot approve rights, clinical claims or unauthorized tags",()=>{
  const okay=parseAiVideoLabels(JSON.stringify({goals:["energy_health","practices"],
    summary:"Public educational practice",confidence:"medium",warnings:[]}));
  assert.equal(okay.reviewRequired,true);
  assert.equal(parseAiVideoLabels(JSON.stringify({goals:["energy_health"],
    summary:"Fine",confidence:"high",warnings:[],editorial_status:"approved"})),null);
  assert.equal(parseAiVideoLabels(JSON.stringify({goals:["diagnosis"],
    summary:"Fine",confidence:"high",warnings:[]})),null);
});
test("candidate status audit separates approved records from unknown entries",()=>{
  assert.deepEqual(curationAudit([{youtube_id:ID1,source_kind:"external",editorial_status:"candidate"},
    {youtube_id:ID2,source_kind:"original",editorial_status:"approved",embed_status:"confirmed",
      rights_status:"embed_approved",content_checked_at:"2026-10-30"},
    {youtube_id:ID2},{youtube_id:"bad"}]),{
      candidates:2,external:1,original:1,approvedEmbeds:1,linkOnly:0,duplicates:1,invalid:1,
    });
});

test("Supabase candidate rows stay invisible until complete independent review",()=>{
 const base={youtube_id:ID1,title:"Public meditation",creator:"Reviewed author",
   source_kind:"external",source_url:"https://www.youtube.com/watch?v="+ID1,
   source_evidence_url:"https://example.org/public-review",audio_language:"en",
   content_type:"guided",goals:["energy","meaning"],claims_risk:"low",
   subtopics:["energy_health","personal_growth"],
   duration_basis:"metadata_checked",duration_verified_seconds:300,
   editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",
   content_checked_at:"2026-11-01",embed_checked_at:"2026-11-01",metadata_checked_at:"2026-11-01"};
 const unchecked={...base,youtube_id:ID2,source_url:"https://www.youtube.com/watch?v="+ID2,
   content_checked_at:null};
 const unreliable={...base,youtube_id:ID3,source_url:"https://www.youtube.com/watch?v="+ID3,
   source_evidence_url:null};
 const reviewed=projectApprovedMeditationRows([base,unchecked,unreliable]);
 assert.equal(reviewed.length,1);
 assert.equal(reviewed[0].youtubeId,ID1);
 assert.equal(reviewed[0].audioLanguage,"en");
 assert.equal(reviewed[0].durationVerifiedSeconds,300);
 assert.equal(reviewed[0].contentType,"soft_meditation");
 assert.deepEqual(reviewed[0].topicTags,["energy","meaning"]);
 assert.equal(buildPublishedVideoIndex(reviewed).length,1);
 assert.deepEqual(projectApprovedMeditationRows([{...base,editorial_status:"candidate"}]),[]);
 assert.deepEqual(projectApprovedMeditationRows([{...base,duration_verified_seconds:601}]),[]);
});

test("high-risk original videos cannot be published through the discovery adapter",()=>{
  const row={youtube_id:ID1,title:"Original",creator:"Owner",source_kind:"original",
    source_url:"https://www.youtube.com/watch?v="+ID1,audio_language:"ru",
    content_type:"guided",goals:["energy"],claims_risk:"high",
    editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",
    content_checked_at:"2026-11-01",embed_checked_at:"2026-11-01",metadata_checked_at:"2026-11-01"};
  assert.deepEqual(projectApprovedMeditationRows([row]),[]);
});
