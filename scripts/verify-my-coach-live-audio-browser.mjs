// Native timer and Web Audio regression for My Coach. No provider, credentials,
// mic, customer data, network or additional browser process. This is a
// synthetic browser-output check, not physical speaker/Gemini acceptance.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

export async function verifyLiveAudioBrowser(browserType,browser){
  const origin='http://my-coach-audio.test'
  const modules=[
    'gemini-live-transport.mjs',
    'gemini-live-echo.mjs',
    'coach-audio-wire.mjs',
    'coach-audio-profiles.mjs',
    'coach-personality-core.mjs',
  ]
  const sources=new Map(await Promise.all(modules.map(async name=>[
    '/'+name,await readFile(new URL('../lib/coaching/'+name,import.meta.url),'utf8'),
  ])))
  const requests=[]
  const context=await browser.newContext()
  const page=await context.newPage()
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  try{
    await context.route('**/*',route=>{
      const url=new URL(route.request().url())
      if(url.origin===origin&&url.pathname==='/'){
        return route.fulfill({contentType:'text/html',body:'<!doctype html><button>Run synthetic audio QA</button>'})
      }
      if(url.origin===origin&&sources.has(url.pathname)){
        requests.push(url.pathname)
        return route.fulfill({contentType:'text/javascript',body:sources.get(url.pathname)})
      }
      return route.abort()
    })
    await page.goto(origin)
    await page.evaluate(async transportUrl=>{
      const check=(condition,code)=>{if(!condition)throw Error(code)}
      const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
      const api=await import(transportUrl)
      const {GeminiLiveReplyWatchdog,GeminiLivePcmPlayer,bytesToBase64,readGeminiLiveServerMessage}=api
      const button=document.querySelector('button')
      button.addEventListener('click',async()=>{
        let audio,watch,shortWatch,player,result
        try{
          const Audio=window.AudioContext||window.webkitAudioContext
          check(typeof Audio==='function','AUDIO_CONTEXT_UNAVAILABLE')
          audio=new Audio()
          await audio.resume()
          check(audio.state==='running','AUDIO_CONTEXT_NOT_RUNNING')
          let ended=0,stalls=0,errors=0,samples=0
          watch=new GeminiLiveReplyWatchdog({canFire:()=>true,onStall:()=>stalls++})
          player=new GeminiLivePcmPlayer(audio,{onEnd:()=>{ended++;watch.clear()},
            onError:()=>errors++,onScheduledPcm:pcm=>{samples+=pcm.length}})
          const analyser=audio.createAnalyser()
          analyser.fftSize=1024
          // Tap the real player's gain output; don't add another speaker route.
          player.output.connect(analyser)
          const wave=new Float32Array(analyser.fftSize)
          const evidence=[]
          for(const [turn,hz] of [[1,440],[2,660]]){
            const pcm=new Uint8Array(12000*2)
            const view=new DataView(pcm.buffer)
            for(let i=0;i<12000;i++)view.setInt16(i*2,Math.round(8000*Math.sin(2*Math.PI*hz*i/24000)),true)
            const frame=readGeminiLiveServerMessage(JSON.stringify({serverContent:{
              outputTranscription:{text:'Synthetic QA reply '+turn},
              modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm; rate=24000',data:bytesToBase64(pcm)}}]},turnComplete:true}}))
            check(frame.audio.length===1&&frame.turnComplete&&frame.output,'PCM_FRAME_REJECTED')
            // Default native browser timers, not injected fake timers.
            watch.touch()
            check(player.append(frame.audio[0]),'PCM_NOT_SCHEDULED')
            const deadline=performance.now()+4000
            let peakRms=0
            while(performance.now()<deadline){
              analyser.getFloatTimeDomainData(wave)
              const rms=Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length)
              peakRms=Math.max(peakRms,rms)
              if(ended===turn)break
              await sleep(15)
            }
            check(ended===turn&&!player.playing,'AUDIBLE_TAIL_NOT_COMPLETED')
            check(samples===turn*12000&&peakRms>.03,'NO_NONZERO_AUDIO_OR_DUPLICATE_PCM')
            check(stalls===0&&errors===0&&watch.timer===null,'TIMER_OR_PLAYBACK_ERROR')
            evidence.push({turn,samples:12000,peakRms:Number(peakRms.toFixed(4))})
          }
          let fired=0
          shortWatch=new GeminiLiveReplyWatchdog({canFire:()=>true,onStall:()=>fired++,timeoutMs:40})
          shortWatch.touch();shortWatch.clear()
          await sleep(100)
          check(fired===0,'CANCELLED_WATCHDOG_FIRED')
          shortWatch.touch()
          const deadline=performance.now()+2000
          while(fired===0&&performance.now()<deadline)await sleep(15)
          check(fired===1&&shortWatch.timer===null,'WATCHDOG_DID_NOT_FIRE_ONCE')
          result={ok:true,evidence,nativeTimer:true,errors,stalls}
        }catch(error){result={ok:false,error:String(error?.message||error)}}
        finally{
          try{watch?.clear();shortWatch?.clear();player?.stop();if(audio)await audio.close()}
          catch(error){if(result?.ok)result={ok:false,error:String(error?.message||error)}}
          window.__hhCoachAudioProbe=result
        }
      },{once:true})
    },origin+'/gemini-live-transport.mjs')
    await page.getByRole('button',{name:'Run synthetic audio QA'}).click()
    await page.waitForFunction(()=>Boolean(window.__hhCoachAudioProbe),null,{timeout:20000})
    const result=await page.evaluate(()=>window.__hhCoachAudioProbe)
    assert.equal(result.ok,true,browserType.name()+': '+JSON.stringify(result))
    assert.deepEqual([...new Set(requests)].sort(),[...sources.keys()].sort(),browserType.name()+': transport dependency graph')
    assert.deepEqual(pageErrors,[],browserType.name()+': native audio browser errors')
    console.log('COACH_NATIVE_AUDIO_BROWSER_PASS '+browserType.name()+' '+JSON.stringify(result))
    return result
  }finally{await context.close()}
}
