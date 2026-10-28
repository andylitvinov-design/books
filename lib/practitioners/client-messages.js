import 'server-only'
import { transaction as databaseTransaction } from '../app/database.js'
import { seal, openSealed } from '../app/crypto.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { validateMessageText } from '../crm/messenger-policy.js'
import { redactRelayContacts, assertNoRelayContacts } from './relay-privacy.mjs'
import { messengerCursor, parseMessengerCursor } from '../crm/messenger-pagination.js'
import {canReplyToConsultation} from './conversation-policy.js'

const bodyContext=(accountId,id)=>({accountId,recordId:id,field:'practice.request.message'})
const admittedStatuses=Object.freeze(['approved','submitted','changes_requested'])


function validateBody(raw) {
  try {
    const text=validateMessageText(raw)
    if(text.length>1200)throw new Error('INVALID_MESSAGE')
    assertNoRelayContacts(text)
    return text
  }catch(error){
    throw new AppError(error?.message==='PRIVATE_CONTENT_BLOCKED'?'PRIVATE_CONTENT_BLOCKED':
      error?.message==='CONTACT_EXCHANGE_BLOCKED'?'CONTACT_EXCHANGE_BLOCKED':'INVALID_MESSAGE',400)
  }
}
async function participant(db,actor,requestId,{lock=false}={}) {
  requireUUID(requestId)
  const row=(await db.query(
    `select r.id,r.account_id,r.recipient_practitioner_id,r.status,r.remote_booking,
      p.trusted_auth_user_id as practitioner_account_id,p.active as practitioner_active,
      p.status as practitioner_status
      from app.consultation_requests r
      join app.practitioners p on p.id=r.recipient_practitioner_id
      where r.id=$1 limit 1${lock?' FOR UPDATE OF r':''}`,
    [requestId])).rows[0]
  if(!row)throw new AppError('NOT_FOUND',404)
  const isRequester=row.account_id===actor.id
  const isPractitioner=row.practitioner_account_id===actor.id &&
    row.practitioner_active===true && admittedStatuses.includes(row.practitioner_status)
  if(!isRequester&&!isPractitioner)throw new AppError('NOT_FOUND',404)
  return {requestId:row.id,requester:row.account_id,
    actorRole:isRequester?'client':'practitioner',
    canNote:isPractitioner&&!isRequester,
    status:row.status,
    canReply:canReplyToConsultation(row.status,row.remote_booking),
  }
}
export function createPractitionerClientMessages(config,{transaction=databaseTransaction}={}) {
  return {
    async list(actor,requestId,before=null){
      return transaction(config,actor,async db=>{
        const scope=await participant(db,actor,requestId)
        let cursor
        try{cursor=parseMessengerCursor(before)}catch{throw new AppError('INVALID_MESSENGER_CURSOR',400)}
        const fetched=(await db.query(
          `select id,author_account_id,author_role,visibility,body_ciphertext,created_at,
             created_at::text as cursor_at
            from app.practitioner_request_messages
            where request_id=$1
              and ($2::timestamptz is null or (created_at,id)<($2::timestamptz,$3::uuid))
            order by created_at desc,id desc limit 41`,
          [scope.requestId,cursor?.at||null,cursor?.id||null])).rows
        const rows=fetched.slice(0,40)
        const unseen=(await db.query(
          `select count(*)::int as total from app.practitioner_request_messages m
             left join app.practitioner_request_reads s
               on s.request_id=m.request_id and s.account_id=$2
           where m.request_id=$1 and m.visibility='participants'
             and m.author_account_id<>$2
             and (s.last_seen_at is null or m.created_at>s.last_seen_at)`,
          [scope.requestId,actor.id])).rows[0]?.total||0
        const nextCursor=fetched.length>40
          ?messengerCursor(rows[rows.length-1].cursor_at,rows[rows.length-1].id):null
        const rendered=rows.reverse().map(row=>{
          const body=openSealed(row.body_ciphertext,bodyContext(scope.requester,row.id),config)||{}
          return {
            id:row.id,role:row.author_role,visibility:row.visibility,mine:row.author_account_id===actor.id,
            text:row.visibility==='participants'?redactRelayContacts(body.text||''):(body.text||''),
            privateAssetId:row.visibility==='participants'&&typeof body.assetId==='string'?body.assetId:null,
            createdAt:row.created_at,
          }
        })
        const assetIds=[...new Set(rendered.map(row=>row.privateAssetId).filter(Boolean))]
        const media=assetIds.length?(await db.query(`select id,message_id,mime from app.practitioner_request_media
          where request_id=$1 and id=any($2::uuid[]) and status='ready'`,
          [scope.requestId,assetIds])).rows:[]
        const allowed=new Map(media.map(row=>[row.id,row]))
        return {requestId:scope.requestId,actorRole:scope.actorRole,canReply:scope.canReply,canNote:scope.canNote,
          unseenCount:unseen,
          messages:rendered.map(({privateAssetId,...row})=>{
            const asset=allowed.get(privateAssetId)
            return {...row,attachment:asset?.message_id===row.id
              ?{id:asset.id,kind:'audio',mime:asset.mime}:null}
          }),nextCursor}
      })
    },
    async markSeen(actor,input){
      requireUUID(input?.requestId)
      requireUUID(input?.messageId)
      return transaction(config,actor,async db=>{
        const scope=await participant(db,actor,input.requestId)
        // Only an actual other participant's shared message can advance the marker.
        // Never acknowledge private practitioner notes or a future message.
        const shown=(await db.query(
          `select id,created_at from app.practitioner_request_messages
            where id=$1 and request_id=$2 and visibility='participants'
              and author_account_id<>$3 limit 1`,
          [input.messageId,scope.requestId,actor.id])).rows[0]
        if(!shown)throw new AppError('NOT_FOUND',404)
        await db.query(
          `insert into app.practitioner_request_reads
             (request_id,account_id,last_seen_at) values ($1,$2,$3)
           on conflict (request_id,account_id) do update set
             last_seen_at=greatest(app.practitioner_request_reads.last_seen_at,excluded.last_seen_at),
             updated_at=now()`,
          [scope.requestId,actor.id,shown.created_at])
        return {requestId:scope.requestId,viewed:true}
      })
    },
    async send(actor,input){
      requireUUID(input?.requestId);requireUUID(input?.operationId)
      const assetId=input.assetId||null
      if(assetId!==null)requireUUID(assetId)
      const text=assetId&&typeof input.text==='string'&&!input.text.trim()
        ?'':validateBody(input.text)
      const visibility=input.visibility||'participants'
      if(assetId&&visibility!=='participants')throw new AppError('INVALID_MESSAGE',400)
      if(!['participants','practitioner_note'].includes(visibility))
        throw new AppError('INVALID_MESSAGE',400)
      if(visibility==='practitioner_note'&&text.length>800)
        throw new AppError('INVALID_MESSAGE',400)
      return transaction(config,actor,async db=>{
        // Serialize sends for this exact request before duplicate and quota
        // checks. Shared locks let concurrent tabs both consume the last slot.
        const scope=await participant(db,actor,input.requestId,{lock:true})
        // Duplicate POST reuses its immutable record and never creates another message.
        if(visibility==='practitioner_note'&&!scope.canNote)
          throw new AppError('NOT_FOUND',404)
        const original=(await db.query(
          `select id,request_id,author_account_id,author_role,visibility,body_ciphertext,created_at
            from app.practitioner_request_messages where id=$1`,[input.operationId])).rows[0]
        if(original){
          const old=openSealed(original.body_ciphertext,bodyContext(scope.requester,original.id),config)||{}
          if(original.request_id!==scope.requestId||original.author_account_id!==actor.id||
              original.author_role!==scope.actorRole||original.visibility!==visibility||
              old.text!==text||(old.assetId||null)!==assetId)
            throw new AppError('CONFLICT',409)
          return {id:original.id,requestId:scope.requestId,saved:true,duplicate:true,
            createdAt:original.created_at}
        }
        if(visibility==='participants'&&!scope.canReply)
          throw new AppError('CONVERSATION_CLOSED',409)
        // Only a new participant-visible practitioner reply can request a private arrival notice.
        const quota=(await db.query(
          `select count(*)::int as total
            from app.practitioner_request_messages
            where request_id=$1 and author_account_id=$2
            and created_at>now()-interval '24 hours'`,
          [scope.requestId,actor.id])).rows[0]?.total||0
        if(quota>=40)throw new AppError('PRACTICE_MESSAGE_DAILY_LIMIT',429)
        if(assetId){
          const media=(await db.query(`select id from app.practitioner_request_media
            where id=$1 and request_id=$2 and uploader_account_id=$3
              and status='ready' and message_id is null
              and created_at>now()-interval '7 days' for update`,
            [assetId,scope.requestId,actor.id])).rows[0]
          if(!media)throw new AppError('ATTACHMENT_NOT_READY',409)
        }
        const cipher=seal({text,...(assetId?{assetId}:{})},
          bodyContext(scope.requester,input.operationId),config)
        try {
          await db.query(
            `insert into app.practitioner_request_messages
             (id,request_id,author_account_id,author_role,visibility,body_ciphertext)
             values($1,$2,$3,$4,$5,$6)`,
            [input.operationId,scope.requestId,actor.id,scope.actorRole,visibility,cipher])
        }catch(error){
          if(error?.code==='23505'||error?.code==='23503')
            throw new AppError('CONFLICT',409)
          throw error
        }
        if(assetId){
          const linked=await db.query(`update app.practitioner_request_media
            set message_id=$1 where id=$2 and request_id=$3
              and uploader_account_id=$4 and status='ready' and message_id is null`,
            [input.operationId,assetId,scope.requestId,actor.id])
          if(linked.rowCount!==1)throw new AppError('ATTACHMENT_NOT_READY',409)
        }
        return {id:input.operationId,requestId:scope.requestId,saved:true,duplicate:false,
          ...(scope.actorRole==='practitioner'&&visibility==='participants'?{notifyClient:true}:{}),
          ...(scope.actorRole==='client'&&visibility==='participants'?{notifyMaster:true}:{})}
      })
    }
  }
}

// Reuse the exact existing server-side participant check for media access.
export {participant as authorizedRequestParticipant}
