// Public, read-only browser playback verification. No credentials or database writes.
// The separate completed run 36708360527 already verified real owner draft persistence.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium, expect } from '/tmp/video-browser-tools/node_modules/@playwright/test/index.mjs'
const origin='https://holistichouse.vercel.app'
const work='/tmp/holistic-video-playback'
mkdirSync(work,{recursive:true})
const report={date:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,origin,checks:[]}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const safeUrl=value=>{try{const u=new URL(value);return u.origin+u.pathname}catch{return ''}}
function save(){writeFileSync(`${work}/results.json`,JSON.stringify(report,null,2))}
const browser=await chromium.launch({headless:true,channel:'chromium'})
async function inspect(frame){
  if(!frame)return {missingFrame:true}
  return frame.evaluate(()=>({
    title:document.title,text:document.body?.innerText.slice(0,1400),
    buttons:[...document.querySelectorAll('button,[role=button]')].map(b=>({name:b.getAttribute('aria-label')||b.getAttribute('title')||b.textContent?.trim().slice(0,100),className:b.className,visible:!!(b.offsetWidth||b.offsetHeight||b.getClientRects().length)})).slice(0,30),
    videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,ended:v.ended,time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,width:v.videoWidth,height:v.videoHeight,ready:v.readyState,network:v.networkState,muted:v.muted,volume:v.volume,error:v.error?.code||null,controls:v.controls,visible:!!(v.offsetWidth||v.offsetHeight||v.getClientRects().length),frames:v.getVideoPlaybackQuality?.().totalVideoFrames||0,audioBytes:v.webkitAudioDecodedByteCount||0}))
  })).catch(()=>({unavailableFrame:true}))
}
async function scenario(label,index,width=1365,complete=false){
  const result={label,ok:false,steps:[],networkErrors:[]}
  const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'})
  const page=await context.newPage()
  let wrapper,frame
  page.on('response',r=>{if(r.status()>=400)result.networkErrors.push({url:safeUrl(r.url()),status:r.status()})})
  try{
    const r=await page.goto(origin+'/en/about',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200)
    wrapper=index<0?page.locator('#psychic-alchemy-video'):page.locator('.site-video-player').nth(index)
    await expect(wrapper).toBeVisible()
    await wrapper.scrollIntoViewIfNeeded()
    assert.equal(await wrapper.locator('iframe').count(),0,'Eager iframe')
    await wrapper.locator('button').first().click()
    const iframe=wrapper.locator('iframe')
    await expect(iframe).toHaveCount(1)
    result.source=safeUrl(await iframe.getAttribute('src'))
    for(let i=0;i<20;i++){
      frame=await (await iframe.elementHandle())?.contentFrame()
      if(frame && await frame.locator('video').count())break
      await pause(1000)
    }
    await pause(2000)
    result.before=await inspect(frame)
    await page.screenshot({path:`${work}/${label}-before.png`,fullPage:false})
    assert.ok(frame,'Player document unavailable')
    // Respect provider sign-in/anti-bot requirements; do not try bypassing them.
    if(/sign in to confirm|not a bot|unusual traffic|video unavailable|private video/i.test(result.before.text||''))throw new Error('Provider access restriction shown; no bypass attempted')
    const largePlay=frame.locator('.ytp-large-play-button')
    if(await largePlay.isVisible().catch(()=>false)){
      await largePlay.click();result.steps.push('clicked visible YouTube play control')
    }else{
      const play=frame.getByRole('button',{name:/^(play|play video|воспроизвести)$/i}).first()
      if(await play.isVisible().catch(()=>false)){await play.click();result.steps.push('clicked visible play control')}
      else if(await frame.locator('video').first().isVisible().catch(()=>false)){
        // Native controls use a hit in the lower-left play-control region, not
        // the inert middle of an HTML video with custom/native controls.
        const video=frame.locator('video').first()
        const state=await video.evaluate(v=>({paused:v.paused,controls:v.controls}))
        if(state.paused&&state.controls){const b=await video.boundingBox();await video.click({position:{x:20,y:b.height-20}});result.steps.push('clicked native video play control')}
      }
    }
    await pause(2000)
    result.afterControl=await inspect(frame)
    if(!result.afterControl.videos?.some(v=>!v.paused&&v.time>0)){
      // Diagnose whether media itself can play after the user's trusted click.
      // Record this distinctly; this is NOT evidence that provider UI controls worked.
      result.directPlay=await frame.evaluate(async()=>{const v=document.querySelector('video');if(!v)return 'no video';try{await v.play();return 'accepted'}catch(e){return e.name+': '+e.message}})
      result.steps.push('diagnostic HTMLMediaElement.play after trusted user click')
    }
    await frame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>1&&v.videoWidth>0&&v.readyState>=2},null,{timeout:20000})
    const start=(await inspect(frame)).videos[0]
    await pause(3000)
    const during=(await inspect(frame)).videos[0]
    result.playback=during
    result.timelineAdvanced=during.time>start.time+1
    result.audioDecoded=during.audioBytes>0
    result.audioAdvances=during.audioBytes>start.audioBytes
    assert.ok(result.timelineAdvanced&&!during.error,'Media timeline did not advance')
    await page.screenshot({path:`${work}/${label}-playing.png`,fullPage:false})
    if(complete){await frame.waitForFunction(()=>document.querySelector('video')?.ended,null,{timeout:120000});result.ended=true}
    result.ok=true
  }catch(e){result.error=String(e.message).slice(0,700);result.final=await inspect(frame);await page.screenshot({path:`${work}/${label}-observation.png`,fullPage:false}).catch(()=>{})}
  finally{report.checks.push(result);save();console.log(`${result.ok?'PASS':'OBSERVATION'}: ${label} ${result.error||''}`);await context.close()}
}
try{
  await scenario('about-desktop',-1,1365,true)
  await scenario('testimonial-1',0)
  await scenario('testimonial-2',1)
  await scenario('testimonial-3',2)
  await scenario('about-mobile',-1,390)
}finally{await browser.close();save()}
if(report.checks.some(x=>!x.ok))process.exitCode=1
