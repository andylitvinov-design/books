import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import stock from '../data/video-catalog/free-stock-scenes.json' with {type:'json'};
import {selectDotStoryPhotos,compileDotStoryPhotoArgs} from '../lib/mandala/dot-story-photo-fallback.mjs';
import {resolveTelegramStoryPlot} from '../lib/mandala/telegram-story-plots.mjs';
test('First Light: all six plot variants can use four original licensed stills',()=>{
 for(let i=1;i<=6;i++){
   const plot=resolveTelegramStoryPlot('morning-energy-s1-p'+i);
   assert.ok(plot);
   assert.deepEqual(selectDotStoryPhotos(plot,catalog,stock).map(p=>p.id),
     ['sun-warm-ocean-dawn','sun-leaves-canopy','sun-golden-aspen','sun-autumn-hills']);
 }
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


test('portrait output selects distinct, independently sourced approved portrait photos',()=>{
 const plot=resolveTelegramStoryPlot('morning-energy-s1-p6');
 const photos=selectDotStoryPhotos(plot,catalog,stock,'portrait');
 assert.deepEqual(photos.map(x=>x.id),[
  'sun-warm-ocean-dawn-portrait','sun-leaves-canopy-portrait',
  'sun-golden-aspen-portrait','sun-autumn-hills-portrait']);
 assert.ok(photos.every(x=>x.orientation==='portrait'));
 const sources=photos.flatMap(x=>catalog.scenes.find(s=>s.id===x.id).originMasterKeys);
 assert.equal(new Set(sources).size,sources.length);
});

test('physical FFmpeg planner preserves both 9:16 portrait and 16:9 landscape dimensions',()=>{
 const paths=[0,1,2,3].map(i=>'/tmp/hh-dot-story-12345/photo-'+i+'.jpg');
 const args=(targetAspect,durationMs,photoOrientations)=>compileDotStoryPhotoArgs({
  photoFiles:paths,audioFile:'/tmp/hh-dot-story-12345/soundtrack.m4a',
  outputFile:'/tmp/hh-dot-story-12345/result.mp4',targetAspect,
  photoOrientations,durationMs});
 const portrait=args('portrait',30000,['portrait','landscape','portrait','landscape']);
 assert.equal(portrait.renderQuality,'photo_portrait_720x1280_12fps');
 assert.match(portrait.args.join(' '),/720x1280/);
 assert.match(portrait.args.join(' '),/boxblur=10:1/);
 assert.match(portrait.args.join(' '),/overlay=/);
 const landscape=args('landscape',30000,['landscape','portrait','landscape','portrait']);
 assert.equal(landscape.renderQuality,'photo_cinematic_1280x720_12fps');
 assert.match(landscape.args.join(' '),/1280x720/);
 assert.equal(args('portrait',240000,[]).renderQuality,'photo_portrait_compact_360x640_2fps');
 assert.throws(()=>args('square',30000,[]),/VIDEO_STORY_PHOTO_PLAN_INVALID/);
 assert.throws(()=>args('portrait',30000,['bogus']),/VIDEO_STORY_PHOTO_PLAN_INVALID/);
});

test('historical plot shard preserves vetted palette when public category is regrouped',()=>{
 const moved=[
   ['morning-energy-s1-p1','stress-anxiety','energy-confidence'],
   ['self-confidence-s1-p1','goals-money','energy-confidence'],
   ['life-purpose-s1-p1','energy-confidence','goals-money'],
   ['childhood-trauma-s1-p1','energy-confidence','stress-anxiety'],
 ];
 for(const [id,current,original] of moved){
   const plot=resolveTelegramStoryPlot(id);
   assert.ok(plot,id);
   assert.equal(plot.categoryId,current,id);
   for(const aspect of ['landscape','portrait']){
     const actual=selectDotStoryPhotos(plot,catalog,stock,aspect);
     const expected=selectDotStoryPhotos({categoryId:original},catalog,stock,aspect);
     assert.equal(actual.length,4,id+':'+aspect);
     assert.deepEqual(actual,expected,id+':'+aspect);
     const origins=actual.flatMap(row=>catalog.scenes.find(scene=>scene.id===row.id).originMasterKeys);
     assert.equal(new Set(origins).size,origins.length);
   }
 }
});
