import 'server-only'
import { randomUUID as cryptoRandomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed, operationHash } from '../app/crypto.js'
import { validateMessageText, canReply, channelTransportReady, MESSENGER_CHANNELS } from './messenger-policy.js'
import { messengerCursor, parseMessengerCursor } from './messenger-pagination.js'
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
    async listMessengerThreads(selectedThreadId=null,{threadsBefore=null,messagesBefore=null}={}){
      if(threadsBefore!==null&&(selectedThreadId!==null||messagesBefore!==null)||
         messagesBefore!==null&&!selectedThreadId)throw new AppError('INVALID_MESSENGER_CURSOR',400)
      if(selectedThreadId!==null)requireUUID(selectedThreadId)
      let threadCursor,messageCursor
      try {
        threadCursor=parseMessengerCursor(threadsBefore)
        messageCursor=parseMessengerCursor(messagesBefore)
      } catch {throw new AppError('INVALID_MESSENGER_CURSOR',400)}
      // Never leave an interrupted serverless send looking indefinitely "queued".
      // Unknown results are intentionally NOT re-sent automatically.
      await db.query(
        "update app.crm_msg_items set status='unknown',updated_at=now() where owner_id=$1 and direction='out' and status='queued' and created_at<now()-interval '5 minutes'",
        [actor.id])
      const accounts=(await db.query('select id,channel,enabled,created_at from app.crm_msg_accounts where owner_id=$1 order by channel',[actor.id])).rows
      const threadSelect=`select t.id,t.account_id,t.contact_id,t.display_ciphertext,
         t.unread_count,t.suppressed,t.last_inbound_at,t.last_message_at,
         t.last_message_at::text as at_cursor,
         a.channel,a.enabled,c.contact_ciphertext,c.suppressed as contact_suppressed,
         c.lifecycle,c.revision as contact_revision,
         (select m.direction from app.crm_msg_items m
          where m.thread_id=t.id and m.owner_id=t.owner_id
            and (m.direction='in' or (m.direction='out' and m.status in ('accepted','delivered','read')))
          order by m.created_at desc,m.id desc limit 1) as last_external_direction
         from app.crm_msg_threads t
         join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id
         join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id`
      const fetched=(await db.query(
        threadSelect+` where t.owner_id=$1
         and ($2::timestamptz is null or (t.last_message_at,t.id)<($2::timestamptz,$3::uuid))
         order by t.last_message_at desc,t.id desc limit 31`,
        [actor.id,threadCursor?.at||null,threadCursor?.id||null])).rows
      const rows=fetched.slice(0,30)
      const nextThreadsCursor=fetched.length>30
        ?messengerCursor(rows[rows.length-1].at_cursor,rows[rows.length-1].id):null
      if(selectedThreadId&&!rows.some(r=>r.id===selectedThreadId)){
        // A thread may be older than the first 30; authorizing by owner, not page position.
        const selected=(await db.query(
          threadSelect+' where t.owner_id=$1 and t.id=$2 limit 1',
          [actor.id,selectedThreadId])).rows[0]
        if(!selected)throw new AppError('NOT_FOUND',404)
        rows.push(selected)
      }
      const threads=rows.map(r=>{
        const p=openSealed(r.contact_ciphertext,personContext(actor.id,r.contact_id),config)
        const fallback=openSealed(r.display_ciphertext,accountContext(actor.id,r.account_id,'crm.msgdisplay'),config)
        return {id:r.id,contactId:r.contact_id,channel:r.channel,name:p?.displayName||fallback?.name||'Client',
          unreadCount:r.unread_count,needsReply:r.last_external_direction==='in',
          suppressed:r.suppressed||r.contact_suppressed,lifecycle:r.lifecycle,
          contactRevision:r.contact_revision,
          lastInboundAt:r.last_inbound_at,lastMessageAt:r.last_message_at,
          reply:canReply({channel:r.channel,lastInboundAt:r.last_inbound_at,suppressed:r.suppressed||r.contact_suppressed||r.lifecycle==='archived',
            enabled:r.enabled&&channelTransportReady(r.channel)})}
      })
      let messages=[],followups=[],nextMessagesCursor=null
      if(selectedThreadId){
        const selected=rows.find(r=>r.id===selectedThreadId)
        if(!selected)throw new AppError('NOT_FOUND',404)
        const due=(await db.query(
          `select id,kind,due_on::text as due_on,revision,status
           from app.crm_followups
           where owner_id=$1 and contact_id=$2 and status='open'
           order by due_on asc,id asc limit 20`,
          [actor.id,selected.contact_id])).rows
        followups=due.map(r=>({id:r.id,kind:r.kind,dueOn:r.due_on,status:r.status,revision:r.revision}))
        const fetchedMessages=(await db.query(
          `select id,direction,status,body_ciphertext,created_at,
             created_at::text as at_cursor
           from app.crm_msg_items
           where owner_id=$1 and thread_id=$2
             and ($3::timestamptz is null or (created_at,id)<($3::timestamptz,$4::uuid))
           order by created_at desc,id desc limit 51`,
          [actor.id,selectedThreadId,messageCursor?.at||null,messageCursor?.id||null])).rows
        const page=fetchedMessages.slice(0,50)
        nextMessagesCursor=fetchedMessages.length>50
          ?messengerCursor(page[page.length-1].at_cursor,page[page.length-1].id):null
        messages=page.reverse().map(m=>({id:m.id,direction:m.direction,status:m.status,
          text:openSealed(m.body_ciphertext,messageContext(actor.id,m.id),config)?.text||'',
          createdAt:m.created_at}))
      }
      return {accounts:accounts.map(a=>({channel:a.channel,connected:a.enabled&&channelTransportReady(a.channel),
        registered:a.enabled,createdAt:a.created_at})),threads,messages,followups,
        nextThreadsCursor,nextMessagesCursor,
        channels:MESSENGER_CHANNELS.map(channel=>({channel,providerConfigured:channelTransportReady(channel)}))}
    },
    async messengerContactId(threadId){
      requireUUID(threadId)
      const row=(await db.query(
        `select t.contact_id from app.crm_msg_threads t
           where t.id=$1 and t.owner_id=$2`,[threadId,actor.id])).rows[0]
      if(!row) throw new AppError('NOT_FOUND',404)
      return row.contact_id
    },
    async messengerFollowupBelongsToThread(threadId,followupId){
      requireUUID(threadId);requireUUID(followupId)
      const item=(await db.query(
        `select 1 from app.crm_followups f join app.crm_msg_threads t
          on t.contact_id=f.contact_id and t.owner_id=f.owner_id
          where f.owner_id=$1 and t.id=$2 and f.id=$3 and f.status='open' limit 1`,
        [actor.id,threadId,followupId])).rows[0]
      return !!item
    },
    async addMessengerNote(input){
      requireUUID(input.threadId)
      requireUUID(input.noteId)
      let text
      try { text=validateMessageText(input.text) } catch(error) {
        throw new AppError(error.message==='PRIVATE_CONTENT_BLOCKED'?'PRIVATE_CONTENT_BLOCKED':'INVALID_MESSAGE',400)
      }
      if(text.length>800) throw new AppError('INVALID_MESSAGE',400)
      const old=(await db.query(
        'select thread_id,direction,body_ciphertext from app.crm_msg_items where id=$1 and owner_id=$2',
        [input.noteId,actor.id])).rows[0]
      if(old){
        if(old.thread_id!==input.threadId||old.direction!=='note'||
          openSealed(old.body_ciphertext,messageContext(actor.id,input.noteId),config)?.text!==text)
          throw new AppError('CONFLICT',409)
        return {id:input.noteId,saved:true,duplicate:true}
      }
      // Owner, not provider, controls internal notes; never touch external adapters.
      const thread=(await db.query(
        'select id from app.crm_msg_threads where id=$1 and owner_id=$2',
        [input.threadId,actor.id])).rows[0]
      if(!thread) throw new AppError('NOT_FOUND',404)
      const recent=(await db.query(
        `select count(*)::int as total from app.crm_msg_items
          where thread_id=$1 and owner_id=$2 and direction='note'
          and created_at>now()-interval '24 hours'`,
        [input.threadId,actor.id])).rows[0]?.total||0
      if(recent>=50) throw new AppError('NOTE_DAILY_LIMIT',429)
      const ciphertext=seal({text},messageContext(actor.id,input.noteId),config)
      await db.query(
        `insert into app.crm_msg_items(id,owner_id,thread_id,direction,status,body_ciphertext)
         values($1,$2,$3,'note','received',$4)`,
        [input.noteId,actor.id,input.threadId,ciphertext])
      // Intentionally do NOT bump thread.last_message_at or notify a client.
      return {id:input.noteId,saved:true,duplicate:false}
    },
    async connectMessengerChannel(channel,externalId){
      if(!MESSENGER_CHANNELS.includes(channel)||!/^\d{5,25}$/.test(String(externalId)))
        throw new AppError('INVALID_CHANNEL',400)
      const digest=businessHash(channel,externalId,config)
      const old=(await db.query('select id,external_hash,enabled from app.crm_msg_accounts where owner_id=$1 and channel=$2',
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
      const existed=(await db.query(
        'select id,status,thread_id,direction,body_ciphertext from app.crm_msg_items where id=$1 and owner_id=$2',
        [input.requestId,actor.id])).rows[0]
      if(existed) {
        // Idempotency identifies one immutable destination and payload, never an arbitrary retry.
        const recorded=openSealed(existed.body_ciphertext,messageContext(actor.id,existed.id),config)?.text
        if(existed.thread_id!==input.threadId||existed.direction!=='out'||recorded!==text)
          throw new AppError('CONFLICT',409)
        return {id:existed.id,status:existed.status,duplicate:true}
      }
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
      // Account/recipient row is locked above, so concurrent owner tabs cannot
      // reserve the same text twice. Protect even after reload or a lost HTTP response.
      // Unknown/queued provider calls are NEVER retried with a fresh request ID.
      const recent=(await db.query(
        `select id,status,body_ciphertext,created_at from app.crm_msg_items
         where thread_id=$1 and owner_id=$2 and direction='out'
           and status in ('queued','unknown','accepted','delivered','read')
           and created_at>now()-interval '24 hours'
         order by created_at desc,id desc limit 30`,
        [thread.id,actor.id])).rows
      const time=Date.now()
      for(const previous of recent){
        const age=time-new Date(previous.created_at).getTime()
        const uncertain=['queued','unknown'].includes(previous.status)
        if(!uncertain && (age<0||age>5*60*1000)) continue
        const lastText=openSealed(previous.body_ciphertext,messageContext(actor.id,previous.id),config)?.text
        if(lastText===text) return {id:previous.id,status:previous.status,duplicate:true}
      }
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
    async checkMessengerReplyReady(id){
      requireUUID(id)
      const row=(await db.query(
        `select m.status,t.suppressed,t.last_inbound_at,a.channel,a.enabled,
           c.suppressed as contact_suppressed,c.lifecycle
         from app.crm_msg_items m
         join app.crm_msg_threads t on t.id=m.thread_id and t.owner_id=m.owner_id
         join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id
         join app.crm_contacts c on c.id=t.contact_id and c.owner_id=t.owner_id
         where m.id=$1 and m.owner_id=$2 and m.direction='out'`,
        [id,actor.id])).rows[0]
      if(!row) throw new AppError('NOT_FOUND',404)
      const check=canReply({channel:row.channel,lastInboundAt:row.last_inbound_at,
        suppressed:row.suppressed||row.contact_suppressed||row.lifecycle==='archived',
        enabled:row.enabled&&channelTransportReady(row.channel)})
      return {allowed:row.status==='queued'&&check.ok,reason:check.reason}
    },
    async finalizeMessengerReply(id,channel,status,providerId=null){
      requireUUID(id)
      if(!['accepted','failed','unknown','blocked'].includes(status)) throw new AppError('INVALID_MESSENGER_STATUS',400)
      const digest=providerId?providerMessageHash(channel,providerId,config):null
      const row=(await db.query(
        `update app.crm_msg_items set status=$1,provider_hash=$2,updated_at=now()
         where id=$3 and owner_id=$4 and status='queued' and direction='out'
         returning id,status,thread_id`,[status,digest,id,actor.id])).rows[0]
      if(!row) return {id,status:'unknown'}
      if(digest&&status==='accepted'){
        // Signed WhatsApp receipts may arrive before the Send API responds.
        // Reconcile the stored receipt instead of displaying a stale "accepted".
        const receipt=(await db.query(
          `select r.status from app.crm_msg_receipts r
           join app.crm_msg_threads t on t.account_id=r.account_id and t.owner_id=r.owner_id
           where t.id=$1 and t.owner_id=$2 and r.provider_hash=$3 limit 1`,
          [row.thread_id,actor.id,digest])).rows[0]
        if(receipt){
          const changed=(await db.query(
            "update app.crm_msg_items set status=$1,updated_at=now() where id=$2 and owner_id=$3 and status='accepted' returning status",
            [receipt.status,id,actor.id])).rows[0]
          return {id,status:changed?.status||row.status}
        }
      }
      return {id,status:row.status}
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
