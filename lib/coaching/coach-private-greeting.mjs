// Device-only name salutation. Never fall back to a network voice or send the
// stored name to Gemini, a synthesis API, analytics or microphone capture.
// The caller delays capture until done settles. Cancellation is idempotent.
export function beginPrivateCoachSalutation({text,locale='en',muted=false,synthesis,Utterance,schedule=setTimeout,clear=clearTimeout}={}){
  const unavailable=()=>({done:Promise.resolve('text'),cancel(){}})
  if(muted||typeof text!=='string'||!text.trim()||text.length>100||!synthesis?.speak||typeof Utterance!=='function')return unavailable()
  let voice
  try{voice=(synthesis.getVoices?.()||[]).find(v=>v.localService===true&&String(v.lang||'').toLowerCase().startsWith(locale.toLowerCase()+'-'))||
    (synthesis.getVoices?.()||[]).find(v=>v.localService===true&&String(v.lang||'').toLowerCase()===locale.toLowerCase())}catch{return unavailable()}
  if(!voice)return unavailable()
  let utterance
  try{utterance=new Utterance(text.trim());utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.94}catch{return unavailable()}
  let resolve,timer,settled=false
  const done=new Promise(r=>{resolve=r})
  function finish(status,cancel=false){
    if(settled)return
    settled=true
    if(timer!==undefined)clear(timer)
    utterance.onend=null;utterance.onerror=null
    if(cancel)try{synthesis.cancel?.()}catch{}
    resolve(status)
  }
  utterance.onend=()=>finish('spoken')
  utterance.onerror=()=>finish('text',true)
  timer=schedule(()=>finish('text',true),6500)
  try{synthesis.speak(utterance)}catch{finish('text',true)}
  return {done,cancel:()=>finish('text',true)}
}
