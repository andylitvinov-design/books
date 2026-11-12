import {NextResponse,after} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {readBody,safeError,PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createDirectMessages} from '@/lib/practitioners/direct-messages'
import {createVerifiedCrmCabinet} from '@/lib/practitioners/direct-verified-crm-cabinet'
import {dispatchDirectMessagePush} from '@/lib/app/direct-message-push'

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
    const verified=createVerifiedCrmCabinet(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      if([...params.keys()].some(key=>!['threadId','messagesBefore'].includes(key))||
         params.getAll('threadId').length>1||params.getAll('messagesBefore').length>1||
         params.has('messagesBefore')&&!params.has('threadId'))
        throw new AppError('INVALID_REQUEST',400)
      if(params.has('threadId')){
        const threadId=params.get('threadId'),cursor=params.get('messagesBefore')
        const connected=await verified.messages(actor,threadId,cursor)
        data=connected||{...(await store.messages(actor,threadId,cursor)),
          legacyReadOnly:true,requiresMessengerVerification:true}
      }else{
        const [legacy,connected]=await Promise.all([
          store.threads(actor),verified.threads(actor)])
        data={threads:[...connected,...legacy.threads.map(row=>({
          ...row,legacyReadOnly:true}))]}
      }
      data={...data,accountId:actor.id}
    }else{
      await consumeRate(config,{op:'direct-message-actions',actor:actor.id},35,60)
      const body=await readBody(request,8192)
      switch(body.action){
        case 'start':
          onlyKeys(body,['action','slug'])
          data=await verified.start(actor,body.slug);break
        case 'send':
          onlyKeys(body,['action','threadId','operationId','text','assetId'])
          data=await verified.send(actor,body);break
        case 'read':
          onlyKeys(body,['action','threadId'])
          data=await verified.read(actor,body.threadId)||await store.read(actor,body.threadId);break
        case 'intent':
          onlyKeys(body,['action','threadId','mime','bytes','allowPublicReuse'])
          // Provider-verified text is the only live conversation lane. Legacy
          // direct-media history remains readable but cannot create new chats.
          throw new AppError('MESSENGER_MEDIA_NOT_AVAILABLE',409)
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
      // Only after a new, committed participant message. Never on a duplicate
      // POST, read action, attachment staging, or a guest Google login alone.
      if(body.action==='send'&&data.saved===true&&data.duplicate===false&&data.providerBacked!==true)
        after(async()=>{
          try{await dispatchDirectMessagePush(config,data.id)}
          catch{console.error('HH_DIRECT_PUSH_DISPATCH_UNCONFIRMED')}
        })
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
