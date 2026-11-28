// One fixed editorial Russian trial. Never uses Static API or customer audio.
export const CAESAR_CAPTURE_FACE='efcb440b-6a24-4e79-a46a-764c1d4b751d'
export const CAESAR_CAPTURE_AUDIO='/api/coaching/intro/ru/caesar?v=5'
export const CAESAR_CAPTURE_CONFIG=Object.freeze({faceId:CAESAR_CAPTURE_FACE,maxSessionLength:60,maxIdleTime:15,handleSilence:true,startFrame:0,streaming_width:1080,streaming_height:1920})
export function captureRequestAllowed(body){return Boolean(body&&Object.keys(body).length===3&&body.job==='greeting-ru'&&body.freeOnly===true&&body.editorialOnly===true)}
export function captureReady(env=process.env){return env.VERCEL_ENV==='production'&&env.HH_COACH_AVATAR_PILOT==='owner-free-only'&&env.HH_SIMLI_FREE_ACCOUNT_VERIFIED==='true'&&Boolean(env.SIMLI_API_KEY)}
export async function mintCaesarCapture(body,{env=process.env,reserve,fetcher=fetch}={}){
 if(!captureReady(env)||!captureRequestAllowed(body))throw Error('CAPTURE_NOT_APPROVED')
 await reserve()
 const response=await fetcher('https://api.simli.ai/compose/token',{method:'POST',redirect:'error',cache:'no-store',headers:{'x-simli-api-key':env.SIMLI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(CAESAR_CAPTURE_CONFIG),signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw Error('CAPTURE_PROVIDER_REJECTED')
 const data=await response.json()
 if(typeof data.session_token!=='string'||!data.session_token||data.session_token.length>16384)throw Error('CAPTURE_TOKEN_INVALID')
 return {sessionToken:data.session_token,maxSeconds:60}
}
export function capturePcm16(buffer){
 if(!buffer||!Number.isFinite(buffer.sampleRate)||buffer.sampleRate<8000||buffer.sampleRate>192000||!Number.isInteger(buffer.length)||buffer.length<1||!Number.isInteger(buffer.numberOfChannels)||buffer.numberOfChannels<1||buffer.numberOfChannels>8)throw Error('CAPTURE_AUDIO_INVALID')
 const seconds=buffer.length/buffer.sampleRate
 if(seconds<10||seconds>30)throw Error('CAPTURE_AUDIO_DURATION')
 const tracks=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i))
 const count=Math.floor(seconds*16000),out=new Uint8Array(count*2),view=new DataView(out.buffer)
 for(let i=0;i<count;i++){
  const pos=i*buffer.sampleRate/16000,lo=Math.floor(pos),hi=Math.min(lo+1,buffer.length-1),f=pos-lo
  let v=0;for(const track of tracks)v+=track[lo]*(1-f)+track[hi]*f
  v=Math.max(-1,Math.min(1,v/tracks.length));view.setInt16(i*2,Math.round(v*(v<0?32768:32767)),true)
 }
 return out
}
export function captureMime(Recorder){return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(t=>Recorder?.isTypeSupported?.(t))||null}
export function captureTracks(video,audio){
 const v=video?.srcObject?.getVideoTracks?.().find(t=>t.readyState==='live'&&!t.muted),a=audio?.srcObject?.getAudioTracks?.().find(t=>t.readyState==='live'&&!t.muted)
 return v&&a&&video.videoWidth===1080&&video.videoHeight===1920?[v,a]:null
}
