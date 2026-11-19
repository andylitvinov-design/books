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
