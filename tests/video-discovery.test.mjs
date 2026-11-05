import test from "node:test";
import assert from "node:assert/strict";
import { getVideoTopics, rankDiscoveryVideos, VIDEO_GOALS } from "../lib/video-discovery/ranker.mjs";
const item=(id,attributes={})=>({id,kind:"video",youtubeId:id,title:"Public lesson",description:"Practice",...attributes});
test("goal vocabulary has stable IDs",()=>{
  assert.deepEqual(VIDEO_GOALS,["all","stress","energy","relationships","work","meaning","practices"]);
});
test("editorial tags override vague language inference",()=>{
  assert.deepEqual(getVideoTopics(item("aa123456789",{title:"Stress and Reiki",topicTags:["energy","practices","energy"]})),["energy","practices"]);
});
test("Russian and English language titles are classified",()=>{
  assert.ok(getVideoTopics(item("aa123456789",{title:"Спокойствие и защита"})).includes("stress"));
  assert.ok(getVideoTopics(item("bb123456789",{title:"Tantra Reiki"})).includes("energy"));
});
test("filters by goal and actual audio language without guessing translation",()=>{
  const videos=[
    item("aa123456789",{topicTags:["stress"],audioLanguage:"ru"}),
    item("bb123456789",{topicTags:["energy"],audioLanguage:"en"}),
    item("cc123456789",{topicTags:["stress"]}),
  ];
  assert.deepEqual(rankDiscoveryVideos(videos,{goal:"stress",language:"ru"}).map(x=>x.youtubeId),["aa123456789"]);
  assert.deepEqual(rankDiscoveryVideos(videos,{goal:"stress",language:"en"}),[]);
});
test("no duplicates and hidden IDs never reappear",()=>{
  const videos=[item("aa123456789"),item("duplicate",{youtubeId:"aa123456789"}),item("bb123456789")];
  assert.deepEqual(rankDiscoveryVideos(videos,{hiddenIds:["aa123456789"]}).map(x=>x.youtubeId),["bb123456789"]);
});
test("saved only, source verification and existing order modes",()=>{
  const videos=[item("aa123456789",{curation:"published"}),
    item("bb123456789",{curation:"verified"}),
    item("cc123456789",{curation:"published"})];
  assert.equal(rankDiscoveryVideos(videos)[0].youtubeId,"bb123456789");
  assert.deepEqual(rankDiscoveryVideos(videos,{savedOnly:true,savedIds:["cc123456789"]}).map(x=>x.youtubeId),["cc123456789"]);
  assert.deepEqual(rankDiscoveryVideos(videos,{sort:"series"}),videos);
});
test("never recommend non-video content",()=>{
  assert.deepEqual(rankDiscoveryVideos([{id:"private",kind:"guide",title:"Client",youtubeId:"secret"}]),[]);
});
