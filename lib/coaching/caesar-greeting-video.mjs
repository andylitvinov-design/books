// Add ONLY reviewed native Simli footage here, with verified bytes and rights.
// No placeholder or locally warped portrait is an approved presentation.
export const CAESAR_APPROVED_PRESENTATION = null
const ROOT='/images/holistic-house/my-coach-motion/'
const HASH=/^[0-9a-f]{64}$/
const pathFor=(name,extension)=>new RegExp('^'+ROOT+'caesar-'+name+'-v[1-9][0-9]*\\.'+extension+'$')
export function validateCaesarPresentation(manifest){
 if(!manifest||manifest.provider!=='simli'||manifest.faceId!=='efcb440b-6a24-4e79-a46a-764c1d4b751d'||manifest.rightsVerified!==true||manifest.visualQaVerified!==true||manifest.nativeResolution!==true||!HASH.test(manifest.anchorSha256||''))return null
 if(!pathFor('anchor','webp').test(manifest.poster||'')||!HASH.test(manifest.posterSha256||''))return null
 const clips=[['neutral',manifest.neutral],['greeting-en',manifest.en],['greeting-ru',manifest.ru]]
 for(const [name,clip] of clips){
  if(!clip||!pathFor(name,'mp4').test(clip.src||'')||!HASH.test(clip.sha256||'')||clip.anchorSha256!==manifest.anchorSha256||!Number.isInteger(clip.width)||!Number.isInteger(clip.height)||Math.min(clip.width,clip.height)<1080||Math.max(clip.width,clip.height)>4096||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>60||clip.audio!==(name!=='neutral'))return null
  if(name==='neutral'&&Math.abs(clip.duration-5)>0.05)return null
  if(name!=='neutral'&&(clip.width!==manifest.neutral.width||clip.height!==manifest.neutral.height))return null
 }
 return manifest
}
export function caesarPresentation(personaId,locale,manifest=CAESAR_APPROVED_PRESENTATION){
 const approved=personaId==='caesar'?validateCaesarPresentation(manifest):null
 if(!approved)return null
 return {poster:approved.poster,neutral:approved.neutral,greeting:locale==='en'?approved.en:locale==='ru'?approved.ru:null}
}
export function caesarVideoMetadataMatches(video,clip){
 return Boolean(video&&clip&&video.videoWidth===clip.width&&video.videoHeight===clip.height&&Number.isFinite(video.duration)&&Math.abs(video.duration-clip.duration)<=0.15)
}
// Match the existing intro audio controller interface; `audio` is the single
// HTMLVideoElement. No separate audio, TTS, provider token or microphone.
export function startCaesarGreetingVideo(video,clip,{onStart,onEnd,onError,onBlocked,muted=false}={}){
 if(!video||!clip)throw Error('CAESAR_VIDEO_UNAVAILABLE')
 let cancelled=false,finished=false,started=false,timer=null
 const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null}}
 const detach=()=>{for(const [name,fn] of listeners)video.removeEventListener(name,fn)}
 const cancel=()=>{if(cancelled)return;cancelled=true;clear();detach();video.pause();video.removeAttribute('src');video.load()}
 const fail=error=>{if(cancelled||finished)return;finished=true;clear();detach();video.pause();try{if(error?.name==='NotAllowedError')onBlocked?.();else onError?.(error)}finally{cancel()}}
 const metadata=()=>{if(!caesarVideoMetadataMatches(video,clip))fail(Error('CAESAR_VIDEO_METADATA_MISMATCH'))}
 const playing=()=>{if(cancelled||finished)return;metadata();if(cancelled||finished||started)return;started=true;clear();onStart?.()}
 const ended=()=>{if(cancelled||finished)return;if(!started||!video.ended){fail(Error('CAESAR_VIDEO_INCOMPLETE'));return}finished=true;clear();detach();try{onEnd?.()}finally{cancel()}}
 const error=()=>fail(Error('CAESAR_VIDEO_ERROR'))
 const listeners=[['loadedmetadata',metadata],['playing',playing],['ended',ended],['error',error]]
 for(const [name,fn] of listeners)video.addEventListener(name,fn)
 video.playsInline=true;video.loop=false;video.muted=Boolean(muted);video.preload='auto';video.src=clip.src
 timer=setTimeout(()=>{if(!started)fail(Error('CAESAR_VIDEO_TIMEOUT'))},30000)
 try{const promise=video.play();if(promise?.catch)void promise.catch(fail)}catch(e){fail(e)}
 return {audio:video,cancel,setMuted:value=>{video.muted=Boolean(value)}}
}
