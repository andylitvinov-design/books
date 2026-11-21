import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import catalog from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import {installGuestVideoBlobCapture,readRealGuestVideo} from './real-guest-video-file.mjs';
const origin=process.env.HH_LIVE_VIDEO_SOURCE??'http://127.0.0.1:3100';
const driver=process.env.HH_LIVE_VIDEO_PLAYWRIGHT;
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/,'LOCAL_MOTION_STUDIO_REQUIRED');
assert.ok(driver?.startsWith('/'),'ABSOLUTE_PLAYWRIGHT_PATH_REQUIRED');
assert.equal(process.platform,'darwin','MACOS_WEBKIT_REQUIRED');
const {webkit}=await import(driver);
function framePixels(file,seconds){
 const pixels=execFileSync('ffmpeg',['-v','error','-ss',String(seconds),'-i',file,'-frames:v','1',
  '-vf','scale=45:80,format=gray','-f','rawvideo','pipe:1'],{timeout:20000});
 assert.equal(pixels.length,45*80);
 return pixels.subarray(0,45*56);
}
function correlation(a,b){
 const meanA=a.reduce((total,value)=>total+value,0)/a.length;
 const meanB=b.reduce((total,value)=>total+value,0)/b.length;
 let numerator=0,powerA=0,powerB=0;
 for(let i=0;i<a.length;i++){
  const left=a[i]-meanA,right=b[i]-meanB;
  numerator+=left*right;
  powerA+=left*left;
  powerB+=right*right;
 }
 return numerator/Math.sqrt(powerA*powerB);
}
let mediaDir;
const browser=await webkit.launch({headless:false});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await installGuestVideoBlobCapture(context);
 await context.route('**/*',route=>route.request().url().startsWith('blob:'+origin+'/')||
    (route.request().url().startsWith(origin+'/')&&['GET','HEAD'].includes(route.request().method()))?route.continue():route.abort());
 const page=await context.newPage();
 const response=await page.goto(origin+'/ru/holistic-support/mandala',{waitUntil:'commit',timeout:180000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('[data-mandala-free-video]')?.getAttribute('data-video-studio-hydrated')==='true',undefined,{timeout:90000});
 await page.locator('[data-video-open-motion-templates]').tap({timeout:30000});
 const advanced=page.locator('[data-video-first-video-advanced]').first();
 await advanced.locator('[data-first-video-openmotion-library] summary').first().tap({timeout:30000});
 const picker=advanced.locator('[data-openmotion-library-loaded]').first();
 await picker.locator('select').selectOption('focused-action',{timeout:45000});
 await picker.locator('[data-openmotion-edit-preset]').tap();
 const scenes=picker.locator('details').filter({hasText:'Каталожные сцены для Motion.md'});
 await scenes.locator('summary').tap();
 await scenes.locator('[data-openmotion-replace-clip]').selectOption('shot-2');
 await scenes.getByRole('searchbox').fill('ocean-pulse');
 const replacement=scenes.locator('[data-openmotion-replace-scene="ocean-pulse"]');
 await replacement.tap();
 assert.match(await scenes.locator('[data-openmotion-replace-clip] option:checked').textContent(),/ocean-pulse/);
 await scenes.locator('[data-openmotion-undo-scene]').tap();
 assert.match(await scenes.locator('[data-openmotion-replace-clip] option:checked').textContent(),/solar-surge/);
 await replacement.tap();
 await scenes.locator('[data-openmotion-move-scene="1"]').tap();
 const clipSelect=scenes.locator('[data-openmotion-replace-clip]');
 assert.match(await clipSelect.locator('option[value="shot-2"]').textContent(),/path-to-goals/);
 assert.match(await clipSelect.locator('option[value="shot-3"]').textContent(),/ocean-pulse/);
 const started=Date.now();
 await picker.locator('[data-openmotion-render-imported]').tap();
 await page.locator('[data-video-ready]').waitFor({state:'visible',timeout:15000});
 console.log('MOTION_READY_OPENED');
 try{
  const {bytes,extension,width,height}=await readRealGuestVideo(page,{timeout:85000});
  assert.equal(extension,'mp4'); assert.equal(width,360); assert.equal(height,640);
  mediaDir=mkdtempSync(join(tmpdir(),'hh-motion-studio-'));
  const file=join(mediaDir,'replacement.mp4');
  writeFileSync(file,bytes);
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',timeout:20000}));
  assert.equal(info.streams.find(track=>track.codec_type==='video')?.codec_name,'h264');
  assert.equal(info.streams.find(track=>track.codec_type==='audio')?.codec_name,'aac');
  assert.ok(Math.abs(Number(info.format.duration)-18.5)<.2);
  const chosen=catalog.scenes.find(scene=>scene.id==='ocean-pulse');
  assert.ok(chosen?.video.startsWith('/videos/holistic-house/'));
  const source=framePixels('public'+chosen.video,2);
  const match=correlation(framePixels(file,11),source);
  assert.ok(match>.96,'MOVED_SCENE_MUST_MATCH_SOURCE');
  console.log('MOTION_STUDIO_WEBKIT_PASS',bytes.length,(Date.now()-started)/1000,match.toFixed(4));
 }catch(error){
  console.log(await page.locator('[data-video-ready]').evaluate(root=>({
    state:root.getAttribute('data-ready-state'),phase:root.querySelector('[data-ready-status]')?.getAttribute('data-ready-status-phase'),
    failure:root.querySelector('[data-ready-export-failed]')?.textContent??null,
    player:root.querySelector('video')?.error?.code??null,
  })));
  throw error;
 }
}finally{
 await browser.close();
 if(mediaDir)rmSync(mediaDir,{recursive:true,force:true});
}
