import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {personalGoalWrite,personalGoalDelete,goalTransition} from './daybook-personal-goal-contract.mjs'
import {goalSnapshot,readGoalSnapshot} from './daybook-goal-snapshot.mjs'
const auditContext=(actor,id)=>({accountId:actor.id,recordId:id,field:'coaching.life_plan_change'})
const goalContext=(actor,id,field)=>({accountId:actor.id,recordId:id,field:'coaching.life_plan.goal.'+field})
async function active(db,actor,lock=false){
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])).rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
}
async function rowFor(db,actor,id){
 return (await db.query("select g.*,to_char(g.target_date,'YYYY-MM-DD') as target_date,a.area_key,a.plan_id from app_private.coaching_goals g join app_private.coaching_life_plan_areas a on a.id=g.area_id and a.account_id=g.account_id where g.id=$1 and g.account_id=$2",[id,actor.id])).rows[0]
}
async function view(db,actor,row,config){
 const audit=(await db.query("select id,snapshot_ciphertext from app_private.coaching_life_plan_changes where account_id=$1 and entity_kind='goal' and entity_id=$2 and to_revision=$3 order by created_at desc,id desc limit 1",[actor.id,row.id,row.revision])).rows[0]
 const snapshot=audit?openSealed(audit.snapshot_ciphertext,auditContext(actor,audit.id),config):null
 const details=readGoalSnapshot(snapshot,{id:row.id,revision:row.revision})
 const title=openSealed(row.title_ciphertext,goalContext(actor,row.id,'title'),config)
 const desiredOutcome=openSealed(row.desired_outcome_ciphertext,goalContext(actor,row.id,'desired_outcome'),config)
 if(details&&(details.title!==title||details.desiredOutcome!==desiredOutcome||details.status!==row.status||details.areaKey!==row.area_key||details.targetDate!==row.target_date))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
 // Legacy records remain usable; unknown extended details are explicitly absent.
 return {id:row.id,areaKey:row.area_key,title,desiredOutcome,status:row.status,targetDate:row.target_date,revision:row.revision,details}
}
export function createPersonalGoalRepository(config){
 return {
  async read(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{
    await active(db,actor)
    const row=await rowFor(db,actor,id)
    if(!row)throw new AppError('NOT_FOUND',404)
    const result=await view(db,actor,row,config)
    return {goal:result.details?{...result.details,createdAt:row.created_at,updatedAt:row.updated_at}:result}
   })
  },
  async save(actor,raw){
   const input=personalGoalWrite(raw),fingerprint=operationHash(input,config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    if((await db.query('select 1 from app_private.coaching_erased_goal_receipts where account_id=$1 and goal_id=$2',[actor.id,input.id])).rows.length)throw new AppError('GOAL_ERASED',410)
    const receipt=(await db.query('select id,entity_kind,entity_id,to_revision,snapshot_ciphertext from app_private.coaching_life_plan_changes where id=$1 and account_id=$2',[input.operationId,actor.id])).rows[0]
    if(receipt){
     const snapshot=openSealed(receipt.snapshot_ciphertext,auditContext(actor,receipt.id),config)
     if(receipt.entity_kind!=='goal'||receipt.entity_id!==input.id||snapshot?.kind!=='personal-goal-v1'||snapshot.requestFingerprint!==fingerprint)throw new AppError('GOAL_IDEMPOTENCY_CONFLICT',409)
     const row=await rowFor(db,actor,input.id)
     if(!row)throw new AppError('GOAL_UNAVAILABLE',410)
     if(row.revision!==receipt.to_revision)throw new AppError('GOAL_REVISION_ADVANCED',409)
     return {goal:{...(await view(db,actor,row,config)).details,createdAt:row.created_at,updatedAt:row.updated_at},saved:true,replayed:true}
    }
    const existing=await rowFor(db,actor,input.id)
    if(existing?existing.revision!==input.revision:input.revision!==0)throw new AppError('GOAL_REVISION_CONFLICT',409)
    goalTransition(existing?.status??null,input.status,input.confirmed)
    await db.query('insert into app_private.coaching_life_plans(account_id) values($1) on conflict(account_id) do nothing',[actor.id])
    const plan=(await db.query("select id from app_private.coaching_life_plans where account_id=$1 and status='active' for update",[actor.id])).rows[0]
    if(!plan)throw new AppError('GOAL_PLAN_UNAVAILABLE',409)
    await db.query('insert into app_private.coaching_life_plan_areas(plan_id,account_id,area_key) values($1,$2,$3) on conflict(plan_id,area_key) do nothing',[plan.id,actor.id,input.areaKey])
    const area=(await db.query('select id from app_private.coaching_life_plan_areas where plan_id=$1 and account_id=$2 and area_key=$3',[plan.id,actor.id,input.areaKey])).rows[0]
    if(!area)throw new AppError('GOAL_PLAN_UNAVAILABLE',409)
    const title=seal(input.title,goalContext(actor,input.id,'title'),config),outcome=seal(input.desiredOutcome,goalContext(actor,input.id,'desired_outcome'),config)
    let row
    if(existing){
     row=(await db.query('update app_private.coaching_goals set area_id=$3,title_ciphertext=$4,desired_outcome_ciphertext=$5,status=$6,target_date=$7,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$8 returning id,revision',[input.id,actor.id,area.id,title,outcome,input.status,input.targetDate,input.revision])).rows[0]
    }else{
     row=(await db.query('insert into app_private.coaching_goals(id,area_id,account_id,title_ciphertext,desired_outcome_ciphertext,status,target_date,revision,idempotency_key) values($1,$2,$3,$4,$5,$6,$7,1,$1) on conflict do nothing returning id,revision',[input.id,area.id,actor.id,title,outcome,input.status,input.targetDate])).rows[0]
    }
    if(!row)throw new AppError('GOAL_REVISION_CONFLICT',409)
    const snapshot=goalSnapshot(input,{revision:row.revision,requestFingerprint:fingerprint,confirmedAt:new Date().toISOString()})
    await db.query("insert into app_private.coaching_life_plan_changes(id,plan_id,account_id,entity_kind,entity_id,from_revision,to_revision,change_kind,snapshot_ciphertext,changed_by,actor_account_id) values($1,$2,$3,'goal',$4,$5,$6,$7,$8,'client',$3)",[input.operationId,plan.id,actor.id,input.id,existing?.revision??null,row.revision,existing?(existing.status!==input.status?'status_changed':'updated'):'created',seal(snapshot,auditContext(actor,input.operationId),config)])
    await db.query('update app_private.coaching_life_plans set plan_version=plan_version+1 where id=$1 and account_id=$2',[plan.id,actor.id])
    const saved=await rowFor(db,actor,input.id),result=await view(db,actor,saved,config)
    return {goal:{...result.details,createdAt:saved.created_at,updatedAt:saved.updated_at},saved:true,replayed:false}
   })
  },
  async remove(actor,raw){
   const input=personalGoalDelete(raw)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    await db.query('select app_private.erase_own_coaching_goal($1,$2,$3)',[input.id,input.revision,input.operationId])
    return {id:input.id,deleted:true}
   })
  },
 }
}
