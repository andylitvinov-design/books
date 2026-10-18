import 'server-only'
import { randomUUID as cryptoRandomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed, operationHash } from '../app/crypto.js'
import { validateMessageText, canReply, channelTransportReady, MESSENGER_CHANNELS } from './messenger-policy.js'
const personContext=(owner,id)=>({accountId:owner,recordId:id,field:'crm.contact'})
const accountContext=(owner,id,field)=>({accountId:owner,recordId:id,field})
const messageContext=(owner,id)=>({accountId:owner,recordId:id,field:'crm.msgbody'})
export function businessHash(channel,businessId,config){
  return operationHash({scope:'crm-msg-business',channel,businessId:String(businessId)},config)
}
export function providerMessageHash(channel,providerId,config){
  return operationHash({scope:'crm-provider-message',channel,providerId:String(providerId)},config)
}
export function createCrmMessengerStore(db,actor,config){
  return {
    async listMessengerThreads(selectedThreadId=null){
      const accounts=(await db.query('select id,channel,enabled,created_at from app.crm_msg_accounts where owner_id=$1 order by channel',[actor.id])).rows
      const rows=(await db.query(
        `select t.id,t.account_id,t.contact_id,t.display_ciphertext,t.unread_count,t.suppressed,t.last_inbound_at,t.last_message_at,
          a.channel,a.enabled,c.contact_ciphertext,c.suppressed as contact_suppressed,c.lifecycle
         from app.crm_msg_threads t join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id
         join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id
         where t.owner_id=$1 order by t.last_message_at desc,t.id desc limit 100`,[actor.id])).rows
      const threads=rows.map(r=>{
        const p=openSealed(r.contact_ciphertext,personContext(actor.id,r.contact_id),config)
        const fallback=openSealed(r.display_ciphertext,accountContext(actor.id,r.account_id,'crm.msgdisplay'),config)
        return {id:r.id,contactId:r.contact_id,channel:r.channel,name:p?.displayName||fallback?.name||'Client',
          unreadCount:r.unread_count,suppressed:r.suppressed||r.contact_suppressed,lifecycle:r.lifecycle,
          lastInboundAt:r.last_inbound_at,lastMessageAt:r.last_message_at,
          reply:canReply({channel:r.channel,lastInboundAt:r.last_inbound_at,suppressed:r.suppressed||r.contact_suppressed,
            enabled:r.enabled&&channelTransportReady(r.channel)})}
      })
      let messages=[]
      if(selectedThreadId){
        requireUUID(selectedThreadId)
        const exists=rows.some(r=>r.id===selectedThreadId)
        if(exists){
          const items=(await db.query(
            'select id,direction,status,body_ciphertext,created_at from app.crm_msg_items where owner_id=$1 and thread_id=$2 order by created_at desc,id desc limit 70',
            [actor.id,selectedThreadId])).rows
          messages=items.reverse().map(m=>({id:m.id,direction:m.direction,status:m.status,
            text:openSealed(m.body_ciphertext,messageContext(actor.id,m.id),config)?.text||'',
            createdAt:m.created_at}))
        }
      }
      return {accounts:accounts.map(a=>({channel:a.channel,connected:a.enabled&&channelTransportReady(a.channel),
        registered:a.enabled,createdAt:a.created_at})),threads,messages,
        channels:MESSENGER_CHANNELS.map(channel=>({channel,providerConfigured:channelTransportReady(channel)}))}
    },
    async connectMessengerChannel(channel,externalId){
      if(!MESSENGER_CHANNELS.includes(channel)||!/^\d{5,25}$/.test(String(externalId)))
        throw new AppError('INVALID_CHANNEL',400)
      const digest=businessHash(channel,externalId,config)
      const old=(await db.query('select id,external_hash,enabled from app.crm_msg_accounts where owner_id=$1 and channel=$2 for update',
        [actor.id,channel])).rows[0]
      if(old){
        if(old.external_hash!==digest||!old.enabled) throw new AppError('CHANNEL_RECONNECT_REVIEW_REQUIRED',409)
        return {channel,registered:true}
      }
      await db.query('insert into app.crm_msg_accounts(id,owner_id,channel,external_hash) values($1,$2,$3,$4)',
        [cryptoRandomUUID(),actor.id,channel,digest])
      return {channel,registered:true}
    },
    async reserveMessengerReply(input){
      requireUUID(input.threadId);requireUUID(input.requestId)
      if(input.purpose!=='customer_reply') throw new AppError('MESSENGER_PURPOSE_DENIED',403)
      let text
      try{text=validateMessageText(input.text)}catch(err){
        throw new AppError(err.message==='PRIVATE_CONTENT_BLOCKED'?'PRIVATE_CONTENT_BLOCKED':'INVALID_MESSAGE',400)
      }
      const existed=(await db.query('select id,status from app.crm_msg_items where id=$1 and owner_id=$2',
        [input.requestId,actor.id])).rows[0]
      if(existed) return {id:existed.id,status:existed.status,duplicate:true}
      const thread=(await db.query(
        `select t.id,t.account_id,t.user_ciphertext,t.suppressed,t.last_inbound_at,
           a.channel,a.enabled,c.suppressed as contact_suppressed,c.lifecycle
           from app.crm_msg_threads t join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id
           join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id
           where t.id=$1 and t.owner_id=$2 for update of t`,[input.threadId,actor.id])).rows[0]
      if(!thread) throw new AppError('NOT_FOUND',404)
      const allowed=canReply({channel:thread.channel,lastInboundAt:thread.last_inbound_at,
        suppressed:thread.suppressed||thread.contact_suppressed||thread.lifecycle==='archived',
        enabled:thread.enabled&&channelTransportReady(thread.channel)})
      if(!allowed.ok) throw new AppError(allowed.reason,403)
      const quota=Number((await db.query(
        `select count(*)::int as total from app.crm_msg_items
          where owner_id=$1 and direction='out' and created_at>now()-interval '24 hours'`,[actor.id])).rows[0]?.total||0)
      if(quota>=20) throw new AppError('MESSENGER_DAILY_LIMIT',429)
      const bodyCiphertext=seal({text},messageContext(actor.id,input.requestId),config)
      const requestHash=operationHash({scope:'crm-msg-request',ownerId:actor.id,id:input.requestId},config)
      await db.query(
        `insert into app.crm_msg_items(id,owner_id,thread_id,direction,status,body_ciphertext,request_hash)
         values($1,$2,$3,'out','queued',$4,$5)`,
        [input.requestId,actor.id,thread.id,bodyCiphertext,requestHash])
      await db.query('update app.crm_msg_threads set last_message_at=now() where id=$1 and owner_id=$2',[thread.id,actor.id])
      const identity=openSealed(thread.user_ciphertext,accountContext(actor.id,thread.account_id,'crm.msgidentity'),config)
      if(!identity?.externalId) throw new AppError('MESSAGE_IDENTITY_UNAVAILABLE',503)
      return {id:input.requestId,status:'queued',duplicate:false,channel:thread.channel,to:String(identity.externalId),text}
    },
    async finalizeMessengerReply(id,channel,status,providerId=null){
      requireUUID(id)
      if(!['accepted','failed','unknown'].includes(status)) throw new AppError('INVALID_MESSENGER_STATUS',400)
      const digest=providerId?providerMessageHash(channel,providerId,config):null
      const row=(await db.query(
        `update app.crm_msg_items set status=$1,provider_hash=$2,updated_at=now()
         where id=$3 and owner_id=$4 and status='queued' and direction='out'
         returning id,status`,[status,digest,id,actor.id])).rows[0]
      return {id,status:row?.status||'unknown'}
    },
    async readMessengerThread(id){
      requireUUID(id)
      const row=(await db.query('update app.crm_msg_threads set unread_count=0,read_at=now() where id=$1 and owner_id=$2 returning id',
        [id,actor.id])).rows[0]
      if(!row) throw new AppError('NOT_FOUND',404)
      return {id,read:true}
    },
  }
}
