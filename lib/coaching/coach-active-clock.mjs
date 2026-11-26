// Presentation time only; never authority for free voice grants.
export function createCoachActiveClock(){
  let elapsed=0,anchor=null
  function sample(now){
    if(anchor!==null&&Number.isFinite(now)&&now>=anchor){elapsed=Math.min(7200,elapsed+(now-anchor)/1000);anchor=now}
    return elapsed
  }
  function setRunning(now,running){
    sample(now)
    anchor=running&&Number.isFinite(now)?now:null
    return elapsed
  }
  function restore(seconds){elapsed=Number.isFinite(seconds)?Math.min(7200,Math.max(0,seconds)):0;anchor=null;return elapsed}
  return {sample,setRunning,restore}
}
