import 'server-only'
import {transaction} from './database.js'
import {pushConfig,sendWebPush} from './web-push.js'
import {clientMessagePushPayload,masterMessagePushPayload} from './notification-contract.js'

// Invoked only after an authorized new reply is committed. A narrowly scoped
// SQL function derives the genuine recipient and opt-in; no client-supplied
// user ID, freeform notification text or URL is used.
export async function dispatchClientMessagePush(config,messageId,env=process.env) {
  if(!pushConfig(env).supported)return {attempted:0,accepted:0,expired:0}
  const targets=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_message_push_targets($1)',[messageId]
  )).rows,{server:true})
  const outcomes=await Promise.allSettled(targets.map(target=>
    sendWebPush({endpoint:target.endpoint,p256dh:target.p256dh,auth:target.auth_secret},
      clientMessagePushPayload(target.locale,target.request_id),env)))
  return {attempted:targets.length,
    accepted:outcomes.filter(x=>x.status==='fulfilled'&&x.value.accepted).length,
    expired:outcomes.filter(x=>x.status==='fulfilled'&&x.value.expired).length}
}

/** Opted-in assigned master's devices only, for actual in-app client replies.
 * Database-derived recipient and fixed notice, never message text or contact data.
 */
export async function dispatchPractitionerMessagePush(config,messageId,env=process.env){
  if(!pushConfig(env).supported)return {attempted:0,accepted:0,expired:0}
  const targets=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.master_message_push_targets($1)',[messageId]
  )).rows,{server:true})
  const outcomes=await Promise.allSettled(targets.map(target=>
    sendWebPush({endpoint:target.endpoint,p256dh:target.p256dh,auth:target.auth_secret},
      masterMessagePushPayload(target.locale,target.request_id),env)))
  return {attempted:targets.length,
    accepted:outcomes.filter(x=>x.status==='fulfilled'&&x.value.accepted).length,
    expired:outcomes.filter(x=>x.status==='fulfilled'&&x.value.expired).length}
}
