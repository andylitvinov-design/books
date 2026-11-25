import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVideoSearchIntent,searchApprovedVideoScenes} from '../lib/mandala/video-scene-search.mjs';

// Fixture scenes use the exact approved same-origin file path and rights gates.
const base={theme:'health',collection:'film-collection-v3',media:'licensed_mp4',status:'approved',
 rightsReference:{kind:'dareful_cc_by_4_0'},pace:'slow',width:720,height:1280,
 categories:['nature'],motifs:['nature'],allowedAspects:['portrait']};
const clip=(id,tags,motifs)=>({...base,id,video:`/videos/holistic-house/film-collection-v3/${id}.mp4`,tags,motifs,
 label:{ru:id,en:id,es:id}});
const scenes=[clip('sun-forest',['sun','forest','warm'],['forest','sun']),
 clip('snow-forest',['winter','forest','snow'],['forest']),
 clip('sea-sun',['sun','sea','water'],['sea','water'])];

test('natural-language aliases are recognized in Russian, English, and Spanish',()=>{
 for(const q of ['солнце и лес','sunlit forest','sol y bosque']){
  const r=searchApprovedVideoScenes({scenes,query:q});
  assert.equal(r.status,'ok');
  assert.equal(r.items[0].id,'sun-forest');
 }
});
test('negative terms are hard filters, not positive scoring',()=>{
 const parsed=parseVideoSearchIntent('Солнце и лес, без моря и воды');
 assert.ok(parsed.include.includes('sun'));
 assert.ok(parsed.include.includes('forest'));
 assert.deepEqual(parsed.exclude,['water','sea']);
 const r=searchApprovedVideoScenes({scenes,query:'солнце без воды'});
 assert.deepEqual(r.items.map(x=>x.id),['sun-forest']);
});
test('source geometry is restrictive, rights alone never mean downloadable landscape',()=>{
 assert.equal(searchApprovedVideoScenes({scenes,aspect:'landscape'}).total,0);
 assert.equal(searchApprovedVideoScenes({scenes,sourceType:'animation'}).total,0);
 assert.equal(searchApprovedVideoScenes({scenes,aspect:'portrait',sourceType:'licensed'}).total,3);
});
test('invalid query and invalid filter fail closed',()=>{
 assert.equal(searchApprovedVideoScenes({scenes,query:'x'.repeat(501)}).status,'invalid_query');
 assert.equal(searchApprovedVideoScenes({scenes,limit:1000}).status,'invalid_filters');
 assert.equal(searchApprovedVideoScenes({scenes,aspect:'invalid'}).status,'invalid_filters');
});
test('catalogue metadata only cannot elevate an unapproved scene',()=>{
 const r=searchApprovedVideoScenes({scenes:[...scenes,{...scenes[0],id:'candidate',status:'candidate'}],query:'лес'});
 assert.equal(r.total,2);
 assert.ok(r.items.every(item=>item.evidence==='catalog_metadata_not_independently_frame_verified'));
 assert.ok(r.items.every(item=>item.requiresFinalComposerValidation===true));
});

test('unrecognized visual brief never falls back to unrelated movies',()=>{
 assert.equal(searchApprovedVideoScenes({scenes,query:'летающий корабль неизвестной планеты'}).status,'unrecognized_query');
 assert.equal(searchApprovedVideoScenes({scenes,query:'дракон в лесу'}).status,'ok');
 const dragon=searchApprovedVideoScenes({scenes,query:'дракон'});
 assert.equal(dragon.status,'no_matching_tags');
 assert.equal(dragon.total,0);
});
test('sea is distinct from river and explicit no-water removes both',()=>{
 const river=clip('quiet-river',['river','water','calm'],['river','water']);
 const items=[...scenes,river];
 const seaOnly=searchApprovedVideoScenes({scenes:items,query:'море'});
 assert.deepEqual(seaOnly.items.map(x=>x.id),['sea-sun']);
 const rivers=searchApprovedVideoScenes({scenes:items,query:'river'});
 assert.deepEqual(rivers.items.map(x=>x.id),['quiet-river']);
 const withoutSea=searchApprovedVideoScenes({scenes:items,query:'солнце без моря'});
 assert.ok(withoutSea.items.some(x=>x.id==='sun-forest'));
 assert.ok(withoutSea.items.every(x=>x.id!=='sea-sun'));
 const noWater=searchApprovedVideoScenes({scenes:items,query:'без воды'});
 assert.ok(noWater.items.every(x=>x.id!=='sea-sun'&&x.id!=='quiet-river'));
});
test('user-specified source type and topic keywords select the right scene',()=>{
 const anim={...base,id:'motion-stress',collection:'original-motion-v1',media:'original_motion_mp4',
   video:'/videos/holistic-house/original-motion-v1/motion-stress.mp4',
   rightsReference:{kind:'project_generated_original',thirdPartyFootage:false},
   visualOrigin:'original_procedural_non_photographic',sha256:'a'.repeat(64),
   tags:['stress-recovery','motion','abstract'],motifs:['abstract'],
   categories:['stress-recovery']};
 const result=searchApprovedVideoScenes({scenes:[...scenes,anim],query:'тревога',sourceType:'animation'});
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].id,'motion-stress');
 assert.equal(result.items[0].sourceType,'original_motion_mp4');
 assert.equal(searchApprovedVideoScenes({scenes:[...scenes,anim],query:'anxiety',sourceType:'licensed'}).total,0);
});
test('exclusions and categories apply to reviewed full metadata, not just titles',()=>{
 const noSea=searchApprovedVideoScenes({scenes,query:'sol sin mar',sourceType:'licensed'});
 assert.ok(noSea.items.length>0);
 assert.ok(noSea.items.every(x=>x.id!=='sea-sun'));
 const clouds=searchApprovedVideoScenes({scenes:[...scenes,clip('soft-clouds',['sky','clouds'],['sky'])],query:'clouds'});
 assert.equal(clouds.items[0].id,'soft-clouds');
});

test('active scenario exclusions also constrain tagged replacement results',()=>{
 const result=searchApprovedVideoScenes({scenes,query:'солнце',excludedMotifs:['water']});
 assert.ok(result.items.every(x=>x.id!=='sea-sun'));
 assert.ok(result.items.some(x=>x.id==='sun-forest'));
 assert.equal(searchApprovedVideoScenes({scenes,excludedMotifs:['invalid']}).status,'invalid_filters');
});

test('labels are localized while stable tag IDs remain untouched',async()=>{
 const {videoSceneTagLabel}=await import('../lib/mandala/video-scene-search.mjs');
 assert.equal(videoSceneTagLabel('forest','ru'),'Лес');
 assert.equal(videoSceneTagLabel('forest','en'),'Forest');
 assert.equal(videoSceneTagLabel('forest','es'),'Bosque');
 assert.equal(videoSceneTagLabel('original-motion-extension','es'),'original motion extension');
});

test('natural slow pace and autumn scene tags stay searchable',()=>{
 const source=clip('golden-foliage',['forest','autumn','warm'],['forest']);
 const result=searchApprovedVideoScenes({scenes:[source],query:'медленный осенний лес'});
 assert.equal(result.status,'ok');
 assert.equal(result.items[0].id,'golden-foliage');
});
