/** Read the actual, test-owned recorded Blob without weakening the guest Save gate. */
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';

export async function installGuestVideoBlobCapture(context){
  await context.addInitScript(()=>{
    const native=URL.createObjectURL;
    const stored=new Map();
    const encodes={mediaRecorderStarts:0,videoEncoderConfigurations:0};
    window.__hhTestEncodeStarts=encodes;
    if(typeof MediaRecorder!="undefined"){
      const start=MediaRecorder.prototype.start;
      MediaRecorder.prototype.start=function(...args){
        encodes.mediaRecorderStarts++;
        return start.apply(this,args);
      };
    }
    if(typeof VideoEncoder!="undefined"){
      const configure=VideoEncoder.prototype.configure;
      VideoEncoder.prototype.configure=function(...args){
        encodes.videoEncoderConfigurations++;
        return configure.apply(this,args);
      };
    }
    window.__hhTestRecordedVideoBlobs=stored;
    URL.createObjectURL=function(blob){
      const uri=native.call(URL,blob);
      if(blob instanceof Blob&&blob.type.startsWith('video/'))stored.set(uri,blob);
      return uri;
    };
  });
}

export async function readRealGuestVideo(page,{timeout=120000}={}){
  const ready=page.locator('[data-video-ready]');
  const readyPlayer=ready.locator('video');
  const result=page.locator('[data-video-result]');
  const renderedPlayer=ready.locator('video[data-mandala-video-preview]');
  let verificationTapped=false;
  await expect.poll(async()=>{
    const verify=ready.locator('[data-ready-play-verify]');
    if(!verificationTapped&&await verify.isVisible()){
      try{await verify.click({timeout:2000});verificationTapped=true;}
      catch(error){if(error.name!=='TimeoutError')throw error;return false;}
    }
    return readyPlayer.isVisible();
  },{timeout,intervals:[250,500,1000]}).toBe(true);
  await expect(ready).toHaveAttribute('data-ready-view','home');
  await expect(result).toHaveAttribute('data-video-result-mode','rendered');
  // Real native guest Save must not be occluded by the optional check-in.
  await expect(page.locator('[data-video-effect-overlay]')).toHaveCount(0,{timeout:12000});
  await expect(page.locator('[data-mandala-video-download]')).toBeHidden();
  await expect.poll(()=>renderedPlayer.evaluate(video=>
    video instanceof HTMLVideoElement&&
    (video.currentSrc.startsWith('blob:')||video.srcObject instanceof Blob)&&
    video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0&&!video.error),
    {timeout:20000}).toBe(true);
  await expect(ready).toHaveAttribute('data-ready-state','complete');
  const encodeStarts=await page.evaluate(()=>window.__hhTestEncodeStarts);
  assert.equal((encodeStarts?.mediaRecorderStarts||0)+
    (encodeStarts?.videoEncoderConfigurations||0),1,
    'ONE_ENCODER_START_PER_SINGLE_EXPRESS_GENERATE_GESTURE');
  const gate=ready.locator('[data-ready-save-gate]');
  let downloads=0;
  const onDownload=()=>{downloads++;};
  page.on('download',onDownload);
  try{
    // The approved Ready has two primary actions; Save is the explicit auth gate.
    // Do not click a removed Download button or weaken the decoded Blob checks.
    await ready.locator('[data-ready-save]').click();
    await gate.waitFor({state:'visible',timeout:10000});
    await ready.locator('[data-ready-save-gate-signin]').waitFor({state:'visible',timeout:10000});
    await ready.locator('[data-ready-save-close]').click();
    await gate.waitFor({state:'detached',timeout:10000});
    assert.equal(downloads,0,'GUEST_DOWNLOAD_MUST_REQUIRE_LOGIN');
  }finally{page.off('download',onDownload);}
  const movie=await page.evaluate(async()=>{
    const video=document.querySelector('[data-video-ready] video[data-mandala-video-preview]');
    if(!(video instanceof HTMLVideoElement)||
       video.readyState<2||video.videoWidth===0||video.videoHeight===0||video.error)
      throw Error('REAL_GUEST_VIDEO_NOT_DECODED');
    const captured=window.__hhTestRecordedVideoBlobs;
    const blob=video.srcObject instanceof Blob
      ? [...(captured?.values()||[])].find(item=>item===video.srcObject)
      : captured?.get(video.currentSrc);
    if(!(blob instanceof Blob))throw Error('REAL_GUEST_VIDEO_BLOB_MISSING');
    if(blob.size<20000||blob.size>100000000)throw Error('REAL_GUEST_VIDEO_BYTES_INVALID');
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(Error('REAL_GUEST_VIDEO_FILE_READ_FAILED'));
      reader.onload=()=>resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    return {base64:String(dataUrl).split(',')[1],mime:blob.type,
      bytes:blob.size,width:video.videoWidth,height:video.videoHeight};
  });
  const bytes=Buffer.from(movie.base64,'base64');
  assert.equal(bytes.length,movie.bytes,'REAL_GUEST_VIDEO_BYTES_CHANGED');
  return {bytes,extension:movie.mime.includes('webm')?'webm':'mp4',
    width:movie.width,height:movie.height,authGateVerified:true};
}
