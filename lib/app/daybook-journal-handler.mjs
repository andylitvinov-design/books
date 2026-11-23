import {PRIVATE_HEADERS,readBody,safeError} from './http.js'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {journalPage} from './daybook-journal-contract.mjs'

// Dependency boundary keeps actual Request/Response security behavior testable without Next builds.
export function createJournalHandler({getConfig,origin,sameOrigin,auth,rate,repository,json=(body,options)=>Response.json(body,options)}){
 return async function handle(request){
  let session
  try{
   if(!['GET','POST','PATCH','DELETE'].includes(request.method)) throw new AppError('METHOD_NOT_ALLOWED',405)
   const config=getConfig()
   origin(request,config)
   if(request.method!=='GET')sameOrigin(request,config)
   session=auth(request,config)
   const actor=await session.verified()
   if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
   await rate(config,{scope:'daybook-journal',method:request.method,accountId:actor.id},request.method==='GET'?60:30,60)
   const repo=repository(config)
   let result
   if(request.method==='GET'){
    const params=new URL(request.url).searchParams
    const keys=[...params.keys()]
    if(new Set(keys).size!==keys.length||keys.some(key=>!['id','limit','before'].includes(key)))throw new AppError('INVALID_JOURNAL_QUERY')
    if(params.has('id')){
     if(keys.length!==1)throw new AppError('INVALID_JOURNAL_QUERY')
     result=await repo.read(actor,requireUUID(params.get('id')))
    }else{
     const input={}
     if(params.has('limit')){
      if(!/^[1-9]\d*$/.test(params.get('limit')))throw new AppError('INVALID_JOURNAL_PAGE')
      input.limit=Number(params.get('limit'))
     }
     if(params.has('before'))input.before=params.get('before')
     journalPage(input)
     result=await repo.list(actor,input)
    }
   }else{
    if(new URL(request.url).search)throw new AppError('INVALID_JOURNAL_QUERY')
    const input=await readBody(request,140000)
    result=request.method==='DELETE'?await repo.remove(actor,input):await repo.save(actor,input)
   }
   return session.apply(json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
   const safe=safeError(error)
   const response=json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
   return session?session.apply(response):response
  }
 }
}
