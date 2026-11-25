import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto'
import {pilotConfig,pilotRequestAllowed,simliPresetForRole,simliTokenBody,sequencerStartBody} from './live-avatar-pilot.mjs'

const SEQUENCER='https://api.sequencer.media/v1/workspaces/'
const SIMLI='https://api.simli.ai/compose/token'
const ORIGIN='https://holistichouse.vercel.app'
const segment=encodeURIComponent
const secret=env=>env.HH_COACH_AVATAR_RECEIPT_SECRET
function signReceipt(id,env){
  const body=Buffer.from(JSON.stringify({id,expires:Date.now()+3600000})).toString('base64url')
  return body+'.'+createHmac('sha256',secret(env)).update(body).digest('base64url')
}
function verifyReceipt(receipt,env){
  if(typeof receipt!=='string'||receipt.length>2048||!secret(env)||secret(env).length<32)throw Error('INVALID_RECEIPT')
  const parts=receipt.split('.')
  if(parts.length!==2)throw Error('INVALID_RECEIPT')
  const expected=createHmac('sha256',secret(env)).update(parts[0]).digest()
  const actual=Buffer.from(parts[1],'base64url')
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('INVALID_RECEIPT')
  const value=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))
  if(typeof value.id!=='string'||!value.id||value.expires<Date.now())throw Error('INVALID_RECEIPT')
  return value.id
}
async function post(fetcher,url,key,body,ms=15000){
  const response=await fetcher(url,{method:'POST',headers:{'x-api-key':key,'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(ms)})
  if(!response.ok)throw Error('AVATAR_PROVIDER_REJECTED')
  return response.json()
}
function isPilotLivekitUrl(value,env){
  try{
    const url=new URL(value)
    return url.protocol==='wss:'&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==='443')&&
      (url.hostname.endsWith('.livekit.cloud')||url.origin===pilotExtraLivekitOrigin(env))
  }catch{return false}
}
function pilotExtraLivekitOrigin(env){
  try{const u=new URL(env.HH_COACH_AVATAR_LIVEKIT_ORIGIN||'');return u.protocol==='wss:'&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null}catch{return null}
}
function seqRoot(c){return SEQUENCER+segment(c.workspace)}
// The owner must independently verify a free-only account with a hard vendor
// billing stop before setting either provider flag. No estimate is a free quote.
export async function startOwnerAvatarPilot(body,{env=process.env,fetcher=fetch}={}){
  if(!pilotRequestAllowed(body))throw Error('INVALID_PILOT_REQUEST')
  const c=pilotConfig(env)[body.provider]
  if(!c?.allowed)throw Error('FREE_PILOT_DISABLED')
  if(body.provider==='simli'){
    const response=await fetcher(SIMLI,{method:'POST',headers:{'x-simli-api-key':c.key,'Content-Type':'application/json'},body:JSON.stringify(simliTokenBody(simliPresetForRole(body.target).faceId)),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
    if(!response.ok)throw Error('AVATAR_PROVIDER_REJECTED')
    const data=await response.json()
    if(typeof data.session_token!=='string'||!data.session_token)throw Error('AVATAR_PROVIDER_RESPONSE')
    return {provider:'simli',target:body.target,sessionToken:data.session_token}
  }
  const root=seqRoot(c),startToken=randomUUID()
  let data
  try{
    data=await post(fetcher,root+'/live-characters/'+segment(c.character)+'/sessions',c.key,sequencerStartBody(startToken),45000)
    if(typeof data.sessionId!=='string'||!data.sessionId||typeof data.livekitUrl!=='string'||!isPilotLivekitUrl(data.livekitUrl,env)||typeof data.livekitClientToken!=='string'||!data.livekitClientToken)throw Error('AVATAR_PROVIDER_RESPONSE')
    return {provider:'sequencer',livekitUrl:data.livekitUrl,livekitClientToken:data.livekitClientToken,receipt:signReceipt(data.sessionId,env)}
  }catch(error){
    // Cancellation also covers a start whose response was lost. A known session
    // is ended directly. Provider's 60-second duration is the final bound.
    const path=typeof data?.sessionId==='string'&&data.sessionId
      ?'/live-character-sessions/'+segment(data.sessionId)+'/end'
      :'/live-character-session-starts/'+segment(startToken)+'/cancel'
    try{await post(fetcher,root+path,c.key,typeof data?.sessionId==='string'?{reason:'USER_CLOSED'}:{})}catch{}
    throw error
  }
}
export async function endOwnerSequencerPilot(receipt,{env=process.env,fetcher=fetch}={}){
  const id=verifyReceipt(receipt,env),c=pilotConfig(env).sequencer
  // Cleanup must work even if the start flag has subsequently been switched off.
  if(!c.key||!c.workspace)throw Error('AVATAR_CLEANUP_UNAVAILABLE')
  await post(fetcher,seqRoot(c)+'/live-character-sessions/'+segment(id)+'/end',c.key,{reason:'USER_CLOSED'})
}
