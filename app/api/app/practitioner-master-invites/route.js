import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {readBody,PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createAppRepository} from '@/lib/app/repository'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {createMasterInvitationRepository} from '@/lib/practitioners/master-invitations'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request){
  let auth
  try{
    const config=getAppConfig(),origin=requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const repo=createMasterInvitationRepository(config)
    const json=(data,status=200)=>auth.apply(NextResponse.json(data,{status,headers:PRIVATE_HEADERS}))
    if(request.method==='GET'){
      const query=new URL(request.url).searchParams
      if([...query.keys()].some(key=>key!=='token')||query.getAll('token').length>1)
        throw new AppError('INVALID_QUERY',400)
      if(query.has('token')){
        await consumeRate(config,{op:'master-invite-preview',ip:request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'},30,60)
        return json(await repo.preview(query.get('token')))
      }
      const actor=await auth.verified()
      if(!practitionerEmailAllowed(actor)||!await createAppRepository(config).isPractitioner(actor))
        throw new AppError('NOT_FOUND',404)
      return json({...await repo.list(actor,origin),accountId:actor.id})
    }
    const body=await readBody(request,2048)
    const actor=await auth.verified()
    const expected=request.headers.get('x-hh-account-id')
    if(expected&&expected!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    if(body.action==='create'){
      onlyKeys(body,['action','name','locale','operationId'])
      if(!expected)throw new AppError('ACCOUNT_CHANGED',409)
      if(!practitionerEmailAllowed(actor)||!await createAppRepository(config).isPractitioner(actor))
        throw new AppError('NOT_FOUND',404)
      await consumeRate(config,{op:'owner-master-invitation',actor:actor.id},10,3600)
      return json(await repo.create(actor,body,origin),201)
    }
    if(body.action==='renew'){
      onlyKeys(body,['action','invitationId'])
      if(!expected||!practitionerEmailAllowed(actor)||!await createAppRepository(config).isPractitioner(actor))
        throw new AppError('NOT_FOUND',404)
      await consumeRate(config,{op:'owner-master-invitation',actor:actor.id},10,3600)
      return json(await repo.renew(actor,body.invitationId,origin))
    }
    if(body.action==='claim'){
      onlyKeys(body,['action','token'])
      await consumeRate(config,{op:'master-invite-claim',actor:actor.id},15,600)
      return json(await repo.claim(actor,body.token))
    }
    throw new AppError('INVALID_ACTION',400)
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handler
export const POST=handler
