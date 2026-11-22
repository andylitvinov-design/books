import {AppError,requireUUID} from '../assessments/contracts.js'
import {PRIVATE_HEADERS,readBody,safeError} from './http.js'
// Canonical action list remains on the existing coaching-life-plan endpoint.
export function createPersonalActionHandler({getConfig,origin,sameOrigin,auth,rate,repository,json=(body,options)=>Response.json(body,options)}){
 return async request=>{
  let session
  try{
   if(!['GET','POST','PATCH','DELETE'].includes(request.method))throw new AppError('METHOD_NOT_ALLOWED',405)
   const config=getConfig()
   origin(request,config)
   if(request.method!=='GET')sameOrigin(request,config)
   session=auth(request,config)
   const actor=await session.verified()
   if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
   await rate(config,{scope:'personal-actions',method:request.method,accountId:actor.id},request.method==='GET'?60:20,60)
   const repo=repository(config),query=new URL(request.url).searchParams
   let result
   if(request.method==='GET'){
    const keys=[...query.keys()]
    if(keys.length!==1||keys[0]!=='id')throw new AppError('INVALID_ACTION_QUERY')
    result=await repo.read(actor,requireUUID(query.get('id')))
   }else{
    if(new URL(request.url).search)throw new AppError('INVALID_ACTION_QUERY')
    const body=await readBody(request,48000)
    result=request.method==='DELETE'?await repo.remove(actor,body):await repo.save(actor,body)
   }
   return session.apply(json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
   const safe=safeError(error)
   const response=json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
   return session?session.apply(response):response
  }
 }
}
