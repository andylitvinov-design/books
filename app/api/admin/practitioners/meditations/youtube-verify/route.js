import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {readBody,PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError,requireUUID,onlyKeys} from '@/lib/assessments/contracts'
import {consumeRate} from '@/lib/app/database'
import {meditationRecordYoutubeReceipt,meditationApprovedHandoff} from '@/lib/practitioners/meditation-studio-service'
import {getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function POST(request){
  if(!(await requireAdminRequest()))
    return NextResponse.json({error:'ADMIN_REQUIRED'},{status:401,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    const input=await readBody(request,6000)
    onlyKeys(input,['id','videoId','accessToken'])
    requireUUID(input.id)
    if(typeof input.videoId!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(input.videoId))
      throw new AppError('INVALID_YOUTUBE_VIDEO',400)
    const token=String(input.accessToken||'')
    if(!/^[A-Za-z0-9._~-]{30,2500}$/.test(token))
      throw new AppError('INVALID_YOUTUBE_ACCESS',400)
    await consumeRate(config,{op:'meditation-youtube-verification'},20,3600)
    const history=getYoutubeHistoryStore()
    if(!history)throw new AppError('YOUTUBE_HISTORY_UNAVAILABLE',503)
    const channels=await history.channels()
    // The initial handoff is approved; subsequent same-video checks must be
    // possible when processing remains pending. Never start another upload.
    const channelMap={ru:channels.ru?.id,en:channels.en?.id}
    const url='https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id='+encodeURIComponent(input.videoId)
    const response=await fetch(url,{headers:{Authorization:'Bearer '+token,
      Accept:'application/json'},cache:'no-store',redirect:'error',
      signal:AbortSignal.timeout(12000)})
    if(!response.ok)throw new AppError('YOUTUBE_READBACK_UNAVAILABLE',503)
    const payload=await response.json()
    const video=Array.isArray(payload?.items)?payload.items.find(v=>v?.id===input.videoId):null
    const channelId=video?.snippet?.channelId
    if(!channelId||!Object.values(channelMap).includes(channelId))
      throw new AppError('YOUTUBE_WRONG_OWNER_CHANNEL',409)
    if(video.status?.privacyStatus!=='unlisted')throw new AppError('YOUTUBE_NOT_UNLISTED',409)
    const processed=video.status?.uploadStatus==='processed'
    const record=await meditationRecordYoutubeReceipt(config,input.id,{videoId:input.videoId,channelId,processed})
    if(channelMap[record.item.language]!==channelId)
      throw new AppError('YOUTUBE_WRONG_LANGUAGE_CHANNEL',409)
    return NextResponse.json({item:record.item,processed},{headers:PRIVATE_HEADERS})
  }catch(error){
    const {status,code}=safeError(error)
    return NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
  }
}
