import {AppError,requireUUID} from '../assessments/contracts.js'
import {dailyIntentionPage} from './daybook-daily-contract.mjs'
import {weeklyDates} from './daybook-weekly-contract.mjs'
import {PRIVATE_HEADERS,readBody,safeError} from './http.js'
export function createWeeklyReviewHandler({getConfig,origin,sameOrigin,auth,rate,repository,json=(body,options)=>Response.json(body,options)}){
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
   await rate(config,{scope:'daybook-weekly',method:request.method,accountId:actor.id},request.method==='GET'?60:20,60)
   const repo=repository(config),query=new URL(request.url).searchParams
   let result
   if(request.method==='GET'){
    const keys=[...query.keys()]
    if(query.has('export')){
     if(query.get('export')!=='1'||new Set(keys).size!==keys.length||keys.some(key=>!['export','limit','before'].includes(key)))throw new AppError('INVALID_DAYBOOK_QUERY')
     const page=dailyIntentionPage({...(query.has('limit')?{limit:Number(query.get('limit'))}:{}),...(query.has('before')?{before:query.get('before')}:{})})
     result=await repo.list(actor,page)
    }else{
     if(keys.length!==1||!['id','week'].includes(keys[0]))throw new AppError('INVALID_DAYBOOK_QUERY')
     result=keys[0]==='id'?await repo.read(actor,requireUUID(query.get('id'))):await repo.byWeek(actor,(weeklyDates(query.get('week')),query.get('week')))
    }
   }else{
    if(new URL(request.url).search)throw new AppError('INVALID_DAYBOOK_QUERY')
    const body=await readBody(request,98304)
    if(Object.hasOwn(body,'operation')){
     if(request.method!=='POST'||body.operation!=='preview')throw new AppError('INVALID_WEEKLY_OPERATION')
     const input={...body};delete input.operation
     result=await repo.preview(actor,input)
    }else result=request.method==='DELETE'?await repo.remove(actor,body):await repo.save(actor,body)
   }
   return session.apply(json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
   const safe=safeError(error),response=json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
   return session?session.apply(response):response
  }
 }
}
