// Browser-only video transport. The existing coach owns speech, memory,
// consent to coaching, protocol, results and its clock. This adapter never
// starts, ends or mutates that logical session. No microphone input is used.
const MAX_SECONDS=300
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const seconds=value=>Number.isSafeInteger(value)&&value>0&&value<=MAX_SECONDS
const consentBody=()=>({action:'start',nonSensitiveConsent:true,privacyConsentVersion:'caesar-video-v1'})

/** Dependencies are the authorized same-origin start/end adapter, existing
 * connectSimliAvatar, watchLukasVideo and createSimliSpeechRelay. The caller
 * must obtain separate provider approval and explicit consent before invoking
 * start. No auto-start, provider fallback, billing or transcript transfer. */
export function createCaesarVideoSession({requestStart,requestEnd,connect,watch,createRelay,video,audio,onState=()=>{},now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
  let run=null,state='idle',disposed=false
  function report(next){state=next;if(!disposed)try{onState(next)}catch{}}
  function detach(){
    for(const media of [video,audio])try{media.muted=true;media.pause();media.srcObject=null}catch{}
  }
  function remainingSeconds(){return run&&!run.stopped?Math.max(0,Math.ceil((run.deadline-now())/1000)):0}
  function stop(reason='ended',current=run){
    if(!current)return Promise.resolve(state)
    if(current.cleanup)return current.cleanup
    current.stopped=true
    current.live=false
    current.cleanup=current.startSettled.then(async()=>{
      let closed=true
      try{current.monitor?.stop()}catch{closed=false}
      try{await current.renderer?.stop()}catch{closed=false}
      detach()
      // Do not treat a local media close as a provider settlement. A lost
      // allocation response or unresolved receipt blocks reuse in this tab.
      let settled=!current.grantRequested
      if(current.sessionId){
        try{
          const result=await requestEnd({action:'end',sessionId:current.sessionId})
          settled=result?.allowed===true&&result.state==='settled'
        }catch{settled=false}
      }
      if(run!==current)return state
      if(closed&&settled){run=null;report(reason)}else report('unconfirmed')
      return state
    })
    // Publish the cleanup promise before abort/notify; SDK callbacks may reenter stop.
    clearTimer(current.timer)
    try{current.relay?.close()}catch{}
    current.controller.abort()
    detach()
    report('stopping')
    return current.cleanup
  }
  function arm(current){
    clearTimer(current.timer)
    current.timer=setTimer(()=>{void stop('ended',current)},Math.max(0,current.deadline-now()))
  }
  async function start({consent=false}={}){
    if(consent!==true||disposed||run||!video||!audio)return false
    let settle
    const current={controller:new AbortController(),started:now(),deadline:0,live:false,stopped:false,grantRequested:false,startSettled:new Promise(resolve=>{settle=resolve})}
    current.deadline=current.started+MAX_SECONDS*1000
    run=current
    // Budget includes token allocation and media setup. Provider independently
    // enforces its own hard limit; this browser timer is not quota evidence.
    arm(current)
    report('connecting')
    try{
      if(current.stopped)return false
      video.muted=true;audio.muted=true
      current.grantRequested=true
      // Do not abort a pending mint HTTP call merely because the UI closes:
      // a late session ID still needs a stop/settlement attempt.
      const grant=await requestStart(consentBody())
      if(grant?.allowed===false){current.grantRequested=false;void stop('unavailable',current);return false}
      if(grant?.allowed===true&&uuid(grant.sessionId))current.sessionId=grant.sessionId
      if(grant?.allowed!==true||!current.sessionId||grant.provider!=='simli'||grant.target!=='coach'||
         !seconds(grant.maxVideoSeconds)||typeof grant.sessionToken!=='string'||!grant.sessionToken.trim()||grant.sessionToken.length>16384)
        throw Error('INVALID_CAESAR_GRANT')
      current.deadline=current.started+grant.maxVideoSeconds*1000
      if(current.stopped||remainingSeconds()===0){void stop('ended',current);return false}
      arm(current)
      const signal=current.controller.signal
      const failed=()=>{void stop('failed',current)}
      current.renderer=await connect({sessionToken:grant.sessionToken,video,audio,signal,onDisconnect:failed})
      if(current.stopped)return false
      current.monitor=watch(video,{signal,onFailure:failed})
      await current.monitor.ready
      if(current.stopped||remainingSeconds()===0||current.monitor.isLive()!==true){void stop('failed',current);return false}
      current.relay=createRelay(current.renderer,{onFailure:failed})
      current.live=true
      report('playing')
      return !current.stopped
    }catch{void stop('failed',current);return false}
    finally{settle()}
  }
  // Only attach this to the canonical assistant-output PCM hook, never capture
  // microphone audio, stored history, or text. The primary voice stays local.
  function schedule(samples,startAt,context){
    const current=run
    if(!current?.live||current.stopped)return false
    if(remainingSeconds()===0||current.monitor?.isLive()!==true){void stop('failed',current);return false}
    try{current.relay.schedule(samples,startAt,context);return true}catch{void stop('failed',current);return false}
  }
  function clear(){try{run?.relay?.clear()}catch{void stop('failed')}}
  function dispose(){disposed=true;return stop()}
  return {start,stop:()=>stop(),schedule,clear,dispose,remainingSeconds,getState:()=>state}
}
