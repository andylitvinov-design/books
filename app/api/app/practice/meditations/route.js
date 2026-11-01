import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {meditationMine,meditationSourceIntent,meditationCompleteSource,
  meditationVideoIntent,meditationCompleteVideo,meditationSubmit} from '@/lib/practitioners/meditation-studio-service'
export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
  let auth
  try{
    const config=getAppConfig()
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    await createPractitionerRepository(config).requireActivated(actor)
    const respond=(body,status=200)=>auth.apply(NextResponse.json(body,{status,headers:PRIVATE_HEADERS}))
    if(request.method==='GET')return respond({items:await meditationMine(config,actor)})
    if(request.method!=='POST')throw new AppError('NOT_FOUND',404)
    const body=await readBody(request,15000)
    await consumeRate(config,{op:'meditation-studio',account:actor.id},48,3600)
    if(body.action==='source-intent')
      return respond(await meditationSourceIntent(config,actor,{mime:body.mime,bytes:body.bytes}),201)
    if(body.action==='source-complete')
      return respond(await meditationCompleteSource(config,actor,body.id))
    if(body.action==='video-intent')
      return respond(await meditationVideoIntent(config,actor,{id:body.id,mime:body.mime,bytes:body.bytes}),201)
    if(body.action==='video-complete')
      return respond(await meditationCompleteVideo(config,actor,body.id))
    if(body.action==='submit')
      return respond(await meditationSubmit(config,actor,{id:body.id,metadata:body.metadata}))
    throw new AppError('INVALID_ACTION',400)
  }catch(error){
    const {status,code}=safeError(error)
    const r=NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(r):r
  }
}
export async function GET(request){return handle(request)}
export async function POST(request){return handle(request)}
