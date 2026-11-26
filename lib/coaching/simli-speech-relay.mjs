import {GeminiLivePcmResampler} from './gemini-live-transport.mjs'
// The original voice player remains authoritative; video can fail independently.
export function createSimliSpeechRelay(renderer,{scheduleTimer=setTimeout,cancelTimer=clearTimeout,onFailure=()=>{}}={}){
  let converter=new GeminiLivePcmResampler(24000),closed=false,generation=0
  const timers=new Set()
  function cancelPending(){
    generation++
    for(const id of timers)cancelTimer(id)
    timers.clear()
    converter=new GeminiLivePcmResampler(24000)
  }
  function clear(){
    if(closed)return
    cancelPending()
    try{renderer.interrupt()}catch{fail()}
  }
  function close(){
    if(closed)return
    closed=true;cancelPending()
    try{renderer.interrupt()}catch{}
  }
  function fail(){if(closed)return;close();try{onFailure()}catch{}}
  function schedule(samples,start,ctx){
    if(closed)return
    if(!(samples instanceof Float32Array)||!samples.length||samples.length>12000||
       !Number.isFinite(start)||!Number.isFinite(ctx?.currentTime)||ctx.state!=='running')return
    const delay=start-ctx.currentTime
    if(delay < -0.25||delay>2.6){fail();return}
    try{
      const bytes=converter.push(samples)
      for(let i=0;i<bytes.length;i+=3200){
        if(timers.size>=32){fail();return}
        const packet=bytes.subarray(i,Math.min(i+3200,bytes.length))
        const scheduledGeneration=generation, due=start+i/32000
        const id=scheduleTimer(()=>{
          timers.delete(id)
          if(closed||scheduledGeneration!==generation)return
          // Never deliver stale assistant speech after a stalled/hidden tab.
          if(ctx.state!=='running'||!Number.isFinite(ctx.currentTime)||ctx.currentTime-due>0.25){fail();return}
          try{renderer.sendPcm16(packet)}catch{fail()}
        },Math.max(0,(delay+i/32000)*1000))
        timers.add(id)
      }
    }catch{fail()}
  }
  return {schedule,clear,close}
}
