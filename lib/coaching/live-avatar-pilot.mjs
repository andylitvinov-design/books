// Owner-only synthetic-audio pilot. No live client dialogue, payment or automatic provider switch.
export const LIVE_AVATAR_PILOT_SECONDS=60
export const LIVE_AVATAR_PRODUCT=Object.freeze({priceEurCents:300,maxSeconds:1200,weeklySessions:2,enabled:false})
export const LIVE_AVATAR_PROVIDERS=Object.freeze(['simli','sequencer'])
// Official Trinity-2 presets: https://docs.simli.com/api-reference/preset-faces
// Only these roles and verified IDs are accepted; no browser-supplied face override.
export const SIMLI_ROLE_PRESETS=Object.freeze({
  chatbot:Object.freeze({name:'Lukas',faceId:'a36d66df-a23d-4569-996b-d0e990019857'}),
  coach:Object.freeze({name:'Caesar',faceId:'efcb440b-6a24-4e79-a46a-764c1d4b751d'}),
})
export function simliPresetForRole(role){
  return typeof role==='string'&&Object.hasOwn(SIMLI_ROLE_PRESETS,role)?SIMLI_ROLE_PRESETS[role]:null
}
export function pilotConfig(env=process.env){
  const enabled=env.HH_COACH_AVATAR_PILOT==='owner-free-only'
  return {
    simli:{allowed:enabled&&env.HH_SIMLI_FREE_ACCOUNT_VERIFIED==='true'&&Boolean(env.SIMLI_API_KEY),key:env.SIMLI_API_KEY},
    sequencer:{allowed:enabled&&env.HH_SEQUENCER_FREE_ACCOUNT_VERIFIED==='true'&&Boolean(env.SEQUENCER_API_KEY&&env.SEQUENCER_WORKSPACE_ID&&env.SEQUENCER_CHARACTER_ID&&env.HH_COACH_AVATAR_RECEIPT_SECRET?.length>=32),key:env.SEQUENCER_API_KEY,workspace:env.SEQUENCER_WORKSPACE_ID,character:env.SEQUENCER_CHARACTER_ID},
  }
}
export function pilotPublicStatus(env=process.env){
  const c=pilotConfig(env)
  return {simli:{allowed:c.simli.allowed,ownAvatar:false,sdkReady:true,avatars:Object.fromEntries(Object.entries(SIMLI_ROLE_PRESETS).map(([role,preset])=>[role,preset.name]))},sequencer:{allowed:c.sequencer.allowed,ownAvatar:true,sdkReady:true},seconds:LIVE_AVATAR_PILOT_SECONDS,product:LIVE_AVATAR_PRODUCT}
}
export function pilotRequestAllowed(body){
  return Boolean(body&&typeof body==='object'&&!Array.isArray(body)&&body.action==='start'&&LIVE_AVATAR_PROVIDERS.includes(body.provider)&&body.syntheticOnly===true&&body.freeOnly===true&&
    Object.keys(body).every(k=>['action','provider','syntheticOnly','freeOnly',...(body.provider==='simli'?['target']:[])].includes(k))&&
    (body.provider!=='simli'||Boolean(simliPresetForRole(body.target))))
}
export function simliTokenBody(faceId){
  return {faceId,maxSessionLength:LIVE_AVATAR_PILOT_SECONDS,maxIdleTime:30}
}
export function sequencerStartBody(startToken){
  return {launchMode:'webrtc',sessionMode:'audio_stream',channels:{text:false,voice:true,video:true},endUserId:'hh-synthetic-'+startToken,saveHistory:false,maxSessionSeconds:LIVE_AVATAR_PILOT_SECONDS,startToken}
}

/** Separate owner-only, non-sensitive dialogue trial. Never enables the customer product. */
export function ownerSimliDialogueReady(env=process.env){
  return env.NEXT_PUBLIC_HH_SIMLI_OWNER_DIALOGUE_PILOT==='true'&&
    env.HH_SIMLI_OWNER_DIALOGUE_PILOT==='owner-non-sensitive-only'&&
    env.HH_SIMLI_DIALOGUE_PRIVACY_APPROVED==='true'&&pilotConfig(env).simli.allowed
}
export function ownerSimliDialogueRequestAllowed(body){
  return Boolean(body&&typeof body==='object'&&!Array.isArray(body)&&
    Object.keys(body).every(k=>['action','provider','target','freeOnly','nonSensitiveTest','privacyConsent'].includes(k))&&
    body.action==='start-dialogue'&&body.provider==='simli'&&simliPresetForRole(body.target)&&
    body.freeOnly===true&&body.nonSensitiveTest===true&&body.privacyConsent===true)
}
