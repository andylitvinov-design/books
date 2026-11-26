// A WebRTC token or an audio track is not proof of a visible video channel.
// Require a live remote video track AND advancing decoded/presented frames.
export function hasLukasVideoTrack(video){
  return Boolean(video?.srcObject?.getVideoTracks?.().some(track=>track.readyState==='live'&&!track.muted)&&
    video.videoWidth>0&&video.videoHeight>0&&video.readyState>=2&&!video.paused&&!video.ended)
}
export function createVideoFrameEvidence({now=()=>performance.now(),timeoutMs=5000,stallMs=3000}={}){
  const start=now()
  let previous=null,last=null,advances=0
  return {
    observe(count,trackReady){
      if(!trackReady||!Number.isFinite(count)||count<0)return false
      if(previous!==null&&count>previous){last=now();advances++}
      previous=count
      return advances>=2
    },
    live(trackReady){return Boolean(trackReady&&advances>=2&&last!==null&&now()-last<stallMs)},
    expired(){return advances>=2?now()-last>=stallMs:now()-start>=timeoutMs}
  }
}
export function watchLukasVideo(video,{signal,onFailure=()=>{},now=()=>performance.now(),timeoutMs=5000,stallMs=3000}={}){
  const evidence=createVideoFrameEvidence({now,timeoutMs,stallMs})
  let stopped=false,settled=false,frameId=null,timer=null,callbackCount=0
  let resolveReady,rejectReady
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject})
  const useCallback=typeof video?.requestVideoFrameCallback==='function'
  const count=()=>useCallback?callbackCount:(video?.getVideoPlaybackQuality?.().totalVideoFrames??video?.webkitDecodedFrameCount)
  function stop(){
    if(stopped)return
    stopped=true;clearInterval(timer)
    if(frameId!==null)try{video.cancelVideoFrameCallback?.(frameId)}catch{}
    signal?.removeEventListener('abort',stop)
    if(!settled){settled=true;rejectReady(Error('VIDEO_CHECK_CANCELLED'))}
  }
  function fail(){
    if(stopped)return
    if(!settled){settled=true;rejectReady(Error('VIDEO_FRAME_UNAVAILABLE'))}
    stop();try{onFailure()}catch{}
  }
  function poll(){
    if(stopped)return
    try{
      const track=hasLukasVideoTrack(video)
      const valid=evidence.observe(count(),track)
      if(!settled&&valid&&evidence.live(track)){settled=true;resolveReady()}
      else if(evidence.expired()||settled&&!track)fail()
    }catch{fail()}
  }
  const onFrame=()=>{
    if(stopped)return
    callbackCount++
    poll()
    if(!stopped)frameId=video.requestVideoFrameCallback(onFrame)
  }
  if(signal?.aborted){stop();return {ready,stop,isLive:()=>false}}
  signal?.addEventListener('abort',stop,{once:true})
  if(useCallback)frameId=video.requestVideoFrameCallback(onFrame)
  timer=setInterval(poll,250)
  poll()
  return {ready,stop,isLive:()=>!stopped&&evidence.live(hasLukasVideoTrack(video))}
}
