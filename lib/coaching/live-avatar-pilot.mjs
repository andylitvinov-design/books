// Owner-only synthetic-audio pilot. No live client dialogue, payment or automatic provider switch.
export const LIVE_AVATAR_PILOT_SECONDS=60
export const LIVE_AVATAR_PRODUCT=Object.freeze({priceEurCents:300,maxSeconds:1200,weeklySessions:2,enabled:false})
export const LIVE_AVATAR_PROVIDERS=Object.freeze(['simli','sequencer'])
export function pilotConfig(env=process.env){
  const enabled=env.HH_COACH_AVATAR_PILOT==='owner-free-only'
  return {
    simli:{allowed:enabled&&env.HH_SIMLI_FREE_ACCOUNT_VERIFIED==='true'&&Boolean(env.SIMLI_API_KEY&&env.SIMLI_TEMPLATE_FACE_ID),key:env.SIMLI_API_KEY,faceId:env.SIMLI_TEMPLATE_FACE_ID},
    sequencer:{allowed:enabled&&env.HH_SEQUENCER_FREE_ACCOUNT_VERIFIED==='true'&&Boolean(env.SEQUENCER_API_KEY&&env.SEQUENCER_WORKSPACE_ID&&env.SEQUENCER_CHARACTER_ID&&env.HH_COACH_AVATAR_RECEIPT_SECRET?.length>=32),key:env.SEQUENCER_API_KEY,workspace:env.SEQUENCER_WORKSPACE_ID,character:env.SEQUENCER_CHARACTER_ID},
  }
}
export function pilotPublicStatus(env=process.env){
  const c=pilotConfig(env)
  return {simli:{allowed:c.simli.allowed,ownAvatar:false,sdkReady:false},sequencer:{allowed:c.sequencer.allowed,ownAvatar:true,sdkReady:true},seconds:LIVE_AVATAR_PILOT_SECONDS,product:LIVE_AVATAR_PRODUCT}
}
export function pilotRequestAllowed(body){
  return body?.action==='start'&&LIVE_AVATAR_PROVIDERS.includes(body.provider)&&body.syntheticOnly===true&&body.freeOnly===true
}
export function simliTokenBody(faceId){
  return {faceId,maxSessionLength:LIVE_AVATAR_PILOT_SECONDS,maxIdleTime:30}
}
export function sequencerStartBody(startToken){
  return {launchMode:'webrtc',sessionMode:'audio_stream',channels:{text:false,voice:true,video:true},endUserId:'hh-synthetic-'+startToken,saveHistory:false,maxSessionSeconds:LIVE_AVATAR_PILOT_SECONDS,startToken}
}
