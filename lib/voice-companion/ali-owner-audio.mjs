// Owner-only non-sensitive audio pilot. Reuses the EXISTING authenticated
// free-only Ali TTS endpoint and its shared budgets; no public client TTS.
// No history, user transcript, private profile, storage, retries or paid fallback.
export function unlockAliOwnerAudio(environment=globalThis){
 const Context=environment.AudioContext||environment.webkitAudioContext;
 if(!Context)return null;
 let context;
 try{
  context=new Context();
  const node=context.createBufferSource();
  node.buffer=context.createBuffer(1,128,22050);
  node.connect(context.destination);
  node.onended=()=>{try{node.disconnect()}catch{}};
  node.start();
  void Promise.resolve(context.resume()).catch(()=>{});
  return context;
 }catch{try{void context?.close()?.catch(()=>{})}catch{}return null}
}
export async function aliOwnerAudioAvailable(environment=globalThis,signal){
 try{
  const response=await environment.fetch('/api/admin/coach-live-avatar',{credentials:'same-origin',cache:'no-store',signal});
  return response.ok&&(await response.json()).chatbot===true;
 }catch{return false}
}
export function startAliOwnerAudio({environment=globalThis,context,personaId,locale,text,onStart=()=>{},onEnd=()=>{},onError=()=>{}}={}){
 const Abort=environment.AbortController||AbortController;
 const controller=new Abort();
 let active=true,node=null,timeout=null;
 const clear=()=>{
  if(timeout!==null){environment.clearTimeout(timeout);timeout=null}
  if(node){node.onended=null;try{node.stop()}catch{}try{node.disconnect()}catch{}node=null}
 };
 const finish=(error)=>{
  if(!active)return;
  active=false;clear();controller.abort();
  if(error)onError();else onEnd();
 };
 const cancel=()=>{if(!active)return;active=false;clear();controller.abort()};
 const run=async()=>{
  try{
   if(!context||context.state==='closed'||!['alex','max','mira','sofia'].includes(personaId)||
      !['en','ru','es'].includes(locale)||typeof text!=='string'||!text.trim()||
      text.length>500||new TextEncoder().encode(text).length>1600)throw Error('INVALID_AUDIO');
   timeout=environment.setTimeout(()=>finish(true),22000);
   const response=await environment.fetch('/api/admin/coach-live-avatar',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'ali-audio',target:'chatbot',locale,personaId,text,
     freeOnly:true,nonSensitiveTest:true,privacyConsent:true,trainingConsent:true})
   });
   if(!active)return;
   if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/wav'))throw Error('NO_AUDIO');
   const bytes=await response.arrayBuffer();
   if(!active)return;
   if(bytes.byteLength<46||bytes.byteLength>2400000)throw Error('INVALID_AUDIO');
   const decoded=await context.decodeAudioData(bytes);
   if(!active)return;
   if(decoded.numberOfChannels!==1||!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>35)throw Error('INVALID_AUDIO');
   // Digital silence must never advance the call or masquerade as speaking.
   const samples=decoded.getChannelData(0);
   let hasSignal=false;
   for(let i=0;i<samples.length;i++){if(Math.abs(samples[i])>0.001){hasSignal=true;break}}
   if(!hasSignal)throw Error('SILENT_AUDIO');
   if(context.state!=='running')await context.resume();
   if(!active)return;
   if(context.state!=='running')throw Error('OUTPUT_BLOCKED');
   node=context.createBufferSource();node.buffer=decoded;
   node.connect(context.destination);node.onended=()=>finish(false);
   node.start();environment.clearTimeout(timeout);
   timeout=environment.setTimeout(()=>finish(true),Math.ceil(decoded.duration*1000)+3000);
   onStart();
  }catch{if(active)finish(true)}
 };
 // Allow caller to install ownership before synchronous validation/callbacks.
 void Promise.resolve().then(run);
 return {cancel};
}
