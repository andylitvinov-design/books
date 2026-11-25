import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {consumeRate} from '@/lib/app/database'
import {getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store'
import {getPractitionerYoutubeStore} from '@/lib/youtube/practitioner-upload-store'
import {practitionerYoutubeSlot} from '@/lib/youtube/practitioner-upload-model.mjs'
import {normalizeGoogleOauthClientId} from '@/lib/youtube/upload-history-model.mjs'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

function inputToken(value) {
  if(typeof value!=='string'||value.length<20||value.length>8192||/[\s\x00-\x1f\x7f]/.test(value))
    throw new AppError('YOUTUBE_RECONNECT_REQUIRED',401)
  return value
}
async function googleJson(path,token) {
  let response
  try{
    response=await fetch('https://www.googleapis.com/youtube/v3/'+path,{
      headers:{Authorization:'Bearer '+inputToken(token)},cache:'no-store',
      credentials:'omit',redirect:'error',signal:AbortSignal.timeout(12000),
    })
  }catch{throw new AppError('YOUTUBE_UNAVAILABLE',503)}
  if(response.status===401||response.status===403)throw new AppError('YOUTUBE_RECONNECT_REQUIRED',401)
  if(response.status===429)throw new AppError('YOUTUBE_QUOTA_REACHED',429)
  if(!response.ok)throw new AppError('YOUTUBE_UNAVAILABLE',503)
  try{return await response.json()}catch{throw new AppError('YOUTUBE_UNAVAILABLE',503)}
}
async function verifiedChannel(token) {
  const data=await googleJson('channels?part=id,snippet&mine=true',token)
  if(!Array.isArray(data.items)||data.items.length!==1||!/^UC[A-Za-z0-9_-]{22}$/.test(data.items[0]?.id||''))
    throw new AppError('YOUTUBE_CHANNEL_AMBIGUOUS',409)
  const found=data.items[0]
  return {id:found.id,name:String(found.snippet?.title||found.id).slice(0,100),
    handle:String(found.snippet?.customUrl||'').slice(0,100)}
}
async function verifiedVideo(videoId,token,channelId) {
  if(!/^[A-Za-z0-9_-]{11}$/.test(String(videoId||'')))throw new AppError('INVALID_VIDEO_ID',400)
  const data=await googleJson('videos?part=snippet,status&id='+encodeURIComponent(videoId),token)
  const match=data.items?.find(item=>item?.id===videoId)
  if(!match||match.snippet?.channelId!==channelId)throw new AppError('YOUTUBE_WRONG_CHANNEL',409)
  if(match.status?.privacyStatus!=='unlisted')throw new AppError('YOUTUBE_VISIBILITY_HOLD',409)
  const title=String(match.snippet?.title||'').trim()
  if(!title||title.length>100)throw new AppError('YOUTUBE_INVALID_TITLE',409)
  return {videoId,channelId,title,privacyStatus:'unlisted'}
}
function errorResponse(error,auth){
  const {status,code}=safeError(error)
  const response=NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
}
async function handler(request){
  let auth
  try{
    const config=getAppConfig()
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    await createPractitionerRepository(config).requireActivated(actor)
    const store=getPractitionerYoutubeStore()
    if(!store)throw new AppError('YOUTUBE_HISTORY_UNAVAILABLE',503)
    const ownerOauth=getYoutubeHistoryStore()
    const configured=normalizeGoogleOauthClientId(process.env.HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID||'')||
      normalizeGoogleOauthClientId(await ownerOauth?.oauthConfig())
    const enabled=Boolean(configured)&&process.env.HH_YOUTUBE_PHONE_UPLOAD_ENABLED!=='false'
    const json=(body,status=200)=>auth.apply(NextResponse.json(body,{status,headers:PRIVATE_HEADERS}))
    if(request.method==='GET'){
      const [channels,history]=await Promise.all([store.channels(actor.id),store.history(actor.id)])
      return json({enabled,clientId:enabled?configured:null,channels,history})
    }
    if(request.method!=='POST')throw new AppError('NOT_FOUND',404)
    if(!enabled)throw new AppError('YOUTUBE_SETUP_REQUIRED',503)
    const body=await readBody(request,12000)
    await consumeRate(config,{op:'practitioner-youtube',account:actor.id},30,3600)
    if(!['pair','disconnect','save'].includes(body.action))throw new AppError('INVALID_ACTION',400)
    onlyKeys(body,body.action==='disconnect'?['action','slot']:
      body.action==='pair'?['action','slot','token','confirmed']:['action','slot','token','videoId'])
    let slot
    try{slot=practitionerYoutubeSlot(body.slot)}catch{throw new AppError('INVALID_SLOT',400)}
    if(body.action==='disconnect'){
      await store.disconnect(actor.id,slot)
      return json({ok:true,channels:await store.channels(actor.id)})
    }
    const token=inputToken(body.token)
    const channel=await verifiedChannel(token)
    if(body.action==='pair'){
      if(body.confirmed!==true)throw new AppError('YOUTUBE_CONFIRMATION_REQUIRED',400)
      try{
        const paired=await store.pair(actor.id,slot,channel)
        return json({ok:true,channel:paired},201)
      }catch(e){
        if(['channel_conflict','channel_already_connected'].includes(e.message))
          throw new AppError(e.message==='channel_conflict'?'YOUTUBE_CHANNEL_CONFLICT':'YOUTUBE_CHANNEL_ALREADY_CONNECTED',409)
        throw e
      }
    }
    const paired=(await store.channels(actor.id))[slot]
    if(!paired||paired.id!==channel.id)throw new AppError('YOUTUBE_WRONG_CHANNEL',409)
    const video=await verifiedVideo(body.videoId,token,paired.id)
    let record
    try{record=await store.save(actor.id,{...video,slot})}
    catch(e){
      if(e.message==='history_conflict')throw new AppError('YOUTUBE_HISTORY_CONFLICT',409)
      throw e
    }
    return json({ok:true,record})
  }catch(error){return errorResponse(error,auth)}
}
export async function GET(request){return handler(request)}
export async function POST(request){return handler(request)}
