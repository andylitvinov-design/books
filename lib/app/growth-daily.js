import 'server-only'
import { randomUUID } from 'node:crypto'
import { transaction } from './database.js'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed } from './crypto.js'
import { GROWTH_GOALS, suggestedCourseTopics } from '../inner-growth/course-model.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { buildFinalCourseRetest } from '../inner-growth/course-final-retest.js'
import { getTestScaleGuide } from '../assessments/scale-guides.js'
import { COURSE_CONTENT_VERSION, COURSE_CONTENT_V3, COURSE_CONTENT_V4, lessonFor } from '../inner-growth/lesson-library.js'
import { v3ReturnSuggestion } from '../inner-growth/course-v3.js'
import { COURSE_JOURNEY } from '../../data/inner-growth/course-journey.js'
import { coursePracticeFocus, courseContinuationGoals, courseNextCycleScaleKeys } from '../inner-growth/course-strategy.js'
import { validTimeZone, localDateKey, courseToday, describeCycle, validateDailyRatings, optionalRating } from '../inner-growth/course-progress.js'

const notAllowed=(code='INVALID_COURSE_ACTION',status=400)=>{throw new AppError(code,status)}
const context=(actor,id,field)=>({accountId:actor.id,recordId:id,field})
const iso=(value)=>value instanceof Date?value.toISOString():value
const dateString=(value)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10)
const positiveText=(value,limit=200,required=true)=>{
  if(value===null||value===undefined) return required?notAllowed('COURSE_TARGET_REQUIRED'):null
  if(typeof value!=='string')notAllowed('INVALID_COURSE_TARGET')
  const str=value.trim()
  if((required&&str.length<3)||str.length>limit)notAllowed('INVALID_COURSE_TARGET')
  return str||null
}
const resolveCycleVersion = value => value === COURSE_CONTENT_V4 ? COURSE_CONTENT_V4 : value === COURSE_CONTENT_V3 ? COURSE_CONTENT_V3 : COURSE_CONTENT_VERSION
const permittedFeedback=new Set(['helped','neutral','uncomfortable','skip'])
const permittedReview=new Set(['continue','softer','rest','new_cycle'])
function parseUUID(value){return requireUUID(value)}
async function accountReady(db,actor){
  const a=(await db.query('select status,onboarding_state,timezone from app.accounts where id=$1',[actor.id])).rows[0]
  if(!a||a.status!=='active'||a.onboarding_state!=='active')notAllowed('ACCOUNT_UNAVAILABLE',403)
  return a
}
export async function createNewCycle(db,actor,course,config,{problemLabel,intention,timeZone}={}){
  const label=positiveText(problemLabel,160)
  if(suggestedCourseTopics(label).urgent || suggestedCourseTopics(intention||'').urgent)
    notAllowed('URGENT_SUPPORT_NEEDED',400)
  const goal=course.goals?.[0]
  if(!GROWTH_GOALS[goal])notAllowed('COURSE_GOAL_REQUIRED')
  const account=await accountReady(db,actor)
  const zone=validTimeZone(timeZone)?timeZone:validTimeZone(account.timezone)?account.timezone:'UTC'
  const existing=(await db.query("select id from app_private.growth_cycles where account_id=$1 and status in ('active','paused') for update",[actor.id])).rows[0]
  if(existing)notAllowed('COURSE_ACTIVE_CYCLE_EXISTS',409)
  const count=(await db.query('select coalesce(max(cycle_number),0)::integer as max from app_private.growth_cycles where account_id=$1 and course_id=$2',[actor.id,course.id])).rows[0]?.max||0
  if(count>=100)notAllowed('COURSE_CYCLE_LIMIT',409)
  const cycleId=randomUUID(),targetId=randomUUID(),local=localDateKey(Date.now(),zone)
  await db.query(`insert into app_private.growth_cycles
    (id,account_id,course_id,cycle_number,primary_domain,content_version,start_local_date,time_zone,duration_days)
    values($1,$2,$3,$4,$5,$6,$7,$8,14)`,[cycleId,actor.id,course.id,count+1,goal,COURSE_CONTENT_V4,local,zone])
  await db.query(`insert into app_private.growth_targets
    (id,account_id,cycle_id,problem_label_ciphertext,intention_ciphertext)
    values($1,$2,$3,$4,$5)`,[targetId,actor.id,cycleId,
      seal(label,context(actor,targetId,'course.target_label'),config),
      intention?seal(positiveText(intention,300,false),context(actor,targetId,'course.target_intention'),config):null])
  return cycleId
}
async function load(db,actor,config,{locale='en',now=Date.now()}={}){
  await accountReady(db,actor)
  const course=(await db.query('select * from app_private.growth_courses where account_id=$1',[actor.id])).rows[0]
  if(!course||course.stage!==4) return {cycle:null,available:false}
  const cycle=(await db.query(`select * from app_private.growth_cycles where account_id=$1
    order by (case when status in ('active','paused') then 0 else 1 end),cycle_number desc limit 1`,[actor.id])).rows[0]
  if(!cycle) return {cycle:null,available:true,requiresTarget:true}
  const target=(await db.query('select * from app_private.growth_targets where account_id=$1 and cycle_id=$2',[actor.id,cycle.id])).rows[0]
  if(!target)notAllowed('COURSE_TARGET_MISSING',503)
  const checkins=(await db.query(`select * from app_private.growth_checkins where account_id=$1 and cycle_id=$2 order by local_date,id`,[actor.id,cycle.id])).rows
  const sessions=(await db.query(`select * from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number,id`,[actor.id,cycle.id])).rows
  const weeklyLast=(await db.query(`select measurement_at from app.assessment_results where account_id=$1
    and provenance->>'definitionKey'='hh-weekly-pulse' order by measurement_at desc limit 1`,[actor.id])).rows[0]
  const weeklyCatalog=monitoringCatalogItem('hh-weekly-pulse')
  const repeatDays=weeklyCatalog?.suggestedRepeatDays||7
  const nextDue=weeklyLast ? new Date(new Date(weeklyLast.measurement_at).getTime()+repeatDays*86400000) : null
  const reviews=(await db.query(`select day_number,next_preference,created_at from app_private.growth_reviews where account_id=$1 and cycle_id=$2`,[actor.id,cycle.id])).rows
  const start=dateString(cycle.start_local_date),
    dayInfo=courseToday(start,cycle.time_zone,cycle.duration_days,now),
    actualCheckin=checkins.find(row=>dateString(row.local_date)===dayInfo.date)
  const history=describeCycle({
    startLocalDay:start,duration:cycle.duration_days,
    checkins:checkins.map(r=>({localDate:dateString(r.local_date),severity:r.severity,interference:r.interference,resource:r.resource})),
    sessions:sessions.map(r=>({dayNumber:r.day_number,completedAt:iso(r.completed_at),feedback:r.feedback,
      beforeNow:r.before_now,afterNow:r.after_now})),
  })
  // Content version is recorded at the start of a cycle. Existing R2 users
  // retain their original lesson IDs and round-robin sequence indefinitely.
  const contentVersion=resolveCycleVersion(cycle.content_version)
  const isV3=[COURSE_CONTENT_V3, COURSE_CONTENT_V4].includes(contentVersion)
  const currentFocus=coursePracticeFocus(course.scale_keys,cycle.primary_domain,dayInfo.day,locale,contentVersion)
  const lessonGoal=currentFocus.goal
  let lesson=lessonFor(lessonGoal,dayInfo.day,locale,cycle.preferences?.length==='quick'?'quick':'standard',contentVersion)
  if(lesson && cycle.preferences?.imagery==='no_imagery') {
    lesson={...lesson,sections:lesson.sections.map(section=>section.kind==='meditation' ? {
      ...section,
      text:locale==='ru'
        ? 'Если визуализация не подходит, оставьте глаза открытыми. Спокойно найдите вокруг три цвета, две формы и один нейтральный звук. Дайте себе паузу, не меняя дыхания. Затем выберите небольшой безопасный шаг из задания дня.'
        : 'If imagery is not comfortable, keep your eyes open. Calmly notice three colours, two shapes and one neutral sound in the room. Allow a pause without changing your breath. Then choose one small safe step from today’s activity.',
    }:section)}
  }
  // The 14 preview cards use the same track rotation and reviewed lesson
  // library as the daily session; they never expose another account's data.
  const lang=locale==='ru'?'ru':'en'
  const roadmap=COURSE_JOURNEY.map(({day:plannedDay})=>{
    const focus=coursePracticeFocus(course.scale_keys,cycle.primary_domain,plannedDay,locale,contentVersion)
    const preview=lessonFor(focus.goal,plannedDay,locale,cycle.preferences?.length==='quick'?'quick':'standard',contentVersion)
    const practiced=Boolean(history.days[plannedDay-1]?.sessionCompleted)
    const status=practiced?'completed'
      :plannedDay===dayInfo.day&&!dayInfo.isAfterCycle?'today'
      :plannedDay<dayInfo.day||dayInfo.isAfterCycle?'past':'upcoming'
    return {
      day:plannedDay,title:preview?.title||'',...preview?.journey,
      workbookSkill:preview?.workbook?.skill||'',
      focusRole:isV3?focus.role:null,
      focusTitle:GROWTH_GOALS[focus.goal]?.title?.[lang]||'',
      scaleLabel:focus.label||null,
      focusScaleId:focus.scaleId||null,
      focusGoal:focus.goal,
      durationMinutes:Math.ceil((preview?.durationSeconds||0)/60),
      status,
    }
  })
  // Repeat the client's existing primary skill gently between rotated topics.
  // This is an optional rehearsal cue, not a therapeutic prescription.
  const primaryFocus=isV3?coursePracticeFocus(course.scale_keys,cycle.primary_domain,1,locale,contentVersion):null
  const primary=GROWTH_GOALS[primaryFocus?.goal||cycle.primary_domain]
  const anchor=primary?{
    title:primary.title[lang],
    practice:cycle.preferences?.imagery==='no_imagery'
      ? (lang==='ru' ? 'Оставьте глаза открытыми, найдите три предмета и один спокойный звук. Дыхание остаётся естественным.'
        : 'Keep your eyes open, notice three objects and one neutral sound. Let your breath stay natural.')
      : primary.grounding[lang],
  }:null
  const journalHistory=sessions.filter(row=>row.reflection_ciphertext)
    .map(row=>({
      day:row.day_number,
      completedAt:iso(row.completed_at),
      // Notes from an earlier course version may predate the new prompts.
      // Never relabel historical notes as answers to v2 questions.
      reflection:openSealed(row.reflection_ciphertext,context(actor,row.id,'course.session_note'),config),
    }))
    .sort((a,b)=>a.day-b.day)
  const currentSession=sessions.find(row=>row.day_number===dayInfo.day)
  const lastSession=sessions.find(row=>row.day_number===dayInfo.day-1)
  const returnSuggestion=isV3?v3ReturnSuggestion({day:dayInfo.day,sessions:sessions.map(s=>({day:s.day_number,feedback:s.feedback}))}):null
  const accountZone=cycle.time_zone
  const finalSession=sessions.find(row=>row.day_number===14)
  // Final retests are offered only AFTER the actual saved day-14 lesson.
  // All rows are owned by this account, and the baseline is pinned to the
  // existing immutable cycle start (not the user's newest result).
  let finalRetest={ready:false,tests:[],completedCount:0,totalCount:0}
  if(finalSession && (dayInfo.day===14 || dayInfo.isAfterCycle) && course.test_keys?.length){
    const selected=[...new Set(course.test_keys)].slice(0,12)
    const rows=(await db.query(`select id,provenance,dimensions,measurement_at
      from app.assessment_results
      where account_id=$1 and provenance->>'definitionKey'=any($2::text[])
      order by measurement_at desc,id desc limit 400`,[actor.id,selected])).rows
    const results=rows.map(row=>({id:row.id,...row.provenance,dimensions:row.dimensions,
      measurementAt:iso(row.measurement_at)}))
    const metadata=selected.map(key=>{
      const item=monitoringCatalogItem(key)
      return {key,title:item?.title?.[lang]||item?.title?.en||key,
        scaleLabels:Object.fromEntries((getTestScaleGuide(key,lang)?.scales||[]).map(s=>[s.key,s.label])),
        version:item?.version||null,startable:item?.startable||false,
        rightsStatus:item?.rightsStatus||null,suggestedRepeatDays:item?.suggestedRepeatDays||null}
    })
    finalRetest=buildFinalCourseRetest({testKeys:selected,results,metadata,
      startedAt:iso(cycle.created_at),completedAt:iso(finalSession.completed_at)})
  }
  return {
    available:true,
    cycle:{
      id:cycle.id,status:cycle.status,revision:cycle.revision,cycleNumber:cycle.cycle_number,
      startLocalDate:start,timeZone:accountZone,day:dayInfo.day,todayLocalDate:dayInfo.date,
      durationDays:cycle.duration_days,contentVersion,
      primaryGoal:primaryFocus?.goal||cycle.primary_domain,activeGoal:lessonGoal,
      activeScaleLabel:currentFocus?.label||null,
      activeFocusRole:isV3?currentFocus.role:null,
      primaryScaleLabel:primaryFocus?.label||null,preferences:cycle.preferences,
      afterCycle:dayInfo.isAfterCycle,completed:cycle.status==='completed',
    },
    target:{
      label:openSealed(target.problem_label_ciphertext,context(actor,target.id,'course.target_label'),config),
      intention:openSealed(target.intention_ciphertext,context(actor,target.id,'course.target_intention'),config),
      recall:'past_24_hours',direction:'higher_is_more_difficult',questionVersion:target.anchors_version,
      scale:{min:0,max:10,zero:'Not difficult at all',ten:'Extremely difficult'},
    },
    currentCheckin:actualCheckin ? {
      id:actualCheckin.id,revision:actualCheckin.revision,date:dateString(actualCheckin.local_date),
      severity:actualCheckin.severity,interference:actualCheckin.interference,resource:actualCheckin.resource,
      note:openSealed(actualCheckin.note_ciphertext,context(actor,actualCheckin.id,'course.checkin_note'),config),
    }:null,
    currentSession:currentSession?{
      completedAt:iso(currentSession.completed_at),feedback:currentSession.feedback,
      beforeNow:currentSession.before_now,afterNow:currentSession.after_now,
      reflection:openSealed(currentSession.reflection_ciphertext,context(actor,currentSession.id,'course.session_note'),config),
    }:null,
    lesson,
    finalRetest,
    anchor,
    roadmap,
    journalHistory,
    gentleSuggested:lastSession?.feedback==='uncomfortable'||returnSuggestion==='gentle',
    returnSuggestion,
    progress:history,
    reviews:reviews.map(r=>({day:r.day_number,decision:r.next_preference,createdAt:iso(r.created_at)})),
    secondaryGoals:(course.goals||[]).slice(1),
    continuationGoals:course.scale_keys?.length
      ? courseContinuationGoals(course.scale_keys) : Object.keys(GROWTH_GOALS),
    continuationRequiresMeasuredChoice:Boolean(course.scale_keys?.length),
    recommendedTest:weeklyLast ? {
      key:'hh-weekly-pulse', due:nextDue?.getTime()<=Date.now(),
      nextDueAt:nextDue?.toISOString()||null,
      explanation:'Original Holistic House Weekly Pulse; separate seven-day self-report, not a diagnosis.',
    }:null,
  }
}
async function editableCycle(db,actor){
  await accountReady(db,actor)
  const course=(await db.query('select * from app_private.growth_courses where account_id=$1 for update',[actor.id])).rows[0]
  if(!course||course.stage!==4)notAllowed('COURSE_NOT_READY',409)
  const cycle=(await db.query(`select * from app_private.growth_cycles where account_id=$1
    and status in ('active','paused','completed') order by cycle_number desc limit 1 for update`,[actor.id])).rows[0]
  return {course,cycle}
}
function requireCurrentDay(cycle){
  const today=courseToday(dateString(cycle.start_local_date),cycle.time_zone,cycle.duration_days)
  return today
}
export function createDailyCourseRepository(config){
  return {
    async exportHistory(actor) {
      return transaction(config,actor,async(db)=>{
        await accountReady(db,actor)
        const cycles=(await db.query('select * from app_private.growth_cycles where account_id=$1 order by cycle_number,id',[actor.id])).rows
        const output=[]
        for(const cycle of cycles){
          const target=(await db.query('select * from app_private.growth_targets where account_id=$1 and cycle_id=$2',[actor.id,cycle.id])).rows[0]
          const observations=(await db.query('select * from app_private.growth_checkins where account_id=$1 and cycle_id=$2 order by local_date',[actor.id,cycle.id])).rows
          const sessions=(await db.query('select * from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number',[actor.id,cycle.id])).rows
          const reviews=(await db.query('select * from app_private.growth_reviews where account_id=$1 and cycle_id=$2 order by day_number',[actor.id,cycle.id])).rows
          output.push({
            cycleId:cycle.id,cycleNumber:cycle.cycle_number,goal:cycle.primary_domain,
            status:cycle.status,contentVersion:cycle.content_version,
            timezone:cycle.time_zone,startDate:dateString(cycle.start_local_date),
            target:target?{
              label:openSealed(target.problem_label_ciphertext,context(actor,target.id,'course.target_label'),config),
              intention:openSealed(target.intention_ciphertext,context(actor,target.id,'course.target_intention'),config),
              metricVersion:target.anchors_version,
            }:null,
            observations:observations.map(r=>({
              date:dateString(r.local_date),severity:r.severity,interference:r.interference,
              resource:r.resource,recordedAt:iso(r.recorded_at),
              note:openSealed(r.note_ciphertext,context(actor,r.id,'course.checkin_note'),config),
            })),
            sessions:sessions.map(r=>({
              day:r.day_number,localDate:dateString(r.local_date),lessonId:r.lesson_id,
              contentVersion:r.content_version,beforeNow:r.before_now,afterNow:r.after_now,
              feedback:r.feedback,completedAt:iso(r.completed_at),
              reflection:openSealed(r.reflection_ciphertext,context(actor,r.id,'course.session_note'),config),
            })),
            reviews:reviews.map(r=>({
              day:r.day_number,decision:r.next_preference,createdAt:iso(r.created_at),
              note:openSealed(r.note_ciphertext,context(actor,r.id,'course.review_note'),config),
            })),
          })
        }
        return output
      })
    },
    async read(actor,locale='en') {
      return transaction(config,actor,db=>load(db,actor,config,{locale}))
    },
    async command(actor,action,input={},locale='en') {
      const rules={
        activate:['problemLabel','intention','timeZone'],
        checkin:['operationId','severity','interference','resource','note','expectedRevision'],
        session:['operationId','day','lessonId','feedback','beforeNow','afterNow','reflection'],
        review:['operationId','day','decision','note'],
        preferences:['expectedRevision','length','imagery','checkinFrequency'],
        pause:['expectedRevision'],resume:['expectedRevision'],
        'new-cycle':['problemLabel','intention','timeZone','goal'],
      }
      if(!rules[action])notAllowed()
      onlyKeys(input,rules[action])
      return transaction(config,actor,async(db)=>{
        const {course,cycle}=await editableCycle(db,actor)
        if(action==='activate'||action==='new-cycle'){
          if(action==='activate'&&cycle)notAllowed('COURSE_ALREADY_ACTIVE',409)
          if(action==='new-cycle'){
            if(!cycle)notAllowed('COURSE_NO_ACTIVE_CYCLE',409)
            const today=requireCurrentDay(cycle)
            if(today.day<14)notAllowed('COURSE_NOT_FINISHED',409)
            // Completing day 14 must not unlock a second day-1 lesson on
            // the same local date for the same course. One new lesson/day.
            const finalSaved=(await db.query(
              'select local_date from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and day_number=14',
              [actor.id,cycle.id],
            )).rows[0]
            if(!finalSaved)notAllowed('COURSE_NOT_FINISHED',409)
            if(today.date<=dateString(finalSaved.local_date))notAllowed('COURSE_NEXT_DAY_ONLY',409)
            if(input.goal && !GROWTH_GOALS[input.goal])notAllowed('INVALID_COURSE_GOAL')
            if(input.goal){
              const scaleKeys=courseNextCycleScaleKeys(course.scale_keys,input.goal)
              if(scaleKeys===null)notAllowed('COURSE_SCALE_SELECTION_REQUIRED',409)
              await db.query('update app_private.growth_courses set goals=array_prepend($2,array_remove(goals,$2)),scale_keys=$3,revision=revision+1,updated_at=now() where id=$1',[course.id,input.goal,scaleKeys])
              course.goals=[input.goal,...course.goals.filter(x=>x!==input.goal)]
              course.scale_keys=scaleKeys
            }
            await db.query("update app_private.growth_cycles set status='archived',finished_at=now(),updated_at=now() where id=$1",[cycle.id])
          }
          await createNewCycle(db,actor,course,config,input)
          return load(db,actor,config,{locale})
        }
        if(!cycle)notAllowed('COURSE_CYCLE_MISSING',409)
        if(['pause','resume','preferences'].includes(action)){
          if(cycle.status==='completed')notAllowed('COURSE_ALREADY_COMPLETED',409)
          if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==cycle.revision)notAllowed('REVISION_CONFLICT',409)
          if(action==='pause'||action==='resume'){
            const target=action==='pause'?'paused':'active'
            await db.query('update app_private.growth_cycles set status=$2,revision=revision+1,updated_at=now() where id=$1',[cycle.id,target])
          }else{
            if(!['quick','standard'].includes(input.length)||
              !['optional','no_imagery'].includes(input.imagery)||
              !['daily','every_other_day','weekly'].includes(input.checkinFrequency))notAllowed('INVALID_COURSE_PREFERENCES')
            const prefs={length:input.length,imagery:input.imagery,checkinFrequency:input.checkinFrequency}
            await db.query('update app_private.growth_cycles set preferences=$2::jsonb,revision=revision+1,updated_at=now() where id=$1',
              [cycle.id,JSON.stringify(prefs)])
          }
          return load(db,actor,config,{locale})
        }
        const today=requireCurrentDay(cycle)
        const finalLocalDay=today.day===14&&!today.isAfterCycle
        if(cycle.status!=='active' &&
          !(cycle.status==='completed' && (action==='review'||(action==='checkin'&&finalLocalDay))))
        {
          if(action==='session' && cycle.status==='completed'){
            const retried=(await db.query('select id from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and operation_id=$3',
              [actor.id,cycle.id,input.operationId])).rows[0]
            if(retried)return load(db,actor,config,{locale})
          }
          notAllowed('COURSE_PAUSED',409)
        }
        if(action==='checkin'){
          if(today.isAfterCycle)notAllowed('COURSE_CYCLE_FINISHED',409)
          parseUUID(input.operationId)
          let ratings
          try{ratings=validateDailyRatings(input)}catch{notAllowed('INVALID_DAILY_RATING')}
          const note=positiveText(input.note,500,false)
          let row=(await db.query('select * from app_private.growth_checkins where account_id=$1 and cycle_id=$2 and local_date=$3 for update',
            [actor.id,cycle.id,today.date])).rows[0]
          if(row && row.operation_id===input.operationId)return load(db,actor,config,{locale})
          if(row){
            if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==row.revision)notAllowed('REVISION_CONFLICT',409)
            await db.query(`update app_private.growth_checkins set severity=$2,interference=$3,resource=$4,note_ciphertext=$5,
              operation_id=$6,revision=revision+1,updated_at=now(),recorded_at=now() where id=$1`,
              [row.id,ratings.severity,ratings.interference,ratings.resource,
                note?seal(note,context(actor,row.id,'course.checkin_note'),config):null,input.operationId])
          }else{
            const id=randomUUID()
            await db.query(`insert into app_private.growth_checkins
              (id,account_id,cycle_id,local_date,severity,interference,resource,note_ciphertext,operation_id)
              values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(cycle_id,local_date) do nothing`,
              [id,actor.id,cycle.id,today.date,ratings.severity,ratings.interference,ratings.resource,
                note?seal(note,context(actor,id,'course.checkin_note'),config):null,input.operationId])
          }
          return load(db,actor,config,{locale})
        }
        if(action==='session'){
          if(today.isAfterCycle)notAllowed('COURSE_CYCLE_FINISHED',409)
          parseUUID(input.operationId)
          if(!Number.isInteger(input.day)||input.day!==today.day)notAllowed('COURSE_DAY_NOT_DUE',409)
          const version=resolveCycleVersion(cycle.content_version)
          const focus=coursePracticeFocus(course.scale_keys,cycle.primary_domain,today.day,locale,version)
          const lesson=lessonFor(focus.goal,today.day,'en','standard',version)
          if(!lesson||input.lessonId!==lesson.id)notAllowed('INVALID_LESSON_ID')
          if(!permittedFeedback.has(input.feedback))notAllowed('INVALID_SESSION_FEEDBACK')
          const before=optionalRating(input.beforeNow),after=optionalRating(input.afterNow)
          if(before===undefined||after===undefined)notAllowed('INVALID_SESSION_RATING')
          const reflection=positiveText(input.reflection,500,false)
          const id=randomUUID()
          await db.query(`insert into app_private.growth_sessions
            (id,account_id,cycle_id,day_number,local_date,lesson_id,content_version,before_now,after_now,
             feedback,reflection_ciphertext,operation_id)
            values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            on conflict(cycle_id,day_number) do nothing`,
            [id,actor.id,cycle.id,today.day,today.date,lesson.id,version,before,after,
             input.feedback,reflection?seal(reflection,context(actor,id,'course.session_note'),config):null,input.operationId])
          if(today.day===14){
            await db.query(`update app_private.growth_cycles set status='completed',finished_at=now(),revision=revision+1,
              updated_at=now() where id=$1 and exists
              (select 1 from app_private.growth_sessions where cycle_id=$1 and day_number=14)`,[cycle.id])
          }
          return load(db,actor,config,{locale})
        }
        if(action==='review'){
          parseUUID(input.operationId)
          if(![7,14].includes(input.day)||today.day<input.day)notAllowed('COURSE_REVIEW_NOT_DUE',409)
          if(!permittedReview.has(input.decision))notAllowed('INVALID_REVIEW_DECISION')
          const note=positiveText(input.note,650,false),id=randomUUID()
          await db.query(`insert into app_private.growth_reviews(id,account_id,cycle_id,day_number,next_preference,note_ciphertext,operation_id)
            values($1,$2,$3,$4,$5,$6,$7) on conflict(cycle_id,day_number) do nothing`,
            [id,actor.id,cycle.id,input.day,input.decision,note?seal(note,context(actor,id,'course.review_note'),config):null,input.operationId])
          return load(db,actor,config,{locale})
        }
        notAllowed()
      })
    }
  }
}
