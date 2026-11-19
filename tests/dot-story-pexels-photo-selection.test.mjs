import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedDotPexelsCandidate,rankDotStoryPexelsPhotos,verifiedDotPexelsCredit,
 PEXELS_LICENSE} from '../lib/mandala/dot-story-pexels-photos.mjs';
import {requiredStoryPhotoCredits,storyYoutubeDescription} from '../lib/practitioners/owner-telegram-story-rights.mjs';
import {resolveTelegramStoryPlot} from '../lib/mandala/telegram-story-plots.mjs';

const photo=(scene,id,priority=100,tags=['sunrise','window','morning'])=>({
 scene_no:scene,priority,photo_id:'pexels-'+id,
 image_url:'https://images.pexels.com/photos/'+id+'/pexels-photo-'+id+'.jpeg?auto=compress&cs=tinysrgb&w=1280',
 source_page_url:'https://www.pexels.com/photo/morning-scene-'+id+'/',
 creator_name:'Photographer '+id,license_url:PEXELS_LICENSE,
 asset_url_check_status:'verified',source_width:4000,source_height:3000,
 quality_score:4,tags:[...tags,'media:photo','source:pexels'],
});
const rows=[
 photo(1,1001),photo(1,1002,70,['morning','light']),
 photo(2,1003,100,['rehearsal','mirror','script']),
 photo(2,1004,70,['human','meeting']),
 photo(3,1005,100,['writing','letter','morning']),
 photo(3,1006,70,['journal','window']),
 photo(4,1007,100,['sunrise','horizon']),
 photo(4,1008,70,['morning','sunrise']),
];

test('six First Light plot variants map four ordered stages to distinct Pexels photos',()=>{
 for(let i=1;i<=6;i++){
   const plot=resolveTelegramStoryPlot('morning-energy-s1-p'+i);
   assert.ok(plot);
   const allocations=rankDotStoryPexelsPhotos(plot,rows);
   assert.ok(allocations.length>0);
   for(const allocation of allocations.slice(0,3)){
     assert.deepEqual(allocation.map(x=>x.sceneNo),[1,2,3,4]);
     assert.equal(new Set(allocation.map(x=>x.photoId)).size,4);
   }
 }
});

test('priority, tags and alternative frames are explicit; duplicated photos are never used twice',()=>{
 const plot=resolveTelegramStoryPlot('morning-energy-s1-p6');
 const duplicate={...rows[2],scene_no:3,priority:150};
 const variants=rankDotStoryPexelsPhotos(plot,[...rows,duplicate]);
 assert.ok(variants.length>0);
 assert.equal(new Set(variants[0].map(x=>x.photoId)).size,4);
 assert.ok(variants.some(a=>a[2].photoId==='pexels-1005'||a[2].photoId==='pexels-1006'));
 assert.deepEqual(rankDotStoryPexelsPhotos(plot,rows.filter(x=>x.scene_no!==4)),[]);
});

test('external origins, unreviewed JPEGs, wrong IDs, invalid tags and altered URLs fail closed',()=>{
 const row=rows[0];
 assert.ok(verifiedDotPexelsCandidate(row));
 for(const altered of [
   {...row,image_url:'https://example.net/photos/1001/pexels-photo-1001.jpeg?auto=compress&cs=tinysrgb&w=1280'},
   {...row,image_url:'https://images.pexels.com/photos/1002/pexels-photo-1002.jpeg?auto=compress&cs=tinysrgb&w=1280'},
   {...row,image_url:row.image_url+'&redirect=http://127.0.0.1/'},
   {...row,source_page_url:'https://www.pexels.com/photo/other-1002/'},
   {...row,license_url:'https://example.org/license/'},
   {...row,asset_url_check_status:'pending_http_check'},
   {...row,creator_name:'<script>oops</script>'},
   {...row,source_width:0},
   {...row,scene_no:9},
 ]){
   assert.equal(verifiedDotPexelsCandidate(altered),null);
 }
 const plot=resolveTelegramStoryPlot('morning-energy-s1-p6');
 assert.deepEqual(rankDotStoryPexelsPhotos(plot,[...rows.slice(0,2),{...rows[2],asset_url_check_status:'unavailable'},...rows.slice(4)]),[]);
});

test('credit source is bound to actual SHA256 JPEG and survives editing and YouTube publication',()=>{
 const plot=resolveTelegramStoryPlot('morning-energy-s1-p6');
 const chosen=rankDotStoryPexelsPhotos(plot,rows)[0];
 const photos=chosen.map(x=>verifiedDotPexelsCredit(x,'a'.repeat(64)));
 const credits=requiredStoryPhotoCredits(photos);
 assert.match(credits,/https:\/\/www\.pexels\.com\/photo\//);
 assert.match(credits,/Pexels License/);
 const description=storyYoutubeDescription('Owner edit',[],photos);
 assert.match(description,/Owner edit/);
 assert.match(description,/Photographs \(Pexels License, adapted\)/);
 assert.ok(description.includes(credits));
 assert.throws(()=>storyYoutubeDescription('Bad',[],[]),/ATTRIBUTION_MISSING/);
 assert.throws(()=>storyYoutubeDescription('Ambiguous',['lake-mist-dawn'],photos),/ATTRIBUTION_AMBIGUOUS/);
 assert.throws(()=>verifiedDotPexelsCredit(chosen[0],'wrong'),/ATTRIBUTION_INVALID/);
 assert.throws(()=>requiredStoryPhotoCredits(photos.slice(1)),/PHOTO_ATTRIBUTION_MISSING/);
});

test('owner Dot reader, JPEG decode, private render and photographer credits are wired end-to-end',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const service=read('lib/practitioners/owner-telegram-video-service.js');
 const renderer=read('lib/practitioners/owner-telegram-story-render.mjs');
 const editor=read('lib/practitioners/owner-telegram-video-metadata-service.js');
 assert.match(service,/public\.hh_video_story_photo_candidates_v1\(\$1::text,null::integer\)/);
 assert.match(service,/p\.tags @> ARRAY\['media:photo'\]::text\[\]/);
 assert.match(service,/s\.fallback_mode='auto_when_mp4_missing'/);
 assert.match(service,/photoCandidates=await ownerStorySupabasePhotoCandidates/);
 assert.match(renderer,/rankDotStoryPexelsPhotos\(plot,photoCandidates\)/);
 assert.match(renderer,/stageDotPexelsPhoto\(photo,file/);
 assert.match(renderer,/Video:\\s\*mjpeg/);
 assert.match(renderer,/redirect:'error'/);
 assert.match(renderer,/renderedPhotoSources:Object\.freeze\(renderedPhotoSources\)/);
 assert.match(service,/\{renderedPhotoSources\}/);
 assert.match(editor,/row\.story_selection\?\.renderedPhotoSources/);
 assert.match(editor,/storyYoutubeDescription\(batch\.value,batch\.sceneIds,batch\.photoSources\)/);
});
