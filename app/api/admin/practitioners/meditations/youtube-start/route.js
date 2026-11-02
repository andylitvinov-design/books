import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {readBody,PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError,requireUUID,onlyKeys} from '@/lib/assessments/contracts'
import {meditationBeginYoutubeUpload} from '@/lib/practitioners/meditation-studio-service'
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
    const input=await readBody(request,1200)
    onlyKeys(input,['id','language','channelId'])
    requireUUID(input.id)
    const history=getYoutubeHistoryStore()
    if(!history)throw new AppError('YOUTUBE_HISTORY_UNAVAILABLE',503)
    const channels=await history.channels()
    const channelMap={ru:channels.ru?.id,en:channels.en?.id}
    const result=await meditationBeginYoutubeUpload(config,input.id,
      {language:input.language,channelId:input.channelId,channelMap})
    return NextResponse.json(result,{headers:PRIVATE_HEADERS})
  }catch(error){
    const {status,code}=safeError(error)
    return NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
  }
}
