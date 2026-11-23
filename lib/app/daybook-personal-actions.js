import 'server-only'
import {createHash} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError,requireUUID,canonicalJSON} from '../assessments/contracts.js'
import {personalActionWrite,personalActionDelete,actionTransition} from './daybook-personal-action-contract.mjs'
const fields=['description','timing','trigger','obstacle','fallback']
const context=(actor,id,field)=>({accountId:actor.id,recordId:id,field:'coaching.life_plan.action.'+field})
const auditContext=(actor,id)=>({accountId:actor.id,recordId:id,field:'coaching.life_plan_change'})
const erasedKey=(actor,id)=>createHash('sha256').update('coaching-erased-manual-action-v1|'+actor.id.toLowerCase()+'|'+id.toLowerCase()).digest('hex')
async function active(db,actor,lock=false){
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])).rowCount)throw new AppError('ACCOUNT_REQUIRED',401)
}
async function rowFor(db,actor,id){
 return (await db.query('select a.*,ar.plan_id from app_private.coaching_action_items a join app_private.coaching_goals g on g.id=a.goal_id and g.account_id=a.account_id join app_private.coaching_life_plan_areas ar on ar.id=g.area_id and ar.account_id=g.account_id where a.id=$1 and a.account_id=$2',[id,actor.id])).rows[0]
}
async function erased(db,actor,id){return (await db.query('select 1 from app_private.coaching_erased_action_receipts where account_id=$1 and source_key=$2',[actor.id,erasedKey(actor,id)])).rowCount>0}
function view(actor,row,config){
 return {id:row.id,goalId:row.goal_id,...Object.fromEntries(fields.map(field=>[field,openSealed(row[field+'_ciphertext'],context(actor,row.id,field),config)??''])),feasibilityScore:row.feasibility_score,dueAt:row.due_at,status:row.status,revision:row.revision,clientConfirmedAt:row.client_confirmed_at,completedAt:row.completed_at,sourceSessionId:row.source_session_id,sourceReportId:row.source_report_id,sourceActionKey:row.source_action_key,createdAt:row.created_at,updatedAt:row.updated_at}
}
export function createPersonalActionRepository(config){
 return {
  async read(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{await active(db,actor);const row=await rowFor(db,actor,id);if(!row)throw new AppError('NOT_FOUND',404);return {action:view(actor,row,config)}})
  },
  async save(actor,raw){
   const input=personalActionWrite(raw),fingerprint=operationHash(input,config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    if(await erased(db,actor,input.id))throw new AppError('ACTION_ERASED',410)
    const receipt=(await db.query('select id,entity_kind,entity_id,to_revision,snapshot_ciphertext from app_private.coaching_life_plan_changes where id=$1 and account_id=$2',[input.operationId,actor.id])).rows[0]
    const existing=await rowFor(db,actor,input.id)
    if(receipt){
     const snapshot=openSealed(receipt.snapshot_ciphertext,auditContext(actor,receipt.id),config)
     if(receipt.entity_kind!=='action'||receipt.entity_id!==input.id||snapshot?.kind!=='personal-action-v1'||snapshot.requestFingerprint!==fingerprint)throw new AppError('ACTION_IDEMPOTENCY_CONFLICT',409)
     if(!existing)throw new AppError('ACTION_ERASED',410)
     if(existing.revision!==receipt.to_revision)throw new AppError('ACTION_REVISION_ADVANCED',409)
     const action=view(actor,existing,config)
     // Canonical columns may also be changed by other first-party clients.
     if(Object.keys(snapshot.action).some(key=>canonicalJSON(action[key])!==canonicalJSON(snapshot.action[key])))throw new AppError('ACTION_READBACK_CONFLICT',409)
     return {action,saved:true,replayed:true}
    }
    if(existing?existing.revision!==input.revision:input.revision!==0)throw new AppError('ACTION_REVISION_CONFLICT',409)
    if(existing&&existing.goal_id!==input.goalId)throw new AppError('ACTION_GOAL_IMMUTABLE',409)
    actionTransition(existing?.status??null,input.status,input.confirmed)
    // All client writes take the account lock first; lock parent before action as report import does.
    const goal=(await db.query('select g.id,g.status,ar.plan_id,p.status as plan_status from app_private.coaching_goals g join app_private.coaching_life_plan_areas ar on ar.id=g.area_id and ar.account_id=g.account_id join app_private.coaching_life_plans p on p.id=ar.plan_id and p.account_id=ar.account_id where g.id=$1 and g.account_id=$2 for update of g,p',[input.goalId,actor.id])).rows[0]
    if(!goal||goal.plan_status!=='active'||!existing&&!['accepted','active'].includes(goal.status))throw new AppError('ACTION_GOAL_UNAVAILABLE',409)
    const encrypted=fields.map(field=>seal(input[field],context(actor,input.id,field),config))
    let row
    const args=[input.id,actor.id,input.goalId,...encrypted,input.feasibilityScore,input.dueAt,input.status,input.confirmed,input.revision]
    if(existing){
     row=(await db.query(`update app_private.coaching_action_items set description_ciphertext=$4,timing_ciphertext=$5,trigger_ciphertext=$6,obstacle_ciphertext=$7,fallback_ciphertext=$8,feasibility_score=$9,due_at=$10,status=$11,client_confirmed_at=case when $12 then coalesce(client_confirmed_at,now()) else client_confirmed_at end,completed_at=case when $11='completed' then coalesce(completed_at,now()) else null end,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and goal_id=$3 and revision=$13 returning id`,args)).rows[0]
    }else{
     row=(await db.query(`insert into app_private.coaching_action_items(id,account_id,goal_id,description_ciphertext,timing_ciphertext,trigger_ciphertext,obstacle_ciphertext,fallback_ciphertext,feasibility_score,due_at,status,client_confirmed_at,revision) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,case when $12 then now() else null end,1) on conflict do nothing returning id`,args.slice(0,12))).rows[0]
    }
    if(!row)throw new AppError('ACTION_REVISION_CONFLICT',409)
    const action=view(actor,await rowFor(db,actor,input.id),config)
    const snapshot={kind:'personal-action-v1',requestFingerprint:fingerprint,action:Object.fromEntries(['id','goalId',...fields,'feasibilityScore','dueAt','status','revision','clientConfirmedAt','completedAt'].map(key=>[key,action[key]]))}
    await db.query("insert into app_private.coaching_life_plan_changes(id,plan_id,account_id,entity_kind,entity_id,from_revision,to_revision,change_kind,snapshot_ciphertext,changed_by,actor_account_id) values($1,$2,$3,'action',$4,$5,$6,$7,$8,'client',$3)",[input.operationId,goal.plan_id,actor.id,input.id,existing?.revision??null,action.revision,existing?(existing.status!==input.status?'status_changed':'updated'):'created',seal(snapshot,auditContext(actor,input.operationId),config)])
    await db.query('update app_private.coaching_life_plans set plan_version=plan_version+1 where id=$1 and account_id=$2',[goal.plan_id,actor.id])
    return {action,saved:true,replayed:false}
   })
  },
  async remove(actor,raw){
   const input=personalActionDelete(raw)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    const row=await rowFor(db,actor,input.id)
    if(!row){if(await erased(db,actor,input.id))return {id:input.id,deleted:true};throw new AppError('NOT_FOUND',404)}
    if(row.revision!==input.revision)throw new AppError('ACTION_REVISION_CONFLICT',409)
    await db.query('select app_private.erase_own_coaching_action($1)',[input.id])
    return {id:input.id,deleted:true}
   })
  },
 }
}
