/**
 * Stories Studio physical acceptance: five independently reviewed camera-filmed scenes, 9:16 MP4/H264,
 * audible soundtrack and verified scene identity. Only GET/HEAD to local Next.
 * Never contacts an AI provider, uploads media or publishes a Story.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync,rmSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {installGuestVideoBlobCapture,readRealGuestVideo} from './real-guest-video-file.mjs';
import {isReviewedFilmedStoryScene} from '../../lib/mandala/reviewed-filmed-story.mjs';
import {verifiedCategorySource} from '../../lib/mandala/category-video-storyboard.mjs';

const origin='http://127.0.0.1:3100';
const browserModule=process.env.HH_LIVE_VIDEO_PLAYWRIGHT;
assert.ok(browserModule?.startsWith('/'),'STORIES_BROWSER_DRIVER_REQUIRED');
assert.equal(process.env.HH_STORIES_E2E_ENGINE,'webkit','STORIES_REAL_WEBKIT_REQUIRED');
assert.equal(process.platform,'darwin','STORIES_REAL_MACOS_REQUIRED');
const {webkit}=await import(pathToFileURL(browserModule).href);
const catalog=JSON.parse(readFileSync('data/video-catalog/scene-taxonomy.json','utf8'));
const approved=new Map(catalog.scenes.filter(scene=>
  isReviewedFilmedStoryScene(scene,'portrait')&&
  verifiedCategorySource(scene)?.durationSeconds>=4)
  .map(scene=>[scene.id,scene]));
const dir=mkdtempSync(path.join(tmpdir(),'hh-story-5shot-'));
const evidencePath='artifacts/benchmarking/five-scene-stories-webkit.json';
const result={test:'anonymous-local-stories-five-scene',browser:'webkit',origin:'localhost',
  paidProviderRequests:0,instagramPosts:0,needsLoginForSave:null,
  status:'FAIL',shotCount:0,distinctSources:0};
let browser,context;
function frame(file,t){
 return execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',file,
   '-frames:v','1','-vf','scale=36:64:force_original_aspect_ratio=increase,crop=36:64',
   '-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:100000,timeout:30000});
}
function correlation(a,b){
 assert.equal(a.length,36*64*3);assert.equal(b.length,a.length);
 let sa=0,sb=0,aa=0,bb=0,ab=0;
 for(let i=0;i<a.length;i++){const x=a[i],y=b[i];sa+=x;sb+=y;aa+=x*x;bb+=y*y;ab+=x*y;}
 const den=Math.sqrt((aa-sa*sa/a.length)*(bb-sb*sb/b.length));
 return den>0?(ab-sa*sb/a.length)/den:0;
}
try{
 browser=await webkit.launch({headless:false});
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
   hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
 await installGuestVideoBlobCapture(context);
 await context.route('**/*',route=>{
   const request=route.request();const url=new URL(request.url());
   return url.origin===origin&&['GET','HEAD'].includes(request.method())
     ?route.continue():route.abort('blockedbyclient');
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.name));
 const response=await page.goto(origin+'/ru/holistic-support/mandala',
   {waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(response?.status(),200,'STORIES_LOCAL_APP_NOT_200');
 await page.locator('[data-video-studio-hydrated="true"]').waitFor({timeout:60000});
 await page.locator('[data-video-continue-scenarios]').click();
 await page.locator('[data-video-quick-control="editor"]').click();
 const storyTab=page.locator('[data-video-montage-tab="concept"]');
 await storyTab.waitFor({state:'visible',timeout:20000});
 await storyTab.click();
 await page.locator('[data-video-montage-concept]').waitFor({state:'visible'});
 // Verify the approved one-screen Story CTA really selects fifth Montage.
 await page.locator('[data-video-story-select-quality]').click();
 const montageTab=page.locator('[data-video-montage-tab="promo"]');
 assert.equal(await montageTab.getAttribute('aria-pressed'),'true',
   'STORY_QUALITY_MUST_OPEN_MONTAGE');
 const advanced=page.locator('[data-video-stories-advanced]');
 await advanced.locator(':scope > summary').click();
 const format=advanced.locator('[data-video-stories-format]');
 await format.waitFor({state:'visible'});
 await format.selectOption('motion');
 assert.equal(await format.inputValue(),'motion');
 await page.locator('[data-video-stories-create]').click();
 const sceneList=page.locator('[data-video-stories-scene-list]');
 await sceneList.waitFor({state:'visible',timeout:20000});
 assert.equal(await sceneList.locator('[data-video-stories-scene]').count(),5);
 const ids=await sceneList.locator('[data-video-stories-source]').evaluateAll(nodes=>
   nodes.map(node=>node.value));
 assert.equal(ids.length,5,'STORIES_NOT_FIVE_REAL_SOURCES');
 assert.equal(new Set(ids).size,5,'STORIES_DUPLICATE_MEDIA');
 for(const id of ids)assert.ok(approved.has(id),'STORIES_UNREVIEWED_OR_GRAPHICAL_SOURCE:'+id);
 result.shotCount=ids.length;result.distinctSources=new Set(ids).size;
 result.verifiedRights=true;
 await page.locator('[data-video-montage-tab="audio"]').click();
 await page.locator('[data-video-montage-audio]').waitFor({state:'visible',timeout:20000});
 const create=page.locator('[data-video-quick-generate]');
 await create.waitFor({state:'visible',timeout:20000});
 await create.click({timeout:30000});
 const attach=page.locator('[data-video-audio-compact-attach]');
 if(await attach.isVisible()&&await attach.isEnabled()){
   await attach.click();
   await create.click({timeout:30000});
 }
 const captured=await readRealGuestVideo(page,{timeout:150000});
 assert.equal(captured.extension,'mp4','STORIES_FINAL_H264_MP4_REQUIRED');
 assert.ok(captured.bytes.length>100000,'STORIES_MP4_EMPTY');
 result.needsLoginForSave=captured.authGateVerified;
 const file=path.join(dir,'story.mp4');
 writeFileSync(file,captured.bytes);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams',
  '-show_format','-of','json',file],{encoding:'utf8',timeout:30000}));
 const video=probe.streams.find(x=>x.codec_type==='video');
 const audio=probe.streams.find(x=>x.codec_type==='audio');
 assert.ok(video&&video.width===720&&video.height===1280,'STORIES_WRONG_9_16');
 assert.equal(video.codec_name,'h264','STORIES_H264_REQUIRED');
 assert.ok(audio,'STORIES_SOUNDTRACK_MISSING');
 assert.equal(audio.codec_name,'aac','STORIES_AAC_REQUIRED');
 const sec=Number(probe.format.duration);
 assert.ok(sec>=18&&sec<=23,'STORIES_WRONG_DURATION:'+sec);
 const pcm=execFileSync('ffmpeg',['-v','error','-i',file,'-vn','-t','2','-ac','1',
   '-ar','8000','-f','s16le','-'],{maxBuffer:100000,timeout:30000});
 assert.ok(pcm.length>8000,'STORIES_PCM_TOO_SHORT');
 let energy=0;
 for(let i=0;i+1<pcm.length;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;
 const rms=Math.sqrt(energy/(pcm.length/2));
 assert.ok(rms>0.003,'STORIES_AUDIO_SILENT');
 const scores=[];
 for(let i=0;i<5;i++){
   const rendered=frame(file,2+4*i);
   assert.ok(rendered.some(value=>value>8),'STORIES_BLACK_SCENE_'+(i+1));
   const source=path.join('public',approved.get(ids[i]).video.replace(/^\/+/,''));
   const refs=[0.4,1.2,2.0,3.0].map(t=>frame(source,t));
   const match=Math.max(...refs.map(ref=>correlation(rendered,ref)));
   assert.ok(match>.55,'STORIES_SCENE_FRAME_MISMATCH_'+(i+1)+':'+match);
   scores.push(Number(match.toFixed(3)));
 }
 assert.deepEqual(errors,[],'STORIES_PAGE_RUNTIME_ERRORS');
 Object.assign(result,{status:'PASS',container:'mp4',width:video.width,height:video.height,
   durationSeconds:Number(sec.toFixed(2)),soundtrackRms:Number(rms.toFixed(4)),
   frameCorrelations:scores,sourceIds:ids});
 console.log('HH_STORIES_FIVE_SHOT_WEBKIT_PASS '+JSON.stringify(result));
}catch(error){
 result.failure=String(error?.message||error).slice(0,250);
 console.error('HH_STORIES_FIVE_SHOT_WEBKIT_FAIL '+JSON.stringify(result));
 throw error;
}finally{
 await context?.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 rmSync(dir,{recursive:true,force:true});
 mkdirSync('artifacts/benchmarking',{recursive:true});
 writeFileSync(evidencePath,JSON.stringify(result,null,2)+'\n');
}
