import {phaseOutcomeContext,phaseRetestPrimaryState,phasePrimaryComparisonState} from '../inner-growth/trauma-phase-outcomes.js'
import {traumaPhaseCheckpoints} from '../inner-growth/trauma-phase-catalog.js'
import { coursePresetForTags } from '../inner-growth/course-presets.js'
import 'server-only'
import { randomUUID } from 'node:crypto'
import { lockCourseOwner, selectOwnedCourse, readCourseAccess, requireCourseCapacity } from './course-access.js'
import { transaction } from './database.js'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed } from './crypto.js'
import { GROWTH_GOALS, suggestedCourseTopics } from '../inner-growth/course-model.js'
import { courseProgramFromTopics, courseProgramDay } from '../inner-growth/course-programs.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { buildFinalCourseRetest } from '../inner-growth/course-final-retest.js'
import { buildAntistressWeeklyCheckpoint } from '../inner-growth/anti-stress-weekly-checkpoint.js'
import { getTestScaleGuide } from '../assessments/scale-guides.js'
import { COURSE_CONTENT_VERSION, COURSE_CONTENT_V3, COURSE_CONTENT_V4, COURSE_ANTISTRESS_OUTCOME_V3, COURSE_ANTISTRESS_SKILLS_V5, COURSE_ANTISTRESS_SKILLS_V6, COURSE_ANTISTRESS_SKILLS_V7, antiStressSkillCards, oporaSkillCards, opora54SkillCards, opora55SkillCards, lessonFor } from '../inner-growth/lesson-library.js'
import {validateOpora54Signals} from '../inner-growth/anti-stress-skills-v6.js'
import { v3ReturnSuggestion } from '../inner-growth/course-v3.js'
import { COURSE_JOURNEY } from '../../data/inner-growth/course-journey.js'
import { coursePracticeFocus, courseContinuationGoals, courseNextCycleScaleKeys } from '../inner-growth/course-strategy.js'
import { effectiveLessonPreferences } from '../inner-growth/course-adaptation.js'
import { moduleLesson } from '../inner-growth/antistress-module-lessons.js'
import { ANTISTRESS_MODULE_IDS, ANTISTRESS_ACTIVE_MODULE_IDS, ANTISTRESS_ROUTER_VERSION, ANTISTRESS_PREVIOUS_ROUTER_VERSION, ANTISTRESS_MODULE_PRIMARY_METRICS, antistressModuleTitle, validateModuleFinderAnswers, unpackCourseModuleContext } from '../inner-growth/antistress-module-router.js'
import { DAY_ONE_SLIDES, validateDayOneAnswers } from '../inner-growth/anti-stress-day-one.js'
import {OPORA_STATE_JOURNEY_SCHEMA,validateOporaStateJourney} from '../inner-growth/opora-state-journey.js'
import { buildCourseSlides, verifyCourseSlideVisitOrder, OPORA_EXPERIENCE_PRE_SAVE_KEYS, OPORA_DAY_ONE_RESTORED_KEYS } from '../inner-growth/course-slide-sequence.js'
import { validateAntiStressLabAnswers } from '../inner-growth/anti-stress-practice-lab.js'
import { validateAntiStressMethodChoice } from '../inner-growth/anti-stress-method-activities.js'
import { validateOporaModuleActivityChoice } from '../inner-growth/opora-module-exercise.js'
import { validTimeZone, localDateKey, courseLessonProgress, describeCycle, validateDailyRatings, optionalRating } from '../inner-growth/course-progress.js'

const notAllowed=(code='INVALID_COURSE_ACTION',status=400)=>{throw new AppError(code,status)}
const context=(actor,id,field)=>({accountId:actor.id,recordId:id,field})
const iso=(value)=>value instanceof Date?value.toISOString():value
const dateString=(value)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10)
const sessionsForProgress=rows=>rows.map(row=>({
  dayNumber:row.day_number,localDate:dateString(row.local_date),completedAt:iso(row.completed_at),
}))
const positiveText=(value,limit=200,required=true)=>{
  if(value===null||value===undefined) return required?notAllowed('COURSE_TARGET_REQUIRED'):null
  if(typeof value!=='string')notAllowed('INVALID_COURSE_TARGET')
  const str=value.trim()
  if((required&&str.length<3)||str.length>limit)notAllowed('INVALID_COURSE_TARGET')
  return str||null
}
const resolveCycleVersion = value => value === COURSE_ANTISTRESS_SKILLS_V7 ? COURSE_ANTISTRESS_SKILLS_V7 : value === COURSE_ANTISTRESS_SKILLS_V6 ? COURSE_ANTISTRESS_SKILLS_V6 : value === COURSE_ANTISTRESS_SKILLS_V5 ? COURSE_ANTISTRESS_SKILLS_V5 : value === COURSE_ANTISTRESS_OUTCOME_V3 ? COURSE_ANTISTRESS_OUTCOME_V3 : value === COURSE_CONTENT_V4 ? COURSE_CONTENT_V4 : value === COURSE_CONTENT_V3 ? COURSE_CONTENT_V3 : COURSE_CONTENT_VERSION
const permittedFeedback=new Set(['helped','neutral','uncomfortable','skip'])
const permittedReview=new Set(['continue','softer','rest','new_cycle'])
// OPORA v1.5: independent, optional educational signals. Do not overwrite
// legacy before/after scores, whose original window is the entire lesson.
const comfortOptions=new Set(['comfortable','neutral','uncomfortable','skip'])
const usefulnessOptions=new Set(['useful','unchanged','unsure','skip'])
const flexibilityOptions=new Set(['more_choice','same','unsure','skip'])
const transferOptions=new Set(['plan','imagined','phrase','real','skip'])
const thoughtOptions=new Set(['cbt','act','neutral'])
const welcomeFeelingOptions=new Set(['steady','tense','low','unsure','skip'])
const openingSupportOptions=new Set(['pause','rest','connection','orient','unsure','other'])
const adaptationOptions=new Set(['keep','simplify','neutral','skip'])
const aphorismOptions=new Set(['agree','unsure','disagree'])
const practiceAttemptOptions=new Set(['tried','simplified','neutral','skip'])
const phraseResponseOptions=new Set(['fits','unsure','no'])
function optionalChoice(value,allowed){
  if(value===undefined||value===null)return null
  if(typeof value!=='string'||!allowed.has(value))notAllowed('INVALID_COURSE_SIGNAL')
  return value
}
// Restore owner-readable responses only after decrypting custom free text.
// Session signals in the private DB never contain the learner's plain text.
function readableSessionSignals(signals,actor,cycleId,config){
  if(!signals?.oporaOpening?.familiarSupportTextCiphertext)return signals||{}
  const {familiarSupportTextCiphertext,...opening}=signals.oporaOpening
  return {...signals,oporaOpening:{...opening,familiarSupportText:openSealed(
    familiarSupportTextCiphertext,context(actor,cycleId,'course.opora.custom_support'),config)}}
}
function firstDayFocusOptions(scaleKeys,primaryGoal,locale,version){
  if(version!==COURSE_ANTISTRESS_OUTCOME_V3)return []
  return [...new Set(Array.isArray(scaleKeys)?scaleKeys:[])].flatMap(id=>{
    if(typeof id!=='string'||!id.includes('::'))return []
    const cut=id.indexOf('::')
    const guide=getTestScaleGuide(id.slice(0,cut),locale)
    const scale=guide?.scales?.find(item=>item.key===id.slice(cut+2)&&item.canChooseSkill)
    const choice=coursePracticeFocus([id],primaryGoal,1,locale,version)
    return scale&&choice?.scaleId===id&&choice.goal
      ? [{id,label:scale.label,testTitle:guide.title,goal:choice.goal}]:[]
  }).slice(0,4)
}
function parseUUID(value){return requireUUID(value)}
async function accountReady(db,actor){
  const a=(await db.query('select status,onboarding_state,timezone from app.accounts where id=$1',[actor.id])).rows[0]
  if(!a||a.status!=='active'||a.onboarding_state!=='active')notAllowed('ACCOUNT_UNAVAILABLE',403)
  return a
}
export async function createNewCycle(db,actor,course,config,{problemLabel,intention,timeZone,moduleId}={}){
  const label=positiveText(problemLabel,160)
  if(suggestedCourseTopics(label).urgent || suggestedCourseTopics(intention||'').urgent)
    notAllowed('URGENT_SUPPORT_NEEDED',400)
  const goal=course.goals?.[0]
  if(!GROWTH_GOALS[goal])notAllowed('COURSE_GOAL_REQUIRED')
  const account=await accountReady(db,actor)
  const zone=validTimeZone(timeZone)?timeZone:validTimeZone(account.timezone)?account.timezone:'UTC'
  await requireCourseCapacity(db, actor, config, { existingCourseId: course.id })
  const existing=(await db.query(config.multiCourseEnabled
    ? "select id from app_private.growth_cycles where account_id=$1 and course_id=$2 and status in ('active','paused') for update"
    : "select id from app_private.growth_cycles where account_id=$1 and status in ('active','paused') for update", config.multiCourseEnabled ? [actor.id,course.id] : [actor.id])).rows[0]
  if(existing)notAllowed('COURSE_ACTIVE_CYCLE_EXISTS',409)
  const count=(await db.query('select coalesce(max(cycle_number),0)::integer as max from app_private.growth_cycles where account_id=$1 and course_id=$2',[actor.id,course.id])).rows[0]?.max||0
  if(count>=100)notAllowed('COURSE_CYCLE_LIMIT',409)
  const cycleId=randomUUID(),targetId=randomUUID(),local=localDateKey(Date.now(),zone)
  // Only newly created Anti-Stress cycles receive the outcome-aligned v3 lesson sequence.
  const isStress=courseProgramFromTopics(course.focus_tags||[])?.id==='stress'
  const previous=unpackCourseModuleContext(course.concerns_ciphertext
    ? openSealed(course.concerns_ciphertext,context(actor,course.id,'course.concerns'),config) : '')
  const isPersonalStress=isStress && !coursePresetForTags(course.focus_tags)
  const selected=isPersonalStress ? (ANTISTRESS_ACTIVE_MODULE_IDS.includes(moduleId)?moduleId:
    ANTISTRESS_ACTIVE_MODULE_IDS.includes(previous.moduleChoice?.id)?previous.moduleChoice.id:'AS2') : 'AS2'
  if(isPersonalStress&&selected==='AS4')notAllowed('COURSE_PROFESSIONAL_SUPPORT_REQUIRED',403)
  if(isPersonalStress && count>0 && previous.moduleChoice?.version===ANTISTRESS_ROUTER_VERSION && ['AS1','AS3','AS5'].includes(selected))
    notAllowed('COURSE_FRESH_INTAKE_REQUIRED',409)
  const finderAnswers=isPersonalStress&&previous.moduleChoice?.answers
    ?validateModuleFinderAnswers(previous.moduleChoice.answers):null
  const moduleBaseline=finderAnswers?{
    definitionKey:'hh-module-finder',version:'v1',recallDays:7,
    locale:previous.moduleChoice?.instrumentLocale||'unknown',
    answers:finderAnswers,measuredAt:previous.moduleChoice?.selectedAt||null,
    weeklyResultId:previous.moduleChoice?.weeklyResultId||null,
  }:null
  const nextContentVersion=courseProgramFromTopics(course.focus_tags||[])?.id==='stress'&&selected==='AS2'
    ? COURSE_ANTISTRESS_SKILLS_V7 : COURSE_CONTENT_V4
  // Keep the same defaults as the database for every newly created cycle.
  // Overriding the jsonb column must not discard daily tracking preferences.
  const preferences={
    length:'standard',imagery:'optional',checkinFrequency:'daily',
    ...(isPersonalStress?{
      oporaModuleId:selected,oporaModuleRouter:ANTISTRESS_ROUTER_VERSION,
      oporaPrimaryMetric:ANTISTRESS_MODULE_PRIMARY_METRICS[selected],
      ...(moduleBaseline?{oporaModuleBaselineCiphertext:seal(JSON.stringify(moduleBaseline),
        context(actor,cycleId,'course.opora.baseline'),config)}:{}),
    }:{}),
  }
  await db.query(`insert into app_private.growth_cycles
    (id,account_id,course_id,cycle_number,primary_domain,content_version,start_local_date,time_zone,duration_days,preferences)
    values($1,$2,$3,$4,$5,$6,$7,$8,14,$9::jsonb)`,[cycleId,actor.id,course.id,count+1,goal,nextContentVersion,local,zone,JSON.stringify(preferences)])
  await db.query(`insert into app_private.growth_targets
    (id,account_id,cycle_id,problem_label_ciphertext,intention_ciphertext)
    values($1,$2,$3,$4,$5)`,[targetId,actor.id,cycleId,
      seal(label,context(actor,targetId,'course.target_label'),config),
      intention?seal(positiveText(intention,300,false),context(actor,targetId,'course.target_intention'),config):null])
  return cycleId
}
async function load(db,actor,config,{locale='en',now=Date.now(),courseId=null}={}){
  await accountReady(db,actor)
  const course=await selectOwnedCourse(db,actor,{courseId,primary:config.multiCourseEnabled})
  const access=await readCourseAccess(db,actor,config)
  if(!course||course.stage!==4||course.status==='closed') return {cycle:null,available:false,courseId:course?.id||null,access}
  const cycle=(await db.query(`select * from app_private.growth_cycles where account_id=$1 and course_id=$2
    order by (case when status in ('active','paused') then 0 else 1 end),cycle_number desc limit 1`,[actor.id,course.id])).rows[0]
  if(!cycle) return {cycle:null,available:true,requiresTarget:true,courseId:course.id,access}
  const target=(await db.query('select * from app_private.growth_targets where account_id=$1 and cycle_id=$2',[actor.id,cycle.id])).rows[0]
  if(!target)notAllowed('COURSE_TARGET_MISSING',503)
  const checkins=(await db.query(`select * from app_private.growth_checkins where account_id=$1 and cycle_id=$2 order by local_date,id`,[actor.id,cycle.id])).rows
  const sessions=(await db.query(`select * from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number,id`,[actor.id,cycle.id])).rows
  const isAntiStressV3=resolveCycleVersion(cycle.content_version)===COURSE_ANTISTRESS_OUTCOME_V3
  const isAntiStressV5=resolveCycleVersion(cycle.content_version)===COURSE_ANTISTRESS_SKILLS_V5
  const isAntiStressV6=resolveCycleVersion(cycle.content_version)===COURSE_ANTISTRESS_SKILLS_V6
  const isAntiStressV7=resolveCycleVersion(cycle.content_version)===COURSE_ANTISTRESS_SKILLS_V7
  const isOporaNav2=!coursePresetForTags(course.focus_tags) && courseProgramFromTopics(course.focus_tags||[])?.id==='stress' &&
    [ANTISTRESS_ROUTER_VERSION,ANTISTRESS_PREVIOUS_ROUTER_VERSION].includes(cycle.preferences?.oporaModuleRouter) &&
    ANTISTRESS_ACTIVE_MODULE_IDS.includes(cycle.preferences?.oporaModuleId)
  const usesOporaOutcomeChecks=isAntiStressV3||isAntiStressV5||isAntiStressV6||isAntiStressV7||isOporaNav2
  // Preserve the exact legacy query contract and its cheap data access.
  // Only new Anti-Stress cycles need the owner-scoped versioned result history.
  const weeklyRows=usesOporaOutcomeChecks
    ? (await db.query(`select id,provenance,measurement_at from app.assessment_results where account_id=$1
      and provenance->>'definitionKey'='hh-weekly-pulse' order by measurement_at desc limit 40`,[actor.id])).rows
    : (await db.query(`select measurement_at from app.assessment_results where account_id=$1
      and provenance->>'definitionKey'='hh-weekly-pulse' order by measurement_at desc limit 1`,[actor.id])).rows
  const weeklyLast=weeklyRows[0]
  const weeklyCatalog=monitoringCatalogItem('hh-weekly-pulse')
  const repeatDays=weeklyCatalog?.suggestedRepeatDays||7
  const nextDue=weeklyLast ? new Date(new Date(weeklyLast.measurement_at).getTime()+repeatDays*86400000) : null
  const reviews=(await db.query(`select day_number,next_preference,created_at from app_private.growth_reviews where account_id=$1 and cycle_id=$2`,[actor.id,cycle.id])).rows
  const start=dateString(cycle.start_local_date),
    dayInfo=courseLessonProgress({sessions:sessionsForProgress(sessions),
      timeZone:cycle.time_zone,duration:cycle.duration_days,now,completed:cycle.status==='completed'}),
    actualCheckin=checkins.find(row=>dateString(row.local_date)===dayInfo.date)
  const history=describeCycle({
    startLocalDay:start,duration:cycle.duration_days,
    checkins:checkins.map(r=>({localDate:dateString(r.local_date),severity:r.severity,interference:r.interference,resource:r.resource})),
    sessions:sessions.map(r=>({dayNumber:r.day_number,localDate:dateString(r.local_date),completedAt:iso(r.completed_at),feedback:r.feedback,
      beforeNow:r.before_now,afterNow:r.after_now})),
  })
  // Content version is recorded at the start of a cycle. Existing R2 users
  // retain their original lesson IDs and round-robin sequence indefinitely.
  const contentVersion=resolveCycleVersion(cycle.content_version)
  const isV3=[COURSE_CONTENT_V3, COURSE_CONTENT_V4, COURSE_ANTISTRESS_OUTCOME_V3, COURSE_ANTISTRESS_SKILLS_V5, COURSE_ANTISTRESS_SKILLS_V6, COURSE_ANTISTRESS_SKILLS_V7].includes(contentVersion)
  // Explicit adaptations are applied to stored preferences only after a
  // completed lesson; any later change via Preferences overrides them.
  const activePreferences=cycle.preferences||{}
  const isActiveStress=!coursePresetForTags(course.focus_tags) && courseProgramFromTopics(course.focus_tags||[])?.id==='stress'
  const moduleId=isActiveStress
    ? ANTISTRESS_MODULE_IDS.includes(activePreferences.oporaModuleId)
      ? activePreferences.oporaModuleId : ([COURSE_ANTISTRESS_OUTCOME_V3,COURSE_ANTISTRESS_SKILLS_V5,COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7].includes(contentVersion)?'AS2':null)
    : null
  const phaseContext=isActiveStress?phaseOutcomeContext(moduleId,activePreferences.oporaModuleRouter):null
  const currentFocus=coursePracticeFocus(course.scale_keys,cycle.primary_domain,dayInfo.day,locale,contentVersion)
  const lessonGoal=currentFocus.goal
  let lesson=moduleLesson(lessonFor(lessonGoal,dayInfo.day,locale,activePreferences.length==='quick'?'quick':'standard',contentVersion),
    moduleId,dayInfo.day,locale,activePreferences.oporaModuleRouter)
  if(lesson && activePreferences.imagery==='no_imagery') {
    lesson={...lesson,sections:lesson.sections.map(section=>section.kind==='meditation' ? {
      ...section,
      text:lesson.antiStress?.neutralText || (locale==='ru'
        ? 'Если визуализация не подходит, оставьте глаза открытыми. Спокойно найдите вокруг три цвета, две формы и один нейтральный звук. Дайте себе паузу, не меняя дыхания. Затем выберите небольшой безопасный шаг из задания дня.'
        : 'If imagery is not comfortable, keep your eyes open. Calmly notice three colours, two shapes and one neutral sound in the room. Allow a pause without changing your breath. Then choose one small safe step from today’s activity.'),
    }:section)}
  }
  // The 14 preview cards use the same track rotation and reviewed lesson
  // library as the daily session; they never expose another account's data.
  const lang=locale==='ru'?'ru':'en'
  // The selected pack is an editorial emphasis, not a different medical or
  // test engine. Return only public authored wording in this private response.
  const programme=courseProgramFromTopics(course.focus_tags||[])
  const dayOneFocusOptions=contentVersion===COURSE_ANTISTRESS_OUTCOME_V3 &&
    dayInfo.day===1 && programme?.id==='stress'
    ? firstDayFocusOptions(course.scale_keys,cycle.primary_domain,lang,contentVersion):[]
  const roadmap=COURSE_JOURNEY.map(({day:plannedDay})=>{
    const focus=coursePracticeFocus(course.scale_keys,cycle.primary_domain,plannedDay,locale,contentVersion)
    const preview=moduleLesson(lessonFor(focus.goal,plannedDay,locale,activePreferences.length==='quick'?'quick':'standard',contentVersion),
      moduleId,plannedDay,locale,activePreferences.oporaModuleRouter)
    const practiced=Boolean(history.days[plannedDay-1]?.sessionCompleted)
    const status=practiced?'completed'
      :plannedDay===dayInfo.day&&!dayInfo.isAfterCycle?'today'
      :plannedDay<dayInfo.day||dayInfo.isAfterCycle?'past':'upcoming'
    return {
      day:plannedDay,title:preview?.title||'',...preview?.journey,
      practiceAttempt:usesOporaOutcomeChecks
        ? sessions.find(row=>row.day_number===plannedDay)?.signals?.practiceAttempt||null : null,
      programmeDay:programme ? (usesOporaOutcomeChecks
        ? {day:plannedDay,title:preview?.title||'',prompt:preview?.journey?.purpose||''}
        : courseProgramDay(programme.id,plannedDay,lang)) : null,
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
    practice:activePreferences.imagery==='no_imagery'
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
  // A new-cycle educational evidence layer, independent of mental-health test scores.
  // Count only saved user choices; a completed slide is not a demonstrated skill.
  const learningSkills=usesOporaOutcomeChecks && (!phaseContext||moduleId==='AS2')
    ? ((isAntiStressV5||isAntiStressV6||isAntiStressV7)?(isAntiStressV7?opora55SkillCards(lang):isAntiStressV6?opora54SkillCards(lang):oporaSkillCards(lang)):antiStressSkillCards(lang)).map(meta=>{
      const first=sessions.find(row=>row.day_number===meta.days[0])
      const last=sessions.find(row=>row.day_number===meta.days[1])
      const savedChoice=isAntiStressV3?last?.signals?.skillProbeChoice||null:null
      const tried=[first,last].some(row=>(isOporaNav2&&!isAntiStressV3?['tried','partly','simplified','neutral'].includes(row?.signals?.practiceLab?.attempt||row?.signals?.practiceAttempt):['tried','simplified','neutral'].includes(row?.signals?.practiceAttempt))||['tried','partly'].includes(row?.signals?.dayOne?.practiceAttempt))
      // NAV-2.0 response cards show introduced/practised only when the user
      // explicitly reports an attempt; clicking a choice does not prove skill.
      return {...meta,
        status:savedChoice?(last.signals.skillProbeHintUsed?'guided_attempt':'new_context_choice')
          :(tried?(isAntiStressV6||(isOporaNav2&&!isAntiStressV3)?'reported_attempt':'guided_attempt'):first||last?'introduced_only':'not_assessed'),
        selectedChoice:savedChoice, usedHint:isAntiStressV6
          ? [first,last].some(row=>Array.isArray(row?.signals?.opora54?.hints)&&row.signals.opora54.hints.length>0)
          : isOporaNav2&&!isAntiStressV3
            ? [first,last].some(row=>row?.signals?.dailyMethodHintUsed===true)
            : Boolean(last?.signals?.skillProbeHintUsed),
        actualPracticeTried:tried,
      }
    }) : []
  const weeklyCheckpoint=usesOporaOutcomeChecks
    ? buildAntistressWeeklyCheckpoint({
      startedAt:iso(cycle.created_at),
      completedLessons:history.practiceCount,
      testKeys:course.test_keys||[],
      results:weeklyRows.map(row=>({
        id:row.id,...row.provenance,measurementAt:iso(row.measurement_at),
      })),
      now,startable:weeklyCatalog?.startable,
      rightsStatus:weeklyCatalog?.rightsStatus,
    }) : null
  const finalSession=sessions.find(row=>row.day_number===14)
  // Final retests are offered only AFTER the actual saved day-14 lesson.
  // All rows are owned by this account, and the baseline is pinned to the
  // existing immutable cycle start (not the user's newest result).
  let finalRetest={ready:false,tests:[],completedCount:0,totalCount:0}
  if(finalSession && (dayInfo.day===14 || dayInfo.isAfterCycle)){
    const selected=[...new Set(course.test_keys||[])].slice(0,12)
    if(!selected.length)finalRetest={ready:true,tests:[],completedCount:0,totalCount:0}
    else {
    const rows=(await db.query(`select id,provenance,dimensions,measurement_at
      from app.assessment_results
      where account_id=$1 and provenance->>'definitionKey'=any($2::text[])
      order by measurement_at desc,id desc limit 400`,[actor.id,selected])).rows
    const results=rows.map(row=>({id:row.id,...row.provenance,dimensions:row.dimensions,
      measurementAt:iso(row.measurement_at)}))
    const metadata=selected.map(key=>{
      const item=monitoringCatalogItem(key)
      return {key,locale:lang,title:item?.title?.[lang]||item?.title?.en||key,
        scaleLabels:Object.fromEntries((getTestScaleGuide(key,lang)?.scales||[]).map(s=>[s.key,s.label])),
        version:item?.version||null,startable:item?.startable||false,
        rightsStatus:item?.rightsStatus||null,suggestedRepeatDays:item?.suggestedRepeatDays||null}
    })
    // The first explicitly selected measured scale is the primary educational
    // outcome. Other selected questionnaires are optional supporting context.
    const firstSelectedScale=course.scale_keys?.[0]
    const primaryTestKey=isActiveStress && ['AS2','AS6'].includes(moduleId) && selected.includes('hh-weekly-pulse')
      ? 'hh-weekly-pulse'
      : typeof firstSelectedScale==='string' ? firstSelectedScale.split('::')[0] : null
    finalRetest=buildFinalCourseRetest({testKeys:selected,primaryTestKey,results,metadata,
      antiStress:isActiveStress,phaseContext,
      startedAt:iso(cycle.created_at),completedAt:iso(finalSession.completed_at)})
    }
  }
  // Historical answers and their follow-up stay sealed in account-owned cycle
  // preferences; only a versioned read-only view is sent to the signed-in user.
  const readOporaMeasurement=(cipher,field)=>{
    if(typeof cipher!=='string'||!cipher)return null
    try{const value=JSON.parse(openSealed(cipher,context(actor,cycle.id,field),config))
      return value?.definitionKey==='hh-module-finder'&&value?.version==='v1'&&
        value?.recallDays===7?value:null
    }catch{return null}
  }
  const oporaBaseline=readOporaMeasurement(activePreferences.oporaModuleBaselineCiphertext,'course.opora.baseline')
  const oporaExit=readOporaMeasurement(activePreferences.oporaModuleExitCiphertext,'course.opora.exit')
  const retestAt=oporaBaseline?.measuredAt?Date.parse(oporaBaseline.measuredAt)+7*86400000:null
  const oporaRetestDue=Number.isFinite(retestAt)&&Date.now()>=retestAt
  const oporaCanRetest=Boolean(oporaBaseline&&['AS1','AS3','AS5'].includes(moduleId)&&
    activePreferences.oporaModuleRouter===ANTISTRESS_ROUTER_VERSION&&finalSession&&
    cycle.status==='completed'&&oporaRetestDue&&!oporaExit)
  const moduleMeasurements=activePreferences.oporaModuleRouter===ANTISTRESS_ROUTER_VERSION?{
    primaryMetric:phaseContext?.primaryMetric||null,
    primaryComparison:phasePrimaryComparisonState(phaseContext,oporaBaseline,oporaExit),
    baseline:oporaBaseline?{answers:oporaBaseline.answers,measuredAt:oporaBaseline.measuredAt,
      locale:oporaBaseline.locale,recallDays:oporaBaseline.recallDays}:null,
    followUp:oporaExit?{primarySkipped:oporaExit.primarySkipped===true,answers:oporaExit.answers,measuredAt:oporaExit.measuredAt,
      locale:oporaExit.locale,recallDays:oporaExit.recallDays}:null,
    retestAvailable:oporaCanRetest,retestDueAt:Number.isFinite(retestAt)?new Date(retestAt).toISOString():null,
    relevantItems:moduleId==='AS1'?['F1','F2']:moduleId==='AS3'?['F3','F4']:
      moduleId==='AS5'?['F7','F8']:[],
  }:null
  return {
    phaseEvidence:phaseContext?traumaPhaseCheckpoints(moduleId,lang).map(item=>({...item,evidence:finalSession?.signals?.phaseCheckpoints?.[item.id]||null})):[],
    available:true,courseId:course.id,courseStatus:course.status,readOnly:course.status==='archived',access,
    programme:programme?{id:programme.id,title:moduleId?((lang==='ru'?'Антистресс ':'Anti-Stress ')+moduleId.slice(2)+' · '+antistressModuleTitle(moduleId,lang,activePreferences.oporaModuleRouter||'')):programme.title[lang],moduleId,day:usesOporaOutcomeChecks
      ? {day:dayInfo.day,title:lesson?.title||'',prompt:lesson?.journey?.purpose||''}
      : courseProgramDay(programme.id,dayInfo.day,lang)}:null,
    cycle:{
      id:cycle.id,status:cycle.status,revision:cycle.revision,cycleNumber:cycle.cycle_number,
      moduleId,moduleRouter:activePreferences.oporaModuleRouter||null,
      startLocalDate:start,timeZone:accountZone,day:dayInfo.day,todayLocalDate:dayInfo.date,
      durationDays:cycle.duration_days,contentVersion,
      primaryGoal:primaryFocus?.goal||cycle.primary_domain,activeGoal:lessonGoal,
      activeScaleLabel:currentFocus?.label||null,
      activeFocusRole:isV3?currentFocus.role:null,
      primaryScaleLabel:primaryFocus?.label||null,
      preferences:Object.fromEntries(Object.entries(activePreferences).filter(([key])=>!key.endsWith('Ciphertext'))),
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
      signals:readableSessionSignals(currentSession.signals,actor,cycle.id,config),
      transferPlan:openSealed(currentSession.practice_plan_ciphertext,context(actor,currentSession.id,'course.practice_plan'),config),
      reflection:openSealed(currentSession.reflection_ciphertext,context(actor,currentSession.id,'course.session_note'),config),
    }:null,
    daySixPlan:(()=>{
      const saved=sessions.find(row=>row.day_number===6)
      return saved?{
        stage:saved.signals?.transferStage||null,
        plan:openSealed(saved.practice_plan_ciphertext,context(actor,saved.id,'course.practice_plan'),config),
      }:null
    })(),
    lesson,
    dayOneFocusOptions,
    finalRetest,
    moduleMeasurements,
    weeklyCheckpoint,
    anchor,
    roadmap,
    learningSkills,
    journalHistory,
    gentleSuggested:lastSession?.feedback==='uncomfortable'||returnSuggestion==='gentle',
    returnSuggestion,
    progress:{...history,practiceStreak:dayInfo.streak},
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
async function editableCycle(db,actor,courseId,cycleId){
  await lockCourseOwner(db,actor)
  const course=await selectOwnedCourse(db,actor,{courseId,mutation:true})
  if(!course||course.stage!==4)notAllowed('COURSE_NOT_READY',409)
  if(['archived','closed'].includes(course.status))notAllowed('COURSE_NOT_ACTIVE',409)
  const cycle=(await db.query(`select * from app_private.growth_cycles where account_id=$1 and course_id=$2
    and status in ('active','paused','completed') order by cycle_number desc limit 1 for update`,[actor.id,course.id])).rows[0]
  if (cycleId != null) { requireUUID(cycleId); if (cycle?.id !== cycleId) notAllowed('COURSE_CYCLE_CHANGED',409) }
  return {course,cycle}
}
async function requireCurrentDay(db,actor,cycle){
  // The parent course is locked FOR UPDATE during commands. This session read
  // prevents concurrent tabs from advancing two lesson numbers on one date.
  const rows=(await db.query('select * from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number,id',
    [actor.id,cycle.id])).rows
  return courseLessonProgress({sessions:sessionsForProgress(rows),timeZone:cycle.time_zone,
    duration:cycle.duration_days,completed:cycle.status==='completed'})
}
export function createDailyCourseRepository(config, { runTransaction = transaction } = {}){
  return {
    async exportHistory(actor) {
      return runTransaction(config,actor,async(db)=>{
        await accountReady(db,actor)
        const cycles=(await db.query('select * from app_private.growth_cycles where account_id=$1 order by cycle_number,id',[actor.id])).rows
        const output=[]
        for(const cycle of cycles){
          const target=(await db.query('select * from app_private.growth_targets where account_id=$1 and cycle_id=$2',[actor.id,cycle.id])).rows[0]
          const observations=(await db.query('select * from app_private.growth_checkins where account_id=$1 and cycle_id=$2 order by local_date',[actor.id,cycle.id])).rows
          const sessions=(await db.query('select * from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number',[actor.id,cycle.id])).rows
          const reviews=(await db.query('select * from app_private.growth_reviews where account_id=$1 and cycle_id=$2 order by day_number',[actor.id,cycle.id])).rows
          output.push({
            courseId:cycle.course_id,cycleId:cycle.id,cycleNumber:cycle.cycle_number,goal:cycle.primary_domain,
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
              signals:readableSessionSignals(r.signals,actor,cycle.id,config),
              transferPlan:openSealed(r.practice_plan_ciphertext,context(actor,r.id,'course.practice_plan'),config),
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
    async read(actor,locale='en',courseId=null) {
      return runTransaction(config,actor,db=>load(db,actor,config,{locale,courseId}))
    },
    async command(actor,action,input={},locale='en') {
      const rules={
        activate:['problemLabel','intention','timeZone'],
        checkin:['operationId','severity','interference','resource','note','expectedRevision'],
        session:['operationId','day','lessonId','feedback','beforeNow','afterNow','reflection',
          'practiceWindow','comfort','usefulness','flexibility','transferStage','thoughtPath','adaptationChoice','transferPlan','welcomeFeeling','oporaOpening',
          'skillProbeChoice','skillProbeHintUsed','aphorismResponse','practiceAttempt','phraseResponse','dayOneAnswers','stateJourney',
           'dailyMethodChoice','dailyMethodHintUsed','practiceLab','moduleActivityChoice','phaseCheckpoints','visitedSlideKeys','opora54'],
        review:['operationId','day','decision','note'],
        preferences:['expectedRevision','length','imagery','checkinFrequency'],
        pause:['expectedRevision'],resume:['expectedRevision'],
        'new-cycle':['problemLabel','intention','timeZone','goal'],
        'module-retest':['moduleAnswers','primarySkipped'],
      }
      if(!rules[action])notAllowed()
      onlyKeys(input,[...rules[action],'courseId','cycleId'])
      return runTransaction(config,actor,async(db)=>{
        const {course,cycle}=await editableCycle(db,actor,input.courseId,input.cycleId)
        if (config.multiCourseEnabled && cycle && !input.cycleId) notAllowed('COURSE_CYCLE_REQUIRED',409)
        if(action==='activate'||action==='new-cycle'){
          if(action==='activate'&&cycle)notAllowed('COURSE_ALREADY_ACTIVE',409)
          if(action==='new-cycle'){
            if(!cycle)notAllowed('COURSE_NO_ACTIVE_CYCLE',409)
            const today=await requireCurrentDay(db,actor,cycle)
            if(today.day<14)notAllowed('COURSE_NOT_FINISHED',409)
            // Completing day 14 must not unlock a second day-1 lesson on
            // the same local date for the same course. One new lesson/day.
            const finalSaved=(await db.query(
              'select local_date from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and day_number=14',
              [actor.id,cycle.id],
            )).rows[0]
            if(!finalSaved)notAllowed('COURSE_NOT_FINISHED',409)
            if(today.date<=dateString(finalSaved.local_date))notAllowed('COURSE_NEXT_DAY_ONLY',409)
            if(cycle.preferences?.oporaModuleRouter===ANTISTRESS_ROUTER_VERSION && ['AS1','AS3','AS5'].includes(cycle.preferences?.oporaModuleId))
              notAllowed('COURSE_FRESH_INTAKE_REQUIRED',409)
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
          // Validate/insert the next cycle before an inactive course occupies
          // its slot; the owner lock and transaction protect the whole transition.
          await createNewCycle(db,actor,course,config,input)
          if (course.status !== 'active') {
            await db.query(`update app_private.growth_courses set status='active',${config.multiCourseEnabled ? 'finished_at=null,' : ''}revision=revision+1,updated_at=now() where id=$1 and account_id=$2`,[course.id,actor.id]); course.status='active'
          }
          return load(db,actor,config,{locale,courseId:course.id})
        }
        if(!cycle)notAllowed('COURSE_CYCLE_MISSING',409)
        if(action==='module-retest'){
          if(cycle.status!=='completed'||!['AS1','AS3','AS5'].includes(cycle.preferences?.oporaModuleId)||
             cycle.preferences?.oporaModuleRouter!==ANTISTRESS_ROUTER_VERSION)
            notAllowed('COURSE_MODULE_RETEST_NOT_AVAILABLE',409)
          const saved=(await db.query('select id from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and day_number=14',
            [actor.id,cycle.id])).rows[0]
          if(!saved)notAllowed('COURSE_MODULE_RETEST_NOT_AVAILABLE',409)
          const prefs=cycle.preferences||{}
          if(!prefs.oporaModuleBaselineCiphertext)notAllowed('COURSE_MODULE_BASELINE_MISSING',409)
          const baseline=JSON.parse(openSealed(prefs.oporaModuleBaselineCiphertext,
            context(actor,cycle.id,'course.opora.baseline'),config))
          if(baseline.version!=='v1'||!Number.isFinite(Date.parse(baseline.measuredAt))||
            Date.now()-Date.parse(baseline.measuredAt)<7*86400000)
            notAllowed('COURSE_MODULE_RETEST_NOT_DUE',409)
          if(baseline.locale!=='unknown'&&baseline.locale!==locale)
            notAllowed('COURSE_MODULE_RETEST_LOCALE_MISMATCH',409)
          let answers
          try{answers=validateModuleFinderAnswers(input.moduleAnswers)}
          catch{notAllowed('COURSE_MODULE_FINDER_INVALID',400)}
          if(input.primarySkipped!==undefined&&typeof input.primarySkipped!=='boolean')notAllowed('COURSE_MODULE_RETEST_INVALID_SKIP',400)
          const primaryState=phaseRetestPrimaryState(phaseOutcomeContext(prefs.oporaModuleId,prefs.oporaModuleRouter),answers,input.primarySkipped===true)
          if(!primaryState?.canSubmit)notAllowed('COURSE_MODULE_PRIMARY_OR_SKIP_REQUIRED',400)
          if(primaryState.skipped)answers={...answers,[primaryState.primaryScaleKey]:null}
          // Idempotent: an already recorded T14 cannot be overwritten later.
          if(prefs.oporaModuleExitCiphertext)return load(db,actor,config,{locale,courseId:course.id})
          const data={definitionKey:'hh-module-finder',version:'v1',recallDays:7,
            locale:baseline.locale==='unknown'?locale:baseline.locale,
            measuredAt:new Date().toISOString(),answers,primarySkipped:primaryState.skipped}
          const updated={...prefs,oporaModuleExitCiphertext:seal(JSON.stringify(data),
            context(actor,cycle.id,'course.opora.exit'),config)}
          await db.query('update app_private.growth_cycles set preferences=$3::jsonb,revision=revision+1,updated_at=now() where account_id=$1 and id=$2',
            [actor.id,cycle.id,JSON.stringify(updated)])
          return load(db,actor,config,{locale,courseId:course.id})
        }
        if(['pause','resume','preferences'].includes(action)){
          if(cycle.status==='completed')notAllowed('COURSE_ALREADY_COMPLETED',409)
          if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==cycle.revision)notAllowed('REVISION_CONFLICT',409)
          if(action==='pause'||action==='resume'){
            const target=action==='pause'?'paused':'active'
            if(action==='resume') await requireCourseCapacity(db,actor,config,{existingCourseId:course.id})
            await db.query('update app_private.growth_courses set status=$3,revision=revision+1,updated_at=now() where account_id=$1 and id=$2',[actor.id,course.id,target])
            await db.query('update app_private.growth_cycles set status=$2,revision=revision+1,updated_at=now() where id=$1',[cycle.id,target])
          }else{
            if(!['quick','standard'].includes(input.length)||
              !['optional','no_imagery'].includes(input.imagery)||
              !['daily','every_other_day','weekly'].includes(input.checkinFrequency))notAllowed('INVALID_COURSE_PREFERENCES')
            const prefs={...cycle.preferences,length:input.length,imagery:input.imagery,checkinFrequency:input.checkinFrequency}
            await db.query('update app_private.growth_cycles set preferences=$2::jsonb,revision=revision+1,updated_at=now() where id=$1',
              [cycle.id,JSON.stringify(prefs)])
          }
          return load(db,actor,config,{locale,courseId:course.id})
        }
        const today=await requireCurrentDay(db,actor,cycle)
        const finalLocalDay=today.day===14&&!today.isAfterCycle
        if(cycle.status!=='active' &&
          !(cycle.status==='completed' && (action==='review'||(action==='checkin'&&finalLocalDay))))
        {
          if(action==='session' && cycle.status==='completed'){
            const retried=(await db.query('select id from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and operation_id=$3',
              [actor.id,cycle.id,input.operationId])).rows[0]
            if(retried)return load(db,actor,config,{locale,courseId:course.id})
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
          if(row && row.operation_id===input.operationId)return load(db,actor,config,{locale,courseId:course.id})
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
          return load(db,actor,config,{locale,courseId:course.id})
        }
        if(action==='session'){
          if(today.isAfterCycle)notAllowed('COURSE_CYCLE_FINISHED',409)
          parseUUID(input.operationId)
          if(today.completedToday){
            const retried=(await db.query('select id from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and operation_id=$3',
              [actor.id,cycle.id,input.operationId])).rows[0]
            if(retried)return load(db,actor,config,{locale,courseId:course.id})
            notAllowed('COURSE_NEXT_DAY_ONLY',409)
          }
          if(!Number.isInteger(input.day)||input.day!==today.day)notAllowed('COURSE_DAY_NOT_DUE',409)
          const version=resolveCycleVersion(cycle.content_version)
          const focus=coursePracticeFocus(course.scale_keys,cycle.primary_domain,today.day,locale,version)
          const lesson=lessonFor(focus.goal,today.day,'en','standard',version)
          const selectedLesson=!coursePresetForTags(course.focus_tags) && courseProgramFromTopics(course.focus_tags||[])?.id==='stress'
            ? moduleLesson(lesson,cycle.preferences?.oporaModuleId,today.day,'en',cycle.preferences?.oporaModuleRouter) : lesson
          const isOporaModule=Boolean(!coursePresetForTags(course.focus_tags) && courseProgramFromTopics(course.focus_tags||[])?.id==='stress' && [ANTISTRESS_ROUTER_VERSION,ANTISTRESS_PREVIOUS_ROUTER_VERSION].includes(selectedLesson?.oporaModule?.version))
          if(!lesson)notAllowed('INVALID_LESSON_ID')
          // Legacy lessons keep their original validation and stored IDs;
          // new module lessons must match their version-pinned variant.
          if(selectedLesson===lesson ? input.lessonId!==lesson.id :
            input.lessonId!==selectedLesson.id)notAllowed('INVALID_LESSON_ID')
          if(!permittedFeedback.has(input.feedback))notAllowed('INVALID_SESSION_FEEDBACK')
          const before=optionalRating(input.beforeNow),after=optionalRating(input.afterNow)
          if(before===undefined||after===undefined)notAllowed('INVALID_SESSION_RATING')
          const reflection=positiveText(input.reflection,500,false)
          const practiceWindow=input.practiceWindow===undefined?'legacy_lesson_v1':input.practiceWindow
          if(!['legacy_lesson_v1','practice_v15','practice_v6'].includes(practiceWindow) ||
            (practiceWindow==='practice_v6'&&version!==COURSE_ANTISTRESS_SKILLS_V7))
            notAllowed('INVALID_COURSE_MEASUREMENT_WINDOW')
          // Route descriptors are reconstructed from the stored, version-pinned cycle,
          // never accepted from the request. Fixed presets retain their original contract.
          const routePlan=!coursePresetForTags(course.focus_tags) &&
            courseProgramFromTopics(course.focus_tags||[])?.id==='stress'
            ? selectedLesson.antiStress?.routePlan : null
          const supportsStressInteraction=[COURSE_ANTISTRESS_OUTCOME_V3,COURSE_ANTISTRESS_SKILLS_V5,COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7].includes(version)||Boolean(routePlan)
          const probe=version===COURSE_ANTISTRESS_OUTCOME_V3?lesson.antiStress?.probe:null
          const probeChoice=input.skillProbeChoice==null?null:input.skillProbeChoice
          if(probeChoice!==null&&(!probe||typeof probeChoice!=='string'||!probe.choices.some(item=>item.value===probeChoice)))
            notAllowed('INVALID_ANTISTRESS_PROBE')
          if(input.skillProbeHintUsed!==undefined&&typeof input.skillProbeHintUsed!=='boolean')
            notAllowed('INVALID_ANTISTRESS_HINT_FLAG')
          if(!supportsStressInteraction&&
            ['skillProbeChoice','skillProbeHintUsed','aphorismResponse','practiceAttempt','phraseResponse','dayOneAnswers',
                'dailyMethodChoice','dailyMethodHintUsed']
              .some(key=>input[key]!==undefined && !(key==='practiceAttempt'&&isOporaModule)))
            notAllowed('INVALID_ANTISTRESS_PROBE')
          const isInteractiveFirstDay=!routePlan && version===COURSE_ANTISTRESS_OUTCOME_V3 &&
            today.day===1 && courseProgramFromTopics(course.focus_tags||[])?.id==='stress'
          const firstStressDay=Boolean(version===COURSE_ANTISTRESS_OUTCOME_V3 && !coursePresetForTags(course.focus_tags) && selectedLesson.antiStress && !selectedLesson.antiStress.routePlan && today.day===1 &&
            courseProgramFromTopics(course.focus_tags||[])?.id==='stress')
          const supportsOporaStateJourney=Boolean(![COURSE_ANTISTRESS_SKILLS_V5,COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7].includes(version) && !firstStressDay &&
            courseProgramFromTopics(course.focus_tags||[])?.id==='stress' &&
            !coursePresetForTags(course.focus_tags) &&
            (Boolean(selectedLesson.antiStress?.skillId) ||
              ['opora-nav-2.0-20261014','opora-trauma-1.3-20261015']
                .includes(selectedLesson.oporaModule?.version)))
          if(!supportsOporaStateJourney && input.stateJourney!==undefined)
            notAllowed('INVALID_OPORA_STATE_JOURNEY',400)
          let stateJourney=null
          if(supportsOporaStateJourney){
            try{stateJourney=validateOporaStateJourney(input.stateJourney)}
            catch{notAllowed('INVALID_OPORA_STATE_JOURNEY',400)}
          }
          if(![COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7].includes(version) && input.opora54!==undefined)
            notAllowed('INVALID_OPORA54_VERSION',400)
          let opora54=null
          if([COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7].includes(version)){
            try{opora54=validateOpora54Signals(input.opora54)}
            catch{notAllowed('INVALID_OPORA54_SIGNALS',400)}
            if(input.aphorismResponse!=null && input.aphorismResponse!==opora54.answers.aphorism)
              notAllowed('INVALID_OPORA54_APHORISM',400)
            if(opora54.hints.includes('rehearse')&&opora54.answers.rehearse==='independent')
              notAllowed('INVALID_OPORA54_INDEPENDENCE',400)
          }
          // Lesson 1 now restores its five separate welcoming screens.
          // Existing V7 tabs with the old five-moment sequence remain valid.
          const restoredDayOne=practiceWindow==='practice_v6' &&
            version===COURSE_ANTISTRESS_SKILLS_V7 && today.day===1 &&
            Array.isArray(input.visitedSlideKeys) &&
            input.visitedSlideKeys.length===OPORA_DAY_ONE_RESTORED_KEYS.length
          let oporaOpening=null
          if(input.oporaOpening!==undefined){
            if(!restoredDayOne||!input.oporaOpening||
              typeof input.oporaOpening!=='object'||Array.isArray(input.oporaOpening))
              notAllowed('INVALID_OPORA_OPENING',400)
            onlyKeys(input.oporaOpening,['resource','lastDayDifficulty','familiarSupport','familiarSupportText'])
            const resource=optionalRating(input.oporaOpening.resource)
            const lastDayDifficulty=optionalRating(input.oporaOpening.lastDayDifficulty)
            if(resource===undefined||lastDayDifficulty===undefined)
              notAllowed('INVALID_OPORA_OPENING',400)
            const familiarSupport=optionalChoice(input.oporaOpening.familiarSupport,openingSupportOptions)
            const rawSupport=input.oporaOpening.familiarSupportText
            if(rawSupport!==undefined&&rawSupport!==null&&typeof rawSupport!=='string')
              notAllowed('INVALID_OPORA_OPENING',400)
            const familiarSupportText=typeof rawSupport==='string'?rawSupport.trim():null
            if((familiarSupportText?.length||0)>160 ||
              (familiarSupportText&&/[\u0000-\u001f\u007f]/u.test(familiarSupportText)) ||
              Boolean(familiarSupportText)!==(familiarSupport==='other'))
              notAllowed('INVALID_OPORA_OPENING',400)
            oporaOpening={
              resource,lastDayDifficulty,familiarSupport,
              ...(familiarSupportText?{familiarSupportText}:{}),
            }
          }
          // Old historical 15-screen lessons and all other versions stay pinned.
          const requiredSlides=practiceWindow==='practice_v6'
            ? (restoredDayOne
              ? OPORA_DAY_ONE_RESTORED_KEYS.map(key=>({key}))
              : OPORA_EXPERIENCE_PRE_SAVE_KEYS.map(key=>({key})))
            : firstStressDay?DAY_ONE_SLIDES:buildCourseSlides(selectedLesson)
          if(!verifyCourseSlideVisitOrder(requiredSlides,input.visitedSlideKeys))
            notAllowed('COURSE_SLIDES_INCOMPLETE',409)
          if(!isInteractiveFirstDay && input.dayOneAnswers!==undefined)
            notAllowed('INVALID_DAY_ONE_LESSON',400)
          let dayOneAnswers={}
          if(isInteractiveFirstDay){
            try{
              const focusIds=firstDayFocusOptions(course.scale_keys,cycle.primary_domain,'en',version).map(item=>item.id)
              dayOneAnswers=validateDayOneAnswers(input.dayOneAnswers,focusIds)
            }catch{notAllowed('INVALID_DAY_ONE_ANSWERS',400)}
          }
          const isInteractiveDay=Boolean(routePlan)||(version===COURSE_ANTISTRESS_OUTCOME_V3 &&
            today.day>1 && courseProgramFromTopics(course.focus_tags||[])?.id==='stress')
          if(!isInteractiveDay&&(input.dailyMethodChoice!==undefined||input.dailyMethodHintUsed!==undefined))
            notAllowed('INVALID_OPORA_METHOD_DAY',400)
          if(input.dailyMethodHintUsed!==undefined&&typeof input.dailyMethodHintUsed!=='boolean')
            notAllowed('INVALID_OPORA_METHOD_HINT',400)
          let validatedMethodChoice=null
          if(isInteractiveDay){
            try{validatedMethodChoice=validateAntiStressMethodChoice(today.day,input.dailyMethodChoice,routePlan?.methodActivity)}
            catch{notAllowed('INVALID_OPORA_METHOD_CHOICE',400)}
          }
          // Additional user-chosen practice detail; we do not infer success
          // from a click and do not accept arbitrary personal text in JSON.
          if(!isInteractiveDay && input.practiceLab!==undefined)
            notAllowed('INVALID_PRACTICE_LAB',400)
          if((!isOporaModule||selectedLesson?.oporaModule?.version===ANTISTRESS_ROUTER_VERSION) && input.moduleActivityChoice!==undefined)
            notAllowed('INVALID_OPORA_MODULE_ACTIVITY',400)
          const legacyModuleDialect=isOporaModule && input.moduleActivityChoice!==undefined
          if(legacyModuleDialect && ['dailyMethodChoice','dailyMethodHintUsed','practiceLab'].some(key=>input[key]!==undefined))
            notAllowed('INVALID_OPORA_MODULE_ACTIVITY',400)
          let moduleActivityChoice=null
          if(isOporaModule){
            try{
              moduleActivityChoice=validateOporaModuleActivityChoice(
                selectedLesson.oporaModule.id,today.day,input.moduleActivityChoice,
                selectedLesson.oporaModule.version)
            }catch{notAllowed('INVALID_OPORA_MODULE_ACTIVITY',400)}
          }
          let practiceLab=null
          if(isInteractiveDay){
            try{practiceLab=validateAntiStressLabAnswers(input.practiceLab,today.day,routePlan?.practiceLab)}
            catch{notAllowed('INVALID_PRACTICE_LAB',400)}
            if(routePlan && input.dailyMethodHintUsed===true && practiceLab?.reflect?.endsWith('_independent'))
              notAllowed('INVALID_PRACTICE_LAB',400)
          }
          const phaseContext=!coursePresetForTags(course.focus_tags)&&courseProgramFromTopics(course.focus_tags||[])?.id==='stress'
            ?phaseOutcomeContext(cycle.preferences?.oporaModuleId,cycle.preferences?.oporaModuleRouter):null
          const checkpointCatalog=phaseContext&&today.day===14
            ?traumaPhaseCheckpoints(cycle.preferences.oporaModuleId,'en'):[]
          let phaseCheckpoints=null
          if(input.phaseCheckpoints!==undefined){
            if(!checkpointCatalog?.length||!input.phaseCheckpoints||typeof input.phaseCheckpoints!=='object'||Array.isArray(input.phaseCheckpoints))
              notAllowed('INVALID_PHASE_CHECKPOINTS',400)
            const allowed=new Map(checkpointCatalog.map(item=>[item.id,item]))
            phaseCheckpoints={}
            for(const [id,evidence] of Object.entries(input.phaseCheckpoints)){
              if(!allowed.has(id)||!evidence||typeof evidence!=='object'||Array.isArray(evidence))notAllowed('INVALID_PHASE_CHECKPOINTS',400)
              onlyKeys(evidence,['state','choice'])
              if(!['independent','guided','not_tried','not_suitable'].includes(evidence.state))notAllowed('INVALID_PHASE_CHECKPOINTS',400)
              if(evidence.state==='independent'&&input.dailyMethodHintUsed===true)notAllowed('INVALID_PHASE_CHECKPOINTS',400)
              const choice=evidence.choice??null
              if(choice!==null&&!allowed.get(id).options.some(option=>option.value===choice))notAllowed('INVALID_PHASE_CHECKPOINTS',400)
              if(['independent','guided'].includes(evidence.state)&&choice===null)notAllowed('INVALID_PHASE_CHECKPOINTS',400)
              phaseCheckpoints[id]={state:evidence.state,choice}
            }
          }
          const signals={
            window:practiceWindow,
            ...(opora54!==null?{opora54,interactionSchema:version===COURSE_ANTISTRESS_SKILLS_V7?'as-5.5-fifteen-screens-v1':'as-5.4-fifteen-screens-v1'}:{}),
            ...(practiceWindow==='practice_v6'?{interactionSchema:restoredDayOne?'as-5.8-restored-five-opening-v1':'as-5.6-five-moments-v1'}:{}),
            ...(oporaOpening?{oporaOpening:{
              resource:oporaOpening.resource,lastDayDifficulty:oporaOpening.lastDayDifficulty,
              familiarSupport:oporaOpening.familiarSupport,
              ...(oporaOpening.familiarSupportText?{
                familiarSupportTextCiphertext:seal(oporaOpening.familiarSupportText,
                  context(actor,cycle.id,'course.opora.custom_support'),config),
              }:{})
            }}:{}),
            ...(phaseCheckpoints?{phaseCheckpoints}:{}),
            comfort:optionalChoice(input.comfort,comfortOptions),
            usefulness:optionalChoice(input.usefulness,usefulnessOptions),
            flexibility:optionalChoice(input.flexibility,flexibilityOptions),
            transferStage:optionalChoice(input.transferStage,transferOptions),
            thoughtPath:optionalChoice(input.thoughtPath,thoughtOptions),
            adaptationChoice:optionalChoice(input.adaptationChoice,adaptationOptions),
            welcomeFeeling:optionalChoice(input.welcomeFeeling,welcomeFeelingOptions),
            welcomeFocus:focus.goal,
            ...(supportsStressInteraction ? {
              skillId:selectedLesson.antiStress?.skillId||null,
              skillProbeChoice:probeChoice,
              skillProbeHintUsed:Boolean(probeChoice&&input.skillProbeHintUsed===true),
              aphorismResponse:optionalChoice(input.aphorismResponse,aphorismOptions),
              practiceAttempt:optionalChoice(input.practiceAttempt,practiceAttemptOptions),
              phraseResponse:optionalChoice(input.phraseResponse,phraseResponseOptions),
            } : {}),
            ...(legacyModuleDialect?{
              interactionSchema:'opora-level-2',
              moduleThemeId:selectedLesson.oporaModule.id+'-day-'+String(today.day),
              moduleActivityChoice,
              aphorismResponse:optionalChoice(input.aphorismResponse,aphorismOptions),
              practiceAttempt:optionalChoice(input.practiceAttempt,practiceAttemptOptions),
              phraseResponse:optionalChoice(input.phraseResponse,phraseResponseOptions),
            }:{}),
            ...(isInteractiveFirstDay?{dayOne:dayOneAnswers,interactiveSchema:'as-1.8'}:{}),
            ...(supportsOporaStateJourney&&stateJourney!==null
              ?{stateJourney,stateJourneySchema:OPORA_STATE_JOURNEY_SCHEMA}:{}),
            ...(isInteractiveDay&&!legacyModuleDialect?{
              dailyMethodChoice:validatedMethodChoice,
              dailyMethodHintUsed:Boolean(input.dailyMethodHintUsed),
              interactiveSchema:routePlan?(routePlan.schema||'opora-nav2-interactions-1'):'as-4.0',
              ...(practiceLab!==null?{practiceLab,practiceLabVersion:routePlan?(routePlan.version||'opora-nav2-lab-1'):'opora-lab-1'}:{}),
            }:{}),
          }
          const transferPlan=positiveText(input.transferPlan,300,false)
          if(transferPlan&&today.day!==6)notAllowed('INVALID_COURSE_PLAN_DAY')
          const id=randomUUID()
          await db.query(`insert into app_private.growth_sessions
            (id,account_id,cycle_id,day_number,local_date,lesson_id,content_version,before_now,after_now,
             feedback,reflection_ciphertext,operation_id,signals,practice_plan_ciphertext)
            values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            on conflict(cycle_id,day_number) do nothing`,
            [id,actor.id,cycle.id,today.day,today.date,selectedLesson?.id||lesson.id,version,before,after,
             input.feedback,reflection?seal(reflection,context(actor,id,'course.session_note'),config):null,
             input.operationId,JSON.stringify(signals),
             transferPlan?seal(transferPlan,context(actor,id,'course.practice_plan'),config):null])
          // Respect only the saved explicit user choice; never infer from an
          // omitted answer, a symptom scale, or a model suggestion.
          if(['simplify','neutral'].includes(signals.adaptationChoice)){
            const nextPreferences=effectiveLessonPreferences(cycle.preferences||{},signals.adaptationChoice)
            await db.query('update app_private.growth_cycles set preferences=$2::jsonb,revision=revision+1,updated_at=now() where id=$1',
              [cycle.id,JSON.stringify(nextPreferences)])
          }
          if(today.day===14){
            await db.query(`update app_private.growth_cycles set status='completed',finished_at=now(),revision=revision+1,
              updated_at=now() where id=$1 and exists
              (select 1 from app_private.growth_sessions where cycle_id=$1 and day_number=14)`,[cycle.id])
            if (config.multiCourseEnabled) await db.query("update app_private.growth_courses set status='completed',is_primary=false,finished_at=now(),revision=revision+1,updated_at=now() where account_id=$1 and id=$2",[actor.id,course.id])
          }
          return load(db,actor,config,{locale,courseId:course.id})
        }
        if(action==='review'){
          parseUUID(input.operationId)
          if(![7,14].includes(input.day)||today.day<input.day)notAllowed('COURSE_REVIEW_NOT_DUE',409)
          if(!permittedReview.has(input.decision))notAllowed('INVALID_REVIEW_DECISION')
          const note=positiveText(input.note,650,false),id=randomUUID()
          await db.query(`insert into app_private.growth_reviews(id,account_id,cycle_id,day_number,next_preference,note_ciphertext,operation_id)
            values($1,$2,$3,$4,$5,$6,$7) on conflict(cycle_id,day_number) do nothing`,
            [id,actor.id,cycle.id,input.day,input.decision,note?seal(note,context(actor,id,'course.review_note'),config):null,input.operationId])
          return load(db,actor,config,{locale,courseId:course.id})
        }
        notAllowed()
      })
    }
  }
}
