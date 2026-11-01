#!/usr/bin/env node
/**
 * Real, anonymous production acceptance for the *chat*, not just the older
 * first-video form: guided intent -> 4 licensed shots -> approved storyboard
 * -> existing Canvas/MediaRecorder -> downloadable moving video + real audio.
 * Chromium's mobile viewport is not a physical iPhone Safari device.
 * Never submits credentials, photos, account details, AI requests or payments.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';

const LIVE='https://holistichouse.vercel.app';
const LOCAL='http://127.0.0.1:3100';
const origin=process.env.HH_CHAT_LIVE_ORIGIN||LIVE;
const driver=process.env.HH_LIVE_VIDEO_PLAYWRIGHT;
if(!driver?.startsWith('/') || (origin!==LIVE &&
  !(origin===LOCAL && process.env.HH_CHAT_ALLOW_LOCAL==='true')))
  throw Error('VIDEO_CHAT_LIVE_CONFIG_UNSAFE');
const {chromium}=await import(driver);
const catalogue=JSON.parse(readFileSync('data/video-catalog/scene-taxonomy.json','utf8'));
const approved=new Map(catalogue.scenes.filter(s=>
  s.status==='approved'&&s.media==='licensed_mp4'&&s.rightsReference&&
  /^\/videos\/holistic-house\/[a-z0-9_/-]+\.mp4$/.test(s.video))
  .map(s=>[s.id,s.video]));
const artifact='artifacts/benchmarking/video-director-chat-live-acceptance.json';
const report={origin,method:'anonymous-local-render',engine:'desktop-Chromium-mobile-emulation',
  physicalIPhoneVerified:false,externalAiRequested:false,paidServiceUsed:false,
  localesChecked:[],shotCount:0,encodedVideo:false,downloadedVideo:false,
  audioVerified:false,sourceIdentityVerified:false,status:'FAIL'};
let browser,mediaDir;
function mediaTool(cmd,args,maxBuffer=1024*1024){
  const r=spawnSync(cmd,args,{timeout:30000,maxBuffer});
  if(r.error||r.status!==0)throw Error('VIDEO_CHAT_'+cmd.toUpperCase()+
    '_FAILED:'+String(r.error?.code||r.status)+':'+String(r.stderr||'').slice(0,130));
  return r.stdout;
}
function sample(media,time){
  return mediaTool('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(time),
    '-i',media,'-frames:v','1','-vf','scale=54:96,format=rgb24',
    '-f','rawvideo','pipe:1'],200*1024);
}
function similarity(a,b){
  assert.equal(a.length,54*96*3,'ENCODED_FRAME_INVALID');
  assert.equal(b.length,a.length,'REFERENCE_FRAME_INVALID');
  let ma=0,mb=0;
  for(let i=0;i<a.length;i++){ma+=a[i];mb+=b[i];}
  ma/=a.length;mb/=b.length;
  let aa=0,bb=0,ab=0;
  for(let i=0;i<a.length;i++){
    const x=a[i]-ma,y=b[i]-mb;aa+=x*x;bb+=y*y;ab+=x*y;
  }
  return aa&&bb?ab/Math.sqrt(aa*bb):0;
}
function decodedAudioRms(path){
  const pcm=mediaTool('ffmpeg',['-hide_banner','-loglevel','error','-i',path,
    '-map','0:a:0','-t','2','-ar','8000','-ac','1','-f','s16le','pipe:1'],100*1024);
  const samples=Math.floor(pcm.length/2);
  assert.ok(samples>4000,'AUDIO_DECODE_EMPTY');
  let power=0;
  for(let i=0;i<samples;i++){const v=pcm.readInt16LE(i*2)/32768;power+=v*v;}
  return Math.sqrt(power/samples);
}
const ideas={
  ru:'Спокойное вертикальное видео про любовь на 20 секунд с медитативной музыкой без фраз',
  en:'A video about love',
  es:'Vídeo vertical suave de amor de 20 segundos con música, sin texto',
};
const sizes={ru:390,en:320,es:430};
async function state(page,value,timeout=15000){
  await page.waitForFunction(expected=>
    document.querySelector('[data-video-director-chat]')?.getAttribute('data-chat-step')===expected,
    value,{timeout});
}
async function send(chat,text){
  const input=chat.locator('form textarea');
  assert.equal(await input.count(),1,'SINGLE_CHAT_COMPOSER_REQUIRED');
  await input.fill(text);
  await chat.locator('form button[type=submit]').click();
}
async function downloadBytes(download){
  const chunks=[];
  for await(const c of await download.createReadStream())chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}
try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const locale of ['en','es','ru']){
    const context=await browser.newContext({
      viewport:{width:sizes[locale],height:844},isMobile:true,hasTouch:true,
      locale:locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-US',
      serviceWorkers:'block',reducedMotion:'reduce',
      storageState:{cookies:[],origins:[]},acceptDownloads:true,
    });
    const networkViolations=[],pageErrors=[];
    await context.route('**/*',route=>{
      const req=route.request();
      let firstParty=false;
      try{firstParty=new URL(req.url()).origin===origin;}catch{}
      if(!firstParty||!['GET','HEAD'].includes(req.method())){
        networkViolations.push({method:req.method(),external:!firstParty});
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page=await context.newPage();
    page.on('pageerror',e=>pageErrors.push(e.name));
    const response=await page.goto(origin+'/'+locale+'/holistic-support/mandala',{
      waitUntil:'domcontentloaded',timeout:65000});
    assert.equal(response?.status(),200,'LIVE_CHAT_PAGE_NOT_200_'+locale);
    const chat=page.locator('[data-video-director-chat]');
    await chat.waitFor({state:'visible',timeout:60000});
    await state(page,'goal');
    assert.equal(await chat.locator('form textarea').count(),1,'CHAT_COMPOSER_DUPLICATED');
    assert.equal(await chat.locator('input[type=checkbox]').isChecked(),false,
      'EXTERNAL_AI_MUST_REQUIRE_OPT_IN');
    assert.equal(await chat.locator('form textarea').evaluate(n=>Number(n.maxLength)),800,
      'CREATIVE_BRIEF_LIMIT_REGRESSION');
    const before=await chat.boundingBox();
    assert.ok(before&&before.width<=sizes[locale]+2,'CHAT_OVERFLOWS_MOBILE_VIEWPORT');
    await send(chat,'Video');
    await state(page,'goal');
    await send(chat,ideas[locale]);
    if(locale==='en'){
      await state(page,'mood');
      await send(chat,'calm');
      await state(page,'aspect');
      await send(chat,'vertical');
      await state(page,'duration');
      await send(chat,'20 seconds');
      await state(page,'music');
      await send(chat,'meditation');
      await state(page,'phrases');
      await send(chat,'no');
    }
    await state(page,'review');
    const card=chat.locator('[data-video-chat-storyboard]');
    await card.waitFor({state:'visible',timeout:15000});
    assert.equal(await card.locator('[data-executable-video-scenario]').getAttribute('data-executable-video-scenario'),
      'hh-executable-video-scenario-v1','PLAN_NOT_EXECUTABLE');
    assert.equal(await card.locator('[data-chat-shot-id]').count(),4,'FOUR_SHOT_PREVIEW_REQUIRED');
    if(locale==='ru'){
      await card.locator('[data-video-chat-change-filter="duration"]').click();
      await state(page,'duration');
      await send(chat,'15');
      await state(page,'review');
      assert.match((await card.locator('[data-executable-video-scenario]').innerText()),/15\s*s/,
        'INLINE_FILTER_CHANGE_DID_NOT_APPLY');
      await card.locator('[data-video-chat-change-filter="duration"]').click();
      await state(page,'duration');
      await send(chat,'20');
      await state(page,'review');
    }
    const shots=await card.locator('[data-chat-shot-id]').evaluateAll(nodes=>nodes.map(node=>({
      id:node.getAttribute('data-chat-shot-id'),
      label:node.querySelector('b')?.textContent||'',
    })));
    assert.equal(new Set(shots.map(x=>x.id)).size,4,'REPEATED_OR_MISSING_MP4_SCENE');
    for(const shot of shots)assert.ok(approved.has(shot.id),'UNLICENSED_PREVIEW_'+shot.id);
    report.localesChecked.push({locale,width:sizes[locale],chatVisible:true,filtersApplied:true,
      fourApprovedClips:true});
    if(locale!=='ru'){
      assert.deepEqual(pageErrors,[],'CLIENT_JAVASCRIPT_ERROR_'+locale);
      assert.deepEqual(networkViolations,[],'UNEXPECTED_REQUEST_WITH_AI_OPT_OUT_'+locale);
      await context.close();
      continue;
    }
    const seconds=shots.map(x=>Number(x.label.match(/(\d+)\s*s\b/i)?.[1]||NaN));
    assert.ok(seconds.every(n=>Number.isInteger(n)&&n>=2),'BAD_SHOT_TIMING');
    assert.equal(seconds.reduce((sum,n)=>sum+n,0),20,'SHOTS_DO_NOT_MATCH_DURATION');
    report.shotCount=shots.length;
    report.approvedClipIds=shots.map(x=>x.id);
    report.stageSeconds=seconds;
    await card.locator('[data-video-chat-confirm]').click();
    await state(page,'ready');
    await page.waitForFunction(()=>{
      const videos=[...document.querySelectorAll('[data-free-film-source]')];
      return videos.length===4&&videos.every(v=>v.readyState>=2&&v.videoWidth>0);
    },undefined,{timeout:90000});
    const sources=await page.locator('[data-free-film-source]').evaluateAll(videos=>
      videos.map(video=>({id:video.dataset.freeFilmSource,src:video.getAttribute('src')})));
    assert.deepEqual(sources.map(x=>x.id),shots.map(x=>x.id),
      'APPROVED_CHAT_STORYBOARD_NOT_APPLIED_TO_RENDERER');
    for(const item of sources)
      assert.equal(item.src,approved.get(item.id),'RENDERER_SOURCE_NOT_APPROVED_'+item.id);
    assert.equal(await page.locator('[data-video-live-stage] canvas').count(),1,
      'CHAT_MUST_REUSE_SINGLE_CANVAS');
    const create=chat.locator('[data-video-chat-create]');
    await create.waitFor({state:'visible',timeout:45000});
    await page.waitForFunction(()=>{
      const b=document.querySelector('[data-video-chat-create]');return Boolean(b&&!b.disabled);
    },undefined,{timeout:65000});
    await create.click({timeout:15000});
    const result=page.locator('[data-video-result]');
    const save=result.locator('[data-mandala-video-download]');
    await save.waitFor({state:'visible',timeout:95000});
    assert.equal(await result.getAttribute('data-video-result-mode'),'rendered',
      'CATALOG_PREVIEW_MUST_NOT_BE_TREATED_AS_NEW_VIDEO');
    assert.equal(await result.locator('[data-video-result-play]').count(),1,
      'MISSING_REAL_PLAYBACK_CONTROL');
    assert.equal(await result.locator('[data-video-share]').count(),1,
      'MISSING_VIDEO_SHARE_CONTROL');
    await chat.locator('[data-video-chat-result]').waitFor({state:'visible',timeout:20000});
    await result.locator('[data-video-result-play]').click();
    await page.waitForFunction(()=>document.querySelector('[data-mandala-video-preview]')?.currentTime>0.15,
      undefined,{timeout:20000});
    const [download]=await Promise.all([
      page.waitForEvent('download',{timeout:25000}),save.click(),
    ]);
    const bytes=await downloadBytes(download);
    const filename=download.suggestedFilename();
    assert.match(filename,/\.(mp4|webm)$/,'INVALID_DOWNLOAD_SUFFIX');
    assert.ok(bytes.length>20000,'DOWNLOAD_HAS_NO_ENCODED_VIDEO');
    if(filename.endsWith('.mp4'))assert.equal(bytes.subarray(4,8).toString(),'ftyp','NOT_A_REAL_MP4');
    else assert.deepEqual(bytes.subarray(0,4),Buffer.from([0x1a,0x45,0xdf,0xa3]),'NOT_A_REAL_WEBM');
    mediaDir=mkdtempSync(join(tmpdir(),'hh-chat-video-'));
    const mediaFile=join(mediaDir,filename.endsWith('.mp4')?'chat.mp4':'chat.webm');
    writeFileSync(mediaFile,bytes);
    const probe=JSON.parse(mediaTool('ffprobe',['-v','error','-show_streams','-show_format','-of','json',mediaFile]).toString());
    const video=probe.streams.find(x=>x.codec_type==='video');
    const audio=probe.streams.find(x=>x.codec_type==='audio');
    assert.ok(video,'RENDERED_VIDEO_STREAM_MISSING');
    assert.ok(audio,'SELECTED_MEDITATION_AUDIO_MISSING');
    assert.deepEqual([video.width,video.height],[720,1280],'INCORRECT_VERTICAL_VIDEO_SIZE');
    const duration=Number(probe.format?.duration||video.duration||0);
    assert.ok(duration>=18&&duration<=26,'VIDEO_DURATION_OUTSIDE_APPROVED_TWENTY_SECONDS');
    const rms=decodedAudioRms(mediaFile);
    assert.ok(rms>0.003,'ATTACHED_MEDITATION_AUDIO_SILENT');
    report.downloadedVideo=true;
    report.encodedVideo=true;
    report.audioVerified=true;
    report.durationSeconds=Number(duration.toFixed(2));
    report.audioRms=Number(rms.toFixed(5));
    report.container=filename.endsWith('.mp4')?'mp4':'webm';
    report.encodedBytes=bytes.length;
    const frames=[1,5,10,17].map(at=>sample(mediaFile,at));
    const delta=Math.max(...frames.slice(1).map(frame=>{
      let d=0;for(let i=0;i<frame.length;i++)d+=Math.abs(frame[i]-frames[0][i]);
      return d/frame.length;
    }));
    assert.ok(delta>0.35,'VIDEO_STATIC_OR_FREEZING');
    report.maxFrameDelta=Number(delta.toFixed(3));
    let offset=0,correlations=[];
    for(let i=0;i<shots.length;i++){
      const output=sample(mediaFile,offset+seconds[i]/2);
      const source=resolve('public','.'+sources[i].src);
      assert.ok(source.startsWith(resolve('public')+'/'),'INVALID_SOURCE_PATH');
      const probes=[0.5,1,2,2.5,3,4].map(at=>sample(source,at));
      const score=Math.max(...probes.map(x=>similarity(output,x)));
      assert.ok(score>0.52,'LICENSED_VIDEO_SOURCE_ABSENT_'+(i+1));
      correlations.push(Number(score.toFixed(3)));
      offset+=seconds[i];
    }
    report.sourceIdentityVerified=true;
    report.sourceCorrelations=correlations;
    const black=spawnSync('ffmpeg',['-hide_banner','-i',mediaFile,'-vf',
      'blackdetect=d=0.18:pix_th=0.05','-an','-f','null','-'],
      {timeout:30000,maxBuffer:1024*1024});
    assert.equal(black.status,0,'BLACK_FRAME_SCAN_FAILED');
    assert.doesNotMatch(String(black.stderr),/black_start:/,'BLACK_GAP_IN_STITCHED_VIDEO');
    assert.deepEqual(pageErrors,[],'LIVE_BROWSER_PAGE_EXCEPTION');
    assert.deepEqual(networkViolations,[],'EXTERNAL_AI_OR_PAYMENT_CALLED_WITHOUT_OPT_IN');
    report.blackGaps=false;
    report.status='PASS';
    console.log('VIDEO_DIRECTOR_CHAT_LIVE_REAL_EXPORT_PASS',JSON.stringify(report));
    await context.close();
  }
}catch(error){
  report.failure=String(error?.message||error).slice(0,220);
  console.error('VIDEO_DIRECTOR_CHAT_LIVE_REAL_EXPORT_FAIL',report.failure);
  process.exitCode=1;
}finally{
  await browser?.close();
  if(mediaDir)rmSync(mediaDir,{recursive:true,force:true});
  mkdirSync('artifacts/benchmarking',{recursive:true});
  writeFileSync(resolve(artifact),JSON.stringify(report,null,2)+'\n');
}
