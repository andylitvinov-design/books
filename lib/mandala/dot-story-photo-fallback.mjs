/** Approved first-party stills are a symbolic fallback, not literal filmed actions. */
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
export function selectDotStoryPhotos(plot,catalog,stockManifest){
 const ids=PALETTES[plot?.categoryId];
 if(!ids||!Array.isArray(catalog?.scenes)||!Array.isArray(stockManifest))return [];
 const byId=new Map(catalog.scenes.map(s=>[s.id,s]));
 const bySource=new Map(stockManifest.map(s=>[s.id,s]));
 const result=[],originals=new Set();
 for(const id of ids){
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
     mediaFidelity:'symbolic_category_illustration'}));
 }
 return result.length===4?Object.freeze(result):[];
}
export function compileDotStoryPhotoArgs({photoFiles,audioFile,outputFile,durationMs}={}){
 if(!Array.isArray(photoFiles)||photoFiles.length!==4||
   photoFiles.some((file,i)=>!LOCAL.test(file)||!file.endsWith('/photo-'+i+'.jpg'))||
   !AUDIO.test(audioFile||'')||!OUTPUT.test(outputFile||'')||
   !Number.isSafeInteger(durationMs)||durationMs<12000||durationMs>1800000)
   fail('VIDEO_STORY_PHOTO_PLAN_INVALID');
 const compact=durationMs>180000,fps=compact?2:12,width=compact?640:1280,height=compact?360:720;
 const marks=[0,1,2,3,4].map(n=>Math.round(durationMs*n/4));
 const secs=[0,1,2,3].map(i=>(marks[i+1]-marks[i])/1000);
 const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2'];
 for(let i=0;i<4;i++)args.push('-loop','1','-framerate',String(fps),'-t',
   (secs[i]+1).toFixed(3),'-i',photoFiles[i]);
 args.push('-i',audioFile);
 const filters=secs.map((seconds,i)=>'['+i+':v]'+
   'scale='+width+':'+height+':force_original_aspect_ratio=increase,'+
   'crop='+width+':'+height+',setsar=1,'+
   "zoompan=z='min(1.08,1+on*0.08/"+Math.max(1,Math.ceil(seconds*fps))+")':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':"+
   'd=1:s='+width+'x'+height+':fps='+fps+','+
   'trim=duration='+seconds.toFixed(3)+',setpts=PTS-STARTPTS[v'+i+']');
 filters.push('[v0][v1][v2][v3]concat=n=4:v=1:a=0[v]');
 args.push('-filter_complex',filters.join(';'),'-map','[v]','-map','4:a:0',
   '-c:v','libx264','-preset','ultrafast','-crf','29',
   '-pix_fmt','yuv420p','-r',String(fps),'-c:a','copy',
   '-t',(durationMs/1000).toFixed(3),'-movflags','+faststart',outputFile);
 return Object.freeze({args:Object.freeze(args),renderQuality:compact?
   'photo_compact_640x360_2fps':'photo_cinematic_1280x720_12fps',
   toleranceMs:compact?650:300});
}
