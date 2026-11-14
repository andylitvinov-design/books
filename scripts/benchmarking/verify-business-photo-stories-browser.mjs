/**
 * Business Stories physical acceptance: six distinct rights-reviewed Pexels JPEGs
 * must be decoded through the allowlisted first-party route and become actual
 * moving, non-black frames in an audible 30-second local H264/AAC MP4.
 * No provider POST, Instagram publish, paid generation or private account data.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {installGuestVideoBlobCapture,readRealGuestVideo} from "./real-guest-video-file.mjs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto} from "../../lib/mandala/story-photo-library.mjs";

const origin="http://127.0.0.1:3100",browserModule=process.env.HH_LIVE_VIDEO_PLAYWRIGHT;
assert.ok(browserModule?.startsWith("/"),"BUSINESS_PHOTO_BROWSER_DRIVER_REQUIRED");
assert.equal(process.env.HH_BUSINESS_PHOTO_E2E_ENGINE,"webkit","BUSINESS_PHOTO_REAL_WEBKIT_REQUIRED");
assert.equal(process.platform,"darwin","BUSINESS_PHOTO_REAL_MACOS_REQUIRED");
const {webkit}=await import(pathToFileURL(browserModule).href);
const dir=mkdtempSync(path.join(tmpdir(),"hh-business-photo-"));
const evidencePath="artifacts/benchmarking/business-photo-stories-webkit.json";
const result={test:"business-photo-six-scene",browser:"webkit",origin:"localhost",
  paidProviderRequests:0,instagramPosts:0,status:"FAIL",sceneCount:0};
let browser,context;
function stillFrame(file){
 return execFileSync("ffmpeg",["-v","error","-i",file,
   "-frames:v","1","-vf","scale=36:64:force_original_aspect_ratio=increase,crop=36:64",
   "-f","rawvideo","-pix_fmt","rgb24","-"],{maxBuffer:100000,timeout:30000});
}
function videoFrame(file,seconds){
 return execFileSync("ffmpeg",["-v","error","-ss",String(seconds),"-i",file,
   "-frames:v","1","-vf","scale=36:64:force_original_aspect_ratio=increase,crop=36:64",
   "-f","rawvideo","-pix_fmt","rgb24","-"],{maxBuffer:100000,timeout:30000});
}
function correlation(a,b){
 assert.equal(a.length,36*64*3);assert.equal(a.length,b.length);
 let ax=0,bx=0,aa=0,bb=0,ab=0;
 for(let i=0;i<a.length;i++){ax+=a[i];bx+=b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];ab+=a[i]*b[i];}
 const den=Math.sqrt((aa-ax*ax/a.length)*(bb-bx*bx/b.length));
 return den>0?(ab-ax*bx/a.length)/den:0;
}
try{
 browser=await webkit.launch({headless:false});
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
   hasTouch:true,serviceWorkers:"block",acceptDownloads:true});
 await installGuestVideoBlobCapture(context);
 await context.route("**/*",route=>{
   const request=route.request(),url=new URL(request.url());
   return url.origin===origin&&["GET","HEAD"].includes(request.method())
     ?route.continue():route.abort("blockedbyclient");
 });
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.name));
 const response=await page.goto(origin+"/ru/holistic-support/mandala",
   {waitUntil:"domcontentloaded",timeout:60000});
 assert.equal(response?.status(),200,"BUSINESS_LOCAL_APP_NOT_200");
 await page.locator('[data-video-studio-hydrated="true"]').waitFor({timeout:60000});
 const details=page.locator("[data-video-wish-disclosure]");
 await details.locator(":scope > summary").tap();
 const wish=page.locator("[data-video-wish]");
 await wish.waitFor({state:"visible",timeout:15000});
 // A literal career/salary action, not a generic 'growth' theme.
 await wish.fill("I want my work recognized and to discuss money, salary and pay with my manager at an office meeting");
 await page.locator("[data-video-continue-scenarios]").tap();
 await page.locator('[data-video-quick-control="editor"]').tap();
 const storyTab=page.locator('[data-video-montage-tab="concept"]');
 await storyTab.waitFor({state:"visible",timeout:15000});
 await storyTab.tap();
 const story=page.locator("[data-video-auto-storyboard]");
 await story.waitFor({state:"visible",timeout:20000});
 await assert.equal(await story.getAttribute("data-photo-fallback"),"licensed",
   "BUSINESS_STORY_NEEDS_REAL_PHOTO_FALLBACK");
 assert.equal(await story.getAttribute("data-storyboard-media-ready"),"true",
   "BUSINESS_STORY_MUST_HAVE_VALID_SOURCE_PLAN");
 assert.equal(await story.getAttribute("data-storyboard-clips"),"6");
 assert.equal(await story.locator('[data-story-media-kind="photo"]').count(),5);
 const ids=(await story.getAttribute("data-storyboard-source-ids")||"").split(",").filter(Boolean);
 assert.equal(ids.length,6,"SIX_DIFFERENT_PHOTO_SOURCES_REQUIRED");
 assert.equal(new Set(ids).size,6,"NO_DUPLICATE_PHOTO_MASTERS");
 for(const id of ids)assert.ok(isTrustedStoryPhoto(STORY_PHOTO_BY_ID.get(id)),
   "BUSINESS_STORY_UNREVIEWED_SOURCE");
 result.sceneCount=6;result.distinctSources=6;result.verifiedRights=true;
 const quality=page.locator("[data-video-story-select-quality]");
 await quality.tap();
 const promo=page.locator('[data-video-montage-tab="promo"]');
 await promo.waitFor({state:"visible"});
 await page.waitForFunction(()=>document.querySelector('[data-video-montage-tab="promo"]')
   ?.getAttribute("aria-pressed")==="true",null,{timeout:15000});
 // The actual Free card invokes the single trusted renderer, not paid generation.
 const free=page.locator('[data-video-montage-pro-choice="free"]');
 await free.waitFor({state:"visible",timeout:15000});
 await free.tap({timeout:30000});
 const file=await readRealGuestVideo(page,{timeout:180000});
 assert.equal(file.extension,"mp4","PHOTO_STORY_MUST_ENCODE_REAL_MP4");
 assert.equal(file.authGateVerified,true,"SAVE_REQUIRES_REAL_LOGIN_GATE");
 assert.ok(file.bytes.length>100000,"PHOTO_STORY_ENCODED_BYTES_MISSING");
 const movie=path.join(dir,"business.mp4");writeFileSync(movie,file.bytes);
 const probe=JSON.parse(execFileSync("ffprobe",["-v","error","-show_streams",
   "-show_format","-of","json",movie],{encoding:"utf8",timeout:30000}));
 const video=probe.streams.find(s=>s.codec_type==="video");
 const audio=probe.streams.find(s=>s.codec_type==="audio");
 assert.equal(video?.codec_name,"h264","H264_VIDEO_REQUIRED");
 assert.equal(audio?.codec_name,"aac","AUDIBLE_AAC_REQUIRED");
 assert.ok(video.width===720&&video.height===1280,"9_16_VERTICAL_REQUIRED");
 const seconds=Number(probe.format.duration);
 assert.ok(seconds>28&&seconds<32,"SIX_FIVE_SECOND_SCENES_REQUIRED");
 const pcm=execFileSync("ffmpeg",["-v","error","-i",movie,"-vn","-t","2",
   "-ac","1","-ar","8000","-f","s16le","-"],{maxBuffer:100000,timeout:30000});
 let energy=0;for(let i=0;i+1<pcm.length;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;
 const rms=Math.sqrt(energy/Math.max(1,pcm.length/2));
 assert.ok(rms>0.003,"SOUNDTRACK_CANNOT_BE_SILENT");
 const matches=[];
 for(let i=0;i<6;i++){
   const id=ids[i],photo=STORY_PHOTO_BY_ID.get(id);
   const response=await page.request.get(origin+photo.src,{timeout:20000});
   assert.equal(response.status(),200,"PHOTO_PROXY_MUST_DELIVER_JPEG");
   const jpeg=path.join(dir,"source-"+i+".jpg");
   writeFileSync(jpeg,await response.body());
   const frame=videoFrame(movie,i*5+2.5),reference=stillFrame(jpeg);
   assert.ok(frame.some(v=>v>8),"NO_BLACK_PHOTO_FRAMES");
   const match=correlation(frame,reference);
   assert.ok(match>.45,"PHOTO_SCENE_DOES_NOT_MATCH_SOURCE:"+i+":"+match);
   matches.push(Number(match.toFixed(3)));
 }
 assert.deepEqual(errors,[],"BUSINESS_STORY_PAGE_ERRORS");
 Object.assign(result,{status:"PASS",sourceIds:ids,width:video.width,height:video.height,
   durationSeconds:Number(seconds.toFixed(2)),audioRms:Number(rms.toFixed(4)),
   frameCorrelations:matches,guestSaveAuthVerified:true});
 console.log("HH_BUSINESS_PHOTO_WEBKIT_PASS "+JSON.stringify(result));
}catch(error){
 result.failure=String(error?.message||error).slice(0,240);
 console.error("HH_BUSINESS_PHOTO_WEBKIT_FAIL "+JSON.stringify(result));
 throw error;
}finally{
 await context?.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 rmSync(dir,{recursive:true,force:true});
 mkdirSync("artifacts/benchmarking",{recursive:true});
 writeFileSync(evidencePath,JSON.stringify(result,null,2)+"\n");
}