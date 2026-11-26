import 'server-only'
import {transaction} from './database.js'
import {operationHash} from './crypto.js'
import {AppError,onlyKeys,requireUUID,revision} from '../assessments/contracts.js'
import {dailyIntentionWrite,dailyIntentionPage,resolveDailyIntention,carryoverActions} from './daybook-daily-contract.mjs'
import {dailyDayKey,sealDailyIntention,readDailyIntention} from './daybook-daily-storage.mjs'
const columns='id,day_key,payload_ciphertext,revision,created_at,updated_at'
const view=(actor,row,config)=>({...readDailyIntention(actor.id,row,config),createdAt:row.created_at,updatedAt:row.updated_at})
async function active(db,actor,lock=false){
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])).rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
}
async function rowFor(db,actor,id){
 return (await db.query(`select ${columns} from app_private.daybook_daily_intentions where account_id=$1 and id=$2`,[actor.id,id])).rows[0]
}
async function dayFor(db,actor,localDay,config){
 return (await db.query(`select ${columns} from app_private.daybook_daily_intentions where account_id=$1 and day_key=$2`,[actor.id,dailyDayKey(actor.id,localDay,config)])).rows[0]
}
async function receipt(db,actor,input,operation,fingerprint){
 const found=(await db.query('select intention_id,operation,revision,request_fingerprint from app_private.daybook_daily_receipts where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
 if(found&&(found.intention_id!==input.id||found.operation!==operation||found.request_fingerprint!==fingerprint))throw new AppError('DAYBOOK_IDEMPOTENCY_CONFLICT',409)
 return found
}
async function recordReceipt(db,actor,input,operation,fingerprint,nextRevision){
 await db.query('insert into app_private.daybook_daily_receipts(account_id,operation_id,intention_id,request_fingerprint,operation,revision) values($1,$2,$3,$4,$5,$6)',[actor.id,input.operationId,input.id,fingerprint,operation,nextRevision])
}
async function canonicalSelection(db,actor,input){
 // Match the existing report import's goal-before-action lock order.
 const goals=(await db.query('select id,status from app_private.coaching_goals where account_id=$1 and (id=$2::uuid or id in (select goal_id from app_private.coaching_action_items where account_id=$1 and id=any($3::uuid[]))) order by id for share',[actor.id,input.weeklyGoalId,input.actionIds])).rows
 const actions=(await db.query('select id,goal_id as "goalId",status,client_confirmed_at as "clientConfirmedAt" from app_private.coaching_action_items where account_id=$1 and id=any($2::uuid[]) order by id for share',[actor.id,input.actionIds])).rows
 return {goals,actions}
}
export function createDailyIntentionRepository(config){
 return {
  async list(actor,raw={}){
   const {limit,before}=dailyIntentionPage(raw)
   return transaction(config,actor,async db=>{
    await active(db,actor)
    const cursor=before?await rowFor(db,actor,before):null
    if(before&&!cursor)throw new AppError('DAYBOOK_CURSOR_UNAVAILABLE',409)
    const rows=(await db.query(`select ${columns} from app_private.daybook_daily_intentions where account_id=$1`+
     (cursor?' and (created_at,id)<($3::timestamptz,$4::uuid)':'')+' order by created_at desc,id desc limit $2',
     cursor?[actor.id,limit+1,cursor.created_at,cursor.id]:[actor.id,limit+1])).rows
    const page=rows.slice(0,limit)
    return {intentions:page.map(row=>view(actor,row,config)),nextCursor:rows.length>limit?page.at(-1).id:null}
   })
  },
  async read(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{await active(db,actor);const row=await rowFor(db,actor,id);if(!row)throw new AppError('NOT_FOUND',404);return {intention:view(actor,row,config)}})
  },
  async byDay(actor,localDay){
   dailyDayKey(actor.id,localDay,config)
   return transaction(config,actor,async db=>{await active(db,actor);const row=await dayFor(db,actor,localDay,config);return {intention:row?view(actor,row,config):null}})
  },
  async save(actor,raw){
   const input=dailyIntentionWrite(raw),fingerprint=operationHash({operation:'save',input},config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    const prior=await receipt(db,actor,input,'save',fingerprint)
    const existing=await rowFor(db,actor,input.id)
    if(prior){
     if(!existing)throw new AppError('DAYBOOK_INTENTION_DELETED',410)
     if(existing.revision!==prior.revision)throw new AppError('DAYBOOK_REVISION_ADVANCED',409)
     return {saved:true,replayed:true,intention:view(actor,existing,config)}
    }
    if((await db.query("select 1 from app_private.daybook_daily_receipts where account_id=$1 and intention_id=$2 and operation='delete' limit 1",[actor.id,input.id])).rows.length)throw new AppError('DAYBOOK_INTENTION_DELETED',410)
    if(existing?existing.revision!==input.revision:input.revision!==0)throw new AppError('DAYBOOK_REVISION_CONFLICT',409)
    const previous=existing?view(actor,existing,config):null
    if(previous&&previous.localDay!==input.localDay)throw new AppError('DAYBOOK_DAY_IMMUTABLE',409)
    const plan=await canonicalSelection(db,actor,input)
    resolveDailyIntention(input,plan,previous)
    const retained=previous?.carryFromDay===input.carryFromDay?new Set(previous.carriedActionIds):new Set()
    const carried=input.carriedActionIds.filter(id=>!retained.has(id))
    if(carried.length){
     const sourceRow=await dayFor(db,actor,input.carryFromDay,config)
     const source=sourceRow?view(actor,sourceRow,config):null
     const eligible=new Set(carryoverActions(source,plan))
     if(!source||carried.some(id=>!eligible.has(id)))throw new AppError('DAYBOOK_CARRYOVER_UNAVAILABLE',409)
    }
    const ciphertext=sealDailyIntention(actor.id,input,input.revision+1,config),key=dailyDayKey(actor.id,input.localDay,config)
    const row=input.revision===0?
     (await db.query(`insert into app_private.daybook_daily_intentions(id,account_id,day_key,payload_ciphertext,revision) values($1,$2,$3,$4,1) on conflict do nothing returning ${columns}`,[input.id,actor.id,key,ciphertext])).rows[0]:
     (await db.query(`update app_private.daybook_daily_intentions set payload_ciphertext=$3,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$4 returning ${columns}`,[input.id,actor.id,ciphertext,input.revision])).rows[0]
    if(!row)throw new AppError('DAYBOOK_REVISION_CONFLICT',409)
    await recordReceipt(db,actor,input,'save',fingerprint,row.revision)
    return {saved:true,replayed:false,intention:view(actor,row,config)}
   })
  },
  async remove(actor,raw){
   onlyKeys(raw,['id','revision','operationId','confirmed'])
   if(raw.confirmed!==true)throw new AppError('DAYBOOK_CONFIRMATION_REQUIRED')
   const input={id:requireUUID(raw.id),revision:revision(raw.revision),operationId:requireUUID(raw.operationId),confirmed:true}
   if(input.revision===0)throw new AppError('INVALID_REVISION')
   const fingerprint=operationHash({operation:'delete',input},config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    if(await receipt(db,actor,input,'delete',fingerprint))return {id:input.id,deleted:true,replayed:true}
    if(!(await db.query('delete from app_private.daybook_daily_intentions where account_id=$1 and id=$2 and revision=$3 returning id',[actor.id,input.id,input.revision])).rows.length)throw new AppError('DAYBOOK_REVISION_CONFLICT',409)
    await recordReceipt(db,actor,input,'delete',fingerprint,input.revision)
    return {id:input.id,deleted:true,replayed:false}
   })
  },
 }
}
