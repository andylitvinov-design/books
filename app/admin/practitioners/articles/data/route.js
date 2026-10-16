import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createArticleRepository} from '@/lib/practitioners/article-repository'
import {consumeRate} from '@/lib/app/database'
import {readBody,PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError,onlyKeys,requireUUID} from '@/lib/assessments/contracts'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request){
 try{
  if(!(await requireAdminRequest()))throw new AppError('SIGN_IN_REQUIRED',401)
  const config=getAppConfig();requestOrigin(request,config)
  if(request.method!=='GET')requireSameOrigin(request,config)
  await consumeRate(config,{op:'article-moderation'},60,60)
  const repo=createArticleRepository(config)
  if(request.method==='GET')return NextResponse.json({items:await repo.moderationList()},{headers:PRIVATE_HEADERS})
  const body=await readBody(request)
  onlyKeys(body,['id','action','note']);requireUUID(body.id)
  return NextResponse.json(await repo.moderate(body.id,{action:body.action,note:body.note}),{headers:PRIVATE_HEADERS})
 }catch(e){const safe=safeError(e);return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})}
}
export {handle as GET,handle as POST}
