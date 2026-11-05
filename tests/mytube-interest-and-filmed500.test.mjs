import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import curation from '../data/video-catalog/mytube-interest-curation-v1.json' with {type:'json'};
import master from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import {sceneEditorialInterest} from '../lib/mandala/mytube-interest-priority.mjs';
import {recommendMyTubeTopicStoryClips} from '../lib/mandala/mytube-video-tagging.mjs';
import {localFilmed500Inventory,FILMED500_CATEGORY_TARGETS} from '../lib/video-vault/verified-filmed-inventory.mjs';
const sha='a'.repeat(64),page='https://dareful.com/test-sun-forest/';
const fakeScene={id:'test-forest',media:'licensed_mp4',status:'approved',video:'/videos/holistic-house/film-collection-v3/test-forest.mp4',technicalQuality:{sha256:sha,editorialApproved:true,decodedFrame:true,reviewedFrames:120},rightsReference:{sourcePage:page}};
const fakeStock={id:fakeScene.id,status:'approved',sourceKind:'licensed_single_shot_edit',sha256:sha,video:fakeScene.video,attribution:'Joel Holland; cropped',sources:[{provider:'dareful',creator:'Joel Holland',sourcePage:page,licenseId:'cc_by_4_0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',licenseEvidence:'Dareful original licensed CC BY 4.0',editedExcerptSha256:sha,attributionRequired:true}]};
test('only four released, 120-frame and SHA-reviewed sources get positive interest tiers',()=>{
 assert.ok(curation.ratings.length>=4);
 assert.equal(new Set(curation.ratings.map(x=>x.id)).size,4);
 assert.equal(new Set(curation.ratings.map(x=>x.sha256)).size,4);
 for(const row of curation.ratings){
  const scene=master.scenes.find(x=>x.id===row.id);
  assert.ok(scene);
  const interest=sceneEditorialInterest(scene);
  assert.equal(interest.tier,row.tier);
  assert.equal(interest.visualScore,row.visualScore);
  assert.ok(interest.weight>=8&&interest.weight<=12);
  assert.equal(sceneEditorialInterest({...scene,status:'draft'}).weight,0);
  assert.equal(sceneEditorialInterest({...scene,technicalQuality:{...scene.technicalQuality,sha256:'0'.repeat(64)}}).weight,0);
 }
 assert.equal(sceneEditorialInterest(master.scenes.find(x=>x.id==='lake-mist-dawn')).tier,'unrated');
});
test('existing editor retains rights, aspect and topic gates while exposing verified interest',()=>{
 const winter=recommendMyTubeTopicStoryClips({topicId:'recovery-after-load',targetAspect:'portrait',scenes:master.scenes});
 assert.equal(winter.candidates.find(x=>x.sceneId==='snow-forest-winter')?.interestTier,'featured');
 assert.equal(winter.candidates.find(x=>x.sceneId==='sun-trees-forest')?.interestTier,'strong');
 const sunset=recommendMyTubeTopicStoryClips({topicId:'evening-fatigue',targetAspect:'portrait',scenes:master.scenes});
 assert.equal(sunset.candidates.find(x=>x.sceneId==='warm-clouds-sunset')?.interestTier,'strong');
 const landscape=recommendMyTubeTopicStoryClips({topicId:'recovery-after-load',targetAspect:'landscape',scenes:master.scenes});
 assert.ok(!landscape.candidates.some(x=>['snow-forest-winter','sun-trees-forest'].includes(x.sceneId)));
 assert.ok(!landscape.clipIds.some(x=>['snow-forest-winter','sun-trees-forest'].includes(x)));
});
test('never claim URL or duplicate crops count as independent filmed footage',()=>{
 const r0=localFilmed500Inventory({scenes:[fakeScene],stock:[fakeStock]});
 assert.equal(r0.independentlyVerifiedLocalUniqueSourceCount,0);
 assert.equal(r0.passedMetadataButNotPhysical,1);
 const r1=localFilmed500Inventory({scenes:[fakeScene],stock:[fakeStock,fakeStock],verifyPhysical:()=>true});
 assert.equal(r1.independentlyVerifiedLocalUniqueSourceCount,1);
 assert.equal(r1.localEvidenceGap,499);
 assert.equal(r1.totalFilmed500VerifiedGlobally,null);
 assert.equal(r1.r2IndependentlyHeadAndGetVerified,null);
 assert.equal(Object.values(FILMED500_CATEGORY_TARGETS).reduce((a,b)=>a+b,0),500);
});
test('local physical audit does not inflate 500 target with 684 procedural or 12 composites',()=>{
 const audit=JSON.parse(execFileSync(process.execPath,['scripts/audit-mytube-filmed500.mjs','--json'],{encoding:'utf8'}));
 assert.ok(audit.catalogEntries>=732);
 assert.ok(audit.licensedOrComposedMasterEntries>=48);
 assert.ok(audit.proceduralMotionEntries>=684);
 assert.ok(audit.independentlyVerifiedLocalUniqueSourceCount>=4);
 assert.equal(audit.localEvidenceGap,500-audit.independentlyVerifiedLocalUniqueSourceCount);
 assert.equal(audit.totalFilmed500VerifiedGlobally,null);
 assert.equal(audit.sourcing.reduce((n,x)=>n+x.target,0),500);
});
