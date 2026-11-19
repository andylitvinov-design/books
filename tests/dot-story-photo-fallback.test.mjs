import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import stock from '../data/video-catalog/free-stock-scenes.json' with {type:'json'};
import {selectDotStoryPhotos,selectDotStoryPhotoAlternates,compileDotStoryPhotoArgs} from '../lib/mandala/dot-story-photo-fallback.mjs';
import firstLightPhotos from '../data/video-catalog/first-light-story-photos-v1.json' with {type:'json'};
import {isTrustedStoryPhoto} from '../lib/mandala/story-photo-library.mjs';
import {requiredStoryRightsCredits,storyYoutubeDescription} from '../lib/practitioners/owner-telegram-story-rights.mjs';
import {resolveTelegramStoryPlot} from '../lib/mandala/telegram-story-plots.mjs';
test('First Light: all six unique plot modes receive their four literal-topic photographs',()=>{
 for(let i=1;i<=6;i++){
   const plot=resolveTelegramStoryPlot('morning-energy-s1-p'+i);
   assert.ok(plot);
   const chosen=selectDotStoryPhotos(plot,catalog,stock);
   const expected=firstLightPhotos.plots[plot.id];
   assert.equal(chosen.length,4,plot.id);
   assert.equal(new Set(chosen.map(p=>p.id)).size,4,plot.id);
   assert.deepEqual(chosen.map(p=>p.id),expected.map(stage=>stage[0]),plot.id);
   for(const [index,photo] of chosen.entries()){
     assert.equal(isTrustedStoryPhoto(photo),true,photo.id);
     assert.match(photo.src,/^\/api\/video\/story-photo\/story-photo-pexels-[0-9]+$/);
     assert.equal(photo.provider,'pexels');
     assert.equal(selectDotStoryPhotoAlternates(plot.id,index)[0]?.id,expected[index][1]);
   }
 }
});
test('First Light YouTube description keeps original Pexels photographers and license',()=>{
 const plot=resolveTelegramStoryPlot('morning-energy-s1-p6');
 const ids=selectDotStoryPhotos(plot,catalog,stock).map(p=>p.id);
 const credits=requiredStoryRightsCredits(ids);
 assert.match(credits,/Pexels License/);
 assert.match(credits,/https:\/\/www\.pexels\.com\/photo\//);
 const description=storyYoutubeDescription('Приватный сюжет · тест',ids);
 assert.match(description,/Photo credits \(Pexels License\):/);
 assert.doesNotMatch(description,/Video footage credits \(CC BY/);
 assert.equal(description.includes('Приватный сюжет · тест'),true);
});
test('portrait and square people photos retain their subject in 16:9 export',()=>{
 const files=[0,1,2,3].map(i=>'/tmp/hh-dot-story-12345/photo-'+i+'.jpg');
 const options={photoFiles:files,audioFile:'/tmp/hh-dot-story-12345/soundtrack.m4a',
   outputFile:'/tmp/hh-dot-story-12345/result.mp4',durationMs:30000};
 const portrait=compileDotStoryPhotoArgs({...options,
   photoOrientations:['portrait','landscape','square','landscape']});
 const ffmpeg=portrait.args[portrait.args.indexOf('-filter_complex')+1];
 assert.match(ffmpeg,/\[0:v\]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720/);
 assert.match(ffmpeg,/\[1:v\]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720/);
 assert.match(ffmpeg,/\[2:v\]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720/);
 assert.throws(()=>compileDotStoryPhotoArgs({...options,
   photoOrientations:['portrait','wrong','square','landscape']}),/PHOTO_PLAN_INVALID/);
});

test('all four categories have four approved, unique-origin photographs',()=>{
 for(const categoryId of ['goals-money','love-relationships','energy-confidence','stress-anxiety']){
   const rows=selectDotStoryPhotos({categoryId},catalog,stock);
   assert.equal(rows.length,4,categoryId);
   const origins=rows.flatMap(row=>catalog.scenes.find(s=>s.id===row.id).originMasterKeys);
   assert.equal(new Set(origins).size,origins.length,categoryId);
 }
});
test('reject edited source path or unsupported category',()=>{
 assert.deepEqual(selectDotStoryPhotos({categoryId:'unknown'},catalog,stock),[]);
 const changed=catalog.scenes.map(s=>s.id==='sun-leaves-canopy'?{...s,poster:'https://elsewhere.com/a.jpg'}:s);
 assert.deepEqual(selectDotStoryPhotos({categoryId:'energy-confidence'},
   {...catalog,scenes:changed},stock),[]);
});
test('signed local-only photo FFmpeg argument vector, short and long modes',()=>{
 const args=ms=>compileDotStoryPhotoArgs({
   photoFiles:[0,1,2,3].map(i=>'/tmp/hh-dot-story-12345/photo-'+i+'.jpg'),
   audioFile:'/tmp/hh-dot-story-12345/soundtrack.m4a',
   outputFile:'/tmp/hh-dot-story-12345/result.mp4',durationMs:ms});
 assert.equal(args(30000).renderQuality,'photo_cinematic_1280x720_12fps');
 assert.equal(args(1800000).renderQuality,'photo_compact_640x360_2fps');
 assert.throws(()=>args(1800001),/PHOTO_PLAN_INVALID/);
 assert.throws(()=>compileDotStoryPhotoArgs({photoFiles:['https://evil.test/a.jpg'],durationMs:30000}),/PHOTO_PLAN_INVALID/);
});
