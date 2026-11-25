import {GeminiLivePcmResampler} from './gemini-live-transport.mjs'
// The original voice player remains authoritative; video can fail independently.
export function createSimliSpeechRelay(renderer,{scheduleTimer=setTimeout,cancelTimer=clearTimeout,onFailure=()=>{}}={}){
  let converter=new GeminiLivePcmResampler(24000),closed=false
  const timers=new Set()
  function clear(){
    for(const id of timers)cancelTimer(id)
    timers.clear()
    converter=new GeminiLivePcmResampler(24000)
    try{renderer.interrupt()}catch{}
  }
  function close(){if(closed)return;closed=true;clear()}
  function fail(){close();try{onFailure()}catch{}}
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
        const id=scheduleTimer(()=>{
          timers.delete(id)
          if(closed)return
          if(ctx.state!=='running'){fail();return}
          try{renderer.sendPcm16(packet)}catch{fail()}
        },Math.max(0,(delay+i/32000)*1000))
        timers.add(id)
      }
    }catch{fail()}
  }
  return {schedule,clear,close}
}
