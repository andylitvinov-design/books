import 'server-only'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { transaction as dbTransaction } from '../app/database.js'
import { seal, openSealed, operationHash } from '../app/crypto.js'
import { messengerCursor, parseMessengerCursor } from '../crm/messenger-pagination.js'
import { validateMessageText } from '../crm/messenger-policy.js'

// Use the SAME encrypted CRM thread as the verified Telegram bot; never create
// a second website-only message table. The SQL functions restrict access by
// live auth.sessions, verified provider chat, explicit CRM link and /agree.
const READY = `select pg_catalog.to_regprocedure('app_private.hh_messenger_self_thread()') is not null
  and pg_catalog.to_regprocedure('app_private.hh_messenger_self_messages(uuid,timestamptz,uuid)') is not null
  and pg_catalog.to_regprocedure('app_private.hh_messenger_self_send(uuid,uuid,text,text)') is not null as ready`
const CONTEXT = (owner,id) => ({accountId:owner,recordId:id,field:'crm.msgbody'})
const isUUID = value => {
  try { requireUUID(value); return true } catch { return false }
}
async function findLinked(db) {
  const available=(await db.query(READY)).rows[0]?.ready===true
  if(!available)return null // Migration not applied: never infer verification.
  const row=(await db.query('select * from app_private.hh_messenger_self_thread()')).rows[0]
  return row || null
}
const label=row=>String(row.practitioner_name||row.practitioner_slug||'Holistic House').slice(0,120)
function publicThread(row) {
  return {id:row.thread_id,slug:row.practitioner_slug,peerName:label(row),
    peerMasterSlug:row.practitioner_slug,isRecipient:false,blocked:false,
    providerBacked:true,channel:'telegram',
    requiresMessengerVerification:row.can_send!==true,
    updatedAt:row.last_message_at,unread:0}
}
function validText(value) {
  try{return validateMessageText(value)}
  catch(error){throw new AppError(error?.message==='PRIVATE_CONTENT_BLOCKED'
    ?'PRIVATE_CONTENT_BLOCKED':'INVALID_MESSAGE',400)}
}
export function createVerifiedCrmCabinet(config,{transaction=dbTransaction}={}) {
  const run=(actor,action)=>transaction(config,actor,action)
  return {
    async threads(actor) {
      return run(actor,async db=>{
        const linked=await findLinked(db)
        return linked?[publicThread(linked)]:[]
      })
    },
    async start(actor,slug) {
      if(typeof slug!=='string'||!/^[a-z0-9-]{2,90}$/.test(slug))
        throw new AppError('INVALID_RECIPIENT',400)
      return run(actor,async db=>{
        const linked=await findLinked(db)
        if(!linked)throw new AppError('MESSENGER_VERIFICATION_REQUIRED',409)
        if(linked.practitioner_slug!==slug)
          throw new AppError('MASTER_MESSENGER_NOT_CONNECTED',409)
        if(linked.can_send!==true)
          throw new AppError('MESSENGER_REPLY_CONSENT_REQUIRED',409)
        return {threadId:linked.thread_id,created:false,blocked:false,providerBacked:true}
      })
    },
    async messages(actor,threadId,before=null) {
      if(!isUUID(threadId))return null
      let cursor
      try{cursor=parseMessengerCursor(before)}catch{
        throw new AppError('INVALID_MESSAGE_CURSOR',400)
      }
      return run(actor,async db=>{
        const linked=await findLinked(db)
        if(!linked||linked.thread_id!==threadId)return null
        const rows=(await db.query(
          'select * from app_private.hh_messenger_self_messages($1,$2,$3)',
          [threadId,cursor?.at||null,cursor?.id||null])).rows
        const page=rows.slice(0,50),tail=page[page.length-1]
        const nextMessagesCursor=rows.length>50&&tail
          ?messengerCursor(tail.at_cursor,tail.message_id):null
        const rendered=page.reverse().map(m=>{
          const value=openSealed(m.body_ciphertext,CONTEXT(linked.owner_id,m.message_id),config)
          return {id:m.message_id,mine:m.direction==='in',status:m.status,
            text:typeof value?.text==='string'?value.text:'',
            createdAt:m.created_at,attachment:null}
        })
        return {threadId,peerName:label(linked),blocked:false,
          requiresMessengerVerification:linked.can_send!==true,
          providerBacked:true,channel:'telegram',attachmentsSupported:false,
          isRecipient:false,hasMore:!!nextMessagesCursor,nextMessagesCursor,
          messages:rendered}
      })
    },
    async read(actor,threadId) {
      if(!isUUID(threadId))return null
      return run(actor,async db=>{
        const linked=await findLinked(db)
        return linked?.thread_id===threadId?{seen:true,providerBacked:true}:null
      })
    },
    async send(actor,input) {
      requireUUID(input?.threadId);requireUUID(input?.operationId)
      if(input.assetId!==undefined)
        throw new AppError('MESSENGER_MEDIA_NOT_AVAILABLE',409)
      const text=validText(input?.text)
      return run(actor,async db=>{
        const linked=await findLinked(db)
        if(!linked||linked.thread_id!==input.threadId)
          throw new AppError('MESSENGER_VERIFICATION_REQUIRED',409)
        if(linked.can_send!==true)
          throw new AppError('MESSENGER_REPLY_CONSENT_REQUIRED',409)
        const digest=operationHash({scope:'hh-crm-cabinet-inbound-v1',
          actorId:actor.id,threadId:input.threadId,id:input.operationId,text},config)
        const ciphertext=seal({text},CONTEXT(linked.owner_id,input.operationId),config)
        const saved=(await db.query(
          'select app_private.hh_messenger_self_send($1,$2,$3,$4) as saved',
          [input.threadId,input.operationId,ciphertext,digest])).rows[0]?.saved===true
        return {id:input.operationId,threadId:input.threadId,
          saved:true,duplicate:!saved,providerBacked:true}
      })
    },
  }
}
