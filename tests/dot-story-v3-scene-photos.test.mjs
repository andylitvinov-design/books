import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import catalog from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import {resolveTelegramStoryPlot} from '../lib/mandala/telegram-story-plots.mjs';
import {validatedDotStoryV3Photo,planDotStoryV3Photos,
 dotStoryV3VerifiedCredit} from '../lib/mandala/dot-story-v3-scene-photos.mjs';
import {requiredStoryPhotoCredits,storyYoutubeDescription}
 from '../lib/practitioners/owner-telegram-story-rights.mjs';

const plot=resolveTelegramStoryPlot('morning-energy-s1-p1');
const scene=catalog.scenes.find(x=>x.id==='sun-warm-ocean-dawn');
const pexels=(scene_no,slot,num)=>({
 plot_id:plot.id,scene_no,slot,asset_id:'pexels-'+num,origin_key:'pexels-'+num,
 match_score:65-slot*2,match_kind:slot===1?'strong_tag_match':'partial_tag_match',
 editorial_review:'suggested',asset_status:'metadata_verified',source_kind:'pexels',
 image_url:'https://images.pexels.com/photos/'+num+'/pexels-photo-'+num+'.jpeg?auto=compress&cs=tinysrgb&w=1280',
 source_page_url:'https://www.pexels.com/photo/a-curated-photo-'+num+'/',
 creator_name:'Creator '+num,license_code:'Pexels License',
 license_url:'https://www.pexels.com/license/',native_width:4000,
 native_height:3000,orientation:'landscape',quality_score:4,
});
const commons=(scene_no,slot,num,license='cc0',licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/')=>({
 ...pexels(scene_no,slot,num),asset_id:'commons-'+num,origin_key:'commons:'+num,
 source_kind:'wikimedia_commons',license_code:license,license_url:licenseUrl,
 image_url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/A_photo.jpg/1920px-A_photo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
 source_page_url:'https://commons.wikimedia.org/wiki/File:A_photo.jpg',
 creator_name:'Commons Photographer',match_kind:'category_fallback',
});
const filmed=(scene_no,slot)=>({
 ...pexels(scene_no,slot,888888),asset_id:'scene-'+scene.id,
 origin_key:scene.originMasterKeys[0].replace(/^original:/,'source:'),
 source_kind:'approved_scene_frame',image_url:scene.poster,
 source_page_url:scene.originMasterKeys[0].replace(/^original:/,''),
 creator_name:'Joel Holland',license_code:'cc_by_4_0',
 license_url:'https://creativecommons.org/licenses/by/4.0/',
 native_width:scene.width,native_height:scene.height,
 orientation:scene.width>scene.height?'landscape':'portrait',
 match_kind:'reviewed_scene_binding',match_score:200,
});
const originalRows=Array.from({length:4},(_,index)=>{
 const no=index+1;
 return [pexels(no,1,10000+no*10),pexels(no,2,10001+no*10),
  commons(no,3,10002+no*10),commons(no,4,10003+no*10),
  pexels(no,5,10004+no*10)];
}).flat();

test('real canonical plot maps 5 distinct candidates per act and selects unique-original sources',()=>{
 assert.ok(plot?.id);
 assert.equal(originalRows.length,20);
 const candidates=planDotStoryV3Photos(plot,originalRows,'landscape');
 assert.ok(candidates.length>0);
 assert.ok(candidates.length<=32);
 for(const p of candidates){
  assert.deepEqual(p.photos.map(x=>x.sceneNo),[1,2,3,4]);
  assert.equal(new Set(p.photos.map(x=>x.originKey)).size,4);
  assert.ok(p.photos.every(x=>x.orientation==='landscape'));
 }
 assert.deepEqual(planDotStoryV3Photos(plot,originalRows,'portrait'),[]);
 assert.deepEqual(planDotStoryV3Photos(plot,originalRows.slice(0,15)),[]);
});
test('trusted Pexels / Commons / licensed first-party still sources validate without arbitrary web URLs',()=>{
 const p=originalRows[0],c=originalRows[2];
 assert.ok(validatedDotStoryV3Photo(p,'landscape'));
 assert.ok(validatedDotStoryV3Photo(c,'landscape'));
 assert.ok(validatedDotStoryV3Photo(commons(1,2,900000,'cc_by_2_0',
  'https://creativecommons.org/licenses/by/2.0'),'landscape'));
 assert.ok(validatedDotStoryV3Photo(filmed(1,1),'landscape'));
 for(const invalid of [
  {...p,image_url:'https://localhost/photos/10010/pexels-photo-10010.jpeg'},
  {...p,source_page_url:'https://www.pexels.com/photo/different-12345/'},
  {...p,orientation:'portrait'},
  {...p,editorial_review:'rejected'},
  {...c,image_url:'http://127.0.0.1/test.jpg'},
  {...c,license_url:'https://example.net/license/'},
  {...c,source_page_url:'https://attacker.example/wiki/File:A_photo.jpg'},
  {...c,image_url:c.image_url+'&redirect=http://127.0.0.1'},
  {...c,origin_key:'commons:99999'},
  {...filmed(1,1),image_url:'https://attacker.example/photo.jpg'},
 ])assert.equal(validatedDotStoryV3Photo(invalid,'landscape'),null);
});
test('stage-specific 9:16 and 16:9 candidates never cross output orientations',()=>{
 const portrait=originalRows.map(row=>({
  ...row,orientation:'portrait',native_width:3000,native_height:4000,
 }));
 const sets=planDotStoryV3Photos(plot,portrait,'portrait');
 assert.equal(sets.length>0,true);
 assert.ok(sets[0].photos.every(x=>x.orientation==='portrait'));
});
test('YouTube credits preserve actual photographed sources, diverse licenses and SHA256 after edits',()=>{
 const photos=[originalRows[0],originalRows[2],
  commons(3,1,700123,'cc_by_2_0','https://creativecommons.org/licenses/by/2.0'),
  filmed(4,2)].map(row=>{
   const p=validatedDotStoryV3Photo(row,'landscape');
   assert.ok(p);
   return dotStoryV3VerifiedCredit(p,'a'.repeat(64));
 });
 const credits=requiredStoryPhotoCredits(photos);
 assert.match(credits,/Pexels License/);
 assert.match(credits,/CC0/);
 assert.match(credits,/CC BY 2 0/);
 assert.match(credits,/approved licensed footage still/);
 const text=storyYoutubeDescription('Owner approved description',[],photos);
 assert.match(text,/Photographs \(source licences, adapted\)/);
 assert.match(text,/Owner approved description/);
 assert.throws(()=>storyYoutubeDescription('bad',['sun-warm-ocean-dawn'],photos),
  /ATTRIBUTION_AMBIGUOUS/);
 assert.throws(()=>dotStoryV3VerifiedCredit(
  validatedDotStoryV3Photo(originalRows[0]),'invalid'),/ATTRIBUTION_INVALID/);
});
test('owner-only montage reads v3 scene choices, decodes bounded JPEG, persists photos and preserves publish gate',()=>{
 const service=readFileSync(new URL('../lib/practitioners/owner-telegram-video-service.js',import.meta.url),'utf8');
 const render=readFileSync(new URL('../lib/practitioners/owner-telegram-story-render.mjs',import.meta.url),'utf8');
 const meta=readFileSync(new URL('../lib/practitioners/owner-telegram-video-metadata-service.js',import.meta.url),'utf8');
 assert.match(service,/hh_video_plot_scene_choices_v3 c/);
 assert.match(service,/c\.plot_id=\$1 and c\.target_aspect=\$2/);
 assert.match(service,/ownerStoryV3SceneCandidates\(/);
 assert.match(service,/v3Candidates,photoCandidates/);
 assert.match(service,/\{renderedPhotoSources\}/);
 assert.match(service,/storyYoutubeDescription\(row.youtube_description/);
 assert.match(render,/planDotStoryV3Photos\(plot,v3Candidates,targetAspect\)/);
 assert.match(render,/stageDotVerifiedScenePhoto\(photo,file/);
 assert.match(render,/redirect:'error'/);
 assert.match(render,/VIDEO_STORY_PHOTO_SIZE_INVALID/);
 assert.match(render,/Video:\\s\*mjpeg/);
 assert.match(render,/renderedPhotoSources:Object\.freeze\(renderedPhotoSources\)/);
 assert.match(meta,/row\.story_selection\?\.renderedPhotoSources/);
});
