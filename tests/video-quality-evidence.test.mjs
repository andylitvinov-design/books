import test from "node:test";
import assert from "node:assert/strict";
import {videoQualityEvidence,presetQualityTieBreaker} from "../lib/mandala/video-quality-evidence.mjs";
import {recommendAutoVideo} from "../lib/mandala/auto-video-director.mjs";
const sha="a".repeat(64);
const scene=(id,props={})=>({
  id,theme:"health",status:"approved",collection:"original-motion-v1",
  video:"/videos/holistic-house/original-motion-v1/"+id+".mp4",
  media:"original_motion_mp4",visualOrigin:"original_procedural_non_photographic",
  rightsReference:{kind:"project_generated_original"},sha256:sha,
  width:432,height:768,fps:18,motifs:["light"],tags:["abstract"],
  ...props
});
test("the 684 legacy motion files cannot masquerade as native HD",()=>{
  const original=scene("motion-legacy");
  assert.equal(videoQualityEvidence(original).tier,"standard_motion_art");
  assert.equal(videoQualityEvidence(original).weight,0);
  assert.equal(videoQualityEvidence({...original,video:"https://stock.example/media.mp4"}).tier,"rejected");
});
test("unreviewed 720p with good codec is not editor-approved quality",()=>{
  const x=scene("clip-hd",{
    collection:"film-collection-v3",media:"licensed_mp4",
    video:"/videos/holistic-house/film-collection-v3/clip-hd.mp4",
    rightsReference:{kind:"dareful_cc_by_4_0"},width:720,height:1280,fps:24,
    technicalQuality:{score:95,sha256:sha,decodedFrame:true,editorialApproved:false}
  });
  assert.equal(videoQualityEvidence(x).tier,"technical_hd_pending_editorial_review");
  const reviewed={...x,technicalQuality:{...x.technicalQuality,editorialApproved:true}};
  assert.equal(videoQualityEvidence(reviewed).tier,"editorially_reviewed_hd");
  assert.equal(videoQualityEvidence({...reviewed,width:1080,height:1920}).tier,"editorially_reviewed_fullhd");
  assert.equal(videoQualityEvidence({...reviewed,technicalQuality:{...reviewed.technicalQuality,score:20}}).weight,1);
});
test("quality tie-breaker never overrides goal relevance or creates source URLs",()=>{
  const standard=[1,2,3,4].map(i=>scene("standard-"+i));
  const full=[1,2,3,4].map(i=>scene("full-"+i,{
    collection:"film-collection-v3",media:"licensed_mp4",
    video:"/videos/holistic-house/film-collection-v3/full-"+i+".mp4",
    rightsReference:{kind:"dareful_cc_by_4_0"},width:720,height:1280,fps:24,
    technicalQuality:{sha256:sha,score:78,decodedFrame:true,editorialApproved:true}
  }));
  const a={id:"standard",theme:"health",clips:standard.map(x=>x.id)};
  const b={id:"full",theme:"health",clips:full.map(x=>x.id)};
  const sources=[...standard,...full],map=new Map(sources.map(x=>[x.id,x]));
  assert.ok(presetQualityTieBreaker(b,map)>presetQualityTieBreaker(a,map));
  const chosen=recommendAutoVideo({goal:"",preferredTheme:"health",
    presets:[a,b],scenes:sources});
  assert.equal(chosen.presetId,"full");
  assert.equal(chosen.sourceClipIds.length,4);
  assert.equal(chosen.paidRenderApproved,false);
});
test("legacy licensed collection metadata is ranked without an invented personal QA approval",()=>{
  const v2=scene("source-v2",{
    collection:"film-collection-v2",media:"licensed_mp4",
    video:"/videos/holistic-house/film-collection-v2/source-v2.mp4",
    rightsReference:{kind:"existing_approved_first_party_master"},width:undefined,height:undefined,fps:undefined
  });
  const v1={...v2,id:"source-v1",collection:"money-films-v1",
    video:"/videos/holistic-house/money-films-v1/source-v1.mp4"};
  const full=videoQualityEvidence(v2),hd=videoQualityEvidence(v1);
  assert.equal(full.tier,"collection_reported_fullhd");
  assert.equal(hd.tier,"collection_reported_hd_unknown_fps");
  assert.equal(full.weight,2);
  assert.equal(hd.weight,1);
  assert.notEqual(full.tier,"editorially_reviewed_fullhd");
});

test("reviewed portrait HD edit is technically 720p but not native portrait film",()=>{
 const x={id:"sun-trees-forest",theme:"health",status:"approved",collection:"film-collection-v3",media:"licensed_mp4",
  video:"/videos/holistic-house/film-collection-v3/sun-trees-forest.mp4",width:720,height:1280,fps:24,
  rightsReference:{kind:"dareful_cc_by_4_0"},technicalQuality:{score:100,sha256:"a".repeat(64),decodedFrame:true,editorialApproved:true,sourceOriginalLandscapeCrop:true}};
 const result=videoQualityEvidence(x);
 assert.equal(result.tier,"editorially_reviewed_encoded_portrait_hd");
 assert.equal(result.weight,4);
 assert.match(result.reason,/not_native/);
});
