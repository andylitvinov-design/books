import 'server-only'
import {transaction} from './database.js'
import {pushConfig,sendWebPush} from './web-push.js'
import {directMessagePushPayload} from './notification-contract.js'

// For the existing on-site Messenger only. Its committed message is the durable
// source event; the private message/device unique claim is the delivery ledger.
// Never accept destination IDs or notification text from the browser.
export async function dispatchDirectMessagePush(config,messageId,env=process.env,{
  send=sendWebPush,transact=transaction,
}={}){
  if(!pushConfig(env).supported)return {configured:false,claimed:0,accepted:0,unknown:0}
  const targets=await transact(config,null,async db=>(await db.query(
    'select * from app_private.direct_message_push_claim($1)',[messageId])).rows,{server:true})
  let accepted=0,unknown=0,revoked=0
  await Promise.allSettled(targets.map(async target=>{
    let state='unknown'
    try {
      const allowed=await transact(config,null,async db=>(await db.query(
        'select app_private.direct_message_push_allowed($1,$2) as allowed',
        [messageId,target.subscription_id])).rows[0]?.allowed,{server:true})
      if(!allowed)state='rejected'
      else{
        const response=await send({
          endpoint:target.endpoint,p256dh:target.p256dh,auth:target.auth_secret,
        },directMessagePushPayload(target.locale,target.thread_id),env)
        state=response.accepted?'accepted':response.expired?'revoked':'rejected'
      }
    }catch{/* Unknown provider status: never blindly retry an already-claimed device. */}
    try{
      await transact(config,null,db=>db.query(
        'select app_private.direct_message_push_finish($1,$2,$3)',
        [messageId,target.subscription_id,state]),{server:true})
    }catch{/* The unique attempt still blocks duplicates after an uncertain failure. */}
    if(state==='accepted')accepted++
    else if(state==='revoked')revoked++
    else unknown++
  }))
  return {configured:true,claimed:targets.length,accepted,revoked,unknown}
}

// A short, read-only search of committed, unread direct messages recovers
// events missed by after(). The database only returns opted-in destinations
// with no existing message/device attempt, and limits the lookback to 15 min.
export async function recoverDirectMessagePush(config,env=process.env,{
  dispatch=dispatchDirectMessagePush,transact=transaction,
  maxMessages=12,clock=()=>Date.now(),maxRuntimeMs=25000,
}={}){
  if(!pushConfig(env).supported)return {configured:false,examined:0,accepted:0}
  const since=clock()
  const ids=await transact(config,null,async db=>(await db.query(
    'select message_id from app_private.direct_message_push_pending($1)',[maxMessages]
  )).rows.map(row=>row.message_id),{server:true})
  const summary={configured:true,examined:0,accepted:0,unknown:0}
  for(const id of ids){
    if(clock()-since>=maxRuntimeMs)break
    try{
      const result=await dispatch(config,id,env,{transact})
      summary.examined++
      summary.accepted+=result.accepted||0
      summary.unknown+=result.unknown||0
    }catch{
      summary.examined++
      summary.unknown++
    }
  }
  return summary
}
