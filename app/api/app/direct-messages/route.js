import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {readBody,safeError,PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createDirectMessages} from '@/lib/practitioners/direct-messages'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request) {
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const expected=request.headers.get('x-hh-account-id')
    if(expected && expected!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    if(request.method==='POST' && expected!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const store=createDirectMessages(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      if([...params.keys()].some(key=>!['threadId','messagesBefore'].includes(key))||
         params.getAll('threadId').length>1||params.getAll('messagesBefore').length>1||
         params.has('messagesBefore')&&!params.has('threadId'))
        throw new AppError('INVALID_REQUEST',400)
      data=params.has('threadId')
        ?await store.messages(actor,params.get('threadId'),params.get('messagesBefore')):await store.threads(actor)
      data={...data,accountId:actor.id}
    }else{
      await consumeRate(config,{op:'direct-message-actions',actor:actor.id},35,60)
      const body=await readBody(request,8192)
      switch(body.action){
        case 'start':
          onlyKeys(body,['action','slug'])
          data=await store.start(actor,body.slug);break
        case 'send':
          onlyKeys(body,['action','threadId','operationId','text','assetId'])
          data=await store.send(actor,body);break
        case 'read':
          onlyKeys(body,['action','threadId'])
          data=await store.read(actor,body.threadId);break
        case 'intent':
          onlyKeys(body,['action','threadId','mime','bytes','allowPublicReuse'])
          data=await store.intent(actor,body);break
        case 'complete':
          onlyKeys(body,['action','assetId'])
          data=await store.complete(actor,body.assetId);break
        case 'publish':
          onlyKeys(body,['action','assetId','title','locale','confirmRights'])
          data=await store.changePublication(actor,body);break
        case 'unpublish':
        case 'revoke':
          onlyKeys(body,['action','assetId'])
          data=await store.changePublication(actor,body);break
        case 'block':
        case 'unblock':
          onlyKeys(body,['action','threadId'])
          data=await store.changePublication(actor,body);break
        default:throw new AppError('INVALID_ACTION',400)
      }
    }
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handler
export const POST=handler
