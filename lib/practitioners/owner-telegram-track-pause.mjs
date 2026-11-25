// Shared strict whole-second policy for private owner audio and video.
export const MAX_TRACK_PAUSE_SECONDS=30
export function parseTrackPauseSeconds(raw){
  if(typeof raw!=='string'&&typeof raw!=='number')return null
  const value=String(raw).trim()
  if(!/^(0|[1-9][0-9]?)$/.test(value))return null
  const seconds=Number(value)
  return Number.isSafeInteger(seconds)&&seconds<=MAX_TRACK_PAUSE_SECONDS?seconds:null
}
export function pausedTrackSeconds(sourceSeconds,audioCount,pauseSeconds){
  if(!Number.isFinite(sourceSeconds)||sourceSeconds<0||
     !Number.isInteger(audioCount)||audioCount<1||
     !Number.isInteger(pauseSeconds)||pauseSeconds<0||
     pauseSeconds>MAX_TRACK_PAUSE_SECONDS)return null
  return sourceSeconds+Math.max(0,audioCount-1)*pauseSeconds
}
