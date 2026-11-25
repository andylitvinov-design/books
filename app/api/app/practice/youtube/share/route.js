import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {submitMasterVideoToOwner,masterVideoRequestStatus,withdrawMasterVideo}
 from '@/lib/youtube/owner-publication-service'

export const runtime='nodejs'
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
   const json=(value,status=200)=>auth.apply(NextResponse.json(value,{status,headers:PRIVATE_HEADERS}))
   if(request.method==='GET'){
     const assetId=new URL(request.url).searchParams.get('assetId')
     return json({request:await masterVideoRequestStatus(config,actor,assetId)})
   }
   if(request.method!=='POST')throw new AppError('NOT_FOUND',404)
   const data=await readBody(request,1200)
   if(!['submit','withdraw'].includes(data.action))throw new AppError('INVALID_ACTION',400)
   onlyKeys(data,data.action==='submit'
     ?['action','assetId','title','rightsConfirmed','privacyConfirmed']
     :['action','assetId'])
   await consumeRate(config,{op:'master-owner-youtube-submission',account:actor.id},6,3600)
   const value=data.action==='submit'
     ?await submitMasterVideoToOwner(config,actor,data)
     :await withdrawMasterVideo(config,actor,data.assetId)
   return json({ok:true,request:value},201)
 }catch(error){
   const {status,code}=safeError(error)
   const result=NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
   return auth?auth.apply(result):result
 }
}
export const GET=handle
export const POST=handle
