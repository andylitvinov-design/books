import 'server-only'
import {transaction} from './database.js'
import {pushConfig,sendWebPush} from './web-push.js'
import {clientMessagePushPayload} from './notification-contract.js'

// Invoked only AFTER a new practitioner reply has been committed. The SQL
// function independently derives and validates the client from the saved
// message. Never accept browser-provided recipient IDs, endpoints or content.
// A push failure must not invalidate the persisted conversation.
export async function dispatchClientMessagePush(config,messageId,env=process.env) {
  if(!pushConfig(env).supported)return {attempted:0,accepted:0,expired:0}
  const targets=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_message_push_targets($1)',[messageId]
  )).rows,{server:true})
  const outcomes=await Promise.allSettled(targets.map(target=>
    sendWebPush({endpoint:target.endpoint,p256dh:target.p256dh,auth:target.auth_secret},
      clientMessagePushPayload(target.locale,target.request_id),env)
  ))
  // Push destinations and account identifiers must not appear in logs or errors.
  return {attempted:targets.length,
    accepted:outcomes.filter(result=>result.status==='fulfilled'&&result.value.accepted).length,
    expired:outcomes.filter(result=>result.status==='fulfilled'&&result.value.expired).length}
}
