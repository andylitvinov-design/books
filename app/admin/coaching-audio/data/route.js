import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {ownerCoachingAudioRead,prepareCoachingAudio,previewCoachingAudio,publishCoachingAudio,unpublishCoachingAudio} from '@/lib/academy/coaching-audio-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive'}
const json=(value,status=200)=>Response.json(value,{status,headers})
const permitted=(body,keys)=>body&&typeof body==='object'&&!Array.isArray(body)&&
  Object.keys(body).every(k=>keys.includes(k))
export async function GET(request){
  if(!await requireAdminRequest())return json({error:'NOT_FOUND'},404)
  const p=new URL(request.url).searchParams
  try{return json(await ownerCoachingAudioRead(getAppConfig(),{
    course:p.get('course'),question:p.get('question'),locale:p.get('locale')}))}
  catch(error){const invalid=error?.code==='INVALID_COACHING_AUDIO_SLOT'
    return json({error:invalid?error.code:'COACHING_AUDIO_STORAGE_UNAVAILABLE'},invalid?400:503)}
}
export async function POST(request){
  if(!await requireAdminRequest())return json({error:'NOT_FOUND'},404)
  let config,body
  try{
    config=getAppConfig();requireSameOrigin(request,config)
    if(!request.headers.get('content-type')?.startsWith('application/json'))
      return json({error:'INVALID_COACHING_AUDIO_ACTION'},415)
    const input=await request.text()
    if(input.length>1500)return json({error:'INVALID_COACHING_AUDIO_ACTION'},413)
    body=JSON.parse(input)
  }catch{return json({error:'INVALID_COACHING_AUDIO_ACTION'},400)}
  try{
    if(body?.action==='prepare'&&permitted(body,['action','course','question','locale','mime','filename','bytes']))
      return json({intent:await prepareCoachingAudio(config,body)},201)
    if(body?.action==='preview'&&permitted(body,['action','course','question','locale','path']))
      return json(await previewCoachingAudio(config,body))
    if(body?.action==='publish'&&permitted(body,['action','course','question','locale','path','confirmed'])&&body.confirmed===true)
      return json(await publishCoachingAudio(config,body))
    if(body?.action==='unpublish'&&permitted(body,['action','course','question','locale','confirmed'])&&body.confirmed===true)
      return json(await unpublishCoachingAudio(config,body))
    return json({error:'INVALID_COACHING_AUDIO_ACTION'},400)
  }catch(error){
    const code=error?.code||'COACHING_AUDIO_STORAGE_UNAVAILABLE'
    return json({error:code},code.startsWith('INVALID_')?400:code==='COACHING_AUDIO_UPLOAD_NOT_FOUND'?409:503)
  }
}
