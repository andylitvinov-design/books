import 'server-only'
import {transaction} from './database.js'
import {pushConfig,sendWebPush} from './web-push.js'
import {coursePushPayload} from './notification-contract.js'
import {AppError} from '../assessments/contracts.js'

// Invoked only from authenticated internal cron (not client routes).
// All tokens stay in the server process and are never logged.
export async function dispatchCourseReminders(config,env=process.env,at=new Date()) {
  if(!pushConfig(env).supported)throw new AppError('PUSH_NOT_CONFIGURED',503)
  const now=at instanceof Date?at:new Date(at)
  if(!Number.isFinite(now.getTime()))throw new AppError('INVALID_TIME',400)
  const claims=await transaction(config,null,async db=>(
    await db.query('select * from app_private.claim_due_course_pushes($1,$2)',[now,60])
  ).rows,{server:true})
  let accepted=0,expired=0,failed=0
  for(let start=0;start<claims.length;start+=10) {
    const chunk=claims.slice(start,start+10)
    const results=await Promise.allSettled(chunk.map(async device=>{
      let outcome={accepted:false,expired:false}
      try{
        outcome=await sendWebPush(
          {endpoint:device.endpoint,p256dh:device.p256dh,auth:device.auth_secret},
          coursePushPayload(device.locale),env)
      }catch{/* Retry on a later day: don't print endpoints or credentials. */}
      await transaction(config,null,db=>db.query(
        'select app_private.finish_course_push($1,$2,$3,$4)',
        [device.subscription_id,device.local_day,outcome.accepted,outcome.expired]
      ),{server:true})
      return outcome
    }))
    for(const item of results) {
      if(item.status!=='fulfilled')failed++
      else if(item.value.expired)expired++
      else if(item.value.accepted)accepted++
      else failed++
    }
  }
  return {claimed:claims.length,accepted,expired,failed}
}
