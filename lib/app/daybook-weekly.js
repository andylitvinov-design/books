import 'server-only'
import {transaction} from './database.js'
import {openSealed,operationHash} from './crypto.js'
import {AppError,onlyKeys,requireUUID,requireTimezone,revision} from '../assessments/contracts.js'
import {weeklyReviewWrite,weeklyDates,resolveWeeklySources} from './daybook-weekly-contract.mjs'
import {weeklyReviewKey,sealWeeklyReview,readWeeklyReview} from './daybook-weekly-storage.mjs'
import {dailyDayKey,readDailyIntention} from './daybook-daily-storage.mjs'
import {dailyIntentionPage} from './daybook-daily-contract.mjs'
import {journalWrite} from './daybook-journal-contract.mjs'
const columns='id,week_key,payload_ciphertext,revision,created_at,updated_at'
const view=(actor,row,config)=>({...readWeeklyReview(actor.id,row,config),createdAt:row.created_at,updatedAt:row.updated_at})
const changed=()=>{throw new AppError('WEEKLY_SOURCE_CHANGED',409)}
async function active(db,actor,lock=false){
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])).rowCount)throw new AppError('ACCOUNT_REQUIRED',401)
}
async function rowFor(db,actor,id){return (await db.query(`select ${columns} from app_private.daybook_weekly_reviews where account_id=$1 and id=$2`,[actor.id,id])).rows[0]}
async function receipt(db,actor,input,operation,fingerprint){
 const row=(await db.query('select review_id,operation,revision,request_fingerprint from app_private.daybook_weekly_receipts where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
 if(row&&(row.review_id!==input.id||row.operation!==operation||row.request_fingerprint!==fingerprint))throw new AppError('WEEKLY_IDEMPOTENCY_CONFLICT',409)
 return row
}
async function recordReceipt(db,actor,input,operation,fingerprint,nextRevision){
 await db.query('insert into app_private.daybook_weekly_receipts(account_id,operation_id,review_id,request_fingerprint,operation,revision) values($1,$2,$3,$4,$5,$6)',[actor.id,input.operationId,input.id,fingerprint,operation,nextRevision])
}
function ids(value,max){
 if(!Array.isArray(value)||value.length>max||new Set(value).size!==value.length)throw new AppError('INVALID_WEEKLY_SOURCES')
 return value.map(requireUUID)
}
function previewInput(raw){
 onlyKeys(raw,['weekStart','timezone','dayIds','journalIds','nextGoalId']);weeklyDates(raw.weekStart)
 return {weekStart:raw.weekStart,timezone:requireTimezone(raw.timezone),dayIds:raw.dayIds===null?null:ids(raw.dayIds,7),journalIds:ids(raw.journalIds,20),nextGoalId:raw.nextGoalId===null?null:requireUUID(raw.nextGoalId)}
}
async function sourcesFor(db,actor,input,config,lock=false){
 const dates=weeklyDates(input.weekStart),keys=dates.map(day=>dailyDayKey(actor.id,day,config)),share=lock?' for share':''
 const rows=(await db.query('select id,revision,day_key,payload_ciphertext from app_private.daybook_daily_intentions where account_id=$1 and day_key=any($2::text[]) and ($3::uuid[] is null or id=any($3::uuid[])) order by id'+share,[actor.id,keys,input.dayIds])).rows
 if(input.dayIds!==null&&input.dayIds.length!==rows.length)changed()
 const days=rows.map(row=>{const day=readDailyIntention(actor.id,row,config);return {id:day.id,revision:day.revision,localDay:day.localDay,timezone:day.timezone,actionIds:day.actionIds}})
 const notes=(await db.query('select id,revision,payload_ciphertext from app_private.daybook_entries where account_id=$1 and id=any($2::uuid[]) order by id'+share,[actor.id,input.journalIds])).rows
 if(notes.length!==input.journalIds.length)changed()
 const journal=notes.map(row=>{
  const value=journalWrite({...openSealed(row.payload_ciphertext,{accountId:actor.id,recordId:row.id,field:'daybook.entry'},config),id:row.id,operationId:row.id,revision:row.revision})
  if(!dates.includes(value.localDay))changed()
  return {id:row.id,revision:row.revision,localDay:value.localDay}
 })
 const actionIds=[...new Set(days.flatMap(row=>row.actionIds))].sort()
 // Preserve canonical goal-before-action order; every save also holds the account lock.
 const goals=(await db.query('select id,status,revision from app_private.coaching_goals where account_id=$1 and (id=$2::uuid or id in (select goal_id from app_private.coaching_action_items where account_id=$1 and id=any($3::uuid[]))) order by id'+share,[actor.id,input.nextGoalId,actionIds])).rows
 const actions=(await db.query('select id,revision,status,completed_at as "completedAt" from app_private.coaching_action_items where account_id=$1 and id=any($2::uuid[]) order by id'+share,[actor.id,actionIds])).rows
 return {days,journal,goals,actions,actionIds}
}
export function createWeeklyReviewRepository(config){
 return {
  async preview(actor,raw){
   const input=previewInput(raw)
   return transaction(config,actor,async db=>{
    await active(db,actor)
    const data=await sourcesFor(db,actor,input,config),actionMap=new Map(data.actions.map(row=>[row.id,row]))
    const sourceDays=data.days.map(({id,revision})=>({id,revision})),sourceJournal=data.journal.map(({id,revision})=>({id,revision})),sourceActions=data.actionIds.map(id=>({id,revision:actionMap.get(id)?.revision??null}))
    // Resolve with a validation-only opaque identity; never persisted or returned as a review ID.
    const draft={id:actor.id,operationId:actor.id,revision:0,weekStart:input.weekStart,timezone:input.timezone,sourceDays,sourceJournal,sourceActions,nextGoalId:input.nextGoalId,wins:'',learning:'',obstacles:'',adjustment:'',nextWeekFocus:'',confirmed:true}
    return {weekStart:input.weekStart,timezone:input.timezone,sourceDays,sourceJournal,sourceActions,nextGoalId:input.nextGoalId,sources:resolveWeeklySources(draft,data)}
   })
  },
  async read(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{await active(db,actor);const row=await rowFor(db,actor,id);if(!row)throw new AppError('NOT_FOUND',404);return {review:view(actor,row,config)}})
  },
  async byWeek(actor,weekStart){
   const key=weeklyReviewKey(actor.id,weekStart,config)
   return transaction(config,actor,async db=>{await active(db,actor);const row=(await db.query(`select ${columns} from app_private.daybook_weekly_reviews where account_id=$1 and week_key=$2`,[actor.id,key])).rows[0];return {review:row?view(actor,row,config):null}})
  },
  async list(actor,raw={}){
   const {limit,before}=dailyIntentionPage(raw)
   return transaction(config,actor,async db=>{
    await active(db,actor);const cursor=before?await rowFor(db,actor,before):null
    if(before&&!cursor)throw new AppError('WEEKLY_CURSOR_UNAVAILABLE',409)
    const rows=(await db.query(`select ${columns} from app_private.daybook_weekly_reviews where account_id=$1`+(cursor?' and (created_at,id)<($3::timestamptz,$4::uuid)':'')+' order by created_at desc,id desc limit $2',cursor?[actor.id,limit+1,cursor.created_at,cursor.id]:[actor.id,limit+1])).rows
    const page=rows.slice(0,limit);return {reviews:page.map(row=>view(actor,row,config)),nextCursor:rows.length>limit?page.at(-1).id:null}
   })
  },
  async save(actor,raw){
   const input=weeklyReviewWrite(raw),fingerprint=operationHash({operation:'save',input},config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    const prior=await receipt(db,actor,input,'save',fingerprint),existing=await rowFor(db,actor,input.id)
    if(prior){if(!existing)throw new AppError('WEEKLY_REVIEW_DELETED',410);if(existing.revision!==prior.revision)throw new AppError('WEEKLY_REVISION_ADVANCED',409);return {saved:true,replayed:true,review:view(actor,existing,config)}}
    if((await db.query("select 1 from app_private.daybook_weekly_receipts where account_id=$1 and review_id=$2 and operation='delete' limit 1",[actor.id,input.id])).rowCount)throw new AppError('WEEKLY_REVIEW_DELETED',410)
    if(existing?existing.revision!==input.revision:input.revision!==0)throw new AppError('WEEKLY_REVISION_CONFLICT',409)
    if(existing&&view(actor,existing,config).weekStart!==input.weekStart)throw new AppError('WEEKLY_WEEK_IMMUTABLE',409)
    const data=await sourcesFor(db,actor,{weekStart:input.weekStart,dayIds:input.sourceDays.map(row=>row.id),journalIds:input.sourceJournal.map(row=>row.id),nextGoalId:input.nextGoalId},config,true)
    const snapshot=resolveWeeklySources(input,data),ciphertext=sealWeeklyReview(actor.id,input,snapshot,input.revision+1,config),key=weeklyReviewKey(actor.id,input.weekStart,config)
    const row=input.revision===0?(await db.query(`insert into app_private.daybook_weekly_reviews(id,account_id,week_key,payload_ciphertext,revision) values($1,$2,$3,$4,1) on conflict do nothing returning ${columns}`,[input.id,actor.id,key,ciphertext])).rows[0]:
     (await db.query(`update app_private.daybook_weekly_reviews set payload_ciphertext=$3,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$4 returning ${columns}`,[input.id,actor.id,ciphertext,input.revision])).rows[0]
    if(!row)throw new AppError('WEEKLY_REVISION_CONFLICT',409)
    await recordReceipt(db,actor,input,'save',fingerprint,row.revision)
    return {saved:true,replayed:false,review:view(actor,row,config)}
   })
  },
  async remove(actor,raw){
   onlyKeys(raw,['id','revision','operationId','confirmed'])
   if(raw.confirmed!==true)throw new AppError('WEEKLY_CONFIRMATION_REQUIRED')
   const input={id:requireUUID(raw.id),operationId:requireUUID(raw.operationId),revision:revision(raw.revision),confirmed:true}
   if(input.revision===0)throw new AppError('INVALID_REVISION')
   const fingerprint=operationHash({operation:'delete',input},config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    if(await receipt(db,actor,input,'delete',fingerprint))return {id:input.id,deleted:true,replayed:true}
    if(!(await db.query('delete from app_private.daybook_weekly_reviews where account_id=$1 and id=$2 and revision=$3 returning id',[actor.id,input.id,input.revision])).rowCount)throw new AppError('WEEKLY_REVISION_CONFLICT',409)
    await recordReceipt(db,actor,input,'delete',fingerprint,input.revision)
    return {id:input.id,deleted:true,replayed:false}
   })
  },
 }
}
