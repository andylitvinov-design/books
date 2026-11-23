/** Approved first-party stills are a symbolic fallback, not literal filmed actions. */
import { originalPlotShard } from './mytube-plot-shard.mjs';

const PALETTES=Object.freeze({
 'goals-money':['sun-autumn-hills','sun-golden-aspen','soft-horizon','sun-warm-ocean-dawn'],
 'love-relationships':['garden-acceptance','heart-flow','sun-warm-ocean-dawn','sun-golden-aspen'],
 'energy-confidence':['sun-warm-ocean-dawn','sun-leaves-canopy','sun-golden-aspen','sun-autumn-hills'],
 'stress-anxiety':['lake-mist-dawn','shore-breath','river-grounding','sun-warm-ocean-dawn']
});
const PHOTO=/^\/videos\/holistic-house\/film-collection-v3\/([a-z0-9-]+)\.jpg$/;
const VIDEO=/^\/videos\/holistic-house\/film-collection-v3\/([a-z0-9-]+)\.mp4$/;
const LOCAL=/^\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80}\/photo-[0-3]\.jpg$/;
const AUDIO=/^\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80}\/soundtrack\.m4a$/;
const OUTPUT=/^\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80}\/result\.mp4$/;
const fail=code=>{throw Error(code)};
export function selectDotStoryPhotos(plot,catalog,stockManifest,targetAspect='landscape'){
 if(!['landscape','portrait'].includes(targetAspect))return [];
 // A migrated scenario retains its approved original editorial-photo palette.
 // New public taxonomy category IDs are for browsing, not relicensing images.
 // Category-only calls preserve the category palette and reject unsupported IDs.
 const originalCategory=typeof plot?.scenarioId==='string'&&
   typeof plot?.subcategoryId==='string' ? originalPlotShard(plot) : plot?.categoryId;
 const ids=PALETTES[originalCategory];
 if(!ids||!Array.isArray(catalog?.scenes)||!Array.isArray(stockManifest))return [];
 const byId=new Map(catalog.scenes.map(s=>[s.id,s]));
 const bySource=new Map(stockManifest.map(s=>[s.id,s]));
 const result=[],originals=new Set();
 for(const baseId of ids){
   const portraitId=baseId+'-portrait';
   const id=targetAspect==='portrait'&&byId.has(portraitId)&&bySource.has(portraitId)
     ?portraitId:baseId;
   const scene=byId.get(id),source=bySource.get(id);
   if(!scene||!source||scene.status!=='approved'||scene.media!=='licensed_mp4'||
     scene.collection!=='film-collection-v3'||scene.rightsReference?.kind!=='dareful_cc_by_4_0'||
     !PHOTO.test(scene.poster||'')||!VIDEO.test(scene.video||'')||
     scene.poster!==source.poster||scene.video!==source.video||
     PHOTO.exec(scene.poster)[1]!==id||VIDEO.exec(scene.video)[1]!==id||
     !Array.isArray(source.sources)||source.sources.length<1||
     !source.sources.every(part=>part.licenseId==='cc_by_4_0'&&
       /^https:\/\/dareful\.com\/[a-z0-9-]+\/$/.test(part.sourcePage||''))||
     !Array.isArray(scene.originMasterKeys)||scene.originMasterKeys.length<1||
     scene.originMasterKeys.some(k=>originals.has(k)))return [];
   scene.originMasterKeys.forEach(k=>originals.add(k));
   result.push(Object.freeze({id,poster:scene.poster,
     orientation:scene.width>scene.height?'landscape':'portrait',
     mediaFidelity:'symbolic_category_illustration'}));
 }
 return result.length===4?Object.freeze(result):[];
}
export function compileDotStoryPhotoArgs({photoFiles,audioFile,outputFile,durationMs,
 targetAspect='landscape',photoOrientations=[]}={}){
 if(!Array.isArray(photoFiles)||photoFiles.length!==4||
   photoFiles.some((file,i)=>!LOCAL.test(file)||!file.endsWith('/photo-'+i+'.jpg'))||
   !AUDIO.test(audioFile||'')||!OUTPUT.test(outputFile||'')||
   !Number.isSafeInteger(durationMs)||durationMs<12000||durationMs>1800000)
   fail('VIDEO_STORY_PHOTO_PLAN_INVALID');
 if(!['landscape','portrait'].includes(targetAspect)||
   !Array.isArray(photoOrientations)||photoOrientations.length>4||
   photoOrientations.some(x=>!['portrait','landscape'].includes(x)))
   fail('VIDEO_STORY_PHOTO_PLAN_INVALID');
 const compact=durationMs>180000,fps=compact?2:12;
 const width=targetAspect==='portrait'?(compact?360:720):(compact?640:1280);
 const height=targetAspect==='portrait'?(compact?640:1280):(compact?360:720);
 const marks=[0,1,2,3,4].map(n=>Math.round(durationMs*n/4));
 const secs=[0,1,2,3].map(i=>(marks[i+1]-marks[i])/1000);
 const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2'];
 for(let i=0;i<4;i++)args.push('-loop','1','-framerate',String(fps),'-t',
   (secs[i]+1).toFixed(3),'-i',photoFiles[i]);
 args.push('-i',audioFile);
 const filters=[];
 for(const [i,seconds] of secs.entries()){
   const duration=seconds.toFixed(3),frames=Math.max(1,Math.ceil(seconds*fps));
   const motion="zoompan=z='min(1.08,1+on*0.08/"+frames+")':"+
     "x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':"+
     'd=1:s='+width+'x'+height+':fps='+fps+','+
     'trim=duration='+duration+',setpts=PTS-STARTPTS[v'+i+']';
   if(photoOrientations[i]===targetAspect){
     filters.push('['+i+':v]scale='+width+':'+height+
       ':force_original_aspect_ratio=increase,crop='+width+':'+height+
       ',setsar=1,'+motion);
   }else{
     // Preserve the entire person/scene. A softly blurred fill replaces black
     // bars when the verified source has the opposite native orientation.
     filters.push('['+i+':v]split=2[bg'+i+'][fg'+i+']');
     filters.push('[bg'+i+']scale='+width+':'+height+
       ':force_original_aspect_ratio=increase,crop='+width+':'+height+
       ',boxblur=10:1[blur'+i+']');
     filters.push('[fg'+i+']scale='+width+':'+height+
       ':force_original_aspect_ratio=decrease[fore'+i+']');
     filters.push('[blur'+i+'][fore'+i+']overlay=(W-w)/2:(H-h)/2,'+
       'setsar=1,'+motion);
   }
 }
 filters.push('[v0][v1][v2][v3]concat=n=4:v=1:a=0[v]');
 args.push('-filter_complex',filters.join(';'),'-map','[v]','-map','4:a:0',
   '-c:v','libx264','-preset','ultrafast','-crf','29',
   '-pix_fmt','yuv420p','-r',String(fps),'-c:a','copy',
   '-t',(durationMs/1000).toFixed(3),'-movflags','+faststart',outputFile);
 return Object.freeze({args:Object.freeze(args),renderQuality:
   targetAspect==='portrait'
     ?(compact?'photo_portrait_compact_360x640_2fps':'photo_portrait_720x1280_12fps')
     :(compact?'photo_compact_640x360_2fps':'photo_cinematic_1280x720_12fps'),
   toleranceMs:compact?650:300});
}
