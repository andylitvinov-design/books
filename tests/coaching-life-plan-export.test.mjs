import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {createHash,randomUUID} from 'node:crypto'
import {AppError,onlyKeys,requireUUID} from '../lib/assessments/contracts.js'
import {seal,openSealed,operationHash} from '../lib/app/crypto.js'

const actor={id:'10000000-0000-4000-8000-000000000001'}
const other={id:'10000000-0000-4000-8000-000000000002'}
const config={encryptionKey:Buffer.alloc(32,73),encryptionKeyId:'test'}
const id=()=>randomUUID()
const encrypt=(recordId,field,value)=>seal(value,{accountId:actor.id,recordId,field},config)
function fixture(){
 const plan=id(),area=id(),goal=id(),action=id(),change=id(),consent=id()
 return {
  coaching_life_plans:[{id:plan,account_id:actor.id,status:'archived',plan_version:2}],
  coaching_life_plan_areas:[{id:area,account_id:actor.id,plan_id:plan,area_key:'finance',current_state_ciphertext:encrypt(area,'coaching.life_plan.current_state','Present'),desired_state_ciphertext:encrypt(area,'coaching.life_plan.desired_state','Future'),obstacles_ciphertext:encrypt(area,'coaching.life_plan.obstacles','Barrier')}],
  coaching_goals:[{id:goal,account_id:actor.id,area_id:area,status:'cancelled',title_ciphertext:encrypt(goal,'coaching.life_plan.goal.title','Goal'),desired_outcome_ciphertext:encrypt(goal,'coaching.life_plan.goal.desired_outcome','Outcome')}],
  coaching_action_items:[{id:action,account_id:actor.id,goal_id:goal,status:'cancelled',description_ciphertext:encrypt(action,'coaching.life_plan.action.description','Action'),timing_ciphertext:encrypt(action,'coaching.life_plan.action.timing','Tomorrow'),trigger_ciphertext:encrypt(action,'coaching.life_plan.action.trigger','Trigger'),obstacle_ciphertext:encrypt(action,'coaching.life_plan.action.obstacle','Obstacle'),fallback_ciphertext:encrypt(action,'coaching.life_plan.action.fallback','Fallback')}],
  coaching_life_plan_changes:[{id:change,account_id:actor.id,plan_id:plan,snapshot_ciphertext:encrypt(change,'coaching.life_plan_change',{currentState:'Past'})}],
  coaching_session_consents:[{id:consent,account_id:actor.id,consent_type:'cross_session_context',accepted:false}],
 }
}
function service(rows){
 const source=readFileSync(new URL('../lib/app/coaching-life-plan.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const db={query:async(sql,args)=>{
  if(sql.includes('from app.accounts'))return {rows:[{id:args[0]}]}
  const table=sql.match(/from app_private\.(\w+)/)?.[1]
  if(!table||!rows[table])throw Error('Unexpected SQL: '+sql)
  return {rows:rows[table].filter(row=>row.account_id===args[0])}
 }}
 const transaction=async(_config,_actor,fn)=>fn(db)
 return runInNewContext('(deps)=>{const {createHash,randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash}=deps;'+source+';return {exportCoachingLifePlan}}')({createHash,randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash})
}
test('exports all owner plan records with canonical AAD and no ciphertext',async()=>{
 const result=await service(fixture()).exportCoachingLifePlan(config,actor)
 assert.equal(result.plans[0].status,'archived')
 assert.equal(result.areas[0].currentState,'Present')
 assert.equal(result.areas[0].desiredState,'Future')
 assert.equal(result.areas[0].obstacles,'Barrier')
 assert.equal(result.goals[0].title,'Goal')
 assert.equal(result.goals[0].desiredOutcome,'Outcome')
 assert.equal(result.actions[0].description,'Action')
 assert.equal(result.actions[0].fallback,'Fallback')
 assert.equal(result.changes[0].snapshot.currentState,'Past')
 assert.equal(result.consents[0].accepted,false)
 assert.doesNotMatch(JSON.stringify(result),/ciphertext/)
 const empty=await service(fixture()).exportCoachingLifePlan(config,other)
 assert.equal(empty.plans.length,0)
 assert.equal(empty.consents.length,0)
})
test('fails closed on unknown encryption and unexpected encrypted fields',async()=>{
 const corrupt=fixture();corrupt.coaching_action_items[0].description_ciphertext='unknown format'
 await assert.rejects(service(corrupt).exportCoachingLifePlan(config,actor),error=>error.code==='PRIVATE_DATA_UNAVAILABLE')
 const unknown=fixture();unknown.coaching_goals[0].future_ciphertext='unrecognized'
 await assert.rejects(service(unknown).exportCoachingLifePlan(config,actor),error=>error.code==='PRIVATE_DATA_UNAVAILABLE')
 const empty=fixture();empty.coaching_goals[0].title_ciphertext=''
 await assert.rejects(service(empty).exportCoachingLifePlan(config,actor),error=>error.code==='PRIVATE_DATA_UNAVAILABLE')
})
test('account export invokes the canonical owner-scoped plan exporter',()=>{
 const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
 assert.match(route,/exported\.coachingLifePlan = await exportCoachingLifePlan\(config, actor\)/)
})
