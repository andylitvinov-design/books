// Local-only mic energy gate for interrupting a speaking coach.
// Echo suppression is provided by getUserMedia; the two-step duck-and-confirm
// rejects most speaker leakage without recording/sending candidate audio.
export function createCoachBargeGate({threshold=0.034,candidateTicks=2,confirmTicks=3,releaseTicks=2}={}){
 let state='idle',hot=0,quiet=0,noise=0.005
 return {
  update(rms){
   const energy=Number.isFinite(rms)?Math.max(0,rms):0
   if(state==='confirmed')return 'confirmed'
   const above=energy>Math.max(threshold,noise*3.3)
   if(state==='idle'){
     if(above){hot++}else{hot=0;noise=noise*.94+energy*.06}
     if(hot>=candidateTicks){state='candidate';hot=0;quiet=0;return 'candidate'}
     return 'idle'
   }
   if(above){hot++;quiet=0}
   else{quiet++;hot=0}
   if(hot>=confirmTicks){state='confirmed';return 'interrupt'}
   if(quiet>=releaseTicks){state='idle';hot=0;quiet=0;return 'restore'}
   // Only the first candidate may duck/allocate a recorder. Subsequent
   // samples are pending confirmation; never trigger a second recorder.
   return 'pending'
  },
  reset(){state='idle';hot=0;quiet=0},
  get state(){return state},
 }
}
const words=text=>String(text||'').toLocaleLowerCase().replace(/ё/gu,'е')
  .match(/[\p{L}\p{N}]+/gu)||[]
// Ignore playback echo transcribed as a new request. Exact short "yes"/"no"
// are still valid; only substantial overlap with the just-spoken coach is vetoed.
export function isCoachBargeEcho(transcript,spoken){
 const a=words(transcript),b=words(spoken)
 if(a.length<4||b.length<6)return false
 const client=a.join(' '),coach=b.join(' ')
 if(coach.includes(client)&&client.length>=22)return true
 const allowed=new Set(b.filter(w=>w.length>=3))
 const matching=a.filter(w=>w.length>=3&&allowed.has(w)).length
 return a.length>=7&&matching/a.length>=.83
}
