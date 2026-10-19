import 'server-only'
import { transaction } from '../app/database.js'
import { seal, openSealed } from '../app/crypto.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { validateMessageText } from '../crm/messenger-policy.js'
import { messengerCursor, parseMessengerCursor } from '../crm/messenger-pagination.js'

const bodyContext=(accountId,id)=>({accountId,recordId:id,field:'practice.request.message'})
const admittedStatuses=Object.freeze(['approved','submitted','changes_requested'])
const writableStatuses=Object.freeze(['requested','contacted'])

function validateBody(raw) {
  try {
    const text=validateMessageText(raw)
    if(text.length>1200)throw new Error('INVALID_MESSAGE')
    return text
  }catch(error){
    throw new AppError(error?.message==='PRIVATE_CONTENT_BLOCKED'?'PRIVATE_CONTENT_BLOCKED':'INVALID_MESSAGE',400)
  }
}
async function participant(db,actor,requestId) {
  requireUUID(requestId)
  const row=(await db.query(
    `select r.id,r.account_id,r.recipient_practitioner_id,r.status,
      p.trusted_auth_user_id as practitioner_account_id,p.active as practitioner_active,
      p.status as practitioner_status
      from app.consultation_requests r
      join app.practitioners p on p.id=r.recipient_practitioner_id
      where r.id=$1 limit 1`,
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
    canReply:writableStatuses.includes(row.status),
  }
}
export function createPractitionerClientMessages(config) {
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
        const nextCursor=fetched.length>40
          ?messengerCursor(rows[rows.length-1].cursor_at,rows[rows.length-1].id):null
        return {requestId:scope.requestId,actorRole:scope.actorRole,canReply:scope.canReply,canNote:scope.canNote,
          messages:rows.reverse().map(row=>({
            id:row.id,role:row.author_role,visibility:row.visibility,mine:row.author_account_id===actor.id,
            text:openSealed(row.body_ciphertext,bodyContext(scope.requester,row.id),config)?.text||'',
            createdAt:row.created_at,
          })),nextCursor}
      })
    },
    async send(actor,input){
      requireUUID(input?.requestId);requireUUID(input?.operationId)
      const text=validateBody(input.text)
      const visibility=input.visibility||'participants'
      if(!['participants','practitioner_note'].includes(visibility))
        throw new AppError('INVALID_MESSAGE',400)
      if(visibility==='practitioner_note'&&text.length>800)
        throw new AppError('INVALID_MESSAGE',400)
      return transaction(config,actor,async db=>{
        const scope=await participant(db,actor,input.requestId)
        // Duplicate POST reuses its immutable record and never creates another message.
        if(visibility==='practitioner_note'&&!scope.canNote)
          throw new AppError('NOT_FOUND',404)
        const original=(await db.query(
          `select id,request_id,author_account_id,author_role,visibility,body_ciphertext,created_at
            from app.practitioner_request_messages where id=$1`,[input.operationId])).rows[0]
        if(original){
          const old=openSealed(original.body_ciphertext,bodyContext(scope.requester,original.id),config)?.text
          if(original.request_id!==scope.requestId||original.author_account_id!==actor.id||
              original.author_role!==scope.actorRole||original.visibility!==visibility||old!==text)
            throw new AppError('CONFLICT',409)
          return {id:original.id,requestId:scope.requestId,saved:true,duplicate:true,
            createdAt:original.created_at}
        }
        if(visibility==='participants'&&!scope.canReply)
          throw new AppError('CONVERSATION_CLOSED',409)
        // No scheduled dispatch, no provider API, no attachment or clinical data.
        const quota=(await db.query(
          `select count(*)::int as total
            from app.practitioner_request_messages
            where request_id=$1 and author_account_id=$2
            and created_at>now()-interval '24 hours'`,
          [scope.requestId,actor.id])).rows[0]?.total||0
        if(quota>=40)throw new AppError('PRACTICE_MESSAGE_DAILY_LIMIT',429)
        const cipher=seal({text},bodyContext(scope.requester,input.operationId),config)
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
        return {id:input.operationId,requestId:scope.requestId,saved:true,duplicate:false}
      })
    }
  }
}
