import test from "node:test";
import assert from "node:assert/strict";
import {projectReviewedShortLessonRows} from "../lib/video-discovery/reviewed-short-lessons.mjs";
const row=(id,overrides={})=>({
  youtube_id:id,title:"Communication & Relationships",creator:"Original creator",
  source_kind:"external",source_url:"https://www.youtube.com/watch?v="+id,
  source_evidence_url:"https://example.org/owner-channel",audio_language:"en",
  content_type:"talk",goals:["relationships"],subtopics:["relationships","connection"],
  duration_basis:"metadata_checked",duration_verified_seconds:600,
  editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",
  metadata_checked_at:"2026-10-30T00:00:00Z",content_checked_at:"2026-11-08T00:00:00Z",
  embed_checked_at:"2026-11-08T00:00:00Z",claims_risk:"low",...overrides,
});
const one="abcdefghijk",two="lmnopqrstuv";
test("short RU/EN educational talks are categorized for MyTube and topic chips",()=>{
  const res=projectReviewedShortLessonRows([row(one),row(two,{
    audio_language:"ru",title:"Как учиться эффективнее",goals:["goals"],
    subtopics:["business","work"],duration_verified_seconds:308
  })]);
  assert.equal(res.length,2);
  assert.equal(res[0].contentType,"explanation");
  assert.deepEqual(res[0].lifeAreas,["relationships"]);
  assert.ok(res[0].topicTags.includes("relationships"));
  assert.equal(res[0].durationVerifiedSeconds,600);
  assert.equal(res[1].audioLanguage,"ru");
  assert.deepEqual(res[1].lifeAreas,["business"]);
  assert.ok(res[1].topicTags.includes("work"));
});
test("unreviewed, unsafe, long or unknown-duration clips never appear",()=>{
  const variants=[
    {editorial_status:"candidate"},{embed_status:"unverified"},
    {rights_status:"pending_embed_check"},{content_checked_at:null},
    {embed_checked_at:null},{metadata_checked_at:null},
    {duration_verified_seconds:601},{duration_verified_seconds:null},
    {duration_basis:"title_only"},{claims_risk:"unknown"},
    {audio_language:"unknown"},{content_type:"unknown"},
    {source_evidence_url:null},{source_url:"https://evil.example/a"},
  ];
  for(const value of variants)
    assert.deepEqual(projectReviewedShortLessonRows([row(one,value)]),[],JSON.stringify(value));
});
test("YouTube deduplication and no invented area",()=>{
  assert.equal(projectReviewedShortLessonRows([row(one),row(one)]).length,1);
  assert.deepEqual(projectReviewedShortLessonRows([row(one,{subtopics:[],goals:[]})]),[]);
  assert.deepEqual(projectReviewedShortLessonRows([row(one,{youtube_id:"invalid"})]),[]);
});
test("approved Spanish-language sources keep compatibility",()=>{
  assert.equal(projectReviewedShortLessonRows([row(one,{audio_language:"es"})])[0].audioLanguage,"es");
});
