// Browser transports: only approved speech-producing audio, never the human microphone.
export const AVATAR_SAMPLE_SECONDS=15
export function avatarSamplePcm16(buffer,maxSeconds=AVATAR_SAMPLE_SECONDS){
  if(!buffer||!Number.isFinite(buffer.sampleRate)||buffer.sampleRate<8000||buffer.sampleRate>192000||!Number.isInteger(buffer.numberOfChannels)||buffer.numberOfChannels<1||buffer.numberOfChannels>32||!Number.isInteger(buffer.length)||buffer.length<1||!Number.isFinite(maxSeconds)||maxSeconds<=0||maxSeconds>AVATAR_SAMPLE_SECONDS)throw Error('AVATAR_SAMPLE_INVALID')
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i))
  const count=Math.floor(Math.min(buffer.length/buffer.sampleRate,maxSeconds)*16000)
  const result=new Uint8Array(count*2),view=new DataView(result.buffer)
  for(let i=0;i<count;i++){
    const pos=i*buffer.sampleRate/16000,lo=Math.floor(pos),hi=Math.min(lo+1,buffer.length-1),frac=pos-lo
    let value=0
    for(const channel of channels)value+=(channel[lo]||0)*(1-frac)+(channel[hi]||0)*frac
    value=Math.max(-1,Math.min(1,value/channels.length))
    view.setInt16(i*2,Math.round(value*(value<0?32768:32767)),true)
  }
  return result
}
function checkActive(signal){if(signal?.aborted)throw Error('AVATAR_CANCELLED')}
export async function connectSimliAvatar({sdk,sessionToken,video,audio,signal,onDisconnect}){
  checkActive(signal)
  if(!sdk?.SimliClient||sdk.LogLevel?.ERROR===undefined)throw Error('SIMLI_SDK_NOT_INSTALLED')
  const client=new sdk.SimliClient(sessionToken,video,audio,null,sdk.LogLevel.ERROR)
  let stopped=false,stopPromise=null
  const stop=()=>{
    if(stopPromise)return stopPromise
    stopped=true;signal?.removeEventListener('abort',onAbort)
    stopPromise=Promise.resolve().then(()=>client.stop())
    return stopPromise
  }
  const onAbort=()=>{void stop().catch(()=>{})}
  const failed=()=>{if(!stopped){onAbort();onDisconnect?.()}}
  // Stop on the first network startup failure, instead of SDK retry loops.
  client.on?.('startup_error',failed);client.on?.('error',failed);client.on?.('stop',failed)
  signal?.addEventListener('abort',onAbort,{once:true})
  try{checkActive(signal);await client.start();if(stopped)throw Error('AVATAR_CANCELLED');checkActive(signal)}
  catch(error){try{await stop()}catch{};throw error}
  return {
    sendPcm16(bytes){if(stopped||!(bytes instanceof Uint8Array)||!bytes.length||bytes.length%2)throw Error('SIMLI_PCM_INVALID');client.sendAudioData(bytes)},
    interrupt(){if(!stopped)client.ClearBuffer()},stop
  }
}
export async function connectSequencerAvatar({sdk,session,context,video,audio,onDisconnect,signal}){
  checkActive(signal)
  const {Room,RoomEvent,Track}=sdk
  const room=new Room()
  const destination=context.createMediaStreamDestination()
  const speechTrack=destination.stream.getAudioTracks()[0]
  if(!speechTrack)throw Error('AVATAR_AUDIO_TRACK_UNAVAILABLE')
  const attached=new Map(),sources=new Set()
  let stopped=false,stopPromise=null
  room.on(RoomEvent.TrackSubscribed,track=>{
    const target=track.kind===Track.Kind.Video?video:track.kind===Track.Kind.Audio?audio:null
    if(!target||stopped)return
    track.attach(target);attached.set(track,target)
  })
  room.on(RoomEvent.TrackUnsubscribed,track=>{
    const target=attached.get(track)
    if(target){track.detach(target);attached.delete(track)}
  })
  room.on(RoomEvent.Disconnected,()=>{if(!stopped)onDisconnect?.()})
  function interrupt(){
    for(const source of sources){try{source.stop()}catch{};try{source.disconnect()}catch{}}
    sources.clear()
  }
  const stop=()=>{
    if(stopPromise)return stopPromise
    stopped=true;signal?.removeEventListener('abort',onAbort);interrupt()
    for(const [track,target] of attached){try{track.detach(target)}catch{}}
    attached.clear()
    try{speechTrack.stop()}catch{}
    stopPromise=Promise.resolve().then(()=>room.disconnect())
    return stopPromise
  }
  const onAbort=()=>{void stop().catch(()=>{})}
  signal?.addEventListener('abort',onAbort,{once:true})
  try{
    checkActive(signal);await room.connect(session.livekitUrl,session.livekitClientToken)
    checkActive(signal);if(stopped)throw Error('AVATAR_CANCELLED')
    await room.startAudio()
    checkActive(signal);if(stopped)throw Error('AVATAR_CANCELLED')
    await room.localParticipant.publishTrack(speechTrack,{source:Track.Source.Microphone,dtx:false})
    checkActive(signal);if(stopped)throw Error('AVATAR_CANCELLED')
  }catch(error){try{await stop();await room.disconnect()}catch{};throw error}
  return {destination,playSample(buffer){
    if(stopped)throw Error('AVATAR_STOPPED')
    const source=context.createBufferSource();source.buffer=buffer
    source.connect(destination);sources.add(source)
    source.onended=()=>{sources.delete(source);try{source.disconnect()}catch{}}
    source.start(0,0,Math.min(buffer.duration,AVATAR_SAMPLE_SECONDS))
  },interrupt,stop}
}
