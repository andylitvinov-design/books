import 'server-only'
import {createHash,randomUUID} from 'node:crypto'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {readCoachingReport} from './coaching-report-store.js'
import {validateCoachingReportV2} from '../personal-coaching/report-v2.js'

const AREA_KEYS=Object.freeze([
  'body_health','emotional_wellbeing','relationships','career_business',
  'finance','personal_growth','lifestyle','meaning_purpose',
])
const AREA_LABELS=Object.freeze({
  en:{
    body_health:'Body & Health',emotional_wellbeing:'Emotional Wellbeing',
    relationships:'Relationships',career_business:'Career & Business',finance:'Finance',
    personal_growth:'Personal Growth',lifestyle:'Lifestyle',meaning_purpose:'Meaning & Purpose',
  },
  ru:{
    body_health:'Тело и здоровье',emotional_wellbeing:'Эмоциональное благополучие',
    relationships:'Отношения',career_business:'Карьера и бизнес',finance:'Финансы',
    personal_growth:'Личностный рост',lifestyle:'Образ жизни',meaning_purpose:'Смысл и предназначение',
  },
  es:{
    body_health:'Cuerpo y salud',emotional_wellbeing:'Bienestar emocional',
    relationships:'Relaciones',career_business:'Carrera y negocio',finance:'Finanzas',
    personal_growth:'Crecimiento personal',lifestyle:'Estilo de vida',meaning_purpose:'Sentido y propósito',
  },
})
const clean=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max?value.trim():''
const context=(actor,id,field)=>({accountId:actor.id,recordId:id,field})
const areaContext=(actor,id,field)=>context(actor,id,'coaching.life_plan.'+field)
const goalContext=(actor,id,field)=>context(actor,id,'coaching.life_plan.goal.'+field)
const actionContext=(actor,id,field)=>context(actor,id,'coaching.life_plan.action.'+field)
// Stable across encryption-key rotation; only opaque IDs enter the digest.
const erasedActionKey=(actor,reportId,candidateId)=>createHash('sha256').update('coaching-erased-action-v1|'+actor.id.toLowerCase()+'|'+reportId.toLowerCase()+'|'+candidateId).digest('hex')

function deterministicUuid(value){
  const hex=createHash('sha256').update(value).digest('hex').slice(0,32).split('')
  hex[12]='5'
  hex[16]=((parseInt(hex[16],16)&3)|8).toString(16)
  const raw=hex.join('')
  return raw.slice(0,8)+'-'+raw.slice(8,12)+'-'+raw.slice(12,16)+'-'+raw.slice(16,20)+'-'+raw.slice(20)
}
function activeAccount(db,actor,lock=false){
  return db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])
}
function emptyArea(areaKey,locale){
  return {areaKey,label:AREA_LABELS[locale]?.[areaKey]||AREA_LABELS.en[areaKey],
    currentState:null,desiredState:null,obstacles:null,selfRating:null,ratingSource:null,
    status:'not_started',revision:0,goals:[]}
}
/** Export all owner records, including archived and cancelled records and audit history. */
export async function exportCoachingLifePlan(config,actor){
  return transaction(config,actor,async db=>{
    if(!(await activeAccount(db,actor,true)).rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
    const read=async(table,order,limit)=>{
      const rows=(await db.query(`select * from app_private.${table} where account_id=$1 order by ${order} limit ${limit+1}`,[actor.id])).rows
      if(rows.length>limit)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
      return rows
    }
    const plans=await read('coaching_life_plans','created_at,id',256)
    const areas=await read('coaching_life_plan_areas','created_at,id',256)
    const goals=await read('coaching_goals','created_at,id',256)
    const actions=await read('coaching_action_items','created_at,id',256)
    const changes=await read('coaching_life_plan_changes','created_at,id',1024)
    const consents=await read('coaching_session_consents','occurred_at,id',1024)
    const decode=(row,fields,ctx,required=[])=>{
      if(Object.keys(row).some(key=>key.endsWith('_ciphertext')&&!Object.hasOwn(fields,key)))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
      const result={...row}
      for(const [column,[name,field]] of Object.entries(fields)){
        const value=openSealed(row[column],ctx(actor,row.id,field),config)
        if(value!==null&&typeof value!=='string')throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
        if(required.includes(column)&&(typeof value!=='string'||!value.trim()))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
        result[name]=value;delete result[column]
      }
      return result
    }
    const plain=row=>{
      if(Object.keys(row).some(key=>key.endsWith('_ciphertext')))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
      return row
    }
    return {
      plans:plans.map(plain),consents:consents.map(plain),
      areas:areas.map(row=>decode(row,{current_state_ciphertext:['currentState','current_state'],desired_state_ciphertext:['desiredState','desired_state'],obstacles_ciphertext:['obstacles','obstacles']},areaContext)),
      goals:goals.map(row=>decode(row,{title_ciphertext:['title','title'],desired_outcome_ciphertext:['desiredOutcome','desired_outcome']},goalContext,['title_ciphertext'])),
      actions:actions.map(row=>decode(row,{description_ciphertext:['description','description'],timing_ciphertext:['timing','timing'],trigger_ciphertext:['trigger','trigger'],obstacle_ciphertext:['obstacle','obstacle'],fallback_ciphertext:['fallback','fallback']},actionContext,['description_ciphertext'])),
      changes:changes.map(row=>{
        if(Object.keys(row).some(key=>key.endsWith('_ciphertext')&&key!=='snapshot_ciphertext'))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
        const snapshot=openSealed(row.snapshot_ciphertext,context(actor,row.id,'coaching.life_plan_change'),config)
        if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
        const result={...row,snapshot};delete result.snapshot_ciphertext;return result
      }),
    }
  })
}
/** Read the single owner's Life Plan. Empty domains are returned without creating database rows. */
export async function readCoachingLifePlan(config,actor,{locale='en'}={}){
  const lang=AREA_LABELS[locale]?locale:'en'
  return transaction(config,actor,async db=>{
    const owner=await activeAccount(db,actor)
    if(!owner.rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
    const permissions=(await db.query("select latest.session_id,s.completed_at from (select distinct on (session_id) session_id,accepted,revoked_at from app_private.coaching_session_consents where account_id=$1 and consent_type='cross_session_context' order by session_id,occurred_at desc,id desc) latest join app_private.coaching_session_records s on s.id=latest.session_id and s.account_id=$1 where latest.accepted and latest.revoked_at is null order by s.completed_at desc,latest.session_id limit 1025",[actor.id])).rows
    if(permissions.length>1024)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
    const contextPermissions=permissions.map(row=>({sessionId:row.session_id,completedAt:row.completed_at}))
    const plan=(await db.query("select id,plan_version,status,created_at,updated_at from app_private.coaching_life_plans where account_id=$1 and status='active'",[actor.id])).rows[0]
    if(!plan)return {plan:null,domains:AREA_KEYS.map(key=>emptyArea(key,lang)),goals:[],actions:[],contextPermissions}
    const areas=(await db.query('select id,area_key,current_state_ciphertext,desired_state_ciphertext,obstacles_ciphertext,self_rating,rating_source,status,revision,source_report_id from app_private.coaching_life_plan_areas where plan_id=$1 and account_id=$2 order by area_key',[plan.id,actor.id])).rows
    const goals=(await db.query('select id,area_id,source_session_id,source_report_id,title_ciphertext,desired_outcome_ciphertext,status,priority,target_date,review_at,revision,created_at,updated_at from app_private.coaching_goals where account_id=$1 order by created_at desc,id',[actor.id])).rows
    const actions=(await db.query('select id,goal_id,source_session_id,source_report_id,source_action_key,description_ciphertext,timing_ciphertext,trigger_ciphertext,obstacle_ciphertext,fallback_ciphertext,status,client_confirmed_at,due_at,completed_at,revision,created_at,updated_at from app_private.coaching_action_items where account_id=$1 order by created_at desc,id',[actor.id])).rows
    const domainById=new Map()
    const decodedAreas=areas.map(row=>{
      const value={
        areaKey:row.area_key,label:AREA_LABELS[lang][row.area_key],
        currentState:openSealed(row.current_state_ciphertext,areaContext(actor,row.id,'current_state'),config),
        desiredState:openSealed(row.desired_state_ciphertext,areaContext(actor,row.id,'desired_state'),config),
        obstacles:openSealed(row.obstacles_ciphertext,areaContext(actor,row.id,'obstacles'),config),
        selfRating:row.self_rating,ratingSource:row.rating_source,status:row.status,
        revision:row.revision,sourceReportId:row.source_report_id,goals:[],
      }
      domainById.set(row.id,value)
      return value
    })
    const decodedGoals=goals.map(row=>{
      const value={
        id:row.id,areaId:row.area_id,sourceSessionId:row.source_session_id,sourceReportId:row.source_report_id,
        title:openSealed(row.title_ciphertext,goalContext(actor,row.id,'title'),config),
        desiredOutcome:openSealed(row.desired_outcome_ciphertext,goalContext(actor,row.id,'desired_outcome'),config),
        status:row.status,priority:row.priority,targetDate:row.target_date,reviewAt:row.review_at,
        revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,actions:[],
      }
      domainById.get(row.area_id)?.goals.push(value)
      return value
    })
    const goalById=new Map(decodedGoals.map(goal=>[goal.id,goal]))
    const decodedActions=actions.map(row=>{
      const value={
        id:row.id,goalId:row.goal_id,sourceSessionId:row.source_session_id,sourceReportId:row.source_report_id,
        sourceActionKey:row.source_action_key,
        description:openSealed(row.description_ciphertext,actionContext(actor,row.id,'description'),config),
        timing:openSealed(row.timing_ciphertext,actionContext(actor,row.id,'timing'),config),
        trigger:openSealed(row.trigger_ciphertext,actionContext(actor,row.id,'trigger'),config),
        obstacle:openSealed(row.obstacle_ciphertext,actionContext(actor,row.id,'obstacle'),config),
        fallback:openSealed(row.fallback_ciphertext,actionContext(actor,row.id,'fallback'),config),
        status:row.status,clientConfirmedAt:row.client_confirmed_at,dueAt:row.due_at,
        completedAt:row.completed_at,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,
      }
      goalById.get(row.goal_id)?.actions.push(value)
      return value
    })
    const domains=AREA_KEYS.map(key=>decodedAreas.find(area=>area.areaKey===key)||emptyArea(key,lang))
    return {plan,domains,goals:decodedGoals,actions:decodedActions,contextPermissions}
  })
}

/** Record an explicit withdrawal even when the associated plan has been removed. */
export async function revokeCoachingPlanContext(config,actor,input){
  onlyKeys(input,['sessionId','confirmed']);requireUUID(input.sessionId)
  if(input.confirmed!==true)throw new AppError('COACHING_PLAN_CONFIRMATION_REQUIRED',400)
  return transaction(config,actor,async db=>{
    if(!(await activeAccount(db,actor,true)).rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
    if(!(await db.query('select id from app_private.coaching_session_records where id=$1 and account_id=$2',[input.sessionId,actor.id])).rows.length)
      throw new AppError('COACHING_PLAN_SESSION_NOT_FOUND',404)
    const latest=(await db.query("select accepted,revoked_at,occurred_at from app_private.coaching_session_consents where session_id=$1 and account_id=$2 and consent_type='cross_session_context' order by occurred_at desc,id desc limit 1",[input.sessionId,actor.id])).rows[0]
    if(latest?.accepted&&!latest.revoked_at){
      await db.query("insert into app_private.coaching_session_consents(id,session_id,account_id,consent_type,accepted,policy_version,purpose,occurred_at) select $1,$2,$3,'cross_session_context',false,'coaching_life_plan_continuity_v1','client_revoked_future_session_context',greatest(clock_timestamp(),max(occurred_at)+interval '1 microsecond') from app_private.coaching_session_consents where session_id=$2 and account_id=$3 and consent_type='cross_session_context'",[randomUUID(),input.sessionId,actor.id])
    }
    return {revoked:true}
  })
}

/** Erase one owner's action and its encrypted action-history snapshots. */
export async function deleteCoachingPlanAction(config,actor,id,input){
  requireUUID(id);onlyKeys(input,['confirmed'])
  if(input.confirmed!==true)throw new AppError('COACHING_PLAN_CONFIRMATION_REQUIRED',400)
  return transaction(config,actor,async db=>{
    if(!(await activeAccount(db,actor,true)).rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
    const row=(await db.query('select a.id,a.source_report_id,a.source_action_key,p.id as plan_id from app_private.coaching_action_items a join app_private.coaching_goals g on g.id=a.goal_id and g.account_id=a.account_id join app_private.coaching_life_plan_areas ar on ar.id=g.area_id and ar.account_id=g.account_id join app_private.coaching_life_plans p on p.id=ar.plan_id and p.account_id=ar.account_id where a.id=$1 and a.account_id=$2 for update of a,p',[id,actor.id])).rows[0]
    if(!row)throw new AppError('COACHING_PLAN_ACTION_NOT_FOUND',404)
    await db.query('select app_private.erase_own_coaching_action($1)',[id])
    return {id,deleted:true}
  })
}

/** Update one client-owned Life Plan domain with optimistic revision and encrypted audit history. */
export async function updateCoachingLifePlanArea(config,actor,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('COACHING_PLAN_AREA_INVALID',400)
  onlyKeys(input,['areaKey','revision','currentState','desiredState','obstacles','selfRating'])
  if(!AREA_KEYS.includes(input.areaKey)||!Number.isSafeInteger(input.revision)||input.revision<0)
    throw new AppError('COACHING_PLAN_AREA_INVALID',400)
  const currentState=clean(input.currentState,1200)||null
  const desiredState=clean(input.desiredState,1200)||null
  const obstacles=clean(input.obstacles,1200)||null
  const rating=input.selfRating===null||input.selfRating===''?null:Number(input.selfRating)
  if(input.selfRating!==undefined&&input.selfRating!==null&&input.selfRating!==''&&
    (!Number.isInteger(rating)||rating<0||rating>10))throw new AppError('COACHING_PLAN_RATING_INVALID',400)
  return transaction(config,actor,async db=>{
    const owner=await activeAccount(db,actor,true)
    if(!owner.rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
    await db.query('insert into app_private.coaching_life_plans(account_id) values($1) on conflict(account_id) do nothing',[actor.id])
    const plan=(await db.query("select id,plan_version from app_private.coaching_life_plans where account_id=$1 and status='active' for update",[actor.id])).rows[0]
    if(!plan)throw new AppError('COACHING_PLAN_UNAVAILABLE',503)
    const existing=(await db.query('select id,revision,current_state_ciphertext,desired_state_ciphertext,obstacles_ciphertext,self_rating,rating_source,status from app_private.coaching_life_plan_areas where plan_id=$1 and account_id=$2 and area_key=$3 for update',[plan.id,actor.id,input.areaKey])).rows[0]
    let areaId,fromRevision,toRevision,changeKind,changed=false
    if(!existing){
      if(input.revision!==0)throw new AppError('COACHING_PLAN_REVISION_CONFLICT',409)
      areaId=randomUUID();fromRevision=null;toRevision=1;changeKind='created'
      await db.query(
        'insert into app_private.coaching_life_plan_areas(id,plan_id,account_id,area_key,current_state_ciphertext,desired_state_ciphertext,obstacles_ciphertext,self_rating,rating_source,status,revision) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)',
        [areaId,plan.id,actor.id,input.areaKey,
          currentState?seal(currentState,areaContext(actor,areaId,'current_state'),config):null,
          desiredState?seal(desiredState,areaContext(actor,areaId,'desired_state'),config):null,
          obstacles?seal(obstacles,areaContext(actor,areaId,'obstacles'),config):null,
          rating,rating===null?null:'client_self_report',
          currentState||desiredState||obstacles||rating!==null?'active':'not_started'])
      changed=true
    }else{
      if(existing.revision!==input.revision)throw new AppError('COACHING_PLAN_REVISION_CONFLICT',409)
      areaId=existing.id;fromRevision=existing.revision;toRevision=existing.revision+1;changeKind='updated'
      const before={
        currentState:openSealed(existing.current_state_ciphertext,areaContext(actor,areaId,'current_state'),config),
        desiredState:openSealed(existing.desired_state_ciphertext,areaContext(actor,areaId,'desired_state'),config),
        obstacles:openSealed(existing.obstacles_ciphertext,areaContext(actor,areaId,'obstacles'),config),
        selfRating:existing.self_rating,ratingSource:existing.rating_source,
      }
      const after={currentState,desiredState,obstacles,selfRating:rating,ratingSource:rating===null?null:'client_self_report'}
      if(operationHash(before,config)===operationHash(after,config))
        return {areaId,areaKey:input.areaKey,revision:existing.revision,planVersion:plan.plan_version,changed:false}
      const updated=(await db.query(
        'update app_private.coaching_life_plan_areas set current_state_ciphertext=$3,desired_state_ciphertext=$4,obstacles_ciphertext=$5,self_rating=$6,rating_source=$7,status=$8,revision=revision+1 where id=$1 and account_id=$2 and revision=$9 returning revision',
        [areaId,actor.id,
          currentState?seal(currentState,areaContext(actor,areaId,'current_state'),config):null,
          desiredState?seal(desiredState,areaContext(actor,areaId,'desired_state'),config):null,
          obstacles?seal(obstacles,areaContext(actor,areaId,'obstacles'),config):null,
          rating,rating===null?null:'client_self_report',
          currentState||desiredState||obstacles||rating!==null?'active':'not_started',
          input.revision])).rows[0]
      if(!updated)throw new AppError('COACHING_PLAN_REVISION_CONFLICT',409)
      changed=true
    }
    if(changed){
      const changeId=randomUUID()
      await db.query(
        "insert into app_private.coaching_life_plan_changes(id,plan_id,account_id,entity_kind,entity_id,from_revision,to_revision,change_kind,snapshot_ciphertext,changed_by,actor_account_id) values($1,$2,$3,'area',$4,$5,$6,$7,$8,'client',$3)",
        [changeId,plan.id,actor.id,areaId,fromRevision,toRevision,changeKind,
          seal({areaKey:input.areaKey,currentState,desiredState,obstacles,selfRating:rating},context(actor,changeId,'coaching.life_plan_change'),config)])
      await db.query('update app_private.coaching_life_plans set plan_version=plan_version+1 where id=$1 and account_id=$2',[plan.id,actor.id])
    }
    const updatedPlan=(await db.query('select plan_version from app_private.coaching_life_plans where id=$1 and account_id=$2',[plan.id,actor.id])).rows[0]
    return {areaId,areaKey:input.areaKey,revision:toRevision,planVersion:updatedPlan?.plan_version||plan.plan_version+1,changed:true}
  })
}

/**
 * Import only accepted actions from the authenticated owner's immutable saved report.
 * The client supplies report/area/action IDs only, never report text or evidence.
 */
export async function importCoachingReportActions(config,actor,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('COACHING_PLAN_IMPORT_INVALID',400)
  onlyKeys(input,['reportId','reportRevision','areaKey','candidateIds','planConsent'])
  requireUUID(input.reportId)
  if(!Number.isSafeInteger(input.reportRevision)||input.reportRevision<1||
    !AREA_KEYS.includes(input.areaKey)||!Array.isArray(input.candidateIds)||
    input.candidateIds.length<1||input.candidateIds.length>3||
    input.candidateIds.some(id=>typeof id!=='string'||id.length>180)||
    new Set(input.candidateIds).size!==input.candidateIds.length||
    input.planConsent!==true)throw new AppError(input.planConsent===true?'COACHING_PLAN_IMPORT_INVALID':'COACHING_PLAN_CONSENT_REQUIRED',400)

  // The report store authenticates owner, decrypts the canonical revision and
  // verifies both immutable/current ciphertext hashes before we inspect actions.
  const saved=await readCoachingReport(config,actor,input.reportId)
  const report=saved.report?.report
  if(saved.report?.revision!==input.reportRevision||!report||
    report.status!=='reviewed'||report.review?.status!=='confirmed'||
    !validateCoachingReportV2(report).valid)throw new AppError('COACHING_REPORT_NOT_CONFIRMED',409)
  const requested=new Set(input.candidateIds)
  const accepted=(report.actionCandidates||[]).filter(item=>
    item.status==='accepted'&&item.origin==='client_selected'&&requested.has(item.candidateId))
  if(accepted.length!==requested.size||!accepted.every(item=>
    typeof item.acceptedAt==='string'&&Number.isFinite(Date.parse(item.acceptedAt))&&
    item.sourceEvidenceIds.some(id=>{
      const evidence=report.evidence.find(row=>row.evidenceId===id)
      return evidence&&evidence.kind==='client_action_acceptance'&&
        evidence.value===item.text&&evidence.capturedAt===item.acceptedAt
    })))throw new AppError('COACHING_PLAN_ACTION_NOT_ACCEPTED',409)

  const desired=clean(report.sections?.desiredOutcome?.text,600)
  const focus=clean(report.outcome?.clientFocus?.text,600)
  const request=clean(report.evidence.find(item=>item.kind==='client_request')?.value,600)
  const goalTitle=desired||focus||request
  if(!goalTitle)throw new AppError('COACHING_PLAN_GOAL_TITLE_REQUIRED',409)
  const goalIdempotencyKey=deterministicUuid(actor.id+'|'+input.reportId+'|'+input.areaKey)
  return transaction(config,actor,async db=>{
    const owner=await activeAccount(db,actor,true)
    if(!owner.rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
    const lockedReport=(await db.query("select id,session_id,status,current_revision,content_hash from app_private.coaching_reports where id=$1 and account_id=$2 and report_kind='ai_coaching' and schema_version='coaching-session-report.v2' and generated_by='deterministic' for update",[input.reportId,actor.id])).rows[0]
    if(!lockedReport||lockedReport.status!=='confirmed'||lockedReport.current_revision!==input.reportRevision||
      lockedReport.session_id!==report.sessionId||lockedReport.content_hash!==operationHash(report,config))
      throw new AppError('COACHING_REPORT_CHANGED',409)
    const consent=(await db.query(
      "select accepted,revoked_at from app_private.coaching_session_consents where account_id=$1 and session_id=$2 and consent_type='report_storage' order by occurred_at desc,id desc limit 1",
      [actor.id,lockedReport.session_id]
    )).rows[0]
    if(!consent?.accepted||consent.revoked_at)throw new AppError('COACHING_REPORT_CONSENT_REQUIRED',403)

    for(const candidate of accepted){
      const erased=(await db.query('select 1 from app_private.coaching_erased_action_receipts where account_id=$1 and source_key=$2',[actor.id,erasedActionKey(actor,input.reportId,candidate.candidateId)])).rows[0]
      if(erased)throw new AppError('COACHING_PLAN_ACTION_DELETED',410)
    }

    await db.query("insert into app_private.coaching_life_plans(account_id) values($1) on conflict(account_id) do nothing",[actor.id])
    const plan=(await db.query("select id,plan_version from app_private.coaching_life_plans where account_id=$1 and status='active' for update",[actor.id])).rows[0]
    if(!plan)throw new AppError('COACHING_PLAN_UNAVAILABLE',503)

    await db.query("insert into app_private.coaching_life_plan_areas(plan_id,account_id,area_key,source_report_id) values($1,$2,$3,$4) on conflict(plan_id,area_key) do nothing",[plan.id,actor.id,input.areaKey,input.reportId])
    const area=(await db.query("select id from app_private.coaching_life_plan_areas where plan_id=$1 and account_id=$2 and area_key=$3 for update",[plan.id,actor.id,input.areaKey])).rows[0]
    if(!area)throw new AppError('COACHING_PLAN_AREA_UNAVAILABLE',503)

    const proposedGoalId=randomUUID()
    const goalResult=await db.query(
      "insert into app_private.coaching_goals(id,area_id,account_id,source_session_id,source_report_id,title_ciphertext,desired_outcome_ciphertext,status,idempotency_key) values($1,$2,$3,$4,$5,$6,$7,'proposed',$8) on conflict(account_id,idempotency_key) do nothing returning id,revision",
      [proposedGoalId,area.id,actor.id,report.sessionId,input.reportId,
        seal(goalTitle,goalContext(actor,proposedGoalId,'title'),config),
        desired?seal(desired,goalContext(actor,proposedGoalId,'desired_outcome'),config):null,
        goalIdempotencyKey])
    let goalId=goalResult.rows[0]?.id||null
    const goalCreated=Boolean(goalId)
    if(!goalId){
      const existing=(await db.query('select id,area_id,source_report_id,revision from app_private.coaching_goals where account_id=$1 and idempotency_key=$2 for update',[actor.id,goalIdempotencyKey])).rows[0]
      if(!existing||existing.area_id!==area.id||existing.source_report_id!==input.reportId)
        throw new AppError('COACHING_PLAN_IMPORT_CONFLICT',409)
      goalId=existing.id
    }
    const actionRows=[]
    for(const candidate of accepted){
      const actionId=randomUUID()
      const inserted=await db.query(
        "insert into app_private.coaching_action_items(id,goal_id,account_id,source_session_id,source_report_id,source_action_key,description_ciphertext,status,client_confirmed_at) values($1,$2,$3,$4,$5,$6,$7,'accepted',$8) on conflict(source_report_id,source_action_key) do nothing returning id,status,client_confirmed_at",
        [actionId,goalId,actor.id,report.sessionId,input.reportId,candidate.candidateId,
          seal(candidate.text,actionContext(actor,actionId,'description'),config),candidate.acceptedAt])
      let action=inserted.rows[0]
      if(!action){
        action=(await db.query('select id,goal_id,status,client_confirmed_at from app_private.coaching_action_items where account_id=$1 and source_report_id=$2 and source_action_key=$3 for update',[actor.id,input.reportId,candidate.candidateId])).rows[0]
        if(!action||action.goal_id!==goalId||action.status!=='accepted'||Date.parse(action.client_confirmed_at)!==Date.parse(candidate.acceptedAt))
          throw new AppError('COACHING_PLAN_IMPORT_CONFLICT',409)
      }
      actionRows.push({id:action.id,candidateId:candidate.candidateId,created:Boolean(inserted.rows[0])})
    }

    const createdActions=actionRows.filter(item=>item.created)
    if(goalCreated||createdActions.length){
      // This affirmative choice authorizes only the selected Life Plan context
      // to be reused in future coaching sessions. It is not practitioner sharing.
      const consentId=randomUUID()
      await db.query(
        "insert into app_private.coaching_session_consents(id,session_id,account_id,consent_type,accepted,policy_version,purpose,occurred_at) select $1,$2,$3,'cross_session_context',true,'coaching_life_plan_continuity_v1','life_plan_continuity',greatest(clock_timestamp(),coalesce(max(occurred_at)+interval '1 microsecond',clock_timestamp())) from app_private.coaching_session_consents where session_id=$2 and account_id=$3 and consent_type='cross_session_context'",
        [consentId,report.sessionId,actor.id]
      )
      for(const item of [
        ...(goalCreated?[{kind:'goal',id:goalId,revision:1,snapshot:{goalId,areaKey:input.areaKey,title:goalTitle,desiredOutcome:desired}}]:[]),
        ...createdActions.map(action=>({kind:'action',id:action.id,revision:1,snapshot:{goalId,actionId:action.id,candidateId:action.candidateId,status:'accepted'}})),
      ]){
        const changeId=randomUUID()
        await db.query(
          "insert into app_private.coaching_life_plan_changes(id,plan_id,account_id,entity_kind,entity_id,from_revision,to_revision,change_kind,snapshot_ciphertext,changed_by,actor_account_id) values($1,$2,$3,$4,$5,null,$6,'created',$7,'client',$3)",
          [changeId,plan.id,actor.id,item.kind,item.id,item.revision,
            seal(item.snapshot,context(actor,changeId,'coaching.life_plan_change'),config)])
      }
      await db.query('update app_private.coaching_life_plans set plan_version=plan_version+1 where id=$1 and account_id=$2',[plan.id,actor.id])
    }
    const updatedPlan=(await db.query('select id,plan_version from app_private.coaching_life_plans where id=$1 and account_id=$2',[plan.id,actor.id])).rows[0]
    return {planId:updatedPlan.id,planVersion:updatedPlan.plan_version,goalId,
      areaKey:input.areaKey,actions:actionRows,imported:createdActions.length,goalCreated}
  })
}
