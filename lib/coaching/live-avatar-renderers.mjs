// Browser transports. All media comes from an approved speech-producing source,
// never the human microphone. The caller owns Gemini and the session protocol.
export async function connectSimliAvatar({sdk,sessionToken,video,audio}){
  if(!sdk?.SimliClient||sdk.LogLevel?.ERROR===undefined)throw Error('SIMLI_SDK_NOT_INSTALLED')
  const client=new sdk.SimliClient(sessionToken,video,audio,null,sdk.LogLevel.ERROR)
  let stopped=false
  const stop=async()=>{if(stopped)return;stopped=true;await client.stop()}
  try{await client.start()}catch(error){try{await stop()}catch{};throw error}
  return {
    sendPcm16(bytes){if(stopped||!(bytes instanceof Uint8Array)||!bytes.length||bytes.length%2)throw Error('SIMLI_PCM_INVALID');client.sendAudioData(bytes)},
    interrupt(){if(!stopped)client.ClearBuffer()},
    stop
  }
}
// Use the existing livekit-client dependency. Injecting the SDK makes the
// lifecycle testable without loading a browser or spending any credits.
export async function connectSequencerAvatar({sdk,session,context,video,audio,onDisconnect}){
  const {Room,RoomEvent,Track}=sdk
  const room=new Room()
  const destination=context.createMediaStreamDestination()
  const speechTrack=destination.stream.getAudioTracks()[0]
  const attached=new Map(),sources=new Set()
  let stopped=false
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
  const stop=async()=>{
    if(stopped)return
    stopped=true;interrupt()
    for(const [track,target] of attached){try{track.detach(target)}catch{}}
    attached.clear()
    try{speechTrack.stop()}finally{await room.disconnect()}
  }
  try{
    await room.connect(session.livekitUrl,session.livekitClientToken)
    await room.startAudio()
    await room.localParticipant.publishTrack(speechTrack,{source:Track.Source.Microphone,dtx:false})
  }catch(error){try{await stop()}catch{};throw error}
  return {destination,playSample(buffer){
    if(stopped)throw Error('AVATAR_STOPPED')
    const source=context.createBufferSource();source.buffer=buffer
    source.connect(destination);sources.add(source)
    source.onended=()=>{sources.delete(source);source.disconnect()}
    source.start()
  },interrupt,stop}
}
