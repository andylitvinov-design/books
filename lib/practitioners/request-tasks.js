import 'server-only'
import {transaction} from '../app/database.js'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {PRACTITIONER_TASK_LIMIT_PER_REQUEST,taskKindAllowed,validTaskDay} from './task-policy.js'

const view=row=>({
  id:row.id,requestId:row.request_id,kind:row.kind,dueOn:row.due_on,
  status:row.status,revision:row.revision,
  createdAt:row.created_at,completedAt:row.completed_at,
})
async function ownedRequest(db,actor,requestId){
  requireUUID(requestId)
  const exists=(await db.query(
    `select r.id from app.consultation_requests r
     join app.practitioners p on p.id=r.recipient_practitioner_id
     where r.id=$1 and p.trusted_auth_user_id=$2 and p.active
       and p.status in ('approved','submitted','changes_requested') limit 1`,
    [requestId,actor.id])).rows[0]
  if(!exists)throw new AppError('NOT_FOUND',404)
}
export function createPractitionerRequestTaskStore(config){
  return {
    async list(actor,requestId){
      return transaction(config,actor,async db=>{
        await ownedRequest(db,actor,requestId)
        const rows=(await db.query(
          `select id,request_id,kind,due_on::text as due_on,status,revision,
              created_at,completed_at
             from app.practitioner_request_tasks
             where request_id=$1 and practitioner_account_id=$2
             order by case when status='open' then 0 else 1 end,
               due_on asc,created_at desc,id desc limit 80`,
          [requestId,actor.id])).rows
        return {requestId,tasks:rows.map(view)}
      })
    },
    async create(actor,input){
      requireUUID(input?.requestId);requireUUID(input?.taskId)
      if(!taskKindAllowed(input.kind)||!validTaskDay(input.dueOn))
        throw new AppError('INVALID_TASK',400)
      return transaction(config,actor,async db=>{
        await ownedRequest(db,actor,input.requestId)
        // One stable UUID describes one immutable creation intent, including the due date.
        const old=(await db.query(
          `select id,request_id,kind,due_on::text as due_on,status,revision,
            created_at,completed_at
            from app.practitioner_request_tasks
            where id=$1 and practitioner_account_id=$2`,[input.taskId,actor.id])).rows[0]
        if(old){
          if(old.request_id!==input.requestId||old.kind!==input.kind||
             old.due_on!==input.dueOn)throw new AppError('CONFLICT',409)
          return {...view(old),duplicate:true}
        }
        const n=(await db.query(
          `select count(*)::int as n from app.practitioner_request_tasks
             where request_id=$1 and practitioner_account_id=$2 and status='open'`,
          [input.requestId,actor.id])).rows[0]?.n||0
        if(n>=PRACTITIONER_TASK_LIMIT_PER_REQUEST)
          throw new AppError('TASK_OPEN_LIMIT',429)
        try{
          const row=(await db.query(
            `insert into app.practitioner_request_tasks
               (id,request_id,practitioner_account_id,kind,due_on)
             values ($1,$2,$3,$4,$5::date)
             returning id,request_id,kind,due_on::text as due_on,status,revision,
               created_at,completed_at`,
            [input.taskId,input.requestId,actor.id,input.kind,input.dueOn])).rows[0]
          return {...view(row),duplicate:false}
        }catch(error){
          if(error?.code==='23505'||error?.code==='23503')throw new AppError('CONFLICT',409)
          throw error
        }
      })
    },
    async change(actor,input){
      requireUUID(input?.requestId);requireUUID(input?.taskId)
      if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0||
         !['complete','reopen','reschedule'].includes(input?.action)||
         (input.action==='reschedule'&&!validTaskDay(input?.dueOn)))
        throw new AppError('INVALID_TASK',400)
      return transaction(config,actor,async db=>{
        await ownedRequest(db,actor,input.requestId)
        const old=(await db.query(
          `select id,request_id,kind,due_on::text as due_on,status,revision
             from app.practitioner_request_tasks
             where id=$1 and request_id=$2 and practitioner_account_id=$3 for update`,
          [input.taskId,input.requestId,actor.id])).rows[0]
        if(!old)throw new AppError('NOT_FOUND',404)
        if(old.revision!==input.expectedRevision)throw new AppError('CONFLICT',409)
        if(input.action==='complete'&&old.status!=='open'||
           input.action==='reopen'&&old.status!=='done'||
           input.action==='reschedule'&&old.status!=='open')
          throw new AppError('INVALID_TASK_STATE',409)
        const update=input.action==='complete'
          ?`status='done',completed_at=now()`
          :input.action==='reopen'
            ?`status='open',completed_at=null`
            :`due_on=$4::date`
        const params=input.action==='reschedule'
          ?[input.taskId,input.requestId,actor.id,input.dueOn]
          :[input.taskId,input.requestId,actor.id]
        const row=(await db.query(
          `update app.practitioner_request_tasks set ${update},revision=revision+1
            where id=$1 and request_id=$2 and practitioner_account_id=$3
            returning id,request_id,kind,due_on::text as due_on,status,
              revision,created_at,completed_at`,
          params)).rows[0]
        if(!row)throw new AppError('NOT_FOUND',404)
        return view(row)
      })
    },
  }
}
